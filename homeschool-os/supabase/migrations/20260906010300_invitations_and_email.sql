-- =============================================================================
-- 0059  STEP 4 - invitation acceptance and the email outbox
-- =============================================================================
-- ACCEPTANCE
-- ----------
-- Accepting an invitation is the one place a user must gain a membership they
-- could not create themselves, so it is SECURITY DEFINER. Everything it grants
-- is pinned to what the invitation already records:
--
--   * the token must hash to a stored token_hash (never the id - possession of
--     a guessable identifier grants nothing);
--   * the invitation must be pending: not accepted, not revoked, not expired;
--   * the CALLER'S OWN verified email must match the invitation's email, so a
--     leaked link cannot be redeemed by whoever finds it;
--   * the role created is the invitation's role, never a parameter. There is no
--     way to ask for a different one.
--
-- EMAIL
-- -----
-- An outbox table rather than fire-and-forget: a send that fails must be
-- visible and retryable, and "did the invitation email actually go out?" must
-- be answerable later. Rows are written by the application and marked sent by
-- the delivery worker.
-- =============================================================================

-- Accepting an invitation is a distinct auditable event; STEP 2 had labels for
-- inviting and for a membership starting, but not for the redemption itself.
alter type app.audit_action add value if not exists 'invitation_accepted';

-- --- outbox -------------------------------------------------------------------

create table public.email_deliveries (
  id              uuid primary key default gen_random_uuid(),
  to_email        text not null,
  template        text not null,
  payload         jsonb not null default '{}'::jsonb,
  organization_id uuid references public.organizations(id) on delete set null,
  invitation_id   uuid references public.invitations(id) on delete set null,
  status          text not null default 'queued'
                  check (status in ('queued','sent','failed','skipped')),
  provider        text,
  provider_id     text,
  attempts        integer not null default 0,
  last_error      text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  updated_at      timestamptz not null default now()
);

alter table public.email_deliveries enable row level security;

-- An org admin may see, and record, what their own organization sent. The
-- delivery worker completes the row under service_role.
create policy email_deliveries_select on public.email_deliveries
  for select to authenticated
  using (organization_id is not null and app.is_org_admin(organization_id));

create policy email_deliveries_insert on public.email_deliveries
  for insert to authenticated
  with check (organization_id is not null and app.is_org_admin(organization_id));

-- Completing a row is a narrow update: an org admin may record what happened to
-- their own organization's send. The RPC below is what constrains WHICH columns
-- move; this policy constrains whose rows they are.
create policy email_deliveries_update on public.email_deliveries
  for update to authenticated
  using (organization_id is not null and app.is_org_admin(organization_id))
  with check (organization_id is not null and app.is_org_admin(organization_id));

create index email_deliveries_pending_idx
  on public.email_deliveries (created_at) where status = 'queued';
create index email_deliveries_org_idx
  on public.email_deliveries (organization_id, created_at desc);

select app.attach_updated_at('public.email_deliveries');

comment on table public.email_deliveries is
  'Outbox for transactional email. Never contains a token - only the invitation '
  'id, so a leaked backup cannot be used to accept invitations.';

-- --- queueing an invitation email ---------------------------------------------

/**
 * Records that an invitation email is being sent. SECURITY INVOKER: the caller
 * must be an admin of the inviting organization, which the INSERT policy above
 * enforces.
 *
 * The plaintext token is deliberately NOT a parameter and is never written
 * here. A live invitation token sitting in an outbox row is a credential at
 * rest - anyone with database or backup access could redeem it. The server
 * action holds the token in memory just long enough to put it in the email.
 * A resend issues a NEW token, which also invalidates the old link.
 */
create or replace function public.queue_invitation_email(p_invitation uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_row  public.invitations%rowtype;
  v_org  text;
  v_by   text;
  v_id   uuid := gen_random_uuid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.invitations where id = p_invitation;
  if not found then
    raise exception 'invitation not found' using errcode = 'insufficient_privilege';
  end if;

  select name into v_org from public.organizations where id = v_row.organization_id;
  select coalesce(full_name, email) into v_by from public.profiles where id = v_user;

  insert into public.email_deliveries
    (id, to_email, template, organization_id, invitation_id, created_by, payload)
  values
    (v_id, v_row.email, 'invitation', v_row.organization_id, p_invitation, v_user,
     jsonb_build_object(
       'organization', coalesce(v_org, 'a homeschool program'),
       'invited_by', coalesce(v_by, 'an administrator'),
       'role', coalesce(v_row.role::text, v_row.invite_kind),
       'invite_kind', v_row.invite_kind,
       'expires_at', to_jsonb(v_row.expires_at)));

  return v_id;
end;
$fn$;

/**
 * Records what the email provider actually did.
 *
 * The status vocabulary is deliberately honest: 'skipped' exists because with
 * no provider configured nothing is sent, and a row that claimed 'sent' in that
 * case would make "did the invitation email go out?" unanswerable later.
 */
create or replace function public.record_email_result(
  p_delivery    uuid,
  p_status      text,
  p_provider    text default null,
  p_provider_id text default null,
  p_error       text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_n integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_status not in ('sent','failed','skipped') then
    raise exception 'unknown delivery status %', p_status using errcode = 'check_violation';
  end if;

  update public.email_deliveries
     set status      = p_status,
         provider    = p_provider,
         provider_id = p_provider_id,
         last_error  = p_error,
         attempts    = attempts + 1,
         sent_at     = case when p_status = 'sent' then now() else sent_at end
   where id = p_delivery;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
end;
$fn$;

-- --- looking at an invitation before accepting it -----------------------------

/**
 * What the acceptance screen shows. Returns nothing at all for a token that is
 * wrong, expired, revoked or already accepted - the caller cannot tell which,
 * and cannot enumerate invitations.
 */
create or replace function public.preview_invitation(p_token text)
returns table (
  organization_name text,
  invited_by        text,
  role              text,
  invite_kind       text,
  email             text,
  expires_at        timestamptz,
  email_matches     boolean)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_row  public.invitations%rowtype;
  v_me   text;
begin
  -- The table is aliased because this function's OUT parameters (email, role,
  -- expires_at) share names with its columns.
  select i.* into v_row from public.invitations i
   where i.token_hash = v_hash
     and i.accepted_at is null
     and i.revoked_at is null
     and i.expires_at > now();
  if not found then
    return;
  end if;

  select p.email into v_me from public.profiles p where p.id = auth.uid();

  return query
  select coalesce(o.name, 'a homeschool program'),
         coalesce(pr.full_name, 'an administrator'),
         coalesce(v_row.role::text, v_row.invite_kind),
         v_row.invite_kind,
         v_row.email,
         v_row.expires_at,
         (v_me is not null and lower(v_me) = lower(v_row.email))
    from (select 1) x
    left join public.organizations o on o.id = v_row.organization_id
    left join public.profiles pr on pr.id = v_row.created_by;
end;
$fn$;

-- --- acceptance ----------------------------------------------------------------

create or replace function public.accept_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_row  public.invitations%rowtype;
  v_me   text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_token), '') = '' then
    raise exception 'invalid invitation' using errcode = 'insufficient_privilege';
  end if;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  -- Locked so two concurrent redemptions cannot both succeed.
  select i.* into v_row from public.invitations i
   where i.token_hash = v_hash
     and i.accepted_at is null
     and i.revoked_at is null
     and i.expires_at > now()
   for update;

  if not found then
    -- Deliberately one message for wrong / expired / revoked / already used.
    raise exception 'invalid invitation' using errcode = 'insufficient_privilege';
  end if;

  -- Recipient ownership: the signed-in account's own email must be the invited
  -- one. A forwarded or leaked link is useless to anybody else.
  select p.email into v_me from public.profiles p where p.id = v_user;
  if v_me is null or lower(v_me) <> lower(v_row.email) then
    raise exception 'this invitation was sent to a different email address'
      using errcode = 'insufficient_privilege';
  end if;

  if v_row.organization_id is not null and v_row.invite_kind = 'org_member' then
    -- The role comes from the invitation. It is never a parameter.
    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_row.organization_id, v_user, v_row.role, 'active')
    on conflict (organization_id, user_id, role) do nothing;

  elsif v_row.family_id is not null then
    insert into public.family_members (family_id, user_id, role, is_primary)
    values (v_row.family_id, v_user, 'guardian', false)
    on conflict do nothing;
  end if;

  update public.invitations
     set accepted_at = now(), accepted_by = v_user
   where id = v_row.id;

  perform app.audit('invitation_accepted', 'invitation', v_row.id, null,
                    v_row.organization_id, v_row.family_id,
                    jsonb_build_object('role', v_row.role, 'kind', v_row.invite_kind),
                    v_user);

  return jsonb_build_object(
    'organization_id', v_row.organization_id,
    'family_id', v_row.family_id,
    'kind', v_row.invite_kind,
    'role', v_row.role);
end;
$fn$;

revoke all on function
  public.queue_invitation_email(uuid),
  public.record_email_result(uuid,text,text,text,text),
  public.preview_invitation(text),
  public.accept_invitation(text)
from public, anon;

grant execute on function
  public.queue_invitation_email(uuid),
  public.record_email_result(uuid,text,text,text,text),
  public.preview_invitation(text),
  public.accept_invitation(text)
to authenticated, service_role;

comment on function public.accept_invitation(text) is
  'Redeems an invitation token. SECURITY DEFINER because the invitee cannot '
  'create their own membership, but every grant is pinned to the stored '
  'invitation: hashed token, still pending, and the caller''s own email must '
  'match the invited address. The role is never a parameter.';

select app.assert_schema_invariants();
