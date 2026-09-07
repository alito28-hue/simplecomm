import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComprobantesUnificados } from '@/lib/facturas';

/**
 * Facturas emitidas que todavía no se marcaron como cobradas, de CUALQUIER mes — no solo el
 * actual. Antes solo existía la columna "Cobro" adentro de Comprobantes, mezclada con la
 * gestión mensual de facturación; no había ninguna vista que mostrara de un vistazo "esto es
 * lo que me deben" cruzando todo el historial.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [all, { data: pagos }] = await Promise.all([
    getComprobantesUnificados(supabase, user.id),
    supabase.from('invoice_payments').select('invoiceId, status').eq('organizationId', user.id).eq('status', 'PAID'),
  ]);

  const pagadas = new Set((pagos ?? []).map(p => p.invoiceId));
  const pendientes = all
    .filter(c => c.status === 'issued' && !pagadas.has(c.invoice_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at)); // más antiguas primero

  const totalPendiente = pendientes.reduce((s, c) => s + c.total_amount, 0);

  return NextResponse.json({ data: pendientes, totalPendiente });
}
