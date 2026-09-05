-- STEP 2.6 / E: representative timings on managed hardware (sanity, not a study).
create or replace function t.time_ms(p_sql text) returns numeric
language plpgsql as $$
declare t0 timestamptz; t1 timestamptz; r record;
begin
  t0 := clock_timestamp();
  for r in execute p_sql loop end loop;
  t1 := clock_timestamp();
  return round(extract(milliseconds from (t1 - t0))::numeric, 2);
end $$;

do $$
declare
  CARLA uuid := '11111111-1111-4111-8111-000000000001';
  TOMAS uuid := '11111111-1111-4111-8111-000000000005';
  ADELE uuid := '11111111-1111-4111-8111-000000000004';
begin
  perform t.login(CARLA);
  raise notice 'parent student dashboard : % ms', t.time_ms('select id, preferred_name, grade_level from public.students');
  raise notice 'parent portfolio feed    : % ms', t.time_ms('select id,title from public.portfolio_items order by occurred_on desc limit 20');
  raise notice 'parent document inbox    : % ms', t.time_ms('select id,original_filename from public.documents order by document_date desc limit 20');
  raise notice 'parent week calendar     : % ms', t.time_ms('select id from public.calendar_event_instances where starts_at between now() and now() + interval ''7 days'' limit 100');
  perform t.logout();
  perform t.login(TOMAS);
  raise notice 'teacher roster           : % ms', t.time_ms('select id, preferred_name from public.students limit 50');
  perform t.logout();
  perform t.login(ADELE);
  raise notice 'organization roster      : % ms', t.time_ms('select id, preferred_name from public.students limit 100');
  raise notice 'org document list        : % ms', t.time_ms('select id from public.documents order by document_date desc limit 50');
  perform t.logout();
end $$;
