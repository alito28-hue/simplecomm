import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  if (ids.length === 0) return NextResponse.json([]);

  const { data, error } = await supabase.from('invoice_payments').select('*')
    .eq('organizationId', user.id).in('invoiceId', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
