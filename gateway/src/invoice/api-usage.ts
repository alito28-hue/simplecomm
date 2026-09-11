import { db } from '../db/client';

export interface QuotaResult {
  ok: boolean;
  message?: string;
}

/**
 * Aplica el cupo mensual del "Plan API" — solo corre para keys de uso directo (monthlyLimit
 * no-null). La key interna que usa la propia app de SimpleComm tiene monthlyLimit null y
 * siempre pasa sin tocar nada: ese límite lo controla la app en su propia base, no acá.
 */
export async function enforceApiKeyQuota(apiKeyId: string): Promise<QuotaResult> {
  const key = await db.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!key || key.monthlyLimit == null) return { ok: true };

  const now = new Date();
  let count = key.monthlyCount;
  let resetAt = key.countResetAt ?? now;
  const needsReset = now.getUTCFullYear() !== resetAt.getUTCFullYear() || now.getUTCMonth() !== resetAt.getUTCMonth();
  if (needsReset) {
    count = 0;
    resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  if (count >= key.monthlyLimit) {
    if (needsReset) {
      await db.apiKey.update({ where: { id: apiKeyId }, data: { monthlyCount: 0, countResetAt: resetAt } });
    }
    return {
      ok: false,
      message: `Límite mensual de la API alcanzado (${key.monthlyLimit} comprobantes/mes). Escribinos a soporte@simplecomm.com.ar para ampliarlo.`,
    };
  }

  await db.apiKey.update({ where: { id: apiKeyId }, data: { monthlyCount: count + 1, countResetAt: resetAt } });
  return { ok: true };
}
