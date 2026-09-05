-- =============================================================================
-- 0004  Locales and content translations (i18n)
-- =============================================================================
-- Supported locales are DATA, not an enum: adding pt-BR must be an insert, not
-- a migration to every table that references a locale.
-- =============================================================================

create table public.locales (
  code          text primary key,                       -- BCP-47, e.g. 'en-US'
  name          text not null,                          -- English name
  native_name   text not null,
  direction     text not null default 'ltr' check (direction in ('ltr', 'rtl')),
  is_default    boolean not null default false,
  enabled       boolean not null default true,
  sort_order    smallint not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index locales_single_default_idx on public.locales ((is_default)) where is_default;
select app.attach_updated_at('public.locales');

insert into public.locales (code, name, native_name, is_default, sort_order) values
  ('en-US', 'English (United States)', 'English',  true,  10),
  ('es-US', 'Spanish (United States)', 'Español',  false, 20);

-- Translations for user-editable and seeded content (subject names, skill
-- names, compliance rule text, announcement bodies). UI chrome is translated in
-- the app with next-intl message catalogues; this table is for DB content only.
create table public.content_translations (
  id            uuid primary key default gen_random_uuid(),
  record_type   text not null,                          -- 'subjects', 'skills', 'compliance_rules'...
  record_id     uuid not null,
  field         text not null,                          -- 'name', 'description', 'requirement_text'
  locale        text not null references public.locales(code),
  value         text not null,
  is_machine_translated boolean not null default false,
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  organization_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  unique (record_type, record_id, field, locale)
);
create index content_translations_lookup_idx on public.content_translations (record_type, record_id, locale);
create index content_translations_org_idx on public.content_translations (organization_id) where organization_id is not null;
select app.attach_updated_at('public.content_translations');

comment on table public.content_translations is
  'Locale overrides for database-resident content. UI strings live in next-intl catalogues.';

alter table public.locales enable row level security;
alter table public.content_translations enable row level security;
