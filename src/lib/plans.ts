// Client-safe: no server imports here

export const TRIAL_LIMIT = 10;

export const PLANS = {
  plan_starter:    { label: 'Starter',    monthlyLimit: 50   },
  plan_pro:        { label: 'Pro',        monthlyLimit: 150  },
  plan_enterprise: { label: 'Enterprise', monthlyLimit: 1500 },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlan(planId: string | null) {
  return PLANS[(planId ?? 'plan_starter') as PlanId] ?? PLANS.plan_starter;
}
