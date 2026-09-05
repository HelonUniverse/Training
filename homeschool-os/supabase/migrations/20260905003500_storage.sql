-- =============================================================================
-- 0035  Storage buckets and policies
-- =============================================================================
-- All buckets are PRIVATE. Downloads never happen directly from the client:
-- the app calls /api/documents/[id]/url, which re-checks app.can_read_document,
-- writes a document_viewed audit row, and mints a signed URL valid for minutes.
-- That is why no SELECT policy exists for `authenticated` on document buckets.
--
-- Path convention:  <scope_id>/<student_id|_org>/<document_id>/<filename>
-- where <scope_id> is the owning family_id or organization_id. The first path
-- segment is what the upload policy authorises against.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('uploads-quarantine', 'uploads-quarantine', false, 52428800,
   array['application/pdf','image/png','image/jpeg','image/heic','image/webp',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'text/plain','video/mp4']),
  ('documents',  'documents',  false, 52428800, null),
  ('portfolio',  'portfolio',  false, 524288000, null),
  ('generated',  'generated',  false, 52428800,  array['application/pdf']),
  ('avatars',    'avatars',    false, 5242880,   array['image/png','image/jpeg','image/webp']),
  ('org-branding','org-branding', false, 5242880, array['image/png','image/jpeg','image/svg+xml','image/webp'])
on conflict (id) do nothing;

-- May the caller write under this path prefix? The first folder must be a
-- family or organization the caller belongs to.
create or replace function app.can_upload_to_prefix(p_name text, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  with parts as (select storage.foldername(p_name) as f)
  select case
           when (select array_length(f, 1) from parts) is null then false
           when (select f[1] from parts) !~ '^[0-9a-fA-F-]{36}$' then false
           else app.is_family_member((select f[1] from parts)::uuid, p_user)
             or app.is_org_member((select f[1] from parts)::uuid, null, p_user)
         end;
$$;
grant execute on function app.can_upload_to_prefix(text, uuid) to authenticated, service_role;

-- Uploads land in quarantine and are moved to `documents` by the scanner job
-- (service_role) once they come back clean.
create policy "quarantine insert own scope" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads-quarantine'
              and owner = auth.uid()
              and app.can_upload_to_prefix(name));

-- The uploader may replace or remove their own not-yet-processed upload.
create policy "quarantine manage own upload" on storage.objects
  for update to authenticated
  using (bucket_id = 'uploads-quarantine' and owner = auth.uid())
  with check (bucket_id = 'uploads-quarantine' and owner = auth.uid());
create policy "quarantine delete own upload" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads-quarantine' and owner = auth.uid());

-- Deliberately NO policies for authenticated on documents / portfolio /
-- generated: every read is a server-minted signed URL, and every write is
-- performed by the pipeline under service_role. Adding a SELECT policy here
-- would bypass the audit trail.

create policy "avatars manage own" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "org branding read members" on storage.objects
  for select to authenticated
  using (bucket_id = 'org-branding'
         and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
         and app.can_view_organization(((storage.foldername(name))[1])::uuid));
create policy "org branding write admins" on storage.objects
  for all to authenticated
  using (bucket_id = 'org-branding'
         and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
         and app.is_org_admin(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'org-branding'
              and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
              and app.is_org_admin(((storage.foldername(name))[1])::uuid));
