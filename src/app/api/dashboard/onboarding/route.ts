import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase
    .from('organizations')
    .select('name, cuit, afipConfigured, gatewayTenantId, gatewayApiKey, ptoVta')
    .eq('id', user.id)
    .maybeSingle();

  const empresaConfigurada = !!org?.name?.trim();

  // AFIP y pto_vta: configurados si la org tiene su propio key, o si tiene
  // afipConfigured/gatewayTenantId, o si existe el key global de fallback.
  // El key global cubre al tenant 1 (Club Sorteos) que se configuró directamente.
  const gatewayKey = await getGatewayKey(user.id);
  const afipConfigurado = !!(org?.afipConfigured || org?.gatewayTenantId || org?.gatewayApiKey || gatewayKey);
  const puntoDeVenta = !!(org?.ptoVta || org?.gatewayTenantId || org?.gatewayApiKey || gatewayKey);

  let primeraFactura = false;
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/invoices?limit=1&page=1`, {
      headers: { 'Authorization': `Bearer ${gatewayKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = await res.json();
      primeraFactura = (data.meta?.total ?? data.data?.length ?? 0) > 0;
    }
  } catch {
    // Gateway no disponible, asumir false
  }

  const steps = [
    { id: 'empresa', label: 'Empresa configurada', done: empresaConfigurada, href: '/dashboard/organizacion/empresa' },
    { id: 'afip', label: 'AFIP configurado', done: afipConfigurado, href: '/dashboard/organizacion' },
    { id: 'pto-venta', label: 'Punto de venta activo', done: puntoDeVenta, href: '/dashboard/organizacion' },
    { id: 'factura', label: 'Primera factura emitida', done: primeraFactura, href: '/dashboard/facturacion/simplificada' },
  ];

  const allDone = steps.every(s => s.done);

  return NextResponse.json({ steps, allDone });
}
