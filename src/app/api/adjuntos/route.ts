import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, igual al límite del bucket

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const relatedType = searchParams.get('relatedType');
  const relatedId = searchParams.get('relatedId');
  if (!relatedType || !relatedId) {
    return NextResponse.json({ error: 'relatedType y relatedId requeridos' }, { status: 400 });
  }

  const { data, error } = await supabase.from('attachments').select('*')
    .eq('organizationId', user.id).eq('relatedType', relatedType).eq('relatedId', relatedId)
    .order('createdAt', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all((data ?? []).map(async (a) => {
    const { data: signed } = await supabase.storage.from('attachments').createSignedUrl(a.fileUrl, 60 * 10);
    return { ...a, signedUrl: signed?.signedUrl ?? null };
  }));

  return NextResponse.json(withUrls);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const relatedType = form.get('relatedType') as string | null;
  const relatedId = form.get('relatedId') as string | null;

  if (!file || !relatedType || !relatedId) {
    return NextResponse.json({ error: 'file, relatedType y relatedId requeridos' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 10MB' }, { status: 400 });
  }

  const path = `${user.id}/${relatedType}/${relatedId}/${randomUUID()}-${file.name}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from('attachments')
    .upload(path, bytes, { contentType: file.type || 'application/octet-stream' });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: signed } = await supabase.storage.from('attachments').createSignedUrl(path, 60 * 60 * 24 * 365);

  const { data, error } = await supabase.from('attachments').insert({
    id: randomUUID(),
    organizationId: user.id,
    relatedType,
    relatedId,
    fileName: file.name,
    fileUrl: path,
    fileSizeKb: Math.round(file.size / 1024),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, signedUrl: signed?.signedUrl ?? null }, { status: 201 });
}
