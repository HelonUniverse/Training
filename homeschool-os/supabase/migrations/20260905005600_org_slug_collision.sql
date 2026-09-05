-- =============================================================================
-- 0054  STEP 3 - organization slug collisions under RLS
-- =============================================================================
-- Found by running organization onboarding end to end.
--
-- 0053 picked a slug like this:
--
--     if exists (select 1 from public.organizations o where o.slug = v_slug)
--     then v_slug := v_slug || '-' || <random>; end if;
--
-- That `exists` runs as the calling user, so it is subject to RLS on
-- organizations - and a user cannot see organizations they are not a member of.
-- The check therefore reports "free" for a slug that is very much taken by
-- somebody else's organization, and the insert then dies on
-- organizations_slug_key. A second family signing up as "Helon Learning
-- Program" would simply be told "Something went wrong".
--
-- This is the same shape as the bug fixed in 0053 (an RLS-invisible row
-- defeating a pre-check) and the fix is the same in spirit: stop asking a
-- question RLS cannot answer honestly. Instead, TRY the insert and react to the
-- real constraint, which sees every row regardless of visibility. That also
-- closes the race two concurrent signups would otherwise hit.
--
-- Deliberately NOT solved with a SECURITY DEFINER "is this slug free" helper:
-- that would answer questions about rows the caller cannot see, and the unique
-- index already knows the answer authoritatively.
-- =============================================================================

create or replace function public.onboard_organization(
  p_name          text,
  p_type          app.organization_type,
  p_state_code    text,
  p_county        text,
  p_location_name text,
  p_size          text,
  p_goals         text[])
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_org  uuid := gen_random_uuid();
  v_base text;
  v_slug text;
  v_done boolean := false;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'an organization needs a name' using errcode = 'check_violation';
  end if;

  v_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'program'; end if;
  v_base := left(v_base, 40);
  v_slug := v_base;

  -- Try the clean slug first, then increasingly random ones. The unique index
  -- is the authority: it sees rows this user cannot.
  for i in 1..6 loop
    begin
      insert into public.organizations
        (id, name, slug, type, state_code, county, created_by, settings)
      values
        (v_org, trim(p_name), v_slug, p_type, p_state_code,
         nullif(trim(coalesce(p_county, '')), ''), v_user,
         jsonb_build_object(
           'onboarding_size', p_size,
           'onboarding_goals', to_jsonb(coalesce(p_goals, '{}'::text[]))));
      v_done := true;
      exit;
    exception when unique_violation then
      v_slug := v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    end;
  end loop;

  if not v_done then
    raise exception 'could not allocate a unique slug for %', p_name
      using errcode = 'unique_violation';
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org, v_user, 'org_admin', 'active');

  if coalesce(trim(p_location_name), '') <> '' then
    insert into public.organization_locations
      (organization_id, name, is_primary, created_by)
    values (v_org, trim(p_location_name), true, v_user);
  end if;

  update public.profiles
     set onboarding_state = jsonb_build_object(
           'role', 'organization', 'completed', true,
           'organization_id', v_org, 'completed_at', to_jsonb(now()))
   where id = v_user;

  return v_org;
end;
$fn$;

comment on function public.onboard_organization(text,app.organization_type,text,text,text,text,text[]) is
  'Creates an organization and its founding administrator in one transaction as '
  'the calling user. SECURITY INVOKER: RLS applies to every statement. Slug '
  'collisions are resolved by retrying the insert, because an RLS-scoped '
  'SELECT cannot see whether another tenant already holds the slug.';

revoke all on function
  public.onboard_organization(text,app.organization_type,text,text,text,text,text[])
from public, anon;
grant execute on function
  public.onboard_organization(text,app.organization_type,text,text,text,text,text[])
to authenticated, service_role;

-- Deploy-blocking check: two different users asking for the same organization
-- name must both succeed, with different slugs.
do $$
declare
  u1 uuid := '00000000-0000-4000-8000-0000005106f1';
  u2 uuid := '00000000-0000-4000-8000-0000005106f2';
  o1 uuid; o2 uuid; s1 text; s2 text;
begin

  insert into auth.users (id, email) values
    (u1, 'slug1@invariant.local'), (u2, 'slug2@invariant.local')
  on conflict (id) do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  o1 := public.onboard_organization('Collision Test Program', 'other', 'FL', null, null, null, '{}');

  perform set_config('request.jwt.claims',
    json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  o2 := public.onboard_organization('Collision Test Program', 'other', 'FL', null, null, null, '{}');

  select slug into s1 from public.organizations where id = o1;
  select slug into s2 from public.organizations where id = o2;

  if s1 is null or s2 is null or s1 = s2 then
    raise exception 'slug collision not resolved (% vs %)', s1, s2;
  end if;

  perform set_config('request.jwt.claims', '', true);

  delete from public.organization_members where organization_id in (o1, o2);
  delete from public.organizations where id in (o1, o2);
  delete from auth.users where id in (u1, u2);

  raise notice 'organization slug collision handling verified (% / %)', s1, s2;
end $$;
