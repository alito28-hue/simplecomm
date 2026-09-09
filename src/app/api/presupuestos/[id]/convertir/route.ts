import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Marca el presupuesto como convertido, llamado por el formulario de Comprobante Manual
 * inmediatamente después de emitir con éxito la factura pre-cargada desde este presupuesto.
 * No emite nada acá — la factura ya se emitió en el flujo normal de facturación, esto solo
 * deja registro de qué comprobante salió de qué presupuesto.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { invoiceNumber } = await req.json();

  const { data, error } = await supabase.from('quotes')
    .update({ status: 'CONVERTIDO', convertedInvoiceNumber: invoiceNumber ?? null, convertedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .eq('id', id).eq('organizationId', user.id).select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
  return NextResponse.json(data);
}
