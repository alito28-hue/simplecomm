import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { effectiveDateForMonth, monthKey } from '@/lib/scheduled-invoices/schedule';
import { getAllowedInvoiceLetters } from '@/lib/fiscal';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('scheduled_invoices')
    .select('*').eq('organizationId', user.id).order('createdAt', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  const required = ['buyerName', 'docType', 'docNumber', 'description', 'recipientEmail', 'firstDate', 'mode', 'endType'];
  if (required.some(key => !body[key]) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) {
    return NextResponse.json({ error: 'Completá todos los campos obligatorios' }, { status: 400 });
  }
  if (!['AUTOMATIC', 'CONFIRMATION'].includes(body.mode) || !['NONE', 'MONTHS', 'INVOICES'].includes(body.endType)) {
    return NextResponse.json({ error: 'Configuración de programación inválida' }, { status: 400 });
  }
  if (body.endType !== 'NONE' && (!Number.isInteger(Number(body.endValue)) || Number(body.endValue) <= 0)) {
    return NextResponse.json({ error: 'El límite debe ser mayor a cero' }, { status: 400 });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (body.firstDate < today) {
    return NextResponse.json({ error: 'La primera emisión no puede estar en el pasado' }, { status: 400 });
  }

  const { data: org } = await supabase.from('organizations')
    .select('fiscalTreatment').eq('id', user.id).maybeSingle();

  const allowedLetters = getAllowedInvoiceLetters(org?.fiscalTreatment);
  const invoiceLetter = body.invoiceLetter ?? 'B';
  if (!allowedLetters.includes(invoiceLetter)) {
    return NextResponse.json({
      error: `Tu condición fiscal no permite emitir Factura ${invoiceLetter}. Tipos permitidos: ${allowedLetters.map(l => `Factura ${l}`).join(', ')}.`,
    }, { status: 400 });
  }

  const modelDay = Number(String(body.firstDate).slice(8, 10));
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('scheduled_invoices').insert({
    id: randomUUID(),
    organizationId: user.id,
    clientId: body.clientId ?? null,
    buyerName: body.buyerName.trim(),
    docType: body.docType,
    docNumber: String(body.docNumber).replace(/\D/g, '') || '0',
    description: body.description.trim(),
    amount: Number(body.amount),
    invoiceLetter,
    ivaRate: Number(body.ivaRate ?? 21),
    concept: Number(body.concept ?? 1),
    recipientEmail: body.recipientEmail.trim(),
    firstDate: body.firstDate,
    modelDay,
    mode: body.mode,
    endType: body.endType,
    endValue: body.endType === 'NONE' ? null : Number(body.endValue),
    nextEffectiveDate: effectiveDateForMonth(body.firstDate, monthKey(body.firstDate)),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
