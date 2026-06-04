import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GATEWAY_URL    = process.env.GATEWAY_URL    ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${GATEWAY_URL}/v1/invoices/${params.id}/pdf`, {
    headers: { 'Authorization': `Bearer ${GATEWAY_API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return NextResponse.json({ error: 'PDF no disponible' }, { status: 404 });

  const pdfBuffer = await res.arrayBuffer();
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${params.id}.pdf"`,
    },
  });
}
