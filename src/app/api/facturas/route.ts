import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComprobantesUnificados } from '@/lib/facturas';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit  = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));
  const status = searchParams.get('status') ?? 'all'; // 'all' | 'issued' | 'error'
  const month  = searchParams.get('month'); // 'YYYY-MM', o ausente/'' = todos los meses
  const q      = searchParams.get('q')?.trim().toLowerCase(); // búsqueda por receptor o CUIT/DNI

  let all = await getComprobantesUnificados(supabase, user.id);
  if (status === 'issued') all = all.filter(c => c.status === 'issued');
  if (status === 'error') all = all.filter(c => c.status === 'error');
  if (q) {
    // Buscar un cliente puede ser en cualquier mes — a propósito ignora el filtro de mes
    // cuando hay búsqueda, para no obligar a adivinar en qué mes está el comprobante.
    const digits = q.replace(/\D/g, '');
    all = all.filter(c =>
      c.buyer_name?.toLowerCase().includes(q) || (digits && c.buyer_doc?.includes(digits))
    );
  } else if (month) {
    all = all.filter(c => c.created_at.slice(0, 7) === month);
  }

  const total = all.length;
  const start = (page - 1) * limit;
  const data = all.slice(start, start + limit);

  return NextResponse.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}
