/**
 * The five things a family actually captures.
 *
 * One list, used by the "Add something" chooser, by the capture screens, and by
 * the tests, so a kind cannot exist in one place and not another.
 *
 * Every kind is a CHOICE THE PERSON MAKES. Nothing here is inferred from a file
 * and nothing is guessed from a filename: the screen asks, and the answer is
 * what gets stored. Smart Intake is a later step, and until it exists the UI
 * says so rather than implying an analysis happened.
 */

export const CAPTURE_KINDS = ['schoolwork', 'project', 'activity', 'book', 'document'] as const;
export type CaptureKind = (typeof CAPTURE_KINDS)[number];

export function isCaptureKind(value: string): value is CaptureKind {
  return (CAPTURE_KINDS as readonly string[]).includes(value);
}

export type FieldName =
  | 'subject'
  | 'description'
  | 'minutes'
  | 'author'
  | 'pages'
  | 'readingType'
  | 'activityKind'
  | 'category';

export type KindSpec = {
  icon: string;
  /** Files are the point of some flows and optional in others. */
  filesRequired: boolean;
  fields: FieldName[];
};

export const KIND_SPEC: Record<CaptureKind, KindSpec> = {
  schoolwork: {
    icon: '✎',
    filesRequired: true,
    fields: ['subject', 'description'],
  },
  project: {
    icon: '◆',
    filesRequired: true,
    fields: ['subject', 'description'],
  },
  activity: {
    // A trip to the springs is worth recording whether or not anyone
    // remembered to take a photo.
    icon: '☀',
    filesRequired: false,
    fields: ['activityKind', 'minutes', 'subject', 'description'],
  },
  book: {
    icon: '❧',
    filesRequired: false,
    fields: ['author', 'readingType', 'minutes', 'pages', 'description'],
  },
  document: {
    icon: '❐',
    filesRequired: true,
    fields: ['category', 'description'],
  },
};

export const ACTIVITY_KINDS = [
  'field_trip',
  'hands_on',
  'art',
  'music',
  'physical',
  'life_skills',
  'community',
  'experiment',
  'educational_game',
  'other',
] as const;

export const READING_TYPES = ['independent', 'read_aloud', 'shared', 'audiobook'] as const;

/**
 * Document categories a parent would actually pick. The full enum includes
 * organization paperwork (contracts, HR records, incidents) that belongs to an
 * organization's own filing, not to a family's upload.
 */
export const FAMILY_DOCUMENT_CATEGORIES = [
  'worksheet',
  'student_work',
  'assessment',
  'evaluation',
  'certificate',
  'report',
  'correspondence',
  'notice_of_intent',
  'receipt',
  'other',
] as const;
