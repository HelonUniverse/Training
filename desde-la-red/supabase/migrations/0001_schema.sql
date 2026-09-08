-- ============================================================================
-- Desde la Red — esquema inicial
--
-- Dos familias de tablas:
--   · Contenido  (guías, enseñanzas, servicios, círculos, eventos, voces)
--     lo lee cualquiera; solo las administradoras lo escriben.
--   · Personal   (guardadas, leídas, círculos, resonancias, camino, reservas)
--     cada persona solo ve y toca lo suyo.
-- ============================================================================

-- ---------------------------------------------------------------- perfiles
-- Se crea solo al registrarse (ver el trigger al final).
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null default '',
  email       text,
  role        text not null default 'member' check (role in ('member', 'admin')),
  created_at  timestamptz not null default now()
);

comment on column public.profiles.role is
  'member = persona que usa la app. admin = administradora: puede publicar contenido.';

-- ¿Quien pide es administradora? Se usa en las políticas de abajo.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------- contenido

create table if not exists public.guides (
  id           text primary key,
  name         text not null,
  title        text not null default '',
  location     text default '',
  initials     text not null default '',
  accent       text not null default 'cyan' check (accent in ('cyan', 'glow', 'electric')),
  years        integer not null default 0,
  circle_count integer not null default 0,
  rating       numeric(2,1) not null default 5.0,
  bio          text default '',
  approach     text[] not null default '{}',
  languages    text[] not null default '{}',
  verified     boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.teachings (
  id             text primary key,
  title          text not null,
  subtitle       text default '',
  theme          text not null,
  image_key      text not null,
  author_id      text references public.guides(id) on delete set null,
  read_minutes   integer not null default 5,
  listen_minutes integer not null default 6,
  published_on   text default '',
  excerpt        text default '',
  body           jsonb not null default '[]'::jsonb,
  tags           text[] not null default '{}',
  featured       boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists teachings_author_idx on public.teachings (author_id);
create index if not exists teachings_featured_idx on public.teachings (featured) where featured;

create table if not exists public.services (
  id               text primary key,
  guide_id         text not null references public.guides(id) on delete cascade,
  name             text not null,
  format           text not null check (format in ('Individual', 'Círculo', 'Intensivo')),
  modality         text not null check (modality in ('En línea', 'Presencial')),
  duration_minutes integer not null default 60,
  price            numeric(10,2) not null default 0,
  currency         text not null default 'USD',
  description      text default '',
  includes         text[] not null default '{}',
  sort_order       integer not null default 0
);

create index if not exists services_guide_idx on public.services (guide_id);

create table if not exists public.circles (
  id         text primary key,
  name       text not null,
  image_key  text not null,
  guide_id   text references public.guides(id) on delete set null,
  members    integer not null default 0,
  cadence    text default '',
  intention  text default '',
  topics     text[] not null default '{}',
  sort_order integer not null default 0
);

create table if not exists public.live_events (
  id               text primary key,
  title            text not null,
  guide_id         text references public.guides(id) on delete set null,
  image_key        text not null,
  starts_label     text not null default '',
  starts_at        timestamptz,
  duration_minutes integer not null default 60,
  attendees        integer not null default 0,
  status           text not null default 'scheduled' check (status in ('live', 'soon', 'scheduled')),
  description      text default '',
  sort_order       integer not null default 0
);

-- Voces de La Red. author_id apunta al perfil cuando la escribe alguien de
-- la app; author_name cubre el contenido sembrado por la Red.
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references public.profiles(id) on delete set null,
  author_name  text not null default '',
  author_role  text not null default 'Caminante',
  accent       text not null default 'cyan' check (accent in ('cyan', 'glow', 'electric')),
  text         text not null,
  circle_id    text references public.circles(id) on delete set null,
  replies      integer not null default 0,
  -- Las resonancias reales viven en post_resonances. Esto es el número con el
  -- que arranca una voz sembrada, para que no empiece en cero.
  base_resonances integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);

-- Las preguntas de Mi Camino también son contenido editable.
create table if not exists public.path_questions (
  id         text primary key,
  prompt     text not null,
  helper     text default '',
  multiple   boolean not null default false,
  options    jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0
);

-- ----------------------------------------------------------------- personal

create table if not exists public.saved_teachings (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  teaching_id text not null references public.teachings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, teaching_id)
);

create table if not exists public.read_teachings (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  teaching_id text not null references public.teachings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, teaching_id)
);

create table if not exists public.circle_members (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  circle_id  text not null references public.circles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, circle_id)
);

create table if not exists public.post_resonances (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.path_answers (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  question_id text not null,
  option_ids  text[] not null default '{}',
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  service_id text not null references public.services(id) on delete cascade,
  guide_id   text references public.guides(id) on delete set null,
  date_label text not null,
  time_label text not null,
  note       text,
  status     text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);

-- ========================================================== seguridad (RLS)
-- Sin esto, cualquiera con la clave pública podría leer y escribir todo.

alter table public.profiles        enable row level security;
alter table public.guides          enable row level security;
alter table public.teachings       enable row level security;
alter table public.services        enable row level security;
alter table public.circles         enable row level security;
alter table public.live_events     enable row level security;
alter table public.posts           enable row level security;
alter table public.path_questions  enable row level security;
alter table public.saved_teachings enable row level security;
alter table public.read_teachings  enable row level security;
alter table public.circle_members  enable row level security;
alter table public.post_resonances enable row level security;
alter table public.path_answers    enable row level security;
alter table public.bookings        enable row level security;

-- Perfiles: cada quien ve y edita el suyo; las administradoras ven todos.
drop policy if exists "perfil propio visible" on public.profiles;
create policy "perfil propio visible" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "perfil propio editable" on public.profiles;
create policy "perfil propio editable" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Contenido: lo lee cualquiera, incluso sin cuenta. Lo escriben las admins.
do $$
declare t text;
begin
  foreach t in array array['guides','teachings','services','circles','live_events','path_questions']
  loop
    execute format('drop policy if exists "contenido visible" on public.%I', t);
    execute format(
      'create policy "contenido visible" on public.%I for select using (true)', t);
    execute format('drop policy if exists "solo admin escribe" on public.%I', t);
    execute format(
      'create policy "solo admin escribe" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Voces: se leen abiertas; una persona escribe y borra las suyas.
drop policy if exists "voces visibles" on public.posts;
create policy "voces visibles" on public.posts for select using (true);

drop policy if exists "escribo mis voces" on public.posts;
create policy "escribo mis voces" on public.posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "edito mis voces" on public.posts;
create policy "edito mis voces" on public.posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "borro mis voces" on public.posts;
create policy "borro mis voces" on public.posts
  for delete using (auth.uid() = author_id or public.is_admin());

-- Tablas personales: cada quien, solo lo suyo.
do $$
declare t text;
begin
  foreach t in array array['saved_teachings','read_teachings','circle_members',
                           'post_resonances','path_answers','bookings']
  loop
    execute format('drop policy if exists "solo lo mio" on public.%I', t);
    execute format(
      'create policy "solo lo mio" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ============================================ perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
