// Flat ESLint config. Written in STEP 2.5 so the service-role boundary is
// enforced from the first line of application code in STEP 3.
// See docs/architecture/12-service-role-boundary.md.

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
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', serviceRoleRestriction],
    },
  },
  {
    // Trusted server-side entry points may use the service role.
    files: [
      'supabase/functions/**/*.ts',
      'app/api/cron/**/*.ts',
      'app/api/webhooks/**/*.ts',
      'lib/supabase/service.ts',
      'scripts/**/*.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Client components may not reach server-only modules at all.
    files: ['components/**/*.tsx', 'app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          ...serviceRoleRestriction,
          patterns: [
            ...serviceRoleRestriction.patterns,
            {
              group: ['**/lib/supabase/server', '**/server/actions/**'],
              message:
                'Client components must receive data as props from a Server Component, ' +
                'or call a server action passed to them - never import the server client.',
            },
          ],
        },
      ],
    },
  },
  {
    // Product identity lives in config/brand.ts only.
    files: ['app/**/*.tsx', 'components/**/*.tsx'],
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
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'server/**/*.ts'],
    ignores: ['lib/compliance/**'],
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
