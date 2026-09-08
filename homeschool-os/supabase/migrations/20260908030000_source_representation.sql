-- =============================================================================
-- 0079  Representation: a third question, kept apart from the first two
-- =============================================================================
-- 0074 recorded WHO published an artifact (`authority`).
-- 0078 recorded WHAT the artifact is (`artifact_kind`).
-- Neither records HOW the content is carried, and that turns out to decide
-- whether a benchmark can be read at all.
--
-- The artifact that made this concrete: CPALMS publishes Florida's B.E.S.T.
-- Mathematics standards as a file named `.doc`, served with a Word MIME type,
-- which Word opens. Its bytes are `<html><body>` - HTML markup whose benchmark
-- code and benchmark wording are adjacent cells of one table row. The same
-- standards, from the same authority, also exist as a PDF whose fonts carry no
-- usable ToUnicode map, where the same association has to be inferred from x/y
-- coordinates and where 358 of 3,740 K-5 text spans cannot be decoded by any
-- extractor.
--
-- Those two artifacts have IDENTICAL authority and IDENTICAL artifact_kind.
-- They are not identically trustworthy, and the difference is not a property of
-- the publisher or of the document's purpose. It is a property of the
-- representation:
--
--   canonical_structured  the association between an identity and its wording
--                         is explicit in the markup - a row, a record, a cell.
--                         Read, not inferred.
--   canonical_html        markup, but prose-flow: the association has to be
--                         recovered from document order and heading structure.
--   canonical_pdf         a page description. Association comes from layout
--                         geometry, and the text itself may not be recoverable.
--
-- WHY THIS IS NOT `detected_format`. Format answers "what are these bytes":
-- html, pdf, xlsx. Representation answers "what can be read out of them with
-- confidence". The CPALMS export is format=html AND
-- representation=canonical_structured; a state's press release about its
-- standards would also be format=html but representation=canonical_html. One
-- column cannot carry both without one of the two meanings quietly losing.
--
-- Nothing here gates publication on representation. A PDF-derived import is not
-- forbidden - Phase A built the layout and glyph-fidelity guards precisely so a
-- PDF can be refused on evidence rather than on category. What this column does
-- is make the difference RECORDED, so "which representation did this benchmark
-- come out of" is answerable years later without re-opening the file.
-- =============================================================================

create type app.source_representation as enum (
  'canonical_structured',  -- identity and wording explicitly associated in the markup
  'canonical_html',        -- markup, prose-flow; association from document order
  'canonical_pdf',         -- page description; association from layout geometry
  'canonical_tabular',     -- a real spreadsheet or delimited export
  'canonical_api',         -- a machine endpoint the authority operates
  'unstructured_text',     -- plain text with no structure to lean on
  'unknown');              -- registered before anybody looked. Honest default.

alter table public.standards_sources
  add column representation app.source_representation not null default 'unknown';

comment on column public.standards_sources.representation is
  'HOW the content is carried, which is a third question from who published it '
  '(authority) and what it is (artifact_kind). A .doc that is really HTML tables '
  'and a PDF of the same standards share an authority and a kind and are not '
  'equally readable; this is where that difference is recorded.';

-- --- where the acquisition actually happened ---------------------------------
-- `source_url` already exists and has been carrying two different facts at
-- once: the page a human should visit to check the document, and the URL the
-- bytes were fetched from. For CPALMS those differ - the page is
-- cpalms.org/downloads, the bytes come from a blob-storage host - and a
-- provenance record that cannot tell them apart cannot be checked.

alter table public.standards_sources
  add column official_source_page text,
  add column acquisition_url      text,
  add column acquired_at          timestamptz;

comment on column public.standards_sources.official_source_page is
  'The page a person should open to see this document published by its '
  'authority. What a spot check starts from.';
comment on column public.standards_sources.acquisition_url is
  'The URL these exact bytes were retrieved from, which is frequently a CDN or '
  'blob host rather than the page above.';

/**
 * Registration, now able to declare the representation and the full acquisition
 * trail. Replaces the 11-argument form from 0078.
 *
 * `representation` has no default value that flatters the artifact:
 * `unknown` is what you get by saying nothing, and it is accurate - nobody
 * looked. An importer that has looked passes what it found.
 *
 * Re-registering the same bytes stays a no-op returning the existing row, and
 * that is deliberate: the sha256 is the identity, so a second registration with
 * different provenance claims must not silently overwrite the first one's.
 */
create or replace function public.register_standards_source(
  p_authority       text,
  p_authority_name  text,
  p_artifact_name   text,
  p_detected_format text,
  p_sha256          text,
  p_byte_size       bigint,
  p_source_url      text default null,
  p_declared_mime   text default null,
  p_language        text default 'en-US',
  p_published_on    date default null,
  p_artifact_kind   text default 'other_reference',
  p_representation  text default 'unknown',
  p_official_source_page text default null,
  p_acquisition_url text default null,
  p_acquired_at     timestamptz default null,
  p_notes           text default null)
returns uuid language plpgsql security invoker set search_path = '' as $fn$
declare v_id uuid;
begin
  if not app.is_standards_admin() then
    raise exception 'standards administration is a platform capability'
      using errcode = 'insufficient_privilege';
  end if;

  select id into v_id from public.standards_sources where sha256 = lower(p_sha256);
  if found then
    return v_id;   -- same bytes, same source. Re-registering is a no-op.
  end if;

  insert into public.standards_sources (
    authority, authority_name, artifact_name, detected_format, declared_mime,
    sha256, byte_size, source_url, source_language, source_published_on,
    artifact_kind, representation, official_source_page, acquisition_url,
    acquired_at, source_notes, created_by)
  values (p_authority::app.standards_source_authority, p_authority_name, p_artifact_name,
          p_detected_format::app.standards_source_format, p_declared_mime,
          lower(p_sha256), p_byte_size,
          coalesce(p_source_url, p_official_source_page), p_language, p_published_on,
          p_artifact_kind::app.source_artifact_kind,
          p_representation::app.source_representation,
          p_official_source_page, p_acquisition_url, p_acquired_at, p_notes, auth.uid())
  returning id into v_id;
  return v_id;
end $fn$;

-- The 11-argument form is gone: leaving it would leave a registration path that
-- silently cannot declare a representation, which is how the column would end
-- up permanently 'unknown' for everything.
drop function if exists public.register_standards_source(
  text, text, text, text, text, bigint, text, text, text, date, text);

revoke all on function public.register_standards_source(
  text, text, text, text, text, bigint, text, text, text, date, text, text,
  text, text, timestamptz, text) from public, anon;
grant execute on function public.register_standards_source(
  text, text, text, text, text, bigint, text, text, text, date, text, text,
  text, text, timestamptz, text) to authenticated, service_role;

select app.assert_schema_invariants();
