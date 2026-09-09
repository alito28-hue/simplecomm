import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQuotePdf } from '@/lib/quote-pdf';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: quote } = await supabase.from('quotes')
    .select('*').eq('id', id).eq('organizationId', user.id).maybeSingle();
  if (!quote) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

  const { data: items } = await supabase.from('quote_items')
    .select('description, quantity, unitPrice').eq('quoteId', id).order('sortOrder');

  const { data: org } = await supabase.from('organizations')
    .select('name, cuit, address, city').eq('id', user.id).maybeSingle();

  const pdfBuffer = await generateQuotePdf({
    seller: { name: org?.name ?? 'SimpleComm', cuit: org?.cuit, address: org?.address, city: org?.city },
    quoteNumber: quote.quoteNumber,
    createdAt: new Date(quote.createdAt),
    validUntil: quote.validUntil,
    buyerName: quote.buyerName,
    buyerDocNumber: quote.buyerDocNumber,
    items: (items ?? []).map(it => ({ description: it.description, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
    totalAmount: Number(quote.totalAmount),
    notes: quote.notes,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="presupuesto-${String(quote.quoteNumber).padStart(5, '0')}.pdf"`,
    },
  });
}
