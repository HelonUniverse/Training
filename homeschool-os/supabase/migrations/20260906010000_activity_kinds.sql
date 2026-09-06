-- =============================================================================
-- 0056  STEP 4 - activity kinds
-- =============================================================================
-- The activity logger offers a fixed vocabulary (field trip, hands-on, art,
-- music, physical activity, life skills, community, experiment, educational
-- game, other). app.portfolio_activity_type is a DIFFERENT vocabulary - it
-- describes the shape of a piece of evidence (worksheet, writing, photo...),
-- not what the family did. Reusing it would have forced field trips to be
-- recorded as "other" and lost the distinction, so this is its own enum.
-- =============================================================================

create type app.activity_kind as enum (
  'field_trip',
  'hands_on',
  'art',
  'music',
  'physical',
  'life_skills',
  'community',
  'experiment',
  'educational_game',
  'other');

alter table public.activity_logs
  add column activity_kind app.activity_kind not null default 'other';

comment on column public.activity_logs.activity_kind is
  'What the family did. Distinct from portfolio_items.activity_type, which '
  'describes the shape of an attached piece of evidence.';

create index activity_logs_kind_idx
  on public.activity_logs (student_id, activity_kind, date desc)
  where deleted_at is null;

select app.assert_schema_invariants();
