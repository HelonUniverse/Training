#!/usr/bin/env node
/**
 * Junta las migraciones en un solo archivo, para poder instalar la base de
 * datos con un único pegado en el SQL Editor de Supabase en vez de tres.
 *
 * Las migraciones siguen siendo la fuente: esto solo las concatena en orden.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'supabase', 'migrations');
const out = path.join(__dirname, '..', 'supabase', 'instalar.sql');

const header = `-- ============================================================================
-- DESDE LA RED — instalación completa, de una sola vez.
--
-- Pega este archivo entero en el SQL Editor de Supabase y dale a RUN. Trae
-- dentro las migraciones en orden, y se puede correr dos veces sin romper
-- nada ni duplicar contenido.
--
-- Al terminar tendrás: las tablas, los permisos por fila, el contenido
-- inicial de la Red, y el disparador que crea el perfil de cada persona al
-- registrarse.
--
-- Generado por scripts/build-install-sql.js — no lo edites a mano.
-- ============================================================================
`;

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const body = files
  .map((f) => `\n\n-- ======================= ${f} =======================\n\n${fs.readFileSync(path.join(dir, f), 'utf8')}`)
  .join('');

fs.writeFileSync(out, header + body);
console.log(`  ✓ supabase/instalar.sql — ${files.length} migraciones, ${(header + body).split('\n').length} líneas`);
