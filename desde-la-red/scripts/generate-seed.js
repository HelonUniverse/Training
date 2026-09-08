/* eslint-disable */
/**
 * Genera el SQL de contenido inicial a partir de los datos que ya usa la app.
 *
 * Compila los módulos de `src/data` a JavaScript y lee de ahí, en vez de
 * transcribir el contenido a mano: así la base de datos y la app arrancan
 * diciendo exactamente lo mismo.
 *
 *   node scripts/generate-seed.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'supabase', 'migrations', '0002_seed.sql');

// --- SQL helpers -----------------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined ? 'null' : Number(v));
const b = (v) => (v ? 'true' : 'false');
const arr = (v) => (!v || !v.length ? `'{}'` : `array[${v.map(q).join(', ')}]`);
const json = (v) => `${q(JSON.stringify(v))}::jsonb`;

const insert = (table, cols, rows) => {
  if (!rows.length) return '';
  const values = rows.map((r) => `  (${r.join(', ')})`).join(',\n');
  return `insert into public.${table} (${cols.join(', ')}) values\n${values}\non conflict (id) do nothing;\n\n`;
};

function compileData() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dlr-seed-'));
  // Un tsconfig propio: hace falta el alias "@/" y no queremos arrastrar la
  // configuración de la app (que compila también las pantallas).
  const cfgPath = path.join(ROOT, 'tsconfig.seed.json');
  fs.writeFileSync(
    cfgPath,
    JSON.stringify(
      {
        compilerOptions: {
          outDir: tmp,
          rootDir: '.',
          module: 'commonjs',
          target: 'es2020',
          moduleResolution: 'bundler',
          skipLibCheck: true,
          noEmitOnError: false,
          paths: { '@/*': ['./src/*'] },
        },
        files: [
          'src/data/types.ts',
          'src/data/guides.ts',
          'src/data/teachings.ts',
          'src/data/community.ts',
        ],
      },
      null,
      2,
    ),
  );

  try {
    execFileSync(path.join(ROOT, 'node_modules', '.bin', 'tsc'), ['-p', cfgPath], {
      stdio: 'inherit',
    });
  } catch {
    // Los errores de tipos no impiden la emisión; si faltara un archivo,
    // el require de abajo falla con un mensaje claro.
  } finally {
    fs.rmSync(cfgPath, { force: true });
  }

  const base = path.join(tmp, 'src', 'data');
  const dir = fs.existsSync(base) ? base : tmp;
  return {
    guides: require(path.join(dir, 'guides.js')),
    teachings: require(path.join(dir, 'teachings.js')),
    community: require(path.join(dir, 'community.js')),
  };
}

function main() {
  const { guides, teachings, community } = compileData();

  let sql = `-- ============================================================================
-- Contenido inicial de Desde la Red.
--
-- Generado por scripts/generate-seed.js a partir de src/data, para que la base
-- de datos y la app digan lo mismo. Es contenido de muestra: las guías y las
-- enseñanzas se sustituyen por las reales desde el panel de administración.
--
-- Se puede volver a correr sin duplicar nada (on conflict do nothing).
-- ============================================================================

`;

  sql += insert(
    'guides',
    ['id', 'name', 'title', 'location', 'initials', 'accent', 'years', 'circle_count',
     'rating', 'bio', 'approach', 'languages', 'verified', 'sort_order'],
    guides.guides.map((g, i) => [
      q(g.id), q(g.name), q(g.title), q(g.location), q(g.initials), q(g.accent),
      n(g.years), n(g.circleCount), n(g.rating), q(g.bio),
      arr(g.approach), arr(g.languages), b(g.verified), n(i),
    ]),
  );

  sql += insert(
    'teachings',
    ['id', 'title', 'subtitle', 'theme', 'image_key', 'author_id', 'read_minutes',
     'listen_minutes', 'published_on', 'excerpt', 'body', 'tags', 'featured', 'sort_order'],
    teachings.teachings.map((t, i) => [
      q(t.id), q(t.title), q(t.subtitle), q(t.theme), q(t.image), q(t.authorId),
      n(t.readMinutes), n(t.listenMinutes), q(t.publishedOn), q(t.excerpt),
      json(t.body), arr(t.tags), b(t.featured), n(i),
    ]),
  );

  sql += insert(
    'services',
    ['id', 'guide_id', 'name', 'format', 'modality', 'duration_minutes', 'price',
     'currency', 'description', 'includes', 'sort_order'],
    guides.services.map((s, i) => [
      q(s.id), q(s.guideId), q(s.name), q(s.format), q(s.modality),
      n(s.durationMinutes), n(s.price), q(s.currency), q(s.description),
      arr(s.includes), n(i),
    ]),
  );

  sql += insert(
    'circles',
    ['id', 'name', 'image_key', 'guide_id', 'members', 'cadence', 'intention', 'topics', 'sort_order'],
    community.circles.map((c, i) => [
      q(c.id), q(c.name), q(c.image), q(c.guideId), n(c.members),
      q(c.cadence), q(c.intention), arr(c.topics), n(i),
    ]),
  );

  sql += insert(
    'live_events',
    ['id', 'title', 'guide_id', 'image_key', 'starts_label', 'duration_minutes',
     'attendees', 'status', 'description', 'sort_order'],
    community.liveEvents.map((e, i) => [
      q(e.id), q(e.title), q(e.guideId), q(e.image), q(e.startsAt),
      n(e.durationMinutes), n(e.attendees), q(e.status), q(e.description), n(i),
    ]),
  );

  sql += insert(
    'path_questions',
    ['id', 'prompt', 'helper', 'multiple', 'options', 'sort_order'],
    community.pathQuestions.map((p, i) => [
      q(p.id), q(p.prompt), q(p.helper), b(p.multiple), json(p.options), n(i),
    ]),
  );

  // Las voces llevan id generado, así que se siembran por texto para no duplicar.
  const circleByName = new Map(community.circles.map((c) => [c.name, c.id]));
  const posts = community.networkPosts.map((p) => {
    const cid = p.circleName ? circleByName.get(p.circleName) : null;
    return `  (${[
      q(p.authorName), q(p.role), q(p.accent), q(p.text),
      cid ? q(cid) : 'null', n(p.replies), n(p.resonances),
    ].join(', ')})`;
  });
  sql += `insert into public.posts (author_name, author_role, accent, text, circle_id, replies, base_resonances)
select * from (values
${posts.join(',\n')}
) as v(author_name, author_role, accent, text, circle_id, replies, base_resonances)
where not exists (select 1 from public.posts p where p.text = v.text);
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, sql);

  console.log(`  ✓ ${path.relative(ROOT, OUT)}`);
  console.log(`    ${guides.guides.length} guías · ${teachings.teachings.length} enseñanzas · ` +
              `${guides.services.length} servicios · ${community.circles.length} círculos · ` +
              `${community.liveEvents.length} eventos · ${community.networkPosts.length} voces`);
}

main();
