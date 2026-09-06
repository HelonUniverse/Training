-- =============================================================================
-- 0063  STEP 4 - the two things a capture must tell someone about
-- =============================================================================
-- Deliberately two, and no more. Notifying a parent every time anything happens
-- is how people learn to ignore the bell, and the first notification they then
-- miss is the one that mattered.
--
--   1. THE FILE WAS REFUSED. Someone photographed their child's work, saw
--      "saved", and the scanner then found something wrong. Without this they
--      would find out in June, looking for evidence that is not there.
--   2. SOMETHING WAS SHARED WITH YOU. A teacher or evaluator now holds access
--      to a family's record; the person who received it should know it arrived.
--
-- A clean scan is NOT a notification. It is the expected outcome, and saying so
-- every time is noise.
--
-- Both are written by triggers, in the same transaction as the event, so a
-- notification cannot describe something that did not happen and cannot be
-- forgotten by a code path that skipped the call.
-- =============================================================================

/**
 * A scan came back bad. Tell the person who uploaded it.
 *
 * SECURITY DEFINER because it runs from the scan worker, which is service_role
 * and therefore has no user to insert "as". It writes only to the uploader's
 * own notification feed - the recipient is read from the document, never
 * supplied.
 */
create or replace function app.notify_scan_outcome()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.scan_status is not distinct from old.scan_status then
    return new;
  end if;
  if new.scan_status not in ('infected', 'error') then
    return new;
  end if;
  if new.uploaded_by is null then
    return new;
  end if;

  insert into public.notifications (user_id, student_id, type, title, body, link, priority, dedupe_key)
  values (
    new.uploaded_by,
    new.student_id,
    'document_review',
    case new.scan_status
      when 'infected' then 'A file you uploaded was not safe to keep'
      else 'We could not check a file you uploaded'
    end,
    coalesce(new.title, new.original_filename) ||
      case new.scan_status
        when 'infected' then ' did not pass our safety check, so it will not be opened. The record is still here.'
        else ' could not be checked, so it will not be opened yet. Try uploading it again.'
      end,
    '/app/documents/' || new.id::text,
    2,
    'scan:' || new.id::text)
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function app.notify_scan_outcome() from public, anon, authenticated;

create trigger notify_scan_outcome
  after update on public.documents
  for each row execute function app.notify_scan_outcome();

/**
 * A document was shared. Tell the recipient, when the recipient is a person.
 *
 * A share with an organization or a grant reaches a group rather than an
 * inbox, so nothing is written for those: a notification addressed to nobody
 * in particular is a row that will never be read.
 */
create or replace function app.notify_document_share()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_doc public.documents;
begin
  if new.shared_with_user_id is null then
    return new;
  end if;

  select * into v_doc from public.documents d where d.id = new.document_id;

  insert into public.notifications (user_id, student_id, type, title, body, link, priority, dedupe_key)
  values (
    new.shared_with_user_id,
    coalesce(new.student_id, v_doc.student_id),
    'access_granted',
    'A document was shared with you',
    coalesce(v_doc.title, v_doc.original_filename, 'A document') ||
      case when new.expires_at is null then ' was shared with you.'
           else ' was shared with you until ' || to_char(new.expires_at, 'FMMonth FMDD, YYYY') || '.'
      end,
    '/app/documents/' || new.document_id::text,
    3,
    'share:' || new.id::text)
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function app.notify_document_share() from public, anon, authenticated;

create trigger notify_document_share
  after insert on public.document_shares
  for each row execute function app.notify_document_share();

comment on function app.notify_scan_outcome() is
  'Notifies the uploader when a scan fails. A clean result is deliberately '
  'silent - it is the expected outcome, and announcing it teaches people to '
  'ignore the ones that matter.';

select app.assert_schema_invariants();
