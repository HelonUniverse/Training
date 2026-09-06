import type { Database } from '@/types/database.generated';

/**
 * Who can see this, said in words a parent uses.
 *
 * The database vocabulary (family_private, academic_shared, evaluator_shared,
 * ...) is precise and belongs in the schema. It is not language anybody outside
 * this codebase speaks, and it must never reach a screen. Everything the UI
 * shows about visibility comes through here.
 *
 * The options offered are also filtered by what the caller can actually grant.
 * Showing a parent "Share with my program" when they belong to no program, or
 * offering an evaluator option with no evaluator, teaches people that our
 * controls are decorative.
 */

export type DocumentVisibility = NonNullable<
  Database['public']['Functions']['register_document']['Args']['p_visibility']
>;

/** i18n keys, never the enum label itself. */
export const VISIBILITY_LABEL: Record<DocumentVisibility, string> = {
  family_private: 'visibility.familyPrivate',
  family_shared: 'visibility.familyShared',
  academic_shared: 'visibility.academicShared',
  assigned_staff: 'visibility.assignedStaff',
  evaluator_shared: 'visibility.evaluatorShared',
  organization_operational: 'visibility.organizationOperational',
  system_compliance: 'visibility.systemCompliance',
};

export const VISIBILITY_DESCRIPTION: Record<DocumentVisibility, string> = {
  family_private: 'visibility.familyPrivateHelp',
  family_shared: 'visibility.familySharedHelp',
  academic_shared: 'visibility.academicSharedHelp',
  assigned_staff: 'visibility.assignedStaffHelp',
  evaluator_shared: 'visibility.evaluatorSharedHelp',
  organization_operational: 'visibility.organizationOperationalHelp',
  system_compliance: 'visibility.systemComplianceHelp',
};

export type SharingContext = {
  /** Does the caller hold document.share on this student? */
  canShare: boolean;
  /** Is the student enrolled with an organization the caller can share into? */
  hasOrganization: boolean;
  /** Are there active evaluator grants for this student? */
  hasEvaluator: boolean;
};

/**
 * The visibility choices to actually offer.
 *
 * Two options are never offered here at all. organization_operational belongs
 * to an organization's own paperwork, not to a family's upload, and
 * system_compliance is set by the compliance flow rather than chosen. Offering
 * either would be offering something the person cannot meaningfully pick.
 */
export function availableVisibilities(context: SharingContext): DocumentVisibility[] {
  const options: DocumentVisibility[] = ['family_private', 'family_shared'];
  if (!context.canShare) return options;
  if (context.hasOrganization) options.push('academic_shared', 'assigned_staff');
  if (context.hasEvaluator) options.push('evaluator_shared');
  return options;
}

/** Scan states, in words, with the tone the badge should use. */
export type ScanStatus = NonNullable<
  Database['public']['Tables']['documents']['Row']['scan_status']
>;

export const SCAN_LABEL: Record<ScanStatus, { key: string; tone: 'neutral' | 'positive' | 'attention' | 'critical' }> = {
  pending: { key: 'scan.pending', tone: 'attention' },
  clean: { key: 'scan.clean', tone: 'positive' },
  infected: { key: 'scan.infected', tone: 'critical' },
  error: { key: 'scan.error', tone: 'critical' },
  skipped: { key: 'scan.skipped', tone: 'neutral' },
};

/** Only a clean file can be opened. Everything else has something to say first. */
export function isViewable(status: ScanStatus): boolean {
  return status === 'clean';
}
