import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { config } from '../config';
import { calculateFacturaB, calculateFacturaC, toAfipDate } from '../invoice/calculate';
import type { InvoiceLetterType } from '../invoice/calculate';
import { generateInvoicePdf } from '../invoice/pdf';

function requireAdminAuth(authHeader: string | undefined): boolean {
  if (!config.GATEWAY_ADMIN_SECRET) return false;
  return authHeader === `Bearer ${config.GATEWAY_ADMIN_SECRET}`;
}

const demoInvoiceSchema = z.object({
  emisor: z.object({
    name: z.string().min(2),
    cuit: z.string().regex(/^\d{11}$/, 'CUIT debe tener 11 dígitos sin guiones'),
    address: z.string().optional(),
    iibb: z.string().optional(),
    activity_start_date: z.string().optional(), // ISO
    pto_vta: z.number().int().positive().optional().default(1),
  }),
  receptor: z.object({
    name: z.string().min(1),
    doc_type: z.enum(['CUIT', 'CUIL', 'DNI', 'CONSUMIDOR_FINAL']).default('CONSUMIDOR_FINAL'),
    doc_number: z.string().optional().default('0'),
    address: z.string().optional(),
  }),
  invoice_letter: z.enum(['A', 'B', 'C']),
  amount: z.number().positive(),      // Importe TOTAL final del comprobante
  description: z.string().optional(),
});

// Genera un CAE de ejemplo con la forma de uno real (14 dígitos) — nunca se envía a AFIP,
// es solo para que el PDF de demo se vea completo. No debe usarse para facturar de verdad.
function fakeCae(): string {
  return String(Math.floor(Math.random() * 1e14)).padStart(14, '0');
}

export async function demoRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/demo/invoice-pdf
   * Genera un PDF de factura de EJEMPLO (CAE ficticio, no autorizado por AFIP) para usar
   * en demos comerciales / videos tutoriales. No toca la base de datos ni ningún tenant
   * real — el emisor y el receptor se pasan libremente en el body. El QR apunta a
   * simplecomm.com.ar/verificar en vez del endpoint real de AFIP, para que no se confunda
   * con un comprobante fiscal válido.
   */
  app.post('/v1/demo/invoice-pdf', async (request, reply) => {
    if (!requireAdminAuth(request.headers.authorization)) {
      return reply.status(401).send({ error: 'Admin secret requerido' });
    }

    const parse = demoInvoiceSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Payload inválido', details: parse.error.flatten().fieldErrors });
    }

    const { emisor, receptor, invoice_letter: letter, amount, description } = parse.data;

    const amounts = letter === 'C' ? calculateFacturaC(amount) : calculateFacturaB(amount, 5);

    const invoiceDate = toAfipDate();
    const caeDueDate = toAfipDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
    const cbteNro = Math.floor(Math.random() * 90_000_000) + 10_000_000;
    const invoiceNumber = `${String(emisor.pto_vta).padStart(4, '0')}-${String(cbteNro).padStart(8, '0')}`;

    const tenant = {
      id: `demo_${randomBytes(6).toString('hex')}`,
      code: 'demo',
      name: emisor.name,
      cuit: emisor.cuit,
      defaultPtoVta: emisor.pto_vta,
      environment: 'PRODUCTION' as const,
      status: 'ACTIVE' as const,
      address: emisor.address ?? null,
      iibb: emisor.iibb ?? null,
      activityStartDate: emisor.activity_start_date ? new Date(emisor.activity_start_date) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docType = receptor.doc_type === 'CONSUMIDOR_FINAL' ? 'CONSUMIDOR_FINAL' : receptor.doc_type;
    const docNumber = docType === 'CONSUMIDOR_FINAL' ? '0' : receptor.doc_number.replace(/\D/g, '');

    const pdfBase64 = await generateInvoicePdf({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenant: tenant as any,
      invoiceNumber,
      invoiceDate,
      invoiceLetter: letter as InvoiceLetterType,
      buyer: {
        fullName: receptor.name,
        docType,
        docNumber,
        address: receptor.address,
      },
      amounts,
      description: description ?? 'Venta',
      cae: fakeCae(),
      caeDueDate,
      qrBaseUrl: 'https://simplecomm.com.ar/verificar',
    });

    return reply.send({
      pdf_base64: pdfBase64,
      invoice_number: invoiceNumber,
      invoice_letter: letter,
      amount_total: amounts.impTotal,
    });
  });
}
