import PDFDocument from 'pdfkit';
import type { InvoiceAmounts } from './calculate';
import type { Tenant } from '@prisma/client';

interface PdfData {
  tenant: Tenant;
  invoiceNumber: string;   // "0004-00000001"
  invoiceDate: string;     // YYYYMMDD
  buyer: {
    fullName: string;
    docType: string;
    docNumber: string;
    email?: string;
  };
  amounts: InvoiceAmounts;
  description?: string;
  cae: string;
  caeDueDate: string;      // YYYYMMDD
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

    const BLACK = '#000000';
    const GRAY = '#555555';
    const LIGHT_GRAY = '#f0f0f0';
    const pageWidth = doc.page.width - 80;
    const leftCol = 40;
    const rightColX = doc.page.width - 220;

    // ── Recuadro emisor (columna izquierda) ────────────────────────────────
    doc.rect(leftCol, 40, pageWidth / 2 - 25, 120).stroke(BLACK);

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11)
      .text(data.tenant.name, leftCol + 8, 50, { width: pageWidth / 2 - 40 });

    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text(`CUIT: ${data.tenant.cuit.replace(/(\d{2})(\d{8})(\d{1})/, '$1-$2-$3')}`, leftCol + 8, 66)
      .text('IVA Responsable Inscripto', leftCol + 8, 80)
      .text('Ingresos Brutos', leftCol + 8, 94);

    // ── Recuadro letra "B" (centro) ────────────────────────────────────────
    const letterX = doc.page.width / 2 - 30;
    doc.rect(letterX, 40, 60, 120).stroke(BLACK);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(52)
      .text('B', letterX, 62, { width: 60, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(GRAY)
      .text('CÓDIGO 06', letterX, 132, { width: 60, align: 'center' });

    // ── Recuadro tipo y número (columna derecha) ───────────────────────────
    doc.rect(doc.page.width / 2 + 32, 40, pageWidth / 2 - 22, 120).stroke(BLACK);

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11)
      .text('FACTURA', doc.page.width / 2 + 40, 50);

    const [ptoVta, nro] = data.invoiceNumber.split('-');
    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text(`Punto de Venta: ${ptoVta}`, doc.page.width / 2 + 40, 68)
      .text(`Comp. Nro: ${nro}`, doc.page.width / 2 + 40, 82)
      .text(`Fecha: ${formatAfipDate(data.invoiceDate)}`, doc.page.width / 2 + 40, 96);

    // ── Datos del receptor ────────────────────────────────────────────────
    let y = 178;
    doc.rect(leftCol, y, pageWidth, 60).stroke(BLACK);

    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text('Apellido y Nombre / Razón Social:', leftCol + 8, y + 8)
      .text('Condición frente al IVA:', leftCol + 8, y + 30);

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9)
      .text(data.buyer.fullName, leftCol + 180, y + 8)
      .text('Consumidor Final', leftCol + 180, y + 30);

    if (data.buyer.docType !== 'CONSUMIDOR_FINAL' && data.buyer.docNumber !== '0') {
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
        .text(`${data.buyer.docType}: ${data.buyer.docNumber}`, rightColX, y + 8);
    }

    // ── Tabla de detalle ──────────────────────────────────────────────────
    y = 256;
    // Header de tabla
    doc.rect(leftCol, y, pageWidth, 20).fill(LIGHT_GRAY).stroke(BLACK);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(8)
      .text('Descripción', leftCol + 8, y + 6)
      .text('Importe', doc.page.width - 120, y + 6, { width: 80, align: 'right' });

    y += 20;
    // Fila de detalle
    doc.rect(leftCol, y, pageWidth, 24).stroke(BLACK);
    doc.fillColor(BLACK).font('Helvetica').fontSize(9)
      .text(data.description ?? 'Servicios', leftCol + 8, y + 7, { width: pageWidth - 100 })
      .text(`$ ${formatMoney(data.amounts.impTotal)}`, doc.page.width - 120, y + 7, { width: 80, align: 'right' });

    // ── Total ─────────────────────────────────────────────────────────────
    y += 40;
    doc.rect(doc.page.width - 200, y, 160, 28).stroke(BLACK);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
      .text('Importe Total: $', doc.page.width - 195, y + 8)
      .text(formatMoney(data.amounts.impTotal), doc.page.width - 65, y + 8, { width: 55, align: 'right' });

    // ── CAE ───────────────────────────────────────────────────────────────
    y = doc.page.height - 120;
    doc.rect(leftCol, y, pageWidth, 50).stroke(BLACK);

    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text('CAE N°:', leftCol + 8, y + 10)
      .text('Fecha de Vto. de CAE:', leftCol + 8, y + 26);

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9)
      .text(data.cae, leftCol + 65, y + 10)
      .text(formatAfipDate(data.caeDueDate), leftCol + 145, y + 26);

    doc.font('Helvetica').fontSize(7).fillColor(GRAY)
      .text('Comprobante emitido en los términos de la R.G. N° 1415/03 de AFIP',
        leftCol, y + 58, { width: pageWidth, align: 'center' });

    doc.end();
  });
}
