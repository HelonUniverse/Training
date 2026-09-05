-- =============================================================================
-- 0005  Profiles
-- =============================================================================
-- One row per auth.users row. Application roles are NEVER stored here or in the
-- JWT: they are resolved per request from membership tables so that revocation
-- takes effect immediately.
-- =============================================================================

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  full_name         text,
  preferred_name    text,
  avatar_path       text,
  phone             text,
  locale            text not null default 'en-US' references public.locales(code),
  timezone          text not null default 'America/New_York',
  is_super_admin    boolean not null default false,
  onboarding_state  jsonb not null default '{}'::jsonb,
  notification_quiet_hours jsonb,
  last_seen_at      timestamptz,
  deactivated_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index profiles_email_lower_idx on public.profiles (lower(email));
create index profiles_super_admin_idx on public.profiles (id) where is_super_admin;
create index profiles_name_trgm_idx on public.profiles
  using gin (coalesce(full_name, '') extensions.gin_trgm_ops);
select app.attach_updated_at('public.profiles');

comment on column public.profiles.is_super_admin is
  'Platform staff flag. Grants NOTHING on its own - a matching open row in '
  'support_access_sessions is required for any student-scoped read (break-glass).';
comment on column public.profiles.locale is
  'User interface language preference (next-intl). Falls back to the organization default, then en-US.';

-- Provision a profile whenever Supabase Auth creates a user.
create or replace function app.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en-US'))
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.profiles enable row level security;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();
