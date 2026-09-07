-- =============================================================================
-- 0076  Who says this skill relates to this standard, and with what authority
-- =============================================================================
-- 0067 gave the crosswalk a relation and an `active` flag. That is enough to
-- record THAT a mapping exists and not enough to record what KIND of claim it
-- is. "Nestra reviewed this", "the state publishes this relationship" and "a
-- curriculum vendor says so in their marketing" are three different claims with
-- three different weights, and collapsing them into `aligned = true` is how a
-- vendor's assertion ends up shown to a family as a fact.
--
-- AI PROPOSES. A suggested mapping enters as `proposed` with an ai_suggested
-- provenance and stays internal until a person approves it. A confidence of
-- 0.99 does not bypass review; confidence is metadata on a suggestion, never a
-- permission.
--
-- MAPPING SEMANTICS. 0067 had exact / narrower / broader / related. The domain
-- wants two more: `partial` (the skill covers part of the benchmark, which is
-- not the same as being narrower in scope) and `supporting` (the skill is
-- practised in service of the benchmark without being part of it).
-- =============================================================================

alter type app.crosswalk_relation add value if not exists 'partial';
alter type app.crosswalk_relation add value if not exists 'supporting';
