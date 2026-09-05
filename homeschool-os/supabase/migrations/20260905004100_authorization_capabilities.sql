-- =============================================================================
-- 0039  STEP 2.5 - the capability matrix
-- =============================================================================
-- Two authorization questions, two mechanisms:
--
--   Q1  Can this user reach this student at all?   -> app.student_access()
--   Q2  Can this user do ACTION on RESOURCE for
--       this student?                              -> app.can_student_action()
--
-- Q2 is answered by an explicit, enumerable matrix: (relationship, resource,
-- action). It is data, not a rule engine - you can read the whole security
-- model with `select * from app.capabilities order by 1,2,3`, and a reviewer
-- can diff it. Adding a capability is an INSERT in a migration; there is no
-- runtime string that can widen authority.
-- =============================================================================

create table app.capabilities (
  relationship      app.relationship_kind not null,
  resource          app.resource_type not null,
  action            app.resource_action not null,
  requires_section  boolean not null default false,
  notes             text,
  primary key (relationship, resource, action)
);

comment on table app.capabilities is
  'The complete authorization matrix. requires_section applies to grant-based '
  'relationships: the resource must also appear in student_access_grants.sections.';

revoke all on app.capabilities from public, anon, authenticated;

-- Convenience for review and tests: one row per relationship/resource with the
-- actions collapsed into an array.
create view app.capability_summary as
select relationship, resource,
       array_agg(action order by action) as actions,
       bool_or(requires_section) as section_scoped
  from app.capabilities
 group by relationship, resource;

revoke all on app.capability_summary from public, anon, authenticated;

-- --- the matrix --------------------------------------------------------------
insert into app.capabilities (relationship, resource, action, requires_section, notes)
select v.rel::app.relationship_kind, v.res::app.resource_type,
       a::app.resource_action, v.sec, v.note
from (values

  -- === the student themself: read their own work, submit their own work =====
  ('student_self','student_profile', array['read'], false, null),
  ('student_self','academic_record', array['read'], false, null),
  ('student_self','portfolio',       array['read','create'], false, null),
  ('student_self','activity_log',    array['read'], false, null),
  ('student_self','reading_log',     array['read','create','update'], false, null),
  ('student_self','assignment',      array['read','create','update'], false, 'update = submit own work'),
  ('student_self','assessment',      array['read'], false, null),
  ('student_self','skill',           array['read'], false, null),
  ('student_self','learning_plan',   array['read'], false, null),
  ('student_self','attendance',      array['read'], false, null),
  ('student_self','calendar',        array['read'], false, null),
  ('student_self','communication',   array['read','create'], false, 'thread membership still applies'),
  ('student_self','report',          array['read'], false, null),

  -- === guardian: FULL ========================================================
  -- The complete recorded authority over a student. Legal custody is NOT
  -- inferred; this reflects only what an existing full guardian recorded.
  ('guardian_full','student_profile', array['read','create','update','delete','export','share'], false, 'export = family data portability'),
  ('guardian_full','academic_record', array['read','create','update','delete'], false, null),
  ('guardian_full','portfolio',       array['read','create','update','delete','share','export'], false, null),
  ('guardian_full','activity_log',    array['read','create','update','delete','export'], false, null),
  ('guardian_full','reading_log',     array['read','create','update','delete','export'], false, null),
  ('guardian_full','assignment',      array['read','create','update','delete'], false, null),
  ('guardian_full','assessment',      array['read','create','update','delete'], false, null),
  ('guardian_full','skill',           array['read','create','update','delete'], false, null),
  ('guardian_full','learning_plan',   array['read','create','update','delete','approve'], false, null),
  ('guardian_full','attendance',      array['read','create','update','delete'], false, null),
  ('guardian_full','calendar',        array['read','create','update','delete'], false, null),
  ('guardian_full','teacher_note',    array['read'], false, 'family-visible notes only'),
  ('guardian_full','document',        array['read','create','update','delete','share','approve','export'], false, 'approve = retention and legal hold'),
  ('guardian_full','compliance',      array['read'], false, 'status is computed, never set by hand'),
  ('guardian_full','compliance_submission', array['read','create','update','approve','sign','submit'], false, null),
  ('guardian_full','evaluation',      array['read','create','update','approve','submit'], false, 'approve = accept the evaluator report'),
  ('guardian_full','evaluator_review',array['read','create','update'], false, null),
  ('guardian_full','consent',         array['read','create'], false, 'consents are append-only; revoking inserts a new row'),
  ('guardian_full','guardian',        array['read','create','update','delete'], false, null),
  ('guardian_full','access_grant',    array['read','create','update','delete'], false, 'only a full guardian shares a child onward'),
  ('guardian_full','organization_enrollment', array['read','create','update'], false, null),
  ('guardian_full','communication',   array['read','create'], false, null),
  ('guardian_full','report',          array['read','create','update','export','share'], false, null),
  ('guardian_full','incident',        array['read'], false, 'only incidents the organization shared'),
  ('guardian_full','audit',           array['read'], false, 'who accessed my child''s records'),

  -- === guardian: STANDARD ====================================================
  -- Full academic authority. Read-only on the legal/administrative surface:
  -- cannot manage guardians, grant access, sign or submit official filings,
  -- accept an evaluation, alter retention, or export the whole record.
  ('guardian_standard','student_profile', array['read','update'], false, null),
  ('guardian_standard','academic_record', array['read','create','update','delete'], false, null),
  ('guardian_standard','portfolio',       array['read','create','update','delete'], false, null),
  ('guardian_standard','activity_log',    array['read','create','update','delete'], false, null),
  ('guardian_standard','reading_log',     array['read','create','update','delete'], false, null),
  ('guardian_standard','assignment',      array['read','create','update','delete'], false, null),
  ('guardian_standard','assessment',      array['read','create','update','delete'], false, null),
  ('guardian_standard','skill',           array['read','create','update'], false, null),
  ('guardian_standard','learning_plan',   array['read','create','update'], false, 'cannot approve a plan'),
  ('guardian_standard','attendance',      array['read','create','update'], false, null),
  ('guardian_standard','calendar',        array['read','create','update','delete'], false, null),
  ('guardian_standard','teacher_note',    array['read'], false, null),
  ('guardian_standard','document',        array['read','create','update'], false, 'no share, delete, retention or export'),
  ('guardian_standard','compliance',      array['read'], false, null),
  ('guardian_standard','compliance_submission', array['read'], false, 'cannot prepare, sign or file'),
  ('guardian_standard','evaluation',      array['read','create'], false, 'may request; cannot accept or submit'),
  ('guardian_standard','consent',         array['read'], false, null),
  ('guardian_standard','guardian',        array['read'], false, null),
  ('guardian_standard','access_grant',    array['read'], false, null),
  ('guardian_standard','organization_enrollment', array['read'], false, null),
  ('guardian_standard','communication',   array['read','create'], false, null),
  ('guardian_standard','report',          array['read','create'], false, null),
  ('guardian_standard','audit',           array['read'], false, null),

  -- === guardian: VIEW ONLY ===================================================
  -- Reads the academic picture. Mutates nothing, anywhere.
  ('guardian_view_only','student_profile', array['read'], false, null),
  ('guardian_view_only','academic_record', array['read'], false, null),
  ('guardian_view_only','portfolio',       array['read'], false, null),
  ('guardian_view_only','activity_log',    array['read'], false, null),
  ('guardian_view_only','reading_log',     array['read'], false, null),
  ('guardian_view_only','assignment',      array['read'], false, null),
  ('guardian_view_only','assessment',      array['read'], false, null),
  ('guardian_view_only','skill',           array['read'], false, null),
  ('guardian_view_only','learning_plan',   array['read'], false, null),
  ('guardian_view_only','attendance',      array['read'], false, null),
  ('guardian_view_only','calendar',        array['read'], false, null),
  ('guardian_view_only','document',        array['read'], false, 'family_private documents remain invisible'),
  ('guardian_view_only','compliance',      array['read'], false, null),
  ('guardian_view_only','evaluation',      array['read'], false, null),
  ('guardian_view_only','communication',   array['read','create'], false, null),
  ('guardian_view_only','report',          array['read'], false, null),

  -- === staff with an explicit WRITE assignment ===============================
  ('staff_assigned_write','student_profile', array['read'], false, null),
  ('staff_assigned_write','academic_record', array['read','create','update','delete'], false, null),
  ('staff_assigned_write','portfolio',       array['read','create','update'], false, null),
  ('staff_assigned_write','activity_log',    array['read','create','update'], false, null),
  ('staff_assigned_write','reading_log',     array['read','create','update'], false, null),
  ('staff_assigned_write','assignment',      array['read','create','update','delete'], false, null),
  ('staff_assigned_write','assessment',      array['read','create','update'], false, null),
  ('staff_assigned_write','skill',           array['read','create','update'], false, 'mastery still needs the human-confirmation constraint'),
  ('staff_assigned_write','learning_plan',   array['read','create','update'], false, 'cannot approve'),
  ('staff_assigned_write','attendance',      array['read','create','update'], false, null),
  ('staff_assigned_write','calendar',        array['read','create','update','delete'], false, null),
  ('staff_assigned_write','teacher_note',    array['read','create','update'], false, null),
  ('staff_assigned_write','document',        array['read','create'], false, 'visibility still filters what is readable'),
  ('staff_assigned_write','compliance',      array['read'], false, 'status only; no authority over it'),
  ('staff_assigned_write','communication',   array['read','create'], false, null),
  ('staff_assigned_write','report',          array['read','create'], false, null),

  -- === staff with an explicit READ assignment ================================
  ('staff_assigned_read','student_profile', array['read'], false, null),
  ('staff_assigned_read','academic_record', array['read'], false, null),
  ('staff_assigned_read','portfolio',       array['read'], false, null),
  ('staff_assigned_read','activity_log',    array['read'], false, null),
  ('staff_assigned_read','reading_log',     array['read'], false, null),
  ('staff_assigned_read','assignment',      array['read'], false, null),
  ('staff_assigned_read','assessment',      array['read'], false, null),
  ('staff_assigned_read','skill',           array['read'], false, null),
  ('staff_assigned_read','learning_plan',   array['read'], false, null),
  ('staff_assigned_read','attendance',      array['read'], false, null),
  ('staff_assigned_read','calendar',        array['read'], false, null),
  ('staff_assigned_read','teacher_note',    array['read'], false, null),
  ('staff_assigned_read','document',        array['read'], false, null),
  ('staff_assigned_read','communication',   array['read','create'], false, null),
  ('staff_assigned_read','report',          array['read'], false, null),

  -- === class staff (derived from co-membership of a class) ===================
  -- Academic authority for teaching. NO authority over guardians, consents,
  -- compliance, official filings, evaluations, access grants, enrolment
  -- ownership, retention, signatures or family-private documents.
  ('class_staff','student_profile', array['read'], false, null),
  ('class_staff','academic_record', array['read','create','update'], false, 'lessons'),
  ('class_staff','portfolio',       array['read','create','update'], false, null),
  ('class_staff','activity_log',    array['read','create','update'], false, null),
  ('class_staff','reading_log',     array['read','create'], false, null),
  ('class_staff','assignment',      array['read','create','update'], false, null),
  ('class_staff','assessment',      array['read','create','update'], false, null),
  ('class_staff','skill',           array['read','create','update'], false, 'observations only'),
  ('class_staff','learning_plan',   array['read'], false, 'may read, may not author'),
  ('class_staff','attendance',      array['read','create','update'], false, null),
  ('class_staff','calendar',        array['read','create','update'], false, null),
  ('class_staff','teacher_note',    array['read','create','update'], false, 'subject to note visibility'),
  ('class_staff','document',        array['read','create'], false, 'academic_shared documents only'),
  ('class_staff','communication',   array['read','create'], false, null),
  ('class_staff','report',          array['read','create'], false, null),

  -- === organization administrator ============================================
  -- Broad operational authority over enrolled students; no family legal authority.
  ('org_admin','student_profile', array['read','update'], false, null),
  ('org_admin','academic_record', array['read','create','update','delete'], false, null),
  ('org_admin','portfolio',       array['read','create','update'], false, null),
  ('org_admin','activity_log',    array['read','create','update'], false, null),
  ('org_admin','reading_log',     array['read','create','update'], false, null),
  ('org_admin','assignment',      array['read','create','update','delete'], false, null),
  ('org_admin','assessment',      array['read','create','update','delete'], false, null),
  ('org_admin','skill',           array['read','create','update'], false, null),
  ('org_admin','learning_plan',   array['read','create','update'], false, 'cannot approve a family''s plan'),
  ('org_admin','attendance',      array['read','create','update','delete'], false, null),
  ('org_admin','calendar',        array['read','create','update','delete'], false, null),
  ('org_admin','teacher_note',    array['read','create','update'], false, null),
  ('org_admin','document',        array['read','create','update'], false, 'no share, delete, retention or family export'),
  ('org_admin','compliance',      array['read'], false, null),
  ('org_admin','compliance_submission', array['read'], false, 'the family files; the organization may not'),
  ('org_admin','evaluation',      array['read','create'], false, 'may coordinate; may not accept or submit'),
  ('org_admin','consent',         array['read'], false, null),
  ('org_admin','guardian',        array['read'], false, null),
  ('org_admin','access_grant',    array['read'], false, null),
  ('org_admin','organization_enrollment', array['read','create','update','delete'], false, null),
  ('org_admin','communication',   array['read','create'], false, null),
  ('org_admin','report',          array['read','create','update','export'], false, 'organization reporting, not family export'),
  ('org_admin','incident',        array['read','create','update','share'], false, null),
  ('org_admin','audit',           array['read'], false, 'own organization only'),

  -- === evaluator grant (SECTION SCOPED) ======================================
  -- Everything marked section-scoped additionally requires the resource to be
  -- present in student_access_grants.sections. Nothing here is generic student
  -- read or write authority.
  ('grant_evaluator','student_profile', array['read'], false, 'name and grade only; needed to write the report'),
  ('grant_evaluator','portfolio',       array['read'], true,  null),
  ('grant_evaluator','reading_log',     array['read'], true,  null),
  ('grant_evaluator','activity_log',    array['read'], true,  null),
  ('grant_evaluator','assessment',      array['read'], true,  null),
  ('grant_evaluator','skill',           array['read'], true,  null),
  ('grant_evaluator','learning_plan',   array['read'], true,  null),
  ('grant_evaluator','attendance',      array['read'], true,  null),
  ('grant_evaluator','academic_record', array['read'], true,  null),
  ('grant_evaluator','document',        array['read'], true,  'and only evaluator_shared documents'),
  ('grant_evaluator','evaluation',      array['read','create','update','sign'], false,
       'may complete and sign their own report; may NOT approve or submit it'),
  ('grant_evaluator','communication',   array['read','create'], false, null),

  -- === provider grant (therapist, specialist) ================================
  ('grant_provider','student_profile', array['read'], false, null),
  ('grant_provider','portfolio',       array['read'], true,  null),
  ('grant_provider','activity_log',    array['read','create'], true, null),
  ('grant_provider','skill',           array['read'], true,  null),
  ('grant_provider','learning_plan',   array['read'], true,  null),
  ('grant_provider','attendance',      array['read'], true,  null),
  ('grant_provider','teacher_note',    array['read','create'], true, null),
  ('grant_provider','calendar',        array['read'], true,  null),
  ('grant_provider','communication',   array['read','create'], false, null),

  -- === review / transfer grants: read only, section scoped ===================
  ('grant_review','student_profile', array['read'], false, null),
  ('grant_review','portfolio',       array['read'], true, null),
  ('grant_review','assessment',      array['read'], true, null),
  ('grant_review','skill',           array['read'], true, null),
  ('grant_review','document',        array['read'], true, null),
  ('grant_transfer','student_profile', array['read'], false, null),
  ('grant_transfer','academic_record', array['read'], true, null),
  ('grant_transfer','portfolio',       array['read'], true, null),
  ('grant_transfer','skill',           array['read'], true, null),
  ('grant_transfer','assessment',      array['read'], true, null),

  -- === platform support: break-glass is READ ONLY, always ====================
  ('platform_support','student_profile', array['read'], false, null),
  ('platform_support','academic_record', array['read'], false, null),
  ('platform_support','portfolio',       array['read'], false, null),
  ('platform_support','activity_log',    array['read'], false, null),
  ('platform_support','reading_log',     array['read'], false, null),
  ('platform_support','assignment',      array['read'], false, null),
  ('platform_support','assessment',      array['read'], false, null),
  ('platform_support','skill',           array['read'], false, null),
  ('platform_support','learning_plan',   array['read'], false, null),
  ('platform_support','attendance',      array['read'], false, null),
  ('platform_support','calendar',        array['read'], false, null),
  ('platform_support','document',        array['read'], false, null),
  ('platform_support','compliance',      array['read'], false, null),
  ('platform_support','compliance_submission', array['read'], false, null),
  ('platform_support','evaluation',      array['read'], false, null),
  ('platform_support','consent',         array['read'], false, null),
  ('platform_support','guardian',        array['read'], false, null),
  ('platform_support','access_grant',    array['read'], false, null),
  ('platform_support','organization_enrollment', array['read'], false, null),
  ('platform_support','report',          array['read'], false, null),
  ('platform_support','audit',           array['read'], false, null)

) as v(rel, res, actions, sec, note), unnest(v.actions) as a;

-- Guard rails on the matrix itself, checked at deploy time.
do $$
declare v_bad text;
begin
  -- teacher_note_private is author-only and must never appear in the matrix.
  if exists (select 1 from app.capabilities where resource = 'teacher_note_private') then
    raise exception 'teacher_note_private must not be grantable through the capability matrix';
  end if;

  -- break-glass support is read-only.
  select string_agg(distinct action::text, ', ') into v_bad
    from app.capabilities where relationship = 'platform_support' and action <> 'read';
  if v_bad is not null then
    raise exception 'platform_support must be read-only, found: %', v_bad;
  end if;

  -- view-only guardians mutate nothing.
  select string_agg(distinct resource::text, ', ') into v_bad
    from app.capabilities where relationship = 'guardian_view_only' and action <> 'read'
      and not (resource = 'communication' and action = 'create');
  if v_bad is not null then
    raise exception 'guardian_view_only must not mutate: %', v_bad;
  end if;

  -- class staff hold no authority over the protected surface.
  select string_agg(distinct resource::text, ', ') into v_bad
    from app.capabilities
   where relationship = 'class_staff'
     and resource in ('guardian','consent','access_grant','compliance','compliance_submission',
                      'evaluation','organization_enrollment','incident','audit');
  if v_bad is not null then
    raise exception 'class_staff must not reach the protected surface: %', v_bad;
  end if;

  -- only a full guardian may submit or sign an official filing.
  select string_agg(distinct relationship::text, ', ') into v_bad
    from app.capabilities
   where resource = 'compliance_submission' and action in ('submit','sign','approve')
     and relationship <> 'guardian_full';
  if v_bad is not null then
    raise exception 'only guardian_full may sign or submit a filing, found: %', v_bad;
  end if;

  -- only a full guardian accepts an evaluation.
  select string_agg(distinct relationship::text, ', ') into v_bad
    from app.capabilities
   where resource = 'evaluation' and action in ('approve','submit')
     and relationship <> 'guardian_full';
  if v_bad is not null then
    raise exception 'only guardian_full may accept or submit an evaluation, found: %', v_bad;
  end if;

  -- every grant-based read of an academic resource must be section scoped.
  select string_agg(distinct relationship::text || '.' || resource::text, ', ') into v_bad
    from app.capabilities
   where relationship::text like 'grant_%'
     and resource in ('portfolio','reading_log','activity_log','assessment','skill',
                      'learning_plan','attendance','academic_record','document')
     and not requires_section;
  if v_bad is not null then
    raise exception 'grant relationships must be section scoped for: %', v_bad;
  end if;
end $$;
