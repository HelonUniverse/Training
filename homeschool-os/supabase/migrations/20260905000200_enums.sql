-- =============================================================================
-- 0002  Enum types
-- =============================================================================
-- Every controlled vocabulary is a Postgres enum so a typo is a migration error
-- rather than a runtime bug. Enum ORDER IS SIGNIFICANT for app.access_level and
-- app.mastery_level (they are compared with < and >).
-- =============================================================================

-- --- access & identity -------------------------------------------------------
create type app.access_level as enum ('none', 'read', 'write', 'admin');
create type app.org_role     as enum ('org_admin', 'teacher', 'tutor', 'staff', 'evaluator');
create type app.member_status as enum ('invited', 'active', 'suspended', 'removed');
create type app.guardian_access_level as enum ('view_only', 'standard', 'full');
create type app.family_member_role as enum ('guardian', 'adult', 'student');
create type app.staff_assignment_role as enum ('teacher', 'tutor', 'specialist', 'case_manager');
create type app.access_grant_kind as enum ('evaluation', 'review', 'transfer', 'support', 'provider');
create type app.grant_status as enum ('pending', 'active', 'revoked', 'expired');

-- --- organizations -----------------------------------------------------------
create type app.organization_type as enum (
  'microschool', 'support_program', 'coop', 'tutoring', 'evaluation_practice', 'other');
create type app.membership_status as enum ('pending', 'active', 'paused', 'ended', 'declined');
create type app.enrollment_type as enum (
  'full_time', 'part_time', 'program', 'tutoring', 'evaluation_only', 'umbrella', 'other');

-- --- record ownership (family vs organization) -------------------------------
create type app.record_class as enum (
  'student_educational',        -- family owns; travels with the student forever
  'organization_operational',   -- organization owns; does not travel with the family
  'shared',                     -- both retain access
  'platform');                  -- platform-internal (audit, jobs, usage)

-- --- students ----------------------------------------------------------------
create type app.student_status as enum ('active', 'inactive', 'graduated', 'withdrawn');

-- --- consent -----------------------------------------------------------------
create type app.consent_type as enum (
  'guardian_relationship', 'student_account', 'ai_document_processing', 'ai_academic_analysis',
  'evaluator_access', 'provider_access', 'photo_media_use', 'communication',
  'organization_data_sharing', 'electronic_signature', 'directory_listing', 'research_participation');
create type app.consent_method as enum (
  'web_checkbox', 'web_signature', 'uploaded_document', 'verbal_recorded', 'email_confirmation', 'import');

-- --- provenance --------------------------------------------------------------
create type app.source_type as enum (
  'parent', 'teacher', 'tutor', 'evaluator', 'student', 'org_admin',
  'assessment', 'portfolio_evidence', 'assignment', 'observation',
  'document_extraction', 'ai_suggestion', 'system_calculation', 'import', 'manual');

-- --- academics ---------------------------------------------------------------
create type app.mastery_level as enum (
  'not_started', 'introduced', 'developing', 'progressing', 'proficient', 'mastered');
create type app.confidence_level as enum (
  'ai_suggested', 'self_reported', 'parent_reported', 'teacher_observed', 'assessment_confirmed');
create type app.skill_framework as enum ('internal', 'state_standard', 'common_core', 'custom');
create type app.class_type as enum ('class', 'pod', 'group', 'program', 'club', 'tutoring_group');
create type app.class_staff_role as enum ('lead', 'assistant', 'substitute', 'observer');
create type app.lesson_status as enum ('draft', 'planned', 'in_progress', 'completed', 'archived');
create type app.lesson_source as enum ('manual', 'ai_generated', 'ai_edited', 'template', 'duplicated', 'import');
create type app.assignment_status as enum (
  'assigned', 'in_progress', 'submitted', 'graded', 'returned', 'excused', 'missing');
create type app.assessment_type as enum (
  'quiz', 'test', 'diagnostic', 'benchmark', 'standardized', 'observation', 'portfolio_review');
create type app.attendance_status as enum ('present', 'absent', 'late', 'excused', 'virtual');
create type app.attendance_method as enum ('teacher', 'parent_checkin', 'self', 'system', 'import');

-- --- calendar ----------------------------------------------------------------
create type app.event_type as enum (
  'class', 'lesson', 'tutoring', 'evaluation', 'field_trip', 'therapy', 'parent_meeting',
  'staff_meeting', 'extracurricular', 'deadline', 'holiday', 'assessment', 'other');
create type app.event_status as enum ('scheduled', 'cancelled', 'completed');
create type app.event_visibility as enum ('family', 'class', 'organization', 'public_org');

-- --- evidence & documents ----------------------------------------------------
create type app.document_category as enum (
  'assessment', 'evaluation', 'lesson_plan', 'worksheet', 'certificate', 'report', 'receipt',
  'notice_of_intent', 'notice_of_termination', 'correspondence', 'student_work', 'credential',
  'contract', 'incident', 'hr_record', 'other', 'unclassified');
create type app.document_status as enum (
  'uploaded', 'scanning', 'quarantined', 'clean', 'processing', 'needs_review', 'filed', 'failed');
create type app.scan_status as enum ('pending', 'clean', 'infected', 'error', 'skipped');
create type app.portfolio_activity_type as enum (
  'worksheet', 'writing', 'project', 'experiment', 'art', 'reading', 'video', 'photo',
  'assessment', 'field_trip', 'discussion', 'other');
create type app.evidence_category as enum (
  'work_sample', 'assessment', 'observation', 'teacher_note', 'certificate', 'reading', 'other');
create type app.reading_type as enum ('independent', 'read_aloud', 'shared', 'audiobook');

-- --- AI ----------------------------------------------------------------------
create type app.ai_feature as enum (
  'document_classification', 'document_extraction', 'worksheet_analysis', 'lesson_generation',
  'weekly_report', 'assistant', 'skill_analysis', 'portfolio_description', 'progress_analysis',
  'daily_brief', 'translation');
create type app.ai_call_status as enum ('success', 'error', 'timeout', 'refused', 'rate_limited', 'budget_blocked');
create type app.suggestion_kind as enum (
  'classify_document', 'create_portfolio_item', 'update_skill', 'create_activity_log',
  'create_reading_log', 'create_assessment_result', 'update_learning_plan', 'create_learning_goal',
  'file_compliance_document', 'create_lesson', 'link_document_to_student');
create type app.suggestion_status as enum ('pending', 'accepted', 'rejected', 'expired', 'superseded');
create type app.confidence_band as enum ('low', 'medium', 'high');
create type app.job_status as enum ('queued', 'running', 'done', 'failed', 'dead');

-- --- compliance --------------------------------------------------------------
create type app.pack_status as enum ('draft', 'active', 'deprecated');
create type app.obligation_level as enum ('required', 'recommended', 'optional', 'unknown');
create type app.compliance_category as enum (
  'registration', 'evaluation', 'portfolio', 'termination', 'records', 'attendance', 'other');
create type app.compliance_status as enum (
  'current', 'upcoming', 'needs_attention', 'incomplete', 'overdue', 'not_applicable', 'unknown');
create type app.submission_method as enum ('email', 'mail', 'portal', 'in_person', 'none');
create type app.submission_status as enum (
  'draft', 'ready', 'awaiting_confirmation', 'sent', 'delivered', 'acknowledged', 'failed', 'manual');

-- --- evaluations -------------------------------------------------------------
create type app.evaluation_status as enum (
  'requested', 'accepted', 'scheduled', 'in_progress', 'submitted', 'parent_review',
  'accepted_by_parent', 'changes_requested', 'declined', 'cancelled');
create type app.evaluation_method as enum ('portfolio_review', 'standardized_test', 'combined', 'other');
create type app.verification_status as enum ('unverified', 'pending', 'verified', 'rejected', 'expired');
create type app.signature_method as enum ('typed', 'drawn', 'uploaded', 'provider');

-- --- plans & goals -----------------------------------------------------------
create type app.plan_status as enum ('draft', 'active', 'archived');
create type app.goal_horizon as enum ('short_term', 'long_term');
create type app.goal_status as enum ('proposed', 'active', 'achieved', 'paused', 'dropped');
create type app.note_visibility as enum ('private_to_author', 'staff', 'family', 'all');

-- --- messaging & notifications ----------------------------------------------
create type app.thread_type as enum ('direct', 'class', 'organization', 'evaluation', 'support', 'announcement');
create type app.notification_type as enum (
  'upcoming_evaluation', 'missing_document', 'lesson_reminder', 'assignment', 'message',
  'teacher_task', 'portfolio_inactivity', 'event_change', 'class_cancellation',
  'document_review', 'compliance_deadline', 'ai_suggestion_ready', 'access_granted', 'access_revoked',
  'weekly_report_ready', 'system');
create type app.notification_digest as enum ('immediate', 'daily', 'weekly', 'off');

-- --- reports -----------------------------------------------------------------
create type app.report_kind as enum (
  'student_progress', 'portfolio', 'activity_log', 'reading_log', 'attendance', 'skill',
  'learning_plan', 'annual_portfolio', 'org_student_summary', 'teacher_caseload',
  'compliance_status', 'weekly_home_report', 'org_daily_brief', 'family_data_export');
create type app.report_status as enum ('queued', 'generating', 'ready', 'failed', 'expired');

-- --- audit & history ---------------------------------------------------------
create type app.audit_action as enum (
  'document_uploaded', 'document_viewed', 'document_downloaded', 'document_deleted',
  'evaluation_viewed', 'evaluation_signed', 'evaluation_completed',
  'compliance_document_generated', 'compliance_document_submitted', 'compliance_status_changed',
  'permissions_changed', 'student_access_granted', 'student_access_revoked',
  'staff_added', 'staff_removed', 'student_created', 'student_archived',
  'report_exported', 'report_shared', 'data_exported',
  'ai_suggestion_applied', 'ai_suggestion_rejected',
  'consent_granted', 'consent_revoked',
  'support_session_opened', 'support_session_closed',
  'organization_membership_started', 'organization_membership_ended',
  'login_succeeded', 'login_failed', 'user_invited');
create type app.history_operation as enum ('insert', 'update', 'delete');
