import type { Json } from '@/types/database.generated';

export type OnboardingRole = 'parent' | 'organization';

/** Persisted in profiles.onboarding_state so a user who leaves resumes here. */
export type OnboardingState = {
  role?: OnboardingRole;
  step?: string;
  completed?: boolean;
  family_id?: string;
  student_id?: string;
  organization_id?: string;
  draft?: Record<string, unknown>;
};

export const PARENT_STEPS = ['child', 'location', 'start', 'subjects', 'goals'] as const;
export const ORG_STEPS = ['profile', 'location', 'size', 'goals'] as const;

export function parseOnboardingState(value: Json | null | undefined): OnboardingState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as OnboardingState;
}

/** Where a returning, un-finished user should be sent. */
export function resumePath(state: OnboardingState): string {
  if (state.completed) {
    return state.role === 'organization' ? '/app/org/home' : '/app/home';
  }
  if (state.role === 'parent') {
    const step = PARENT_STEPS.includes((state.step ?? '') as (typeof PARENT_STEPS)[number])
      ? state.step
      : 'child';
    return `/onboarding/parent/${step}`;
  }
  if (state.role === 'organization') {
    const step = ORG_STEPS.includes((state.step ?? '') as (typeof ORG_STEPS)[number])
      ? state.step
      : 'profile';
    return `/onboarding/organization/${step}`;
  }
  return '/onboarding/role';
}
