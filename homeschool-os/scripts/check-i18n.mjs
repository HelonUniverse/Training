#!/usr/bin/env node
/**
 * Every translation key a screen asks for must exist, in BOTH locales.
 *
 * next-intl throws at render time for a missing key, which means the way you
 * normally find one is by opening the page - in the locale you don't speak.
 * This walks the source instead: it pairs each getTranslations/useTranslations
 * namespace with the t('...') calls in that file and checks the resulting keys
 * against both catalogs.
 *
 * Template literals (t(`kind.${x}`)) are checked by their static prefix: the
 * value is unknown here, but a typo in the prefix is still caught.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const LOCALES = ['en-US', 'es-US'];

const catalogs = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(join(ROOT, 'messages', `${l}.json`), 'utf8'))]),
);

function flatten(object, prefix = '') {
  const keys = new Set();
  for (const [k, v] of Object.entries(object)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const nested of flatten(v, `${prefix}${k}.`)) keys.add(nested);
    } else {
      keys.add(`${prefix}${k}`);
    }
  }
  return keys;
}

const flat = Object.fromEntries(LOCALES.map((l) => [l, flatten(catalogs[l])]));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const problems = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');

  // const t = useTranslations('ns')  /  const t = await getTranslations('ns')
  const namespaces = new Map();
  const declaration = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*'([^']+)'\s*\)/g;
  for (const match of source.matchAll(declaration)) namespaces.set(match[1], match[2]);
  if (namespaces.size === 0) continue;

  const alternatives = Array.from(namespaces.keys()).join('|');

  // t('literal.key')
  for (const match of source.matchAll(new RegExp(`\\b(${alternatives})\\(\\s*'([^']+)'`, 'g'))) {
    const key = `${namespaces.get(match[1])}.${match[2]}`;
    for (const locale of LOCALES) {
      if (!flat[locale].has(key)) {
        problems.push(`${relative(ROOT, file)}: missing ${locale} key  ${key}`);
      }
    }
  }

  // t(`prefix.${expr}`) - only the static prefix can be checked
  for (const match of source.matchAll(new RegExp(`\\b(${alternatives})\\(\\s*\`([^\`$]*)\\$\\{`, 'g'))) {
    const prefix = `${namespaces.get(match[1])}.${match[2]}`;
    for (const locale of LOCALES) {
      const found = Array.from(flat[locale]).some((k) => k.startsWith(prefix));
      if (!found) {
        problems.push(`${relative(ROOT, file)}: no ${locale} keys under  ${prefix}*`);
      }
    }
  }
}

// The two catalogs must also agree with each other.
for (const key of flat['en-US']) {
  if (!flat['es-US'].has(key)) problems.push(`messages: es-US is missing  ${key}`);
}
for (const key of flat['es-US']) {
  if (!flat['en-US'].has(key)) problems.push(`messages: en-US is missing  ${key}`);
}

const unique = Array.from(new Set(problems));
if (unique.length > 0) {
  console.error(`FAIL: ${unique.length} translation problem(s)`);
  for (const p of unique) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`i18n ok - ${flat['en-US'].size} keys, both locales, all references resolve`);
