'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/guard';
import { parseOnboardingState, type OnboardingRole, type OnboardingState } from '@/lib/onboarding';
import { mapOrgTypeToSchema, type OrgTypeSlug } from '@/lib/reference';

export type ActionState = { error?: string } | undefined;

/**
 * All of these run through the user-scoped client. RLS decides what is allowed;
 * nothing here uses the service role. The multi-row writes go through the
 * SECURITY INVOKER RPCs added in migration 0053 so they are atomic.
 */

async function readState(): Promise<OnboardingState> {
  const supabase = await createClient();
  const user = await requireUser();
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_state')
    .eq('id', user.id)
    .maybeSingle();
  return parseOnboardingState(data?.onboarding_state);
}

/** Merge-and-save, so a half-finished flow survives a closed tab. */
async function saveState(patch: Partial<OnboardingState>): Promise<void> {
  const supabase = await createClient();
  const user = await requireUser();
  const current = await readState();
  const next = { ...current, ...patch, draft: { ...current.draft, ...patch.draft } };
  await supabase
    .from('profiles')
    .update({ onboarding_state: next as never })
    .eq('id', user.id);
}

export async function chooseRole(role: OnboardingRole): Promise<void> {
  await requirePermission();
  await saveState({ role, step: role === 'parent' ? 'child' : 'profile' });
  revalidatePath('/onboarding', 'layout');
  redirect(role === 'parent' ? '/onboarding/parent/child' : '/onboarding/organization/profile');
}

/** Persist one step's answers and advance. */
export async function saveStep(
  step: string,
  draft: Record<string, unknown>,
  nextPath: string,
): Promise<void> {
  await requirePermission();
  await saveState({ step, draft });
  redirect(nextPath);
}

export async function completeParentOnboarding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  await requirePermission();

  const state = await readState();
  const d = (state.draft ?? {}) as Record<string, string | string[] | undefined>;

  const goals = formData.getAll('goals').map(String);
  const subjects = (d.subjects as string[] | undefined) ?? [];

  const firstName = String(d.childFirstName ?? '').trim();
  const lastName = String(d.childLastName ?? '').trim();
  const dob = String(d.childDob ?? '');
  const stateCode = String(d.stateCode ?? '');
  const startDate = String(d.startDate ?? '');

  if (!firstName || !lastName || !dob || !stateCode || !startDate) {
    return { error: 'onboarding.errors.incomplete' };
  }

  const { data, error } = await supabase.rpc('onboard_parent', {
    p_family_name: `${lastName} Family`,
    p_state_code: stateCode,
    p_county: String(d.county ?? ''),
    p_start_date: startDate,
    p_child_first: firstName,
    p_child_last: lastName,
    p_child_preferred: String(d.childPreferredName ?? ''),
    p_child_dob: dob,
    p_subjects: subjects,
    p_goals: goals,
  });

  if (error || !data) {
    return { error: 'auth.errors.generic' };
  }

  revalidatePath('/', 'layout');
  redirect('/onboarding/parent/complete');
}

export async function completeOrganizationOnboarding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  await requirePermission();

  const state = await readState();
  const d = (state.draft ?? {}) as Record<string, string | string[] | undefined>;

  const goals = formData.getAll('goals').map(String);
  const name = String(d.orgName ?? '').trim();
  const typeSlug = String(d.orgType ?? 'other') as OrgTypeSlug;
  const stateCode = String(d.orgStateCode ?? '');

  if (!name || !stateCode) return { error: 'onboarding.errors.incomplete' };

  const { data, error } = await supabase.rpc('onboard_organization', {
    p_name: name,
    p_type: mapOrgTypeToSchema(typeSlug),
    p_state_code: stateCode,
    p_county: String(d.orgCounty ?? ''),
    p_location_name: String(d.orgLocationName ?? ''),
    p_size: String(d.orgSize ?? ''),
    p_goals: goals,
  });

  if (error || !data) return { error: 'auth.errors.generic' };

  revalidatePath('/', 'layout');
  redirect('/app/org/home');
}

export async function addChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  await requirePermission();

  const familyId = String(formData.get('familyId') ?? '');
  const first = String(formData.get('firstName') ?? '').trim();
  const last = String(formData.get('lastName') ?? '').trim();
  const preferred = String(formData.get('preferredName') ?? '').trim();
  const dob = String(formData.get('dob') ?? '');

  if (!familyId || !first || !last || !dob) return { error: 'onboarding.errors.incomplete' };

  const { error } = await supabase.rpc('add_child', {
    p_family_id: familyId,
    p_child_first: first,
    p_child_last: last,
    p_child_preferred: preferred,
    p_child_dob: dob,
  });

  if (error) return { error: 'auth.errors.generic' };

  revalidatePath('/app', 'layout');
  redirect('/app/home');
}
