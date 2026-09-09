import PDFDocument from 'pdfkit';

export interface QuotePdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotePdfData {
  seller: { name: string; cuit?: string | null; address?: string | null; city?: string | null };
  quoteNumber: number;
  createdAt: Date;
  validUntil?: string | null; // YYYY-MM-DD
  buyerName: string;
  buyerDocNumber?: string | null;
  items: QuotePdfItem[];
  totalAmount: number;
  notes?: string | null;
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateAR(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatIsoDateAR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Genera el PDF de un presupuesto — documento comercial, no fiscal (sin CAE, no pasa por ARCA). */
export function generateQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const marginX = 40;
    const contentW = pageW - marginX * 2;

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#17231D').text(data.seller.name, marginX, 40);
    doc.font('Helvetica').fontSize(9).fillColor('#55645B');
    let y = 62;
    if (data.seller.cuit) { doc.text(`CUIT: ${data.seller.cuit}`, marginX, y); y += 13; }
    if (data.seller.address) {
      const loc = data.seller.city ? `${data.seller.address}, ${data.seller.city}` : data.seller.address;
      doc.text(loc, marginX, y); y += 13;
    }

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#17231D')
      .text(`PRESUPUESTO N° ${String(data.quoteNumber).padStart(5, '0')}`, marginX, 40, { align: 'right', width: contentW });
    doc.font('Helvetica').fontSize(9).fillColor('#55645B')
      .text(`Fecha: ${formatDateAR(data.createdAt)}`, marginX, 62, { align: 'right', width: contentW });
    if (data.validUntil) {
      doc.text(`Válido hasta: ${formatIsoDateAR(data.validUntil)}`, marginX, 75, { align: 'right', width: contentW });
    }

    const headerBottom = Math.max(y, 90) + 10;
    doc.moveTo(marginX, headerBottom).lineTo(pageW - marginX, headerBottom).strokeColor('#DBE1D4').lineWidth(1).stroke();

    // ── Receptor ────────────────────────────────────────────────────────────
    let cursorY = headerBottom + 14;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#7C8B81').text('PRESUPUESTO PARA', marginX, cursorY);
    cursorY += 14;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#17231D').text(data.buyerName, marginX, cursorY);
    cursorY += 15;
    if (data.buyerDocNumber) {
      doc.font('Helvetica').fontSize(9).fillColor('#55645B').text(`Doc: ${data.buyerDocNumber}`, marginX, cursorY);
      cursorY += 14;
    }

    // ── Tabla de ítems ──────────────────────────────────────────────────────
    cursorY += 14;
    const col = { desc: marginX, qty: marginX + contentW - 210, price: marginX + contentW - 145, subtotal: marginX + contentW - 75 };
    const rowH0 = cursorY;
    doc.rect(marginX, rowH0, contentW, 22).fill('#EBEFE7');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#55645B');
    doc.text('ÍTEM', col.desc + 8, rowH0 + 7);
    doc.text('CANT.', col.qty, rowH0 + 7, { width: 60, align: 'right' });
    doc.text('P. UNIT.', col.price, rowH0 + 7, { width: 60, align: 'right' });
    doc.text('SUBTOTAL', col.subtotal, rowH0 + 7, { width: 70, align: 'right' });
    cursorY = rowH0 + 22;

    doc.font('Helvetica').fontSize(9.5).fillColor('#17231D');
    for (const item of data.items) {
      const subtotal = item.quantity * item.unitPrice;
      const descW = col.qty - col.desc - 60;
      const descHeight = doc.heightOfString(item.description, { width: descW });
      const rowH = Math.max(20, descHeight + 10);

      doc.text(item.description, col.desc + 8, cursorY + 5, { width: descW });
      doc.text(String(item.quantity), col.qty, cursorY + 5, { width: 60, align: 'right' });
      doc.text(formatMoney(item.unitPrice), col.price, cursorY + 5, { width: 60, align: 'right' });
      doc.text(formatMoney(subtotal), col.subtotal, cursorY + 5, { width: 70, align: 'right' });

      cursorY += rowH;
      doc.moveTo(marginX, cursorY).lineTo(marginX + contentW, cursorY).strokeColor('#DBE1D4').lineWidth(0.5).stroke();
    }

    // ── Total ───────────────────────────────────────────────────────────────
    cursorY += 14;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#17231D')
      .text(`TOTAL: ${formatMoney(data.totalAmount)}`, marginX, cursorY, { width: contentW, align: 'right' });
    cursorY += 26;

    if (data.notes) {
      doc.font('Helvetica').fontSize(9).fillColor('#55645B').text(data.notes, marginX, cursorY, { width: contentW });
      cursorY += doc.heightOfString(data.notes, { width: contentW }) + 16;
    }

    // ── Aclaración legal ────────────────────────────────────────────────────
    const footerY = doc.page.height - 60;
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#7C8B81')
      .text('Este documento es un presupuesto y no constituye una factura ni un comprobante fiscal válido. Precios sujetos a disponibilidad de stock y modificación sin previo aviso.',
        marginX, footerY, { width: contentW, align: 'center' });

    doc.end();
  });
}
