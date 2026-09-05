-- =============================================================================
-- 0025  Messaging and announcements
-- =============================================================================
-- Child safety: there is no code path to a private adult-to-minor thread. A
-- thread containing a minor student must also contain one of that student's
-- active guardians, unless it is a moderated class or organization thread.
-- =============================================================================

create table public.message_threads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  family_id       uuid references public.families(id) on delete cascade,
  student_id      uuid references public.students(id) on delete cascade,
  class_id        uuid references public.classes(id) on delete cascade,
  evaluation_id   uuid references public.evaluations(id) on delete set null,
  subject         text,
  type            app.thread_type not null default 'direct',
  status          text not null default 'open' check (status in ('open','archived','closed')),
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id)
);
create index message_threads_org_idx on public.message_threads (organization_id, last_message_at desc);
create index message_threads_student_idx on public.message_threads (student_id);
create index message_threads_class_idx on public.message_threads (class_id);
select app.attach_updated_at('public.message_threads');

create table public.message_thread_participants (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references public.message_threads(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null default 'member' check (role in ('member','owner','moderator')),
  muted         boolean not null default false,
  last_read_at  timestamptz,
  left_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (thread_id, user_id)
);
create index mtp_user_idx on public.message_thread_participants (user_id) where left_at is null;
select app.attach_updated_at('public.message_thread_participants');

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.message_threads(id) on delete cascade,
  sender_user_id  uuid references public.profiles(id) on delete set null,
  body            text,
  attachments     jsonb not null default '[]'::jsonb,     -- document ids
  system_kind     text,
  sent_at         timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  constraint messages_content_ck check (
    coalesce(length(btrim(body)), 0) > 0 or attachments <> '[]'::jsonb or system_kind is not null)
);
create index messages_thread_idx on public.messages (thread_id, sent_at desc);
create index messages_sender_idx on public.messages (sender_user_id);

-- Bumps the thread so inbox ordering never needs an aggregate.
create or replace function app.touch_thread_last_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.message_threads set last_message_at = new.sent_at, updated_at = now()
   where id = new.thread_id;
  return null;
end;
$$;
create trigger touch_thread after insert on public.messages
  for each row execute function app.touch_thread_last_message();

-- Child-safety invariant, enforced as a deferred constraint trigger so a thread
-- can be assembled participant-by-participant inside one transaction.
create or replace function app.enforce_minor_thread_safety()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_type app.thread_type;
  v_minor record;
begin
  select t.type into v_type from public.message_threads t where t.id = new.thread_id;
  if v_type in ('class', 'organization', 'announcement') then
    return null;   -- moderated group contexts
  end if;

  for v_minor in
    select s.id as student_id
      from public.message_thread_participants p
      join public.students s on s.user_id = p.user_id
     where p.thread_id = new.thread_id
       and p.left_at is null
       and s.date_of_birth > (current_date - interval '18 years')
  loop
    if not exists (
      select 1
        from public.message_thread_participants p2
        join public.student_guardians sg
          on sg.user_id = p2.user_id and sg.student_id = v_minor.student_id and sg.revoked_at is null
       where p2.thread_id = new.thread_id and p2.left_at is null)
    then
      raise exception
        'a thread including a minor must also include one of their guardians (student %)',
        v_minor.student_id using errcode = 'check_violation';
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger enforce_minor_thread_safety
  after insert or update on public.message_thread_participants
  deferrable initially deferred
  for each row execute function app.enforce_minor_thread_safety();

create table public.announcements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  body            text not null,
  locale          text references public.locales(code),
  audience        jsonb not null default '{}'::jsonb,      -- roles / class ids / location ids
  publish_at      timestamptz not null default now(),
  expires_at      timestamptz,
  pinned          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  deleted_at      timestamptz
);
create index announcements_org_idx on public.announcements (organization_id, publish_at desc) where deleted_at is null;
select app.attach_updated_at('public.announcements');

alter table public.message_threads enable row level security;
alter table public.message_thread_participants enable row level security;
alter table public.messages enable row level security;
alter table public.announcements enable row level security;
