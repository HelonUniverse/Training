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
 *   STORAGE /storage/v1/object/...   (upload, sign, download, remove)
 *
 * The storage side matters as much as the REST side. Bytes land on local disk,
 * but the AUTHORIZATION is real: an upload is an insert into the real
 * storage.objects table as the real user, so the quarantine policy decides;
 * signing first checks that the same user can SELECT that object, so migration
 * 0060's "readable only when the owning document is readable and clean" is what
 * gates every preview. A test that gets a signed URL here would get one in
 * production, and one that is refused here would be refused there.
 *
 * It is a TEST HARNESS. It is never imported by application code and never
 * shipped. Tokens are opaque random strings kept in memory, not real JWTs.
 */
import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pg from 'pg';

/**
 * jsonb columns need JSON, not a JavaScript value.
 *
 * PostgREST receives a JSON document and casts each field to its column type,
 * so `{"suggested_value": "Math"}` reaches a jsonb column as the JSON string
 * `"Math"`, and `[0.9]` as a JSON array. Binding the raw JS value through
 * node-postgres instead sends `Math` (not valid JSON) and `{0.9}` (a Postgres
 * ARRAY literal, also not valid JSON), and the insert fails with "invalid input
 * syntax for type json".
 *
 * That is a difference between the harness and production, which is precisely
 * what this harness exists NOT to have - so the column types are read once from
 * the catalogue and the values encoded the way PostgREST would.
 */
const jsonColumnCache = new Map();

async function jsonColumns(client, table) {
  if (jsonColumnCache.has(table)) return jsonColumnCache.get(table);
  const r = await client.query(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1
        and data_type in ('json', 'jsonb')`,
    [table],
  );
  const set = new Set(r.rows.map((row) => row.column_name));
  jsonColumnCache.set(table, set);
  return set;
}

function encodeForColumn(value, key, jsonCols) {
  if (!jsonCols.has(key)) return value;
  if (value === null || value === undefined) return null;
  // Already a JSON document as text: leave it be.
  if (typeof value === 'string') {
    try { JSON.parse(value); return value; } catch { return JSON.stringify(value); }
  }
  return JSON.stringify(value);
}

const DB = process.env.DATABASE_URL ?? 'postgresql://postgres:localdev@127.0.0.1:5433/hos_test';
const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);

/**
 * PostgREST hands a `date` column back as "2026-09-06" - a calendar day, with
 * no time and no zone, because that is what the column means. node-postgres
 * instead parses it into a JS Date, which then serialises as a full ISO
 * timestamp and shifts by the server's offset.
 *
 * Left alone, the harness feeds the app a shape production never produces. It
 * cost an afternoon once already: every card on the portfolio timeline read
 * "Invalid Date", and the app was not at fault.
 */
pg.types.setTypeParser(1082, (value) => value); // date
pg.types.setTypeParser(1083, (value) => value); // time
pg.types.setTypeParser(1266, (value) => value); // timetz

const pool = new pg.Pool({ connectionString: DB, max: 10 });

/** Where uploaded bytes live for the duration of a test run. */
const STORE = process.env.FAKE_STORAGE_DIR ?? '/tmp/hos-fake-storage';
mkdirSync(STORE, { recursive: true });

/** signed-url token -> { bucket, path, expiresAt }. Opaque, in-memory. */
const signatures = new Map();

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

/**
 * The service-role key. The trusted worker (the scan cron route) presents this
 * instead of a session, exactly as it would against real Supabase.
 */
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key';
const SERVICE = Symbol('service_role');

function bearer(req) {
  const raw = req.headers.authorization ?? '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  if (token && token === SERVICE_KEY) return SERVICE;
  return sessions.get(token) ?? null;
}

/**
 * Run a query as the caller, so RLS applies exactly as in production.
 *
 * The service_role branch sets NO jwt claims, which is the whole point:
 * auth.uid() is null there, and app.record_scan_result refuses to run unless it
 * is. The worker's privilege and the user's are genuinely different roles here,
 * not a flag this harness decides to honour.
 */
async function asUser(userId, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (userId === SERVICE) {
      await client.query('set local role service_role');
    } else if (userId) {
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

/** proretset, cached: the catalog is the authority on a function's shape. */
const setReturningCache = new Map();
async function returnsSet(name) {
  if (setReturningCache.has(name)) return setReturningCache.get(name);
  const out = await asAdmin((c) =>
    c.query(
      `select bool_or(p.proretset) as s from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1`,
      [name],
    ),
  );
  const answer = out.rows[0]?.s === true;
  setReturningCache.set(name, answer);
  return answer;
}

const OPS = {
  eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike',
};

/** One `column.op.value` term. Returns null if it is not one. */
function term(key, raw, values) {
  const m = /^([a-z]+)\.(.*)$/.exec(raw);
  if (!m) return null;
  const [, op, val] = m;
  if (op === 'is') return `"${key}" is ${val === 'null' ? 'null' : val}`;
  if (OPS[op]) {
    values.push(val);
    return `"${key}" ${OPS[op]} $${values.length}`;
  }
  if (op === 'in') {
    const items = val.replace(/^\(|\)$/g, '').split(',');
    const ph = items.map((v) => {
      values.push(v.replace(/^"|"$/g, ''));
      return `$${values.length}`;
    });
    return `"${key}" in (${ph.join(',')})`;
  }
  return null;
}

/**
 * `.or('a.ilike.%x%,b.ilike.%x%')` arrives as or=(a.ilike.%x%,b.ilike.%x%).
 * Splitting on commas at depth zero keeps a value containing a comma intact.
 */
function orClause(raw, values) {
  const inner = raw.replace(/^\(|\)$/g, '');
  const parts = [];
  let depth = 0;
  let buf = '';
  for (const ch of inner) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else buf += ch;
  }
  if (buf) parts.push(buf);

  const clauses = [];
  for (const part of parts) {
    const dot = part.indexOf('.');
    if (dot === -1) continue;
    const clause = term(part.slice(0, dot), part.slice(dot + 1), values);
    if (clause) clauses.push(clause);
  }
  return clauses.length ? `(${clauses.join(' or ')})` : null;
}

/** Translate a subset of PostgREST query params into SQL. */
function buildFilters(params, values) {
  const clauses = [];
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
    if (key === 'or') {
      const clause = orClause(raw, values);
      if (clause) clauses.push(clause);
      continue;
    }
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
        const jsonCols = await jsonColumns(c, table);
        for (const row of rows) {
          const keys = Object.keys(row);
          const vals = keys.map((k) => encodeForColumn(row[k], k, jsonCols));
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
      await asUser(userId, async (c) => {
        const jsonCols = await jsonColumns(c, table);
        const values = [];
        const sets = Object.entries(body).map(([k, v]) => {
          values.push(encodeForColumn(v, k, jsonCols));
          return `"${k}" = $${values.length}`;
        });
        const where = buildFilters(params, values);
        let sql = `update public."${table}" set ${sets.join(', ')}`;
        if (where.length) sql += ` where ${where.join(' and ')}`;
        await c.query(sql, values);
      });
      return json(res, 204, null);
    }

    return json(res, 405, { message: 'method not allowed' });
  } catch (e) {
    console.error('[rest]', req.method, table, e.message);
    return json(res, 400, { message: e.message, code: e.code ?? '', details: '', hint: '' });
  }
}


/* ------------------------------------------------------------------ storage */

function objectFile(bucket, path) {
  return join(STORE, bucket, path);
}

/**
 * storage-js sends a File/Blob as multipart/form-data. Only one part is ever
 * needed here, so this pulls out the first file part rather than implementing
 * RFC 7578.
 */
function multipartFile(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
  if (!boundaryMatch) return { bytes: buffer, type: contentType ?? 'application/octet-stream' };
  const boundary = Buffer.from(`--${boundaryMatch[1] ?? boundaryMatch[2]}`);

  let cursor = buffer.indexOf(boundary);
  while (cursor !== -1) {
    const headerStart = cursor + boundary.length + 2;
    const headerEnd = buffer.indexOf('\r\n\r\n', headerStart);
    if (headerEnd === -1) break;
    const headers = buffer.slice(headerStart, headerEnd).toString('utf8');
    const next = buffer.indexOf(boundary, headerEnd);
    if (next === -1) break;

    if (/filename=/i.test(headers)) {
      const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(headers);
      return {
        // -2 drops the CRLF that precedes the next boundary.
        bytes: buffer.slice(headerEnd + 4, next - 2),
        type: (typeMatch?.[1] ?? 'application/octet-stream').trim(),
      };
    }
    cursor = next;
  }
  return { bytes: buffer, type: contentType ?? 'application/octet-stream' };
}

/**
 * Upload. The row goes into the REAL storage.objects table as the REAL user, so
 * "quarantine insert own scope" is what decides - an upload into another
 * family's prefix fails here exactly as it would in production. Bytes are only
 * written after the database has accepted the row.
 */
async function storageUpload(res, userId, bucket, path, buffer, contentType) {
  if (!userId || userId === SERVICE) return json(res, 401, { message: 'unauthorized' });
  const { bytes, type } = multipartFile(buffer, contentType);

  try {
    await asUser(userId, (c) =>
      c.query(
        `insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
         values ($1, $2, $3::uuid, $3, jsonb_build_object('size', $4::bigint, 'mimetype', $5::text))`,
        [bucket, path, userId, bytes.length, type],
      ),
    );
  } catch (e) {
    const denied = e.code === '42501';
    return json(res, denied ? 403 : 400, {
      statusCode: denied ? '403' : '400',
      error: denied ? 'Unauthorized' : 'BadRequest',
      message: e.message,
    });
  }

  const file = objectFile(bucket, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);

  return json(res, 200, { Key: `${bucket}/${path}`, Id: randomUUID(), path });
}

/**
 * Can this user read these bytes? Asked of the database, never decided here.
 * The SELECT policy from migration 0060 joins the object to its documents row,
 * so a pending or infected file simply is not visible and gets no signature.
 */
async function canRead(userId, bucket, path) {
  const out = await asUser(userId, (c) =>
    c.query('select 1 from storage.objects where bucket_id = $1 and name = $2', [bucket, path]),
  );
  return out.rowCount > 0;
}

/**
 * storage-js builds the final URL as `${storageUrl}${signedURL}`, and its
 * storageUrl already ends in /storage/v1 - so this must NOT repeat that prefix.
 */
function sign(bucket, path, expiresIn) {
  const token = randomBytes(24).toString('hex');
  signatures.set(token, { bucket, path, expiresAt: Date.now() + expiresIn * 1000 });
  return `/object/sign/${bucket}/${path}?token=${token}`;
}

async function storageSignOne(res, userId, bucket, path, expiresIn) {
  if (!userId) return json(res, 401, { message: 'unauthorized' });
  if (!(await canRead(userId, bucket, path))) {
    return json(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
  }
  return json(res, 200, { signedURL: sign(bucket, path, expiresIn) });
}

async function storageSignMany(res, userId, bucket, paths, expiresIn) {
  if (!userId) return json(res, 401, { message: 'unauthorized' });
  const out = [];
  for (const path of paths) {
    const allowed = await canRead(userId, bucket, path);
    out.push(
      allowed
        ? { error: null, path, signedURL: sign(bucket, path, expiresIn) }
        : { error: 'Object not found', path, signedURL: null },
    );
  }
  return json(res, 200, out);
}

/** Following a signed URL. No session required - that is what "signed" means. */
function storageDownload(res, bucket, path, token) {
  const record = signatures.get(token ?? '');
  if (!record || record.bucket !== bucket || record.path !== path) {
    return json(res, 400, { message: 'Invalid signature' });
  }
  if (Date.now() > record.expiresAt) {
    signatures.delete(token);
    return json(res, 400, { message: 'Expired signature' });
  }
  const file = objectFile(bucket, path);
  if (!existsSync(file)) return json(res, 404, { message: 'Object not found' });

  const bytes = readFileSync(file);
  res.writeHead(200, {
    'content-type': 'application/octet-stream',
    'content-length': bytes.length,
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  });
  res.end(bytes);
}

/**
 * Remove. The local shim carries managed Supabase's protect_delete trigger,
 * which refuses every direct SQL delete from storage.objects - that is how the
 * platform forces removal through the Storage API so the file itself is really
 * deleted. So permission is established the only way it can be: attempt the
 * delete as the user and read what comes back.
 *
 *   trigger raised  -> RLS let the row through, the user MAY delete it
 *   0 rows affected -> RLS filtered it out, the user may NOT
 *
 * Only then is the row removed the way the real storage service would, with
 * triggers suppressed.
 */
async function storageRemove(res, userId, bucket, paths) {
  if (!userId) return json(res, 401, { message: 'unauthorized' });
  const removed = [];

  for (const path of paths) {
    let permitted = false;
    try {
      const out = await asUser(userId, (c) =>
        c.query('delete from storage.objects where bucket_id = $1 and name = $2', [bucket, path]),
      );
      permitted = out.rowCount > 0;
    } catch (e) {
      permitted = e.code === '42501' && /Storage API/.test(e.message);
      if (!permitted) continue;
    }
    if (!permitted) continue;

    await asAdmin(async (c) => {
      await c.query("set session_replication_role = 'replica'");
      await c.query('delete from storage.objects where bucket_id = $1 and name = $2', [bucket, path]);
      await c.query("set session_replication_role = 'origin'");
    });
    rmSync(objectFile(bucket, path), { force: true });
    removed.push({ bucket_id: bucket, name: path });
  }

  return json(res, 200, removed);
}

/* ------------------------------------------------------------------- server */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') return json(res, 204, null);

  const isStorage = url.pathname.startsWith('/storage/v1/');

  let body = null;
  let raw = Buffer.alloc(0);
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    raw = Buffer.concat(chunks);
    // Upload bodies are bytes. Parsing them as UTF-8 JSON would corrupt every
    // photo that happens not to be valid UTF-8, which is all of them.
    const looksJson = (req.headers['content-type'] ?? '').includes('json');
    if (!isStorage || looksJson) {
      const text = raw.toString('utf8');
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }
    }
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

    /* ------------------------------------------------------------ storage */
    if (isStorage) {
      const userId = bearer(req);
      const rest = url.pathname.replace('/storage/v1/', '');

      // POST /object/sign/<bucket>            -> many
      // POST /object/sign/<bucket>/<path>     -> one
      // GET  /object/sign/<bucket>/<path>?token=...
      if (rest.startsWith('object/sign/')) {
        const [bucket, ...segments] = rest.replace('object/sign/', '').split('/');
        const path = segments.join('/');

        if (req.method === 'GET') return storageDownload(res, bucket, path, url.searchParams.get('token'));

        const expiresIn = Number(body?.expiresIn ?? 60);
        if (Array.isArray(body?.paths)) return storageSignMany(res, userId, bucket, body.paths, expiresIn);
        return storageSignOne(res, userId, bucket, path, expiresIn);
      }

      if (rest.startsWith('object/')) {
        const [bucket, ...segments] = rest.replace('object/', '').split('/');
        const path = segments.join('/');

        if (req.method === 'POST' || req.method === 'PUT') {
          return storageUpload(res, userId, bucket, path, raw, req.headers['content-type']);
        }
        if (req.method === 'DELETE') {
          const paths = Array.isArray(body?.prefixes) ? body.prefixes : path ? [path] : [];
          return storageRemove(res, userId, bucket, paths);
        }
        if (req.method === 'GET') {
          // Authenticated read straight from the API, still policy-gated.
          if (!userId || !(await canRead(userId, bucket, path))) {
            return json(res, 404, { message: 'Object not found' });
          }
          const file = objectFile(bucket, path);
          if (!existsSync(file)) return json(res, 404, { message: 'Object not found' });
          const bytes = readFileSync(file);
          res.writeHead(200, {
            'content-type': 'application/octet-stream',
            'content-length': bytes.length,
            'access-control-allow-origin': '*',
          });
          return res.end(bytes);
        }
      }

      return json(res, 404, { message: 'not found' });
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
        // A function returning TABLE(...) is a set, and PostgREST answers with
        // an array of row objects. Calling it in the select list instead would
        // hand back a composite rendered as a string, which the client cannot
        // read - so ask the catalog which shape this one is.
        const setReturning = await returnsSet(fn);
        const out = await asUser(userId, (c) =>
          setReturning
            ? c.query(`select * from public.${fn}(${args})`, values)
            : c.query(`select public.${fn}(${args}) as result`, values),
        );
        return json(res, 200, setReturning ? out.rows : (out.rows[0]?.result ?? null));
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
