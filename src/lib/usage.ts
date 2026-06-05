import { createClient } from '@/lib/supabase/server';
import { PLANS, TRIAL_LIMIT, getPlan } from '@/lib/plans';

// Re-export so existing server-side imports don't need to change
export { PLANS, TRIAL_LIMIT, getPlan };
export type { PlanId } from '@/lib/plans';

export async function getOrgUsage(organizationId: string) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from('organizations')
    .select('planId, invoiceCountMonth, invoiceCountResetAt, subscriptionStatus')
    .eq('id', organizationId)
    .single();

  if (!org) return null;

  const plan  = getPlan(org.planId);
  const now   = new Date();
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

  const isSubscribed    = org.subscriptionStatus === 'ACTIVE';
  const effectiveLimit  = isSubscribed ? plan.monthlyLimit : TRIAL_LIMIT;

  return {
    planId:             (org.planId ?? 'plan_starter') as import('@/lib/plans').PlanId,
    planLabel:          plan.label,
    monthlyLimit:       effectiveLimit,
    currentCount,
    remaining:          Math.max(0, effectiveLimit - currentCount),
    percentage:         Math.min(100, Math.round((currentCount / effectiveLimit) * 100)),
    subscriptionStatus: org.subscriptionStatus as string | null,
    isSubscribed,
    isTrial:            !isSubscribed && currentCount < TRIAL_LIMIT,
    trialRemaining:     !isSubscribed ? Math.max(0, TRIAL_LIMIT - currentCount) : null,
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

  if (!usage.isSubscribed) {
    // Trial mode
    if (usage.currentCount >= TRIAL_LIMIT) {
      return {
        allowed: false,
        reason:  `Período de prueba agotado (${usage.currentCount}/${TRIAL_LIMIT} comprobantes gratuitos usados). Suscribite para continuar.`,
        current: usage.currentCount,
        limit:   TRIAL_LIMIT,
      };
    }
  } else {
    // Subscribed: check plan limit
    if (usage.currentCount >= usage.monthlyLimit) {
      return {
        allowed: false,
        reason:  `Límite mensual alcanzado (${usage.currentCount}/${usage.monthlyLimit}). Actualizá tu plan para continuar.`,
        current: usage.currentCount,
        limit:   usage.monthlyLimit,
      };
    }
  }

  const supabase = await createClient();
  await supabase.from('organizations')
    .update({ invoiceCountMonth: usage.currentCount + 1 })
    .eq('id', organizationId);

  return { allowed: true, current: usage.currentCount + 1, limit: usage.monthlyLimit };
}
