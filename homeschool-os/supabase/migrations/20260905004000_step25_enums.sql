-- =============================================================================
-- 0038  STEP 2.5 - enum types for resource-scoped authorization
-- =============================================================================
-- Isolated in its own migration because `alter type ... add value` cannot be
-- used in the same transaction that adds it, and the Supabase CLI wraps each
-- migration file in a transaction.
-- =============================================================================

-- What is being acted on. Deliberately a CLOSED list: a new resource is a
-- migration plus a row in app.capabilities, not a runtime string.
create type app.resource_type as enum (
  'student_profile',
  'academic_record',        -- lessons, enrolment-linked academic context
  'portfolio',
  'activity_log',
  'reading_log',
  'assignment',
  'assessment',
  'skill',
  'learning_plan',
  'attendance',
  'calendar',
  'teacher_note',           -- notes visible to family or staff
  'teacher_note_private',   -- notes private to their author
  'document',
  'compliance',
  'compliance_submission',
  'evaluation',
  'evaluator_review',
  'consent',
  'guardian',
  'access_grant',
  'organization_enrollment',
  'communication',
  'report',
  'incident',
  'audit'
);

create type app.resource_action as enum (
  'read', 'create', 'update', 'delete', 'approve', 'sign', 'submit', 'share', 'export'
);

-- How a user is related to a student. This is the ONLY input to the capability
-- matrix, which keeps authorization explicit and enumerable.
create type app.relationship_kind as enum (
  'student_self',
  'guardian_full',
  'guardian_standard',
  'guardian_view_only',
  'staff_assigned_read',
  'staff_assigned_write',
  'class_staff',            -- derived from co-membership of a class
  'org_admin',
  'grant_evaluator',
  'grant_provider',
  'grant_review',
  'grant_transfer',
  'platform_support'
);

-- Explicit document visibility. Replaces the free-text check constraint.
create type app.document_visibility as enum (
  'family_private',          -- uploader + full guardians only
  'family_shared',           -- everyone in the family
  'academic_shared',         -- family + staff with academic access to the student
  'assigned_staff',          -- family + explicitly assigned staff (not class staff)
  'evaluator_shared',        -- family + evaluators holding an active document-scoped grant
  'organization_operational',-- organization only; not the family unless explicitly shared
  'system_compliance'        -- compliance artefacts: family + platform
);

-- New audit actions for STEP 2.5 (sharing is an auditable event).
alter type app.audit_action add value if not exists 'document_shared';
alter type app.audit_action add value if not exists 'document_unshared';
alter type app.audit_action add value if not exists 'document_visibility_changed';
alter type app.audit_action add value if not exists 'authorization_denied';
