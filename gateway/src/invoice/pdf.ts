import PDFDocument from 'pdfkit';
import type { InvoiceAmounts } from './calculate';
import type { Tenant } from '@prisma/client';

interface PdfData {
  tenant: Tenant;
  invoiceNumber: string;
  invoiceDate: string;    // YYYYMMDD
  buyer: {
    fullName: string;
    docType: string;
    docNumber: string;
    email?: string;
  };
  amounts: InvoiceAmounts;
  description?: string;
  cae: string;
  caeDueDate: string;     // YYYYMMDD
}

function formatAfipDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function formatMoney(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateInvoicePdf(data: PdfData): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    doc.on('error', reject);

    const GREEN = '#2e7d32';
    const GRAY = '#666666';
    const pageWidth = doc.page.width - 80; // margins

    // ── Encabezado ─────────────────────────────────────────────────────────
    doc
      .rect(40, 40, pageWidth, 70)
      .fill(GREEN);

    doc
      .fillColor('white')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('FACTURA B', 50, 55);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`N° ${data.invoiceNumber}`, 50, 82);

    doc
      .fillColor('white')
      .fontSize(10)
      .text(data.tenant.name, doc.page.width - 280, 55, { width: 230, align: 'right' })
      .text(`CUIT: ${data.tenant.cuit}`, doc.page.width - 280, 72, { width: 230, align: 'right' });

    // ── Datos emisor ───────────────────────────────────────────────────────
    doc
      .fillColor('#333333')
      .fontSize(9)
      .font('Helvetica')
      .text('Fecha:', 50, 130)
      .font('Helvetica-Bold')
      .text(formatAfipDate(data.invoiceDate), 110, 130)
      .font('Helvetica')
      .text('IVA Responsable Inscripto', 50, 145);

    // ── Separador ─────────────────────────────────────────────────────────
    doc
      .moveTo(40, 168)
      .lineTo(doc.page.width - 40, 168)
      .strokeColor(GREEN)
      .lineWidth(1.5)
      .stroke();

    // ── Datos receptor ─────────────────────────────────────────────────────
    doc
      .fillColor(GRAY)
      .font('Helvetica')
      .fontSize(9)
      .text('DATOS DEL RECEPTOR', 50, 180);

    doc
      .fillColor('#333333')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(data.buyer.fullName, 50, 196);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(GRAY)
      .text(`${data.buyer.docType}: ${data.buyer.docNumber}`, 50, 212);

    if (data.buyer.email) {
      doc.text(data.buyer.email, 50, 226);
    }

    // ── Separador ─────────────────────────────────────────────────────────
    doc
      .moveTo(40, 248)
      .lineTo(doc.page.width - 40, 248)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    // ── Detalle ────────────────────────────────────────────────────────────
    doc
      .fillColor(GRAY)
      .font('Helvetica')
      .fontSize(9)
      .text('DETALLE', 50, 262);

    doc
      .fillColor('#333333')
      .fontSize(10)
      .font('Helvetica')
      .text(data.description ?? 'Servicio', 50, 278, { width: pageWidth - 100 });

    // ── Importes ───────────────────────────────────────────────────────────
    const amtX = doc.page.width - 200;
    let amtY = 350;

    const addAmountRow = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10)
        .fillColor(bold ? '#333333' : GRAY)
        .text(label, amtX, amtY)
        .text(`$ ${value}`, amtX + 80, amtY, { width: 80, align: 'right' });
      amtY += 18;
    };

    addAmountRow('Neto:', formatMoney(data.amounts.impNeto));
    addAmountRow('IVA 21%:', formatMoney(data.amounts.impIVA));

    doc
      .moveTo(amtX, amtY)
      .lineTo(amtX + 160, amtY)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();
    amtY += 8;

    addAmountRow('TOTAL:', formatMoney(data.amounts.impTotal), true);

    // ── CAE ────────────────────────────────────────────────────────────────
    doc
      .rect(40, 460, pageWidth, 60)
      .fill('#f8fafc');

    doc
      .fillColor(GRAY)
      .font('Helvetica')
      .fontSize(8)
      .text('CAE:', 50, 472)
      .text('Vencimiento CAE:', 50, 488);

    doc
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(data.cae, 150, 472)
      .text(formatAfipDate(data.caeDueDate), 150, 488);

    doc
      .fillColor(GRAY)
      .font('Helvetica')
      .fontSize(7)
      .text(
        'Comprobante válido — Resolución General AFIP N° 4291/2018',
        50,
        504,
        { width: pageWidth, align: 'center' }
      );

    doc.end();
  });
}
