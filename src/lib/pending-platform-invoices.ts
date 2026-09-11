import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type PlatformName = 'mercadolibre' | 'mercadopago';

export interface PendingInvoiceInput {
  organizationId: string;
  platform: PlatformName;
  externalRef: string;
  buyerName: string;
  buyerDocType: string;
  buyerDocNumber: string;
  buyerEmail?: string | null;
  amount: number;
  invoiceLetter: 'A' | 'B' | 'C';
  description: string;
  metadata?: Record<string, unknown>;
}

const PLATFORM_LABEL: Record<PlatformName, string> = {
  mercadolibre: 'Mercado Libre',
  mercadopago: 'Mercado Pago',
};

/**
 * Deja una venta detectada por webhook (ML/MP) esperando aprobación manual en vez de
 * facturarla directo — para integraciones configuradas en modalidad "Con confirmación".
 * No falla si ya existe una fila PENDING para el mismo pago (reentrega del webhook): el
 * índice único parcial de la tabla lo absorbe silenciosamente.
 */
export async function createPendingInvoice(input: PendingInvoiceInput): Promise<void> {
  const db = createAdminClient();

  const { error } = await db.from('pending_platform_invoices').insert({
    id: randomUUID(),
    organizationId: input.organizationId,
    platform: input.platform,
    externalRef: input.externalRef,
    buyerName: input.buyerName,
    buyerDocType: input.buyerDocType,
    buyerDocNumber: input.buyerDocNumber,
    buyerEmail: input.buyerEmail ?? null,
    amount: input.amount,
    invoiceLetter: input.invoiceLetter,
    description: input.description,
    metadata: input.metadata ?? {},
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  });

  // 23505 = ya existe una PENDING para este (platform, externalRef) — no es un error real,
  // es la reentrega de un webhook que ya habíamos registrado.
  if (error && error.code !== '23505') {
    console.error('[pending-platform-invoices] Error creando fila pendiente:', error.message);
    return;
  }
  if (error) return;

  await db.from('notifications').insert({
    id: randomUUID(),
    organizationId: input.organizationId,
    type: 'info',
    title: 'Factura pendiente de aprobación',
    body: `${PLATFORM_LABEL[input.platform]}: ${input.buyerName} — $${input.amount.toLocaleString('es-AR')}. Revisala para emitir la factura.`,
    actionUrl: '/dashboard/facturas-pendientes',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}
