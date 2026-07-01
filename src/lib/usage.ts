import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS, TRIAL_LIMIT as DEFAULT_TRIAL_LIMIT, getPlan } from '@/lib/plans';

export { PLANS, getPlan };
export type { PlanId } from '@/lib/plans';

/**
 * Límite de comprobantes gratis por mes para orgs sin suscripción activa.
 * Configurable por el admin (tabla app_settings) — cae al default si no está seteado.
 */
export async function getFreeTierLimit(): Promise<number> {
  const db = createAdminClient();
  const { data } = await db.from('app_settings').select('value').eq('key', 'free_tier_limit').maybeSingle();
  const parsed = data?.value ? parseInt(data.value, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_TRIAL_LIMIT;
}

async function getPlanLimit(supabase: Awaited<ReturnType<typeof createClient>>, planId: string | null) {
  const id = planId ?? 'plan_starter';

  // Try DB plan first (supports unlimited = monthlyLimit 0)
  const { data } = await supabase.from('plans').select('name, monthlyLimit').eq('id', id).single();
  if (data) return { label: data.name, monthlyLimit: data.monthlyLimit as number };

  // Fallback to hardcoded
  const p = getPlan(planId);
  return { label: p.label, monthlyLimit: p.monthlyLimit };
}

export async function getOrgUsage(organizationId: string) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from('organizations')
    .select('planId, invoiceCountMonth, invoiceCountResetAt, subscriptionStatus')
    .eq('id', organizationId)
    .single();

  if (!org) return null;

  const [plan, freeTierLimit] = await Promise.all([
    getPlanLimit(supabase, org.planId),
    getFreeTierLimit(),
  ]);
  const isUnlimited = plan.monthlyLimit === 0;

  const now     = new Date();
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

  const isSubscribed   = org.subscriptionStatus === 'ACTIVE';
  const effectiveLimit = isSubscribed
    ? plan.monthlyLimit
    : freeTierLimit;
  const effectiveUnlimited = isSubscribed && isUnlimited;

  return {
    planId:             (org.planId ?? 'plan_starter') as import('@/lib/plans').PlanId,
    planLabel:          plan.label,
    monthlyLimit:       effectiveLimit,
    isUnlimited:        effectiveUnlimited,
    currentCount,
    remaining:          effectiveUnlimited ? Infinity : Math.max(0, effectiveLimit - currentCount),
    percentage:         effectiveUnlimited ? 0 : Math.min(100, Math.round((currentCount / effectiveLimit) * 100)),
    subscriptionStatus: org.subscriptionStatus as string | null,
    isSubscribed,
    isTrial:            !isSubscribed && currentCount < freeTierLimit,
    trialRemaining:     !isSubscribed ? Math.max(0, freeTierLimit - currentCount) : null,
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
    if (usage.currentCount >= usage.monthlyLimit) {
      return {
        allowed: false,
        reason:  `Período de prueba agotado (${usage.currentCount}/${usage.monthlyLimit} comprobantes gratuitos usados). Suscribite para continuar.`,
        current: usage.currentCount,
        limit:   usage.monthlyLimit,
      };
    }
  } else {
    // Unlimited plan: always allow
    if (!usage.isUnlimited && usage.currentCount >= usage.monthlyLimit) {
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
