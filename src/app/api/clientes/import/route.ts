import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

interface ImportRow {
  businessName: string;
  docType: string;
  docNumber: string;
  emailContact?: string;
  phone?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await req.json() as { rows: ImportRow[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Sin filas para importar' }, { status: 400 });
  }
  if (rows.length > 2000) {
    return NextResponse.json({ error: 'Máximo 2000 contactos por importación' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const records = rows
    .filter(r => r.businessName?.trim())
    .map(r => ({
      id: randomUUID(),
      organizationId: user.id,
      businessName: r.businessName.trim(),
      docType: r.docType?.toUpperCase() || 'CONSUMIDOR_FINAL',
      docNumber: r.docNumber?.replace(/\D/g, '') || '0',
      emailContact: r.emailContact?.trim() || null,
      phone: r.phone?.trim() || null,
      fiscalTreatment: 'CONSUMIDOR_FINAL',
      defaultPaymentCond: 'CONTADO',
      sendInvoice: true,
      createdAt: now,
      updatedAt: now,
    }));

  // Upsert: on conflict (organizationId, docNumber) update name/email/phone
  const { error, data } = await supabase
    .from('clients')
    .upsert(records, {
      onConflict: 'organizationId,docNumber',
      ignoreDuplicates: false,
    })
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: data?.length ?? records.length });
}
