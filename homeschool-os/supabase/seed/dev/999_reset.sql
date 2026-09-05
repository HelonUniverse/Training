-- Removes development fixtures. Development databases only.
\if :{?allow_dev_seed}
\else
  \echo 'ERROR: run with -v allow_dev_seed=on'
  \quit
\endif

do $$
begin
  if coalesce(current_setting('app.environment', true), 'development') = 'production' then
    raise exception 'refusing to delete data in production';
  end if;
end $$;

begin;
delete from public.families where id = 'aaaaaaaa-0000-4000-8000-000000000001';
delete from public.organizations where id = 'aaaaaaaa-0000-4000-8000-000000000021';
commit;
\echo 'Development fixtures removed.'
