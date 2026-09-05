-- =============================================================================
-- 0053  STEP 3 - atomic onboarding entry points
-- =============================================================================
-- Onboarding writes several related rows (family, membership, student,
-- guardianship, academic year, subjects). Through PostgREST each of those is a
-- separate HTTP call, so a failure halfway leaves a half-built family - exactly
-- the "partial onboarding must not leave corrupted relationships" risk.
--
-- These functions are SECURITY INVOKER on purpose. They run as the CALLING
-- user, so every statement inside is still evaluated against RLS exactly as if
-- the client had issued it - the caller gains no authority they did not already
-- have. What they gain is atomicity: PostgREST runs one RPC in one transaction,
-- so the whole graph commits or none of it does.
--
-- This is the opposite of a service-role shortcut. Nothing here bypasses the
-- authorization system; it only makes the writes the user is already allowed to
-- make happen together.
--
-- NOTE ON `RETURNING`: under RLS, INSERT ... RETURNING also applies the SELECT
-- policy to the row it hands back. A newly inserted student is NOT yet readable
-- by the parent who created it, because student readability flows from the
-- guardian link - which is inserted on the NEXT statement. So `returning id into`
-- fails on students with "new row violates row-level security policy", even
-- though the insert itself is authorised. Ids are therefore generated up front
-- with gen_random_uuid() and inserted explicitly; nothing here needs to read a
-- row back before its relationships exist.
-- =============================================================================

create or replace function public.onboard_parent(
  p_family_name     text,
  p_state_code      text,
  p_county          text,
  p_start_date      date,
  p_child_first     text,
  p_child_last      text,
  p_child_preferred text,
  p_child_dob       date,
  p_subjects        text[],
  p_goals           text[])
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user    uuid := auth.uid();
  v_family  uuid := gen_random_uuid();
  v_student uuid := gen_random_uuid();
  v_year    uuid := gen_random_uuid();
  v_subject text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_child_first), '') = '' or coalesce(trim(p_child_last), '') = '' then
    raise exception 'a child needs a first and last name' using errcode = 'check_violation';
  end if;

  insert into public.families
    (id, name, created_by, primary_guardian_id, state_code, county,
     is_independent, homeschool_start_date, settings)
  values
    (v_family,
     coalesce(nullif(trim(p_family_name), ''), trim(p_child_last) || ' Family'),
     v_user, v_user, p_state_code, nullif(trim(coalesce(p_county, '')), ''),
     true, p_start_date,
     jsonb_build_object('onboarding_goals', to_jsonb(coalesce(p_goals, '{}'::text[]))));

  insert into public.family_members (family_id, user_id, role, is_primary)
  values (v_family, v_user, 'guardian', true);

  insert into public.students
    (id, family_id, legal_first_name, legal_last_name, preferred_name, date_of_birth,
     state_code, county, homeschool_start_date, created_by)
  values
    (v_student, v_family, trim(p_child_first), trim(p_child_last),
     nullif(trim(coalesce(p_child_preferred, '')), ''), p_child_dob,
     p_state_code, nullif(trim(coalesce(p_county, '')), ''), p_start_date, v_user);

  insert into public.student_guardians
    (student_id, user_id, relationship, is_primary, access_level, granted_by)
  values (v_student, v_user, 'parent', true, 'full', v_user);

  -- A current academic year so the calendar and learning plan have a home.
  insert into public.academic_years (id, family_id, name, starts_on, ends_on, is_current, created_by)
  values (
    v_year, v_family,
    to_char(p_start_date, 'YYYY') || '-' || to_char(p_start_date + interval '1 year', 'YYYY'),
    p_start_date,
    (p_start_date + interval '1 year' - interval '1 day')::date,
    true, v_user);

  update public.students set current_academic_year_id = v_year where id = v_student;

  foreach v_subject in array coalesce(p_subjects, '{}'::text[]) loop
    insert into public.subjects (family_id, slug, name, is_system, created_by)
    values (v_family, v_subject, initcap(replace(v_subject, '_', ' ')), false, v_user)
    on conflict do nothing;
  end loop;

  update public.profiles
     set onboarding_state = jsonb_build_object(
           'role', 'parent', 'completed', true,
           'family_id', v_family, 'student_id', v_student,
           'completed_at', to_jsonb(now()))
   where id = v_user;

  return v_student;
end;
$fn$;

comment on function public.onboard_parent(text,text,text,date,text,text,text,date,text[],text[]) is
  'Creates the whole parent graph in one transaction as the calling user. '
  'SECURITY INVOKER: RLS applies to every statement, so this grants no authority.';

-- --- adding a second (or third) child ---------------------------------------

create or replace function public.add_child(
  p_family_id       uuid,
  p_child_first     text,
  p_child_last      text,
  p_child_preferred text,
  p_child_dob       date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user    uuid := auth.uid();
  v_student uuid := gen_random_uuid();
  v_state   text;
  v_county  text;
  v_start   date;
  v_year    uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Readable only if the caller is a member of this family, per RLS.
  select f.state_code, f.county, f.homeschool_start_date
    into v_state, v_county, v_start
    from public.families f where f.id = p_family_id;

  if not found then
    raise exception 'family not found' using errcode = 'insufficient_privilege';
  end if;

  insert into public.students
    (id, family_id, legal_first_name, legal_last_name, preferred_name, date_of_birth,
     state_code, county, homeschool_start_date, created_by)
  values
    (v_student, p_family_id, trim(p_child_first), trim(p_child_last),
     nullif(trim(coalesce(p_child_preferred, '')), ''), p_child_dob,
     v_state, v_county, v_start, v_user);

  insert into public.student_guardians
    (student_id, user_id, relationship, is_primary, access_level, granted_by)
  values (v_student, v_user, 'parent', true, 'full', v_user);

  select ay.id into v_year
    from public.academic_years ay
   where ay.family_id = p_family_id and ay.is_current
   limit 1;

  if v_year is not null then
    update public.students set current_academic_year_id = v_year where id = v_student;
  end if;

  return v_student;
end;
$fn$;

-- --- organization ------------------------------------------------------------

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
  v_slug text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'an organization needs a name' using errcode = 'check_violation';
  end if;

  -- Slug: readable, unique, and never a source of collision failures during
  -- onboarding. The random suffix is only added if the clean slug is taken.
  v_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'program'; end if;
  if exists (select 1 from public.organizations o where o.slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
  end if;

  insert into public.organizations
    (id, name, slug, type, state_code, county, created_by, settings)
  values
    (v_org, trim(p_name), v_slug, p_type, p_state_code,
     nullif(trim(coalesce(p_county, '')), ''), v_user,
     jsonb_build_object(
       'onboarding_size', p_size,
       'onboarding_goals', to_jsonb(coalesce(p_goals, '{}'::text[]))));

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
  'the calling user. SECURITY INVOKER: RLS applies to every statement.';

-- --- privileges --------------------------------------------------------------
-- These are the only public functions an ordinary session may call.
revoke all on function
  public.onboard_parent(text,text,text,date,text,text,text,date,text[],text[]),
  public.add_child(uuid,text,text,text,date),
  public.onboard_organization(text,app.organization_type,text,text,text,text,text[])
from public, anon;

grant execute on function
  public.onboard_parent(text,text,text,date,text,text,text,date,text[],text[]),
  public.add_child(uuid,text,text,text,date),
  public.onboard_organization(text,app.organization_type,text,text,text,text,text[])
to authenticated, service_role;

-- The invariant added in 0050 requires every function in app/public to pin
-- search_path; these do. Re-assert so a regression here is caught at deploy.
select app.assert_schema_invariants();
