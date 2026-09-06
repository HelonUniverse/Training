-- =============================================================================
-- 0057  STEP 4 - capture entry points
-- =============================================================================
-- One capture is several rows: a document, its first version, a portfolio item,
-- and sometimes an activity or reading log. Through PostgREST each is a
-- separate request, so a failure halfway leaves an orphaned document row
-- pointing at a file nobody can find, or a portfolio item with no evidence.
--
-- As in 0053 these are SECURITY INVOKER: they run as the calling user, RLS
-- applies to every statement, and the only thing they add is atomicity.
--
-- The `RETURNING` trap from 0053 applies here too - a freshly inserted document
-- is readable by its uploader (documents_select allows uploaded_by = auth.uid())
-- but a portfolio item is not readable until the student relationship resolves,
-- so ids are generated up front throughout.
--
-- ON DEFAULTS: every argument that may be omitted carries `default null`.
-- That is not decoration. The generated TypeScript types model a parameter's
-- type but not its nullability, so a required-but-nullable argument becomes
-- one the compiler will not let you pass null to. Defaults let the client
-- simply leave it out, which is also what it means.
-- =============================================================================

-- --- document_versions was read-only ----------------------------------------
-- 0042 gave document_versions a SELECT policy and nothing else, so no user
-- could ever record a version - not even the uploader recording the original.
-- The gate is write access to the PARENT document: you may add a version to a
-- document you uploaded, or one you may update. The subquery is RLS-filtered,
-- which is safe here because documents_select already lets an uploader see
-- their own row (unlike the traps in 0053/0054).
create policy document_versions_insert on public.document_versions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.documents d
       where d.id = document_versions.document_id
         and d.deleted_at is null
         and (d.uploaded_by = auth.uid()
              or (d.student_id is not null
                  and app.can_student_action(d.student_id, 'document', 'update')))));

-- --- registering an uploaded file -------------------------------------------

/**
 * Records a file that has already been written to storage.
 *
 * scan_status is NOT a parameter. It is always 'pending' here: only the trusted
 * worker may move a document out of pending, through app.record_scan_result.
 * That keeps "is this file safe" out of the hands of the client entirely.
 *
 * DUPLICATES. documents_family_hash_idx is unique on (family_id, sha256), so
 * re-saving byte-identical content inside one family raises unique_violation.
 * Rather than surface a constraint error, this reports it: the caller gets the
 * id of the document that already holds those bytes and can delete the object
 * it just uploaded.
 *
 * Note what that CANNOT do. The index is scoped to one family and the lookup
 * runs under RLS, so a hash held by another household matches nothing and
 * raises nothing. No observable state differs based on what anyone else has
 * ever uploaded.
 */
create or replace function public.register_document(
  p_bucket         text,
  p_path           text,
  p_filename       text,
  p_mime           text,
  p_bytes          bigint,
  p_sha256         text,
  p_family         uuid default null,
  p_student        uuid default null,
  p_title          text default null,
  p_category       app.document_category default 'unclassified',
  p_visibility     app.document_visibility default 'family_private',
  p_document_date  date default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user     uuid := auth.uid();
  v_doc      uuid := gen_random_uuid();
  v_existing uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'a document needs a sha256 digest' using errcode = 'check_violation';
  end if;
  if p_bytes is null or p_bytes <= 0 then
    raise exception 'a document needs a positive byte size' using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_path), '') = '' or coalesce(trim(p_bucket), '') = '' then
    raise exception 'a document needs a storage location' using errcode = 'check_violation';
  end if;
  if p_family is null and p_student is null then
    raise exception 'a document needs an owner' using errcode = 'check_violation';
  end if;

  begin
    insert into public.documents (
      id, student_id, family_id, uploaded_by, created_by,
      storage_bucket, storage_path, original_filename, mime_type, byte_size, sha256,
      title, category, visibility, document_date,
      status, scan_status, source, record_class)
    values (
      v_doc, p_student, p_family, v_user, v_user,
      p_bucket, p_path, p_filename, p_mime, p_bytes, lower(p_sha256),
      nullif(trim(coalesce(p_title, '')), ''), p_category, p_visibility, p_document_date,
      'uploaded', 'pending', 'upload', 'student_educational');
  exception when unique_violation then
    select d.id into v_existing
      from public.documents d
     where d.sha256 = lower(p_sha256)
       and d.deleted_at is null
     limit 1;
    return jsonb_build_object('id', v_existing, 'duplicate', true);
  end;

  insert into public.document_versions (document_id, version, storage_path, sha256, byte_size, reason)
  values (v_doc, 1, p_path, lower(p_sha256), p_bytes, 'original upload');

  return jsonb_build_object('id', v_doc, 'duplicate', false);
end;
$fn$;

comment on function public.register_document is
  'Records an already-uploaded file as a document plus its first version, in one '
  'transaction, as the calling user. scan_status is always pending - only the '
  'trusted worker may change it. Returns {id, duplicate}.';

-- --- finding a duplicate BEFORE uploading ------------------------------------

/**
 * Answers "have I already saved this exact file?"
 *
 * Deliberately SECURITY INVOKER and scoped to the caller's own visibility: it
 * can only ever match a document the caller can already read. A hash held by
 * another family is invisible here, so this can never be used as an oracle to
 * discover that some other household uploaded the same file.
 */
create or replace function public.find_duplicate_document(p_sha256 text)
returns table (id uuid, title text, original_filename text, document_date date, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $fn$
  select d.id, d.title, d.original_filename, d.document_date, d.created_at
    from public.documents d
   where d.sha256 = lower(p_sha256)
     and d.deleted_at is null
   limit 1;
$fn$;

comment on function public.find_duplicate_document(text) is
  'Duplicate check scoped to what the caller can already see. Cannot reveal that '
  'another tenant holds the same file.';

-- --- portfolio ----------------------------------------------------------------

create or replace function public.create_portfolio_item(
  p_student       uuid,
  p_title         text,
  p_occurred_on   date default null,
  p_activity_type app.portfolio_activity_type default 'other',
  p_category      app.evidence_category default 'work_sample',
  p_subject       uuid default null,
  p_description   text default null,
  p_document_ids  uuid[] default '{}',
  p_visibility    text default 'family')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_item uuid := gen_random_uuid();
  v_family uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'a portfolio item needs a title' using errcode = 'check_violation';
  end if;

  -- Readable only if the caller may see this student, per RLS.
  select s.family_id into v_family from public.students s where s.id = p_student;
  if not found then
    raise exception 'student not found' using errcode = 'insufficient_privilege';
  end if;

  insert into public.portfolio_items (
    id, student_id, family_id, title, occurred_on, activity_type, evidence_category,
    subject_id, description, document_ids, visibility,
    created_by, entered_by, source_type, record_class)
  values (
    v_item, p_student, v_family, trim(p_title), coalesce(p_occurred_on, current_date),
    p_activity_type, p_category, p_subject,
    nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_document_ids, '{}'::uuid[]),
    -- portfolio_items.visibility is its own vocabulary (private/family/staff/
    -- organization), NOT app.document_visibility. The attached documents carry
    -- the real document visibility; this is who sees the story entry.
    coalesce(nullif(trim(coalesce(p_visibility,'')),''), 'family'),
    v_user, v_user, 'parent', 'student_educational');

  return v_item;
end;
$fn$;

/** Adds more evidence to an existing item rather than creating a second one. */
create or replace function public.attach_documents(p_item uuid, p_document_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_n integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  update public.portfolio_items
     set document_ids = (
           select array_agg(distinct x)
             from unnest(document_ids || coalesce(p_document_ids, '{}'::uuid[])) x)
   where id = p_item;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select array_length(document_ids, 1) into v_n from public.portfolio_items where id = p_item;
  return coalesce(v_n, 0);
end;
$fn$;

-- --- activity -----------------------------------------------------------------

create or replace function public.log_activity(
  p_student      uuid,
  p_title        text,
  p_kind         app.activity_kind default 'other',
  p_date         date default null,
  p_minutes      integer default null,
  p_subject      uuid default null,
  p_description  text default null,
  p_document_ids uuid[] default '{}')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_log  uuid := gen_random_uuid();
  v_item uuid;
  v_family uuid;
  v_when date := coalesce(p_date, current_date);
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'an activity needs a title' using errcode = 'check_violation';
  end if;

  select s.family_id into v_family from public.students s where s.id = p_student;
  if not found then
    raise exception 'student not found' using errcode = 'insufficient_privilege';
  end if;

  -- Evidence attached => one portfolio item, never one per photo.
  if coalesce(array_length(p_document_ids, 1), 0) > 0 then
    v_item := public.create_portfolio_item(
      p_student, trim(p_title), v_when,
      case p_kind
        when 'field_trip' then 'field_trip'::app.portfolio_activity_type
        when 'art' then 'art'::app.portfolio_activity_type
        when 'experiment' then 'experiment'::app.portfolio_activity_type
        else 'photo'::app.portfolio_activity_type
      end,
      'observation'::app.evidence_category,
      p_subject, p_description, p_document_ids, 'family');
  end if;

  insert into public.activity_logs (
    id, student_id, family_id, activity_title, activity_kind, date, duration_minutes,
    subject_id, description, portfolio_item_id,
    created_by, entered_by, source_type, dedupe_key)
  values (
    v_log, p_student, v_family, trim(p_title), coalesce(p_kind,'other'),
    v_when, p_minutes,
    p_subject, nullif(trim(coalesce(p_description,'')),''), v_item,
    v_user, v_user, 'parent',
    app.dedupe_key('activity', v_log));

  return v_log;
end;
$fn$;

-- --- reading ------------------------------------------------------------------

create or replace function public.log_reading(
  p_student      uuid,
  p_book_title   text,
  p_author       text default null,
  p_reading_type app.reading_type default 'independent',
  p_started_on   date default null,
  p_completed_on date default null,
  p_minutes      integer default null,
  p_pages        integer default null,
  p_notes        text default null,
  p_cover_doc    uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_log  uuid := gen_random_uuid();
  v_family uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_book_title), '') = '' then
    raise exception 'a reading log needs a book title' using errcode = 'check_violation';
  end if;

  select s.family_id into v_family from public.students s where s.id = p_student;
  if not found then
    raise exception 'student not found' using errcode = 'insufficient_privilege';
  end if;

  insert into public.reading_logs (
    id, student_id, family_id, book_title, author, reading_type,
    started_on, completed_on, minutes, pages_read, notes, source_document_id,
    created_by, entered_by, source_type)
  values (
    v_log, p_student, v_family, trim(p_book_title),
    nullif(trim(coalesce(p_author,'')),''), coalesce(p_reading_type,'independent'),
    p_started_on, p_completed_on, p_minutes, p_pages,
    nullif(trim(coalesce(p_notes,'')),''), p_cover_doc,
    v_user, v_user, 'parent');

  return v_log;
end;
$fn$;

-- --- privileges ---------------------------------------------------------------
revoke all on function
  public.register_document(text,text,text,text,bigint,text,uuid,uuid,text,app.document_category,app.document_visibility,date),
  public.find_duplicate_document(text),
  public.create_portfolio_item(uuid,text,date,app.portfolio_activity_type,app.evidence_category,uuid,text,uuid[],text),
  public.attach_documents(uuid,uuid[]),
  public.log_activity(uuid,text,app.activity_kind,date,integer,uuid,text,uuid[]),
  public.log_reading(uuid,text,text,app.reading_type,date,date,integer,integer,text,uuid)
from public, anon;

grant execute on function
  public.register_document(text,text,text,text,bigint,text,uuid,uuid,text,app.document_category,app.document_visibility,date),
  public.find_duplicate_document(text),
  public.create_portfolio_item(uuid,text,date,app.portfolio_activity_type,app.evidence_category,uuid,text,uuid[],text),
  public.attach_documents(uuid,uuid[]),
  public.log_activity(uuid,text,app.activity_kind,date,integer,uuid,text,uuid[]),
  public.log_reading(uuid,text,text,app.reading_type,date,date,integer,integer,text,uuid)
to authenticated, service_role;

select app.assert_schema_invariants();
