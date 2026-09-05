/**
 * A minimal Supabase-compatible server for local end-to-end testing.
 *
 * WHY THIS EXISTS
 * ---------------
 * This workspace has no Docker (so `supabase start` is impossible) and no
 * network egress to supabase.co. Without something like this, STEP 3 could only
 * be verified by compilation - which the brief explicitly forbids.
 *
 * WHAT IT IS NOT
 * --------------
 * It is NOT a mock. It does not fabricate responses. Every REST call and RPC is
 * translated to SQL and executed against the REAL PostgreSQL database carrying
 * the real migrations, as the `authenticated` role, with request.jwt.claims set
 * to the signed-in user. So RLS is genuinely enforced: if a policy would deny a
 * read in production, it denies it here too. That is what makes the E2E tests
 * meaningful rather than decorative.
 *
 * It implements only the surface this app uses:
 *   POST /auth/v1/signup, /auth/v1/token, /auth/v1/logout
 *   GET  /auth/v1/user
 *   REST /rest/v1/<table>            (select / insert / update, filters, count)
 *   POST /rest/v1/rpc/<function>
 *
 * It is a TEST HARNESS. It is never imported by application code and never
 * shipped. Tokens are opaque random strings kept in memory, not real JWTs.
 */
import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import pg from 'pg';

const DB = process.env.DATABASE_URL ?? 'postgresql://postgres:localdev@127.0.0.1:5433/hos_test';
const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);

const pool = new pg.Pool({ connectionString: DB, max: 10 });

/** token -> userId. Opaque, in-memory, test-only. */
const sessions = new Map();

function json(res, status, body, extra = {}) {
  const payload = body === null ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-expose-headers': 'content-range',
    ...extra,
  });
  res.end(payload);
}

function bearer(req) {
  const raw = req.headers.authorization ?? '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  return sessions.get(token) ?? null;
}

/** Run a query as the signed-in user so RLS applies exactly as in production. */
async function asUser(userId, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (userId) {
      await client.query('select set_config($1, $2, true)', [
        'request.jwt.claims',
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ]);
      await client.query('set local role authenticated');
    } else {
      await client.query('set local role anon');
    }
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Superuser access, used only for the auth tables the real GoTrue would own. */
async function asAdmin(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

function userPayload(row) {
  return {
    id: row.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: row.email,
    email_confirmed_at: row.email_confirmed_at ?? new Date().toISOString(),
    confirmed_at: row.email_confirmed_at ?? new Date().toISOString(),
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: row.raw_user_meta_data ?? {},
    identities: [],
  };
}

function sessionPayload(token, user) {
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: token,
    user,
  };
}

/* ------------------------------------------------------------ PostgREST bits */

const OPS = {
  eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike',
};

/** Translate a subset of PostgREST query params into SQL. */
function buildFilters(params, values) {
  const clauses = [];
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
    const m = /^([a-z]+)\.(.*)$/.exec(raw);
    if (!m) continue;
    const [, op, val] = m;
    if (op === 'is') {
      clauses.push(`"${key}" is ${val === 'null' ? 'null' : val}`);
    } else if (OPS[op]) {
      values.push(val);
      clauses.push(`"${key}" ${OPS[op]} $${values.length}`);
    } else if (op === 'in') {
      const items = val.replace(/^\(|\)$/g, '').split(',');
      const ph = items.map((v) => {
        values.push(v.replace(/^"|"$/g, ''));
        return `$${values.length}`;
      });
      clauses.push(`"${key}" in (${ph.join(',')})`);
    }
  }
  return clauses;
}

/**
 * PostgREST's `select` supports embedding (`families(id,name)`). The app uses
 * that in getContexts(); resolve those as a correlated json subquery.
 */
function parseSelect(select) {
  if (!select || select === '*') return { columns: ['*'], embeds: [] };
  const columns = [];
  const embeds = [];
  let depth = 0;
  let buf = '';
  const parts = [];
  for (const ch of select) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else buf += ch;
  }
  if (buf) parts.push(buf);

  for (const p of parts) {
    const m = /^([A-Za-z_][\w]*)\((.*)\)$/.exec(p.trim());
    if (m) embeds.push({ table: m[1], columns: m[2].split(',').map((c) => c.trim()) });
    else columns.push(p.trim());
  }
  return { columns: columns.length ? columns : ['*'], embeds };
}

/** Foreign-key column used to join an embedded table. */
const EMBED_FK = {
  families: 'family_id',
  organizations: 'organization_id',
};

async function handleRest(req, res, url, userId, body) {
  const table = url.pathname.replace('/rest/v1/', '');
  if (!/^[a-z_]+$/.test(table)) return json(res, 400, { message: 'bad table' });

  const params = url.searchParams;
  const prefer = String(req.headers.prefer ?? '');
  const wantCount = prefer.includes('count=exact');
  const headOnly = req.method === 'HEAD' || params.get('__head') === '1';

  try {
    if (req.method === 'GET' || req.method === 'HEAD') {
      const { columns, embeds } = parseSelect(params.get('select'));
      const values = [];
      const where = buildFilters(params, values);

      const cols = columns.includes('*') ? '*' : columns.map((c) => `"${c}"`).join(', ');
      const embedSql = embeds
        .map((e) => {
          const fk = EMBED_FK[e.table] ?? `${e.table}_id`;
          const inner = e.columns.map((c) => `'${c}', x."${c}"`).join(', ');
          return `, (select json_build_object(${inner}) from public."${e.table}" x
                     where x.id = t."${fk}") as "${e.table}"`;
        })
        .join('');

      let sql = `select ${cols}${embedSql} from public."${table}" t`;
      if (where.length) sql += ` where ${where.join(' and ')}`;

      const order = params.get('order');
      if (order) {
        const [col, dir] = order.split('.');
        if (/^[a-z_]+$/.test(col)) sql += ` order by "${col}" ${dir === 'desc' ? 'desc' : 'asc'}`;
      }
      const limit = params.get('limit');
      if (limit && /^\d+$/.test(limit)) sql += ` limit ${limit}`;

      const out = await asUser(userId, async (c) => {
        const rows = headOnly ? { rows: [] } : await c.query(sql, values);
        let count = null;
        if (wantCount) {
          let csql = `select count(*)::int as n from public."${table}" t`;
          if (where.length) csql += ` where ${where.join(' and ')}`;
          const cr = await c.query(csql, values);
          count = cr.rows[0].n;
        }
        return { rows: rows.rows ?? [], count };
      });

      const headers = {};
      if (out.count !== null) headers['content-range'] = `0-${Math.max(out.count - 1, 0)}/${out.count}`;
      return json(res, 200, headOnly ? null : out.rows, headers);
    }

    if (req.method === 'POST') {
      const rows = Array.isArray(body) ? body : [body];
      const returning = prefer.includes('return=representation');
      const out = await asUser(userId, async (c) => {
        const inserted = [];
        for (const row of rows) {
          const keys = Object.keys(row);
          const vals = keys.map((k) => row[k]);
          const ph = keys.map((_, i) => `$${i + 1}`);
          const sql =
            `insert into public."${table}" (${keys.map((k) => `"${k}"`).join(',')}) ` +
            `values (${ph.join(',')})${returning ? ' returning *' : ''}`;
          const r = await c.query(sql, vals);
          if (returning) inserted.push(...r.rows);
        }
        return inserted;
      });
      return json(res, 201, returning ? out : null);
    }

    if (req.method === 'PATCH') {
      const values = [];
      const sets = Object.entries(body).map(([k, v]) => {
        values.push(v);
        return `"${k}" = $${values.length}`;
      });
      const where = buildFilters(params, values);
      let sql = `update public."${table}" set ${sets.join(', ')}`;
      if (where.length) sql += ` where ${where.join(' and ')}`;
      await asUser(userId, (c) => c.query(sql, values));
      return json(res, 204, null);
    }

    return json(res, 405, { message: 'method not allowed' });
  } catch (e) {
    console.error('[rest]', req.method, table, e.message);
    return json(res, 400, { message: e.message, code: e.code ?? '', details: '', hint: '' });
  }
}

/* ------------------------------------------------------------------- server */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') return json(res, 204, null);

  let body = null;
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    body = raw ? JSON.parse(raw) : {};
  }

  try {
    /* ------------------------------------------------------------- signup */
    if (url.pathname === '/auth/v1/signup' && req.method === 'POST') {
      const { email, password, data } = body;
      const exists = await asAdmin((c) =>
        c.query('select 1 from auth.users where lower(email) = lower($1)', [email]),
      );
      if (exists.rowCount > 0) {
        return json(res, 400, { message: 'User already registered', code: 'user_already_exists' });
      }
      const id = randomUUID();
      await asAdmin((c) =>
        c.query(
          `insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
             email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
             confirmation_token, recovery_token, email_change_token_new, email_change)
           values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated','authenticated',
             $2, $3, now(), now(), now(),
             '{"provider":"email","providers":["email"]}'::jsonb, $4::jsonb, '', '', '', '')`,
          [id, email, `test:${password}`, JSON.stringify(data ?? {})],
        ),
      );
      const row = (await asAdmin((c) => c.query('select * from auth.users where id = $1', [id]))).rows[0];
      const token = randomBytes(24).toString('hex');
      sessions.set(token, id);
      return json(res, 200, sessionPayload(token, userPayload(row)));
    }

    /* -------------------------------------------------------------- token */
    if (url.pathname === '/auth/v1/token' && req.method === 'POST') {
      const { email, password } = body;
      const r = await asAdmin((c) =>
        c.query('select * from auth.users where lower(email) = lower($1)', [email]),
      );
      const row = r.rows[0];
      if (!row || row.encrypted_password !== `test:${password}`) {
        return json(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      }
      const token = randomBytes(24).toString('hex');
      sessions.set(token, row.id);
      return json(res, 200, sessionPayload(token, userPayload(row)));
    }

    /* --------------------------------------------------------------- user */
    if (url.pathname === '/auth/v1/user') {
      const userId = bearer(req);
      if (!userId) return json(res, 401, { message: 'invalid claim' });
      if (req.method === 'PUT') {
        return json(res, 200, userPayload(
          (await asAdmin((c) => c.query('select * from auth.users where id=$1', [userId]))).rows[0],
        ));
      }
      const r = await asAdmin((c) => c.query('select * from auth.users where id=$1', [userId]));
      if (r.rowCount === 0) return json(res, 401, { message: 'user not found' });
      return json(res, 200, userPayload(r.rows[0]));
    }

    if (url.pathname === '/auth/v1/logout') {
      const raw = req.headers.authorization ?? '';
      sessions.delete(raw.replace('Bearer ', ''));
      return json(res, 204, null);
    }

    if (url.pathname === '/auth/v1/recover' || url.pathname === '/auth/v1/resend') {
      return json(res, 200, {});
    }

    /* ---------------------------------------------------------------- rpc */
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = url.pathname.replace('/rest/v1/rpc/', '');
      if (!/^[a-z_]+$/.test(fn)) return json(res, 400, { message: 'bad function' });
      const userId = bearer(req);
      const keys = Object.keys(body ?? {});
      const args = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
      const values = keys.map((k) => body[k]);
      try {
        const out = await asUser(userId, (c) =>
          c.query(`select public.${fn}(${args}) as result`, values),
        );
        return json(res, 200, out.rows[0]?.result ?? null);
      } catch (e) {
        console.error('[rpc]', fn, e.message);
        return json(res, 400, { message: e.message, code: e.code ?? '' });
      }
    }

    /* --------------------------------------------------------------- rest */
    if (url.pathname.startsWith('/rest/v1/')) {
      return handleRest(req, res, url, bearer(req), body);
    }

    return json(res, 404, { message: 'not found' });
  } catch (e) {
    return json(res, 500, { message: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`fake-supabase listening on http://127.0.0.1:${PORT} -> ${DB}`);
});
