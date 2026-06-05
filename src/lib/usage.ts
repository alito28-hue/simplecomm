import { createClient } from '@/lib/supabase/server';

export const PLANS = {
  plan_starter:    { label: 'Starter',    monthlyLimit: 50   },
  plan_pro:        { label: 'Pro',        monthlyLimit: 150  },
  plan_enterprise: { label: 'Enterprise', monthlyLimit: 1500 },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlan(planId: string | null) {
  return PLANS[(planId ?? 'plan_starter') as PlanId] ?? PLANS.plan_starter;
}

export async function getOrgUsage(organizationId: string) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from('organizations')
    .select('planId, invoiceCountMonth, invoiceCountResetAt, subscriptionStatus')
    .eq('id', organizationId)
    .single();

  if (!org) return null;

  const plan = getPlan(org.planId);
  const now  = new Date();
  const resetAt = org.invoiceCountResetAt ? new Date(org.invoiceCountResetAt) : new Date(0);
  const needsReset =
    now.getFullYear() !== resetAt.getFullYear() ||
    now.getMonth()    !== resetAt.getMonth();

  let currentCount = org.invoiceCountMonth ?? 0;

  if (needsReset) {
    await supabase.from('organizations').update({
      invoiceCountMonth:   0,
      invoiceCountResetAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    }).eq('id', organizationId);
    currentCount = 0;
  }

  return {
    planId:             (org.planId ?? 'plan_starter') as PlanId,
    planLabel:          plan.label,
    monthlyLimit:       plan.monthlyLimit,
    currentCount,
    remaining:          Math.max(0, plan.monthlyLimit - currentCount),
    percentage:         Math.min(100, Math.round((currentCount / plan.monthlyLimit) * 100)),
    subscriptionStatus: org.subscriptionStatus,
  };
}

export async function checkAndIncrementUsage(
  organizationId: string
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
  const usage = await getOrgUsage(organizationId);

  if (!usage) {
    return { allowed: false, reason: 'Organización no encontrada', current: 0, limit: 0 };
  }

  if (usage.subscriptionStatus === 'CANCELLED') {
    return { allowed: false, reason: 'Cuenta cancelada. Contactá soporte.', current: usage.currentCount, limit: usage.monthlyLimit };
  }

  if (usage.currentCount >= usage.monthlyLimit) {
    return {
      allowed: false,
      reason:  `Límite mensual alcanzado (${usage.currentCount}/${usage.monthlyLimit}). Actualizá tu plan para continuar.`,
      current: usage.currentCount,
      limit:   usage.monthlyLimit,
    };
  }

  const supabase = await createClient();
  await supabase.from('organizations')
    .update({ invoiceCountMonth: usage.currentCount + 1 })
    .eq('id', organizationId);

  return { allowed: true, current: usage.currentCount + 1, limit: usage.monthlyLimit };
}
