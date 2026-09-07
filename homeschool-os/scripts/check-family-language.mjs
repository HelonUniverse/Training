#!/usr/bin/env node
/**
 * Nestra is child-paced. Standards are optional reference maps.
 *
 * The failure mode this guards against is not a bad decision - it is drift. One
 * plausible string ("On track", "Behind") added months from now by someone who
 * never read docs/architecture/17-child-paced-learning.md, and the product is
 * quietly telling a homeschool parent their child is failing against a map the
 * family never agreed to be measured by.
 *
 * So the rule lives here, where the build can fail, instead of only in prose.
 *
 * Scope is deliberately the SHIPPED CATALOGS, not the source. Copy is what a
 * parent reads; a variable called `isBehind` is a naming problem, not this one.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LOCALES = ['en-US', 'es-US'];

/**
 * Each entry is a phrase that makes a claim about a child's standing against an
 * external framework. Wording that describes OUR RECORDS is fine and absent
 * here on purpose: "no learning evidence is linked to this reference" says what
 * we hold, not what the child is.
 */
const BANNED = [
  // English
  [/\brequired standard\b/i,            'a standard is a reference, never a requirement'],
  [/\bmust complete\b/i,                'nothing in a child-paced product must be completed by a date'],
  [/\bgrade[- ]level requirement\b/i,   'grade level is context, not a box'],
  [/\bshould already know\b/i,          'states a deficit from a map the family never chose'],
  [/\bbehind (standard|grade)\b/i,      'a coverage gap is not a deficiency'],
  [/\bon track for\b/i,                 'implies a schedule the child is being measured against'],
  [/\bfalling behind\b/i,               'same'],
  [/\bcatch up\b/i,                     'same'],
  [/\bbelow grade\b/i,                  'same'],
  [/\boff[- ]grade\b/i,                 'asynchronous development across subjects is normal'],
  // Spanish - the same claims, which is the point of checking both catalogs
  [/\best[áa]ndar requerido\b/i,        'a standard is a reference, never a requirement'],
  [/\bdebe completar\b/i,               'nothing must be completed by a date'],
  [/\bpor debajo del (grado|nivel)\b/i, 'a coverage gap is not a deficiency'],
  [/\batrasad[oa]\b/i,                  'states a deficit about a child'],
  [/\bponerse al d[ií]a\b/i,            'same'],
  [/\bya deber[ií]a saber\b/i,          'states a deficit from a map the family never chose'],
];

function flatten(object, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(object)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, `${prefix}${k}.`));
    else out.push([`${prefix}${k}`, String(v)]);
  }
  return out;
}

const problems = [];
for (const locale of LOCALES) {
  const catalog = JSON.parse(readFileSync(join(ROOT, 'messages', `${locale}.json`), 'utf8'));
  for (const [key, value] of flatten(catalog)) {
    for (const [pattern, why] of BANNED) {
      if (pattern.test(value)) problems.push({ locale, key, value, why });
    }
  }
}

if (problems.length > 0) {
  console.error('Family-facing language that measures a child against a standard:\n');
  for (const p of problems) {
    console.error(`  ${p.locale}  ${p.key}`);
    console.error(`    "${p.value}"`);
    console.error(`    ${p.why}\n`);
  }
  console.error('See docs/architecture/17-child-paced-learning.md.');
  console.error('If a regulatory feature genuinely needs this wording, it does not');
  console.error('belong in the family catalogs - raise it rather than widening this list.');
  process.exit(1);
}

console.log(`family language: ok (${LOCALES.length} catalogs)`);
