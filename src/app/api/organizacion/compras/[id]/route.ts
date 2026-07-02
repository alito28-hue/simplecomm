import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: purchase } = await supabase.from('purchase_invoices').select('fileUrl')
    .eq('id', id).eq('organizationId', user.id).maybeSingle();
  if (!purchase) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  if (purchase.fileUrl) {
    await supabase.storage.from('attachments').remove([purchase.fileUrl]);
  }
  const { error } = await supabase.from('purchase_invoices').delete().eq('id', id).eq('organizationId', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
