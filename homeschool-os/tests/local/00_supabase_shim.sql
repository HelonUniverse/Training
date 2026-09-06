-- Local-only shim reproducing the parts of a Supabase project the migrations depend on.
-- NEVER applied to a real Supabase project (auth/storage schemas already exist there).
create schema if not exists auth;
create schema if not exists storage;

do $$ begin
  create role anon nologin noinherit;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin noinherit;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin noinherit bypassrls;
exception when duplicate_object then null; end $$;
do $$ begin
  create role supabase_auth_admin nologin noinherit;
exception when duplicate_object then null; end $$;

create schema if not exists extensions;

-- Supabase grants the API roles USAGE on auth and storage. Without this a
-- SECURITY INVOKER function body calling auth.uid() as `authenticated` fails
-- with "permission denied for schema auth", which real Supabase does not do.
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
create extension if not exists pgcrypto with schema extensions;

-- Mirrors the columns of Supabase's auth.users that the migrations and the
-- acceptance fixtures actually touch.
create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key default gen_random_uuid(),
  aud varchar(255),
  role varchar(255),
  email text,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  confirmation_token varchar(255),
  recovery_token varchar(255),
  email_change_token_new varchar(255),
  email_change varchar(255),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Supabase reads these from the request JWT; locally we drive them with a GUC.
-- Same resolution order as Supabase's own auth.uid(): the individual claim GUC
-- first, then the full claims JSON that PostgREST sets.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'authenticated');
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  -- Real Supabase carries both: `owner` (uuid, legacy) and `owner_id` (text).
  -- The shim lacked owner_id, so tests written against the managed platform
  -- died locally on a missing column instead of on a real assertion.
  owner_id text,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;

-- Supabase grants the API roles full DML on storage.objects and lets RLS do the
-- deciding. Without these grants the local harness fails with "permission
-- denied" before any policy is consulted, which reads like a policy pass.
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;

-- Managed Supabase installs storage.protect_delete(), which blocks every direct
-- SQL DELETE from storage.objects - including as service_role - so that object
-- removal always goes through the Storage HTTP API and the file itself is
-- actually deleted. Mirrored here so local and managed behave the same.
create or replace function storage.protect_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'delete from storage.objects is not permitted; use the Storage API'
    using errcode = 'insufficient_privilege';
end $$;
drop trigger if exists protect_delete on storage.objects;
create trigger protect_delete before delete on storage.objects
  for each row execute function storage.protect_delete();

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$ select string_to_array(name, '/'); $$;
