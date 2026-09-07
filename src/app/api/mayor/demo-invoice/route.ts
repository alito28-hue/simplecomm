import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GATEWAY_URL } from '@/lib/gateway';

const GATEWAY_ADMIN_SECRET = process.env.GATEWAY_ADMIN_SECRET ?? '';
const ADMIN_EMAIL          = process.env.ADMIN_EMAIL          ?? 'alito28@gmail.com';

interface DemoInvoiceBody {
  emisor: {
    name: string;
    cuit: string;
    address?: string;
    iibb?: string;
    activity_start_date?: string;
    pto_vta?: number;
  };
  receptor: {
    name: string;
    doc_type: 'CUIT' | 'CUIL' | 'DNI' | 'CONSUMIDOR_FINAL';
    doc_number?: string;
    address?: string;
  };
  invoice_letter: 'A' | 'B' | 'C';
  amount: number;
  description?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!GATEWAY_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Gateway admin no configurado' }, { status: 503 });
  }

  let body: DemoInvoiceBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }); }

  const gwRes = await fetch(`${GATEWAY_URL}/v1/demo/invoice-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_ADMIN_SECRET}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const gwData = await gwRes.json();

  if (!gwRes.ok) {
    return NextResponse.json({ error: gwData.error ?? 'Error generando el comprobante de demo' }, { status: gwRes.status === 400 ? 400 : 502 });
  }

  return NextResponse.json(gwData);
}
