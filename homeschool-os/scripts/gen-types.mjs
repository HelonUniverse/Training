import { PostgresMeta } from '@supabase/postgres-meta/dist/lib/index.js';
import { getGeneratorMetadata } from '@supabase/postgres-meta/dist/lib/generators.js';
import { generateTypescriptTypes } from '@supabase/postgres-meta/dist/server/format-pool.js';

// Points the Supabase type generator at a local PostgreSQL carrying the same
// schema. See types/README.md for why this exists.
const pgMeta = new PostgresMeta({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:localdev@127.0.0.1:5433/hos_test',
  max: 1,
});

const { data, error } = await getGeneratorMetadata(pgMeta, { includedSchemas: ['public'] });
if (error) { console.error('META ERROR', error); process.exit(1); }

const out = await generateTypescriptTypes(data, {
  detectOneToOneRelationships: true,
  defaultSchema: 'public',
});
process.stdout.write(typeof out === 'string' ? out : String(out));
await pgMeta.end();
process.exit(0);
