-- =============================================================================
-- 0043  STEP 2.5 - workflow guards
-- =============================================================================
-- RLS answers "may you touch this row". These triggers answer "may you make
-- THIS state transition", which is where the dangerous actions live: accepting
-- an evaluation, filing an official document, deleting an educational record.
--
-- All guards are skipped when auth.uid() is null (trusted background jobs
-- running under service_role), and enforced for every user session.
-- =============================================================================

-- An evaluator may complete and sign their own report. Only a full guardian
-- accepts it, and only a full guardian files it onward.
create or replace function app.guard_evaluation_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.status = 'accepted_by_parent' and old.status is distinct from 'accepted_by_parent' then
    if not app.can_student_action(new.student_id, 'evaluation', 'approve') then
      raise exception 'accepting an evaluation requires evaluation.approve authority'
        using errcode = 'insufficient_privilege';
    end if;
    if new.parent_reviewed_by is distinct from auth.uid() then
      raise exception 'the accepting guardian must be the authenticated user'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- the evaluator's own signature must be their own
  if new.evaluator_signature_id is distinct from old.evaluator_signature_id
     and new.evaluator_signature_id is not null then
    if not exists (select 1 from public.signatures s
                    where s.id = new.evaluator_signature_id and s.signer_user_id = auth.uid()) then
      raise exception 'an evaluation may only carry a signature created by the signer'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_evaluation_transition
  before update on public.evaluations
  for each row execute function app.guard_evaluation_transition();

-- Filing an official document is a full-guardian act, end to end.
create or replace function app.guard_submission_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.approved_by is distinct from old.approved_by and new.approved_by is not null then
    if not app.can_student_action(new.student_id, 'compliance_submission', 'approve') then
      raise exception 'approving a filing requires compliance_submission.approve authority'
        using errcode = 'insufficient_privilege';
    end if;
    if new.approved_by is distinct from auth.uid() then
      raise exception 'the approver must be the authenticated user'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.signature_id is distinct from old.signature_id and new.signature_id is not null then
    if not app.can_student_action(new.student_id, 'compliance_submission', 'sign') then
      raise exception 'signing a filing requires compliance_submission.sign authority'
        using errcode = 'insufficient_privilege';
    end if;
    if not exists (select 1 from public.signatures s
                    where s.id = new.signature_id and s.signer_user_id = auth.uid()) then
      raise exception 'a filing may only carry a signature created by the signer'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.status in ('sent','delivered','acknowledged')
     and old.status not in ('sent','delivered','acknowledged') then
    if not app.can_student_action(new.student_id, 'compliance_submission', 'submit') then
      raise exception 'filing an official document requires compliance_submission.submit authority'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_submission_transition
  before update on public.document_submissions
  for each row execute function app.guard_submission_transition();

-- Soft-deleting a document is a distinct capability from editing one.
create or replace function app.guard_document_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or new.student_id is null then
    return new;
  end if;
  if new.deleted_at is not null and old.deleted_at is null then
    if not app.can_student_action(new.student_id, 'document', 'delete') then
      raise exception 'deleting a document requires document.delete authority'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_document_delete
  before update on public.documents
  for each row execute function app.guard_document_delete();

-- A learning plan becomes the active plan only when someone with approval
-- authority approves it - an AI draft cannot promote itself.
create or replace function app.guard_learning_plan_activation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.status = 'active' and old.status is distinct from 'active' then
    if not app.can_student_action(new.student_id, 'learning_plan', 'approve') then
      raise exception 'activating a learning plan requires learning_plan.approve authority'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_learning_plan_activation
  before update on public.learning_plans
  for each row execute function app.guard_learning_plan_activation();
