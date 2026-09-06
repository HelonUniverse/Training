// Flat ESLint config. Written in STEP 2.5 so the service-role boundary is
// enforced from the first line of application code in STEP 3.
// See docs/architecture/12-service-role-boundary.md.
//
// TWO THINGS WERE WRONG WITH IT UNTIL STEP 4, and they cancelled each other out
// so neatly that nothing ever complained:
//
//   1. eslint itself was never a dependency, and the config named no parser.
//      Run through npx, ESLint parsed .ts files with espree and failed on the
//      first type annotation, so every rule below was inert - including the
//      import restriction whose whole purpose is the service-role boundary.
//   2. The globs matched `app/**` and `components/**`, but this project keeps
//      its code in `src/`. Even with a parser, nothing would have matched.
//      (scripts/check-service-role.sh had the identical bug, found in STEP 2.6.)
//
// The bash guard did hold the boundary throughout, so this was a missing second
// line of defence rather than an open door. Both halves are fixed here.
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

const serviceRoleRestriction = {
  paths: [
    {
      name: '@/lib/supabase/service',
      message:
        'The service-role client bypasses RLS. It is permitted only in supabase/functions/**, ' +
        'app/api/cron/** and app/api/webhooks/**. Use @/lib/supabase/server in ordinary code.',
    },
  ],
  patterns: [
    {
      group: ['**/lib/supabase/service', '**/supabase/service*'],
      message: 'Import the user-scoped client (@/lib/supabase/server) instead.',
    },
  ],
};

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'types/database.generated.ts'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      'no-restricted-imports': ['error', serviceRoleRestriction],
    },
  },
  {
    // Trusted server-side entry points may use the service role.
    files: [
      'supabase/functions/**/*.ts',
      'src/app/api/cron/**/*.ts',
      'src/app/api/webhooks/**/*.ts',
      'src/lib/supabase/service.ts',
      'scripts/**/*.{ts,mjs}',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Client components may not reach server-only modules at all - but "is this
    // a Client Component" is a fact about the FIRST LINE of a file, not about
    // its path, and a flat config cannot see file contents. The rule that used
    // to live here matched every .tsx under app/, which in the App Router is
    // mostly Server Components doing exactly what @/lib/supabase/server is for.
    // Once the config could parse TypeScript at all, it lit up ten of them.
    //
    // That check now lives where it can actually be expressed:
    // scripts/check-service-role.sh greps for 'use client' and then checks the
    // imports of the files that really are client components. It runs in CI as
    // `npm run guard`.
    files: ['src/**/*.tsx'],
    rules: {},
  },
  {
    // Product identity lives in config/brand.ts only.
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/Homeschool OS/]",
          message: 'Use brand.name from @/config/brand instead of a hard-coded product name.',
        },
      ],
    },
  },
  {
    // No state name, statute or deadline outside the compliance packs.
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/server/**/*.ts'],
    ignores: ['src/lib/compliance/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/Fla\\.|Florida Statute|§\\s?1002/]",
          message: 'Legal content belongs in lib/compliance/packs/**, never in application code.',
        },
      ],
    },
  },
];
