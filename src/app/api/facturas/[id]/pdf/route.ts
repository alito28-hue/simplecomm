import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = await getGatewayKey(user.id);

  const res = await fetch(`${GATEWAY_URL}/v1/invoices/${id}/pdf`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return NextResponse.json({ error: 'PDF no disponible' }, { status: 404 });

  const pdfBuffer = await res.arrayBuffer();
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': res.headers.get('Content-Disposition') ?? `attachment; filename="factura-${id}.pdf"`,
    },
  });
}
