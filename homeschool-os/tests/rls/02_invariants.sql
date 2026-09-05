-- =============================================================================
-- Database-enforced product invariants
-- =============================================================================
\set CARLA '11111111-1111-4111-8111-000000000001'
\set TOMAS '11111111-1111-4111-8111-000000000005'
\set LUCAS '44444444-4444-4444-8444-00000000000d'
\set LUCASU '11111111-1111-4111-8111-000000000009'
\set MARLA '44444444-4444-4444-8444-00000000000e'

-- 1. AI alone may never mark a skill mastered.
do $$
begin
  begin
    insert into public.student_skills (student_id, skill_id, mastery_level, confidence, score)
    values ('44444444-4444-4444-8444-00000000000d', '00000000-0000-4000-8000-000000000204',
            'mastered', 'ai_suggested', 95);
    raise exception 'ASSERTION FAILED: AI-only mastery was accepted';
  exception when check_violation then null;
  end;
  -- a human-confirmed assessment result may.
  insert into public.student_skills (student_id, skill_id, mastery_level, confidence, score,
                                     human_confirmed_by, human_confirmed_at)
  values ('44444444-4444-4444-8444-00000000000d', '00000000-0000-4000-8000-000000000204',
          'mastered', 'assessment_confirmed', 95,
          '11111111-1111-4111-8111-000000000001', now());
  delete from public.student_skills where student_id = '44444444-4444-4444-8444-00000000000d';
end $$;

-- 2. An AI-provenance row requires both a suggestion and a human confirmation.
do $$
begin
  begin
    insert into public.portfolio_items (student_id, family_id, title, ai_generated)
    values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a',
            'Auto-filed item', true);
    raise exception 'ASSERTION FAILED: unconfirmed AI-generated row was accepted';
  exception when check_violation then null;
  end;
end $$;

-- 3. Suggestions can never be marked as not requiring confirmation.
do $$
begin
  begin
    insert into public.ai_suggestions (student_id, kind, payload, requires_confirmation)
    values ('44444444-4444-4444-8444-00000000000d', 'create_portfolio_item', '{}'::jsonb, false);
    raise exception 'ASSERTION FAILED: an auto-apply suggestion was accepted';
  exception when check_violation then null;
  end;
end $$;

-- 4. Consents are append-only.
do $$
declare v_id uuid;
begin
  insert into public.consents (consent_type, subject_student_id, guardian_id, granted, granted_at, method)
  values ('ai_document_processing', '44444444-4444-4444-8444-00000000000d',
          '11111111-1111-4111-8111-000000000001', true, now(), 'web_checkbox')
  returning id into v_id;
  begin
    update public.consents set granted = false where id = v_id;
    raise exception 'ASSERTION FAILED: a consent row was updated';
  exception when restrict_violation then null;
  end;
  begin
    delete from public.consents where id = v_id;
    raise exception 'ASSERTION FAILED: a consent row was deleted';
  exception when restrict_violation then null;
  end;
  -- revocation is a NEW row that supersedes the old one
  insert into public.consents (consent_type, subject_student_id, guardian_id, granted, revoked_at,
                               method, supersedes_id)
  values ('ai_document_processing', '44444444-4444-4444-8444-00000000000d',
          '11111111-1111-4111-8111-000000000001', false, now(), 'web_checkbox', v_id);
  perform t.assert(
    not app.has_consent('ai_document_processing', '44444444-4444-4444-8444-00000000000d'),
    'the superseding revocation is what current state reflects');
  perform t.assert_eq(
    (select count(*) from public.consents where subject_student_id = '44444444-4444-4444-8444-00000000000d'),
    2::bigint, 'both consent events are retained');
end $$;

-- 5. The stored file of a document is immutable.
do $$
begin
  begin
    update public.documents set storage_path = 'somewhere/else.pdf'
     where id = '66666666-6666-4666-8666-000000000011';
    raise exception 'ASSERTION FAILED: a document''s storage path was changed';
  exception when restrict_violation then null;
  end;
  -- classification metadata is editable
  update public.documents set category = 'evaluation', title = 'Annual evaluation'
   where id = '66666666-6666-4666-8666-000000000011';
end $$;

-- 6. Audit rows cannot be altered or removed.
do $$
declare v_id uuid;
begin
  v_id := app.audit('document_viewed', 'documents', '66666666-6666-4666-8666-000000000011',
                    '44444444-4444-4444-8444-00000000000d', null, null, '{}'::jsonb,
                    '11111111-1111-4111-8111-000000000001');
  perform t.assert(v_id is not null, 'app.audit records an event');
  begin
    delete from public.audit_logs where id = v_id;
    raise exception 'ASSERTION FAILED: an audit row was deleted';
  exception when restrict_violation then null;
  end;
end $$;

-- 7. An official filing cannot be recorded as sent without approval + signature.
do $$
begin
  begin
    insert into public.document_submissions (student_id, family_id, method, status, sent_at)
    values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a',
            'email', 'sent', now());
    raise exception 'ASSERTION FAILED: an unapproved, unsigned filing was recorded as sent';
  exception when check_violation then null;
  end;
end $$;

-- 8. A compliance rule cannot be active without a named human verification.
do $$
begin
  begin
    update public.compliance_rules set active = true
     where code = 'FL.NOI';
    raise exception 'ASSERTION FAILED: an unverified compliance rule was activated';
  exception when check_violation then null;
  end;
end $$;

-- 9. A pack cannot be published without a named publisher.
do $$
begin
  begin
    update public.compliance_packs set status = 'active' where state_code = 'FL';
    raise exception 'ASSERTION FAILED: a pack was published with no publisher';
  exception when check_violation then null;
  end;
end $$;

-- 10. No private adult-to-minor thread.
do $$
declare v_thread uuid;
begin
  insert into public.message_threads (id, type, subject, created_by)
  values (gen_random_uuid(), 'direct', 'Hello', '11111111-1111-4111-8111-000000000005')
  returning id into v_thread;
  begin
    insert into public.message_thread_participants (thread_id, user_id) values
      (v_thread, '11111111-1111-4111-8111-000000000005'),   -- teacher
      (v_thread, '11111111-1111-4111-8111-000000000009');   -- Lucas, a minor
    -- deferred constraint fires at commit; force it now
    set constraints all immediate;
    raise exception 'ASSERTION FAILED: an adult-to-minor private thread was created';
  exception when check_violation then null;
  end;
end $$;

-- 11. Skill history is append-only.
do $$
declare v_ss uuid; v_ev uuid;
begin
  insert into public.student_skills (student_id, skill_id, confidence)
  values ('44444444-4444-4444-8444-00000000000d', '00000000-0000-4000-8000-000000000206', 'teacher_observed')
  returning id into v_ss;
  insert into public.student_skill_events (student_skill_id, student_id, skill_id, confidence, source_type, score)
  values (v_ss, '44444444-4444-4444-8444-00000000000d', '00000000-0000-4000-8000-000000000206',
          'teacher_observed', 'observation', 68)
  returning id into v_ev;
  begin
    update public.student_skill_events set score = 99 where id = v_ev;
    raise exception 'ASSERTION FAILED: a skill event was rewritten';
  exception when restrict_violation then null;
  end;
end $$;

-- 12. Temporal history captures who changed what.
do $$
declare v_count int;
begin
  update public.students set grade_level = '6' where id = '44444444-4444-4444-8444-00000000000d';
  select count(*) into v_count
    from public.record_history
   where table_name = 'students'
     and record_id = '44444444-4444-4444-8444-00000000000d'
     and operation = 'update'
     and 'grade_level' = any (changed_fields);
  perform t.assert(v_count >= 1, 'record_history captured the grade level change');
end $$;

-- 13. Activity log auto-generation is idempotent.
do $$
begin
  insert into public.activity_logs (student_id, family_id, activity_title, source_type, source_id, dedupe_key)
  values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a',
          'Fractions lesson', 'manual', '00000000-0000-4000-8000-0000000009aa',
          app.dedupe_key('lessons', '00000000-0000-4000-8000-0000000009aa'));
  begin
    insert into public.activity_logs (student_id, family_id, activity_title, source_type, source_id, dedupe_key)
    values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a',
            'Fractions lesson', 'manual', '00000000-0000-4000-8000-0000000009aa',
            app.dedupe_key('lessons', '00000000-0000-4000-8000-0000000009aa'));
    raise exception 'ASSERTION FAILED: a duplicate activity log row was accepted';
  exception when unique_violation then null;
  end;
end $$;

-- 14. Partitions are not directly reachable by an application user.
do $$
begin
  begin
    perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-000000000008', true);
    set local role authenticated;
    perform count(*) from public.audit_logs_default;
    reset role;
    raise exception 'ASSERTION FAILED: a partition was readable directly';
  exception when insufficient_privilege then
    reset role;
  end;
end $$;

-- 15. A super-admin flag alone grants nothing without a break-glass session.
do $$
begin
  update public.profiles set is_super_admin = true where id = '11111111-1111-4111-8111-000000000008';
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-000000000008', true);
  perform t.assert(not app.is_platform_support(),
    'is_super_admin without an open support session grants nothing');
  perform t.assert_eq(app.student_access('44444444-4444-4444-8444-00000000000d'), 'none'::app.access_level,
    'a super admin cannot read a student without break-glass');

  insert into public.support_access_sessions (user_id, student_id, reason, expires_at)
  values ('11111111-1111-4111-8111-000000000008', '44444444-4444-4444-8444-00000000000d',
          'Support ticket 1234: parent reports a missing document', now() + interval '1 hour');
  perform t.assert_eq(app.student_access('44444444-4444-4444-8444-00000000000d'), 'read'::app.access_level,
    'an open break-glass session grants read access');
  update public.profiles set is_super_admin = false where id = '11111111-1111-4111-8111-000000000008';
end $$;

select 'all invariant checks passed' as result;
