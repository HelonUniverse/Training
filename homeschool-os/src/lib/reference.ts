/**
 * Reference data for onboarding.
 *
 * States and counties are static lists rather than database tables: they change
 * essentially never, and a network round trip to fill a dropdown during
 * onboarding is exactly the kind of friction STEP 3 is meant to remove.
 * The values written to the database are the two-letter code and the county
 * name, matching students.state_code / students.county.
 */

export const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
  ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
  ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
  ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

export const stateOptions = US_STATES.map(([value, label]) => ({ value, label }));

/** Florida's 67 counties. Other states fall back to free entry for now. */
export const FLORIDA_COUNTIES = [
  'Alachua', 'Baker', 'Bay', 'Bradford', 'Brevard', 'Broward', 'Calhoun', 'Charlotte',
  'Citrus', 'Clay', 'Collier', 'Columbia', 'DeSoto', 'Dixie', 'Duval', 'Escambia',
  'Flagler', 'Franklin', 'Gadsden', 'Gilchrist', 'Glades', 'Gulf', 'Hamilton', 'Hardee',
  'Hendry', 'Hernando', 'Highlands', 'Hillsborough', 'Holmes', 'Indian River', 'Jackson',
  'Jefferson', 'Lafayette', 'Lake', 'Lee', 'Leon', 'Levy', 'Liberty', 'Madison',
  'Manatee', 'Marion', 'Martin', 'Miami-Dade', 'Monroe', 'Nassau', 'Okaloosa',
  'Okeechobee', 'Orange', 'Osceola', 'Palm Beach', 'Pasco', 'Pinellas', 'Polk',
  'Putnam', 'St. Johns', 'St. Lucie', 'Santa Rosa', 'Sarasota', 'Seminole', 'Sumter',
  'Suwannee', 'Taylor', 'Union', 'Volusia', 'Wakulla', 'Walton', 'Washington',
] as const;

export const COUNTIES_BY_STATE: Record<string, readonly string[]> = {
  FL: FLORIDA_COUNTIES,
};

export function countyOptions(stateCode: string) {
  return (COUNTIES_BY_STATE[stateCode] ?? []).map((c) => ({ value: c, label: c }));
}

export function hasCountyList(stateCode: string) {
  return (COUNTIES_BY_STATE[stateCode]?.length ?? 0) > 0;
}

/* ------------------------------------------------------------------ subjects */

/** Slugs match public.subjects.slug for the system-seeded rows. */
export const CORE_SUBJECTS = ['math', 'reading', 'writing', 'science', 'social_studies'] as const;
export const OPTIONAL_SUBJECTS = [
  'art', 'music', 'physical_education', 'foreign_language', 'technology', 'life_skills', 'other',
] as const;
export const ALL_SUBJECTS = [...CORE_SUBJECTS, ...OPTIONAL_SUBJECTS];
export type SubjectSlug = (typeof ALL_SUBJECTS)[number];

/* -------------------------------------------------------------------- goals */

export const PARENT_GOALS = [
  'organized', 'portfolio', 'lessons', 'progress', 'records', 'evaluation', 'attention',
] as const;
export type ParentGoal = (typeof PARENT_GOALS)[number];

/* -------------------------------------------------------- organization data */

export const ORG_TYPES = [
  'support_program', 'microschool', 'learning_pod', 'tutoring', 'hybrid', 'enrichment', 'other',
] as const;
export type OrgTypeSlug = (typeof ORG_TYPES)[number];

/**
 * The onboarding question is a product-personalization signal, NOT a legal
 * classification. app.organization_type is a narrower vocabulary, so these map
 * down to it deliberately - see mapOrgTypeToSchema.
 */
export function mapOrgTypeToSchema(slug: OrgTypeSlug): 'microschool' | 'coop' | 'tutoring' | 'other' {
  switch (slug) {
    case 'microschool':
      return 'microschool';
    case 'learning_pod':
      return 'coop';
    case 'tutoring':
      return 'tutoring';
    default:
      return 'other';
  }
}

export const ORG_SIZES = ['1-10', '11-25', '26-50', '51-100', '100+'] as const;
export type OrgSize = (typeof ORG_SIZES)[number];

export const ORG_GOALS = [
  'students', 'families', 'teachers', 'classes', 'calendar', 'lessons',
  'portfolio', 'academics', 'records', 'evaluations', 'communication', 'operations',
] as const;
export type OrgGoal = (typeof ORG_GOALS)[number];

/* ------------------------------------------------------------- school years */

/** A US homeschool year is treated as starting in August. */
export function currentSchoolYearStart(today = new Date()): string {
  const year = today.getUTCFullYear();
  const startYear = today.getUTCMonth() >= 7 ? year : year - 1;
  return `${startYear}-08-01`;
}

export function previousSchoolYearStart(today = new Date()): string {
  const current = currentSchoolYearStart(today);
  const year = Number(current.slice(0, 4)) - 1;
  return `${year}-08-01`;
}

export function slugToName(slug: string): string {
  return slug
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
