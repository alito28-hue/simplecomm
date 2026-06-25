import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { InvoiceAmounts, IvaRateId, InvoiceLetterType } from './calculate';
import { CBTE_TYPE, docTypeToAfipId } from './calculate';
import type { Tenant } from '@prisma/client';

interface PdfData {
  tenant: Tenant;
  invoiceNumber: string;       // "0004-00000001"
  invoiceDate: string;         // YYYYMMDD
  invoiceLetter?: string;      // 'A' | 'B' | 'C'
  buyer: {
    fullName: string;
    docType: string;
    docNumber: string;
    email?: string;
  };
  amounts: InvoiceAmounts;
  description?: string;
  cae: string;
  caeDueDate: string;          // YYYYMMDD
  serviceDateFrom?: string;    // YYYYMMDD — período facturado, factura de servicios
  serviceDateTo?: string;      // YYYYMMDD
  paymentDueDate?: string;     // YYYYMMDD
}

const IVA_RATE_LABEL: Record<IvaRateId, string> = {
  2: 'No Gravado',
  3: 'Exento',
  4: '10,5%',
  5: '21%',
  6: '27%',
};

function formatAfipDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function formatMoney(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCuit(cuit: string): string {
  return cuit.length === 11 ? cuit.replace(/(\d{2})(\d{8})(\d{1})/, '$1-$2-$3') : cuit;
}

function formatDateAR(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function buyerIvaCondition(docType: string): string {
  return docType === 'CONSUMIDOR_FINAL' ? 'Consumidor Final' : 'Responsable Inscripto';
}

function emisorIvaCondition(letter: InvoiceLetterType): string {
  return letter === 'C' ? 'Responsable Monotributo' : 'IVA Responsable Inscripto';
}

// ── Número a letras (pesos argentinos) ───────────────────────────────────────

const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DIECIS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const VEINTIS = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function tensToWords(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DIECIS[n - 10];
  if (n < 30) return VEINTIS[n - 20];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
}

function hundredsToWords(n: number): string {
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const rest = n % 100;
  const restWords = rest > 0 ? tensToWords(rest) : '';
  if (c === 0) return restWords;
  return rest > 0 ? `${CENTENAS[c]} ${restWords}` : CENTENAS[c];
}

function apocope(s: string): string {
  return s.replace(/uno$/, 'ún');
}

function numberToWordsEs(nInt: number): string {
  if (nInt === 0) return 'cero';
  const millions = Math.floor(nInt / 1_000_000);
  const thousands = Math.floor((nInt % 1_000_000) / 1000);
  const units = nInt % 1000;
  const parts: string[] = [];

  if (millions > 0) {
    parts.push(millions === 1 ? 'un millón' : `${apocope(hundredsToWords(millions))} millones`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mil' : `${apocope(hundredsToWords(thousands))} mil`);
  }
  if (units > 0) {
    parts.push(apocope(hundredsToWords(units)));
  }
  return parts.join(' ');
}

function amountToWordsEs(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const intPart = Math.floor(rounded);
  const cents = Math.round((rounded - intPart) * 100);
  const words = numberToWordsEs(intPart);
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return cents > 0
    ? `${capitalized} pesos con ${String(cents).padStart(2, '0')}/100`
    : `${capitalized} pesos`;
}

// ── QR AFIP (RG 4892/2020) ───────────────────────────────────────────────────

function buildAfipQrUrl(data: PdfData): string {
  const letter = (data.invoiceLetter ?? 'B') as InvoiceLetterType;
  const [ptoVtaStr, nroStr] = data.invoiceNumber.split('-');
  const fecha = `${data.invoiceDate.slice(0, 4)}-${data.invoiceDate.slice(4, 6)}-${data.invoiceDate.slice(6, 8)}`;

  const payload = {
    ver: 1,
    fecha,
    cuit: Number(data.tenant.cuit),
    ptoVta: Number(ptoVtaStr),
    tipoCmp: CBTE_TYPE[letter],
    nroCmp: Number(nroStr),
    importe: data.amounts.impTotal,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: docTypeToAfipId(data.buyer.docType),
    nroDocRec: Number(data.buyer.docNumber) || 0,
    tipoCodAut: 'E',
    codAut: Number(data.cae),
  };

  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
}

// ── Ítems de detalle ──────────────────────────────────────────────────────────

interface LineItem {
  alicuotaLabel: string;
  baseImp: number;
}

function buildLineItems(amounts: InvoiceAmounts, letter: InvoiceLetterType): LineItem[] {
  if (letter !== 'A') {
    return [{ alicuotaLabel: '—', baseImp: amounts.impTotal }];
  }
  const items: LineItem[] = amounts.ivaItems.map((item) => ({
    alicuotaLabel: IVA_RATE_LABEL[item.id],
    baseImp: item.baseImp,
  }));
  if (amounts.impOpEx > 0) items.push({ alicuotaLabel: 'Exento', baseImp: amounts.impOpEx });
  if (amounts.impTotConc > 0) items.push({ alicuotaLabel: 'No Gravado', baseImp: amounts.impTotConc });
  return items.length > 0 ? items : [{ alicuotaLabel: '—', baseImp: amounts.impNeto }];
}

export async function generateInvoicePdf(data: PdfData): Promise<string> {
  const letter = (data.invoiceLetter ?? 'B') as InvoiceLetterType;
  const qrBuffer = await QRCode.toBuffer(buildAfipQrUrl(data), { width: 200, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    doc.on('error', reject);

    const BLACK = '#000000';
    const GRAY = '#555555';
    const LIGHT_GRAY = '#f0f0f0';
    const MARGIN = 40;
    const pageWidth = doc.page.width - MARGIN * 2;
    const leftCol = MARGIN;
    const rightEdge = doc.page.width - MARGIN;

    // ── Encabezado: emisor | letra | comprobante ──────────────────────────
    const emisorLines = [
      `CUIT: ${formatCuit(data.tenant.cuit)}`,
      emisorIvaCondition(letter),
      `Ingresos Brutos: ${data.tenant.iibb ?? data.tenant.cuit}`,
    ];
    if (data.tenant.address) emisorLines.push(`Domicilio: ${data.tenant.address}`);
    if (data.tenant.activityStartDate) {
      emisorLines.push(`Inicio de Actividades: ${formatDateAR(data.tenant.activityStartDate)}`);
    }

    const col1W = 230;
    const col2W = 60;
    const col3X = leftCol + col1W + col2W;
    const col3W = pageWidth - col1W - col2W;
    const emisorTextWidth = col1W - 16;

    // Cada línea puede envolver a más de un renglón (ej: domicilios largos),
    // así que medimos la altura real en vez de asumir un alto fijo por línea.
    doc.font('Helvetica').fontSize(9);
    const lineHeights = emisorLines.map((line) => doc.heightOfString(line, { width: emisorTextWidth }));
    const emisorTextHeight = lineHeights.reduce((sum, h) => sum + h + 2, 0);

    const headerY = 40;
    const headerH = Math.max(100, 34 + emisorTextHeight);

    doc.rect(leftCol, headerY, col1W, headerH).stroke(BLACK);
    doc.rect(leftCol + col1W, headerY, col2W, headerH).stroke(BLACK);
    doc.rect(col3X, headerY, col3W, headerH).stroke(BLACK);

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11)
      .text(data.tenant.name, leftCol + 8, headerY + 8, { width: emisorTextWidth });
    doc.font('Helvetica').fontSize(9).fillColor(GRAY);
    let emisorLineY = headerY + 26;
    emisorLines.forEach((line, i) => {
      doc.text(line, leftCol + 8, emisorLineY, { width: emisorTextWidth });
      emisorLineY += lineHeights[i] + 2;
    });

    const letterCodes: Record<InvoiceLetterType, string> = { A: 'COD. 001', B: 'COD. 006', C: 'COD. 011' };
    const letterX = leftCol + col1W;
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(44)
      .text(letter, letterX, headerY + 18, { width: col2W, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(GRAY)
      .text(letterCodes[letter], letterX, headerY + 78, { width: col2W, align: 'center' });

    const [ptoVta, nro] = data.invoiceNumber.split('-');
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(12)
      .text('FACTURA', col3X + 10, headerY + 10);
    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text(`Punto de Venta: ${ptoVta}`, col3X + 10, headerY + 32)
      .text(`Comp. Nro: ${nro}`, col3X + 10, headerY + 48)
      .text(`Fecha de Emisión: ${formatAfipDate(data.invoiceDate)}`, col3X + 10, headerY + 64);

    // ── Período facturado (solo facturas con concepto Servicios/Ambos) ────
    let nextY = headerY + headerH + 10;
    if (data.serviceDateFrom && data.serviceDateTo && data.paymentDueDate) {
      const periodoH = 26;
      doc.rect(leftCol, nextY, pageWidth, periodoH).stroke(BLACK);
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(8)
        .text(`Período Facturado Desde: ${formatAfipDate(data.serviceDateFrom)}`, leftCol + 8, nextY + 9, { width: 210 })
        .text(`Hasta: ${formatAfipDate(data.serviceDateTo)}`, leftCol + 226, nextY + 9, { width: 110 })
        .text(`Fecha de Vto. para el pago: ${formatAfipDate(data.paymentDueDate)}`, leftCol + 344, nextY + 9, { width: pageWidth - 352 });
      nextY += periodoH + 10;
    }

    // ── Receptor ────────────────────────────────────────────────────────────
    const receptorY = nextY;
    const receptorH = 64;
    doc.rect(leftCol, receptorY, pageWidth, receptorH).stroke(BLACK);

    const receptorRightX = leftCol + pageWidth / 2 + 10;
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text('Apellido y Nombre / Razón Social:', leftCol + 8, receptorY + 8);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9)
      .text(data.buyer.fullName, leftCol + 8, receptorY + 20, { width: pageWidth / 2 - 20 });

    if (data.buyer.docType !== 'CONSUMIDOR_FINAL' && data.buyer.docNumber !== '0') {
      const docLabel = data.buyer.docType === 'CUIT' ? formatCuit(data.buyer.docNumber) : data.buyer.docNumber;
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
        .text(`${data.buyer.docType}: ${docLabel}`, leftCol + 8, receptorY + 38);
    }

    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text(`Condición Frente al IVA: ${buyerIvaCondition(data.buyer.docType)}`, receptorRightX, receptorY + 8)
      .text('Condición de Venta: Contado', receptorRightX, receptorY + 22);
    if (data.buyer.email) {
      doc.text(`Email: ${data.buyer.email}`, receptorRightX, receptorY + 36);
    }

    // ── Tabla de detalle ──────────────────────────────────────────────────
    const lineItems = buildLineItems(data.amounts, letter);
    const showIva = letter === 'A';

    const descW = showIva ? pageWidth - 330 : pageWidth - 290;
    const colCant = 35;
    const colUnit = 35;
    const colPrecio = showIva ? 70 : 80;
    const colDesc = 50;
    const colIva = showIva ? 60 : 0;
    const colSubtotal = showIva ? 80 : 90;

    const xDesc = leftCol;
    const xCant = xDesc + descW;
    const xUnit = xCant + colCant;
    const xPrecio = xUnit + colUnit;
    const xDescPct = xPrecio + colPrecio;
    const xIva = xDescPct + colDesc;
    const xSubtotal = xIva + colIva;
    const colX = { desc: xDesc, cant: xCant, unit: xUnit, precio: xPrecio, desc2: xDescPct, iva: xIva, subtotal: xSubtotal };

    let y = receptorY + receptorH + 12;
    doc.rect(leftCol, y, pageWidth, 22).fill(LIGHT_GRAY).stroke(BLACK);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(7.5)
      .text('Descripción', colX.desc + 6, y + 7)
      .text('Cant.', colX.cant, y + 7, { width: colCant, align: 'center' })
      .text('U. Med.', colX.unit, y + 7, { width: colUnit, align: 'center' })
      .text('Precio Unit.', colX.precio, y + 7, { width: colPrecio, align: 'right' })
      .text('% Desc.', colX.desc2, y + 7, { width: colDesc, align: 'right' });
    if (showIva) {
      doc.text('Alícuota IVA', colX.iva, y + 7, { width: colIva, align: 'right' });
    }
    doc.text(showIva ? 'Subtotal sin IVA' : 'Importe', colX.subtotal, y + 7, { width: colSubtotal - 8, align: 'right' });

    y += 22;
    const rowH = 20;
    for (const item of lineItems) {
      doc.rect(leftCol, y, pageWidth, rowH).stroke(BLACK);
      doc.fillColor(BLACK).font('Helvetica').fontSize(8)
        .text(data.description ?? 'Venta', colX.desc + 6, y + 6, { width: descW - 12 })
        .text('1', colX.cant, y + 6, { width: colCant, align: 'center' })
        .text('UN', colX.unit, y + 6, { width: colUnit, align: 'center' })
        .text(formatMoney(item.baseImp), colX.precio, y + 6, { width: colPrecio, align: 'right' })
        .text('0,00%', colX.desc2, y + 6, { width: colDesc, align: 'right' });
      if (showIva) {
        doc.text(item.alicuotaLabel, colX.iva, y + 6, { width: colIva, align: 'right' });
      }
      doc.text(`$ ${formatMoney(item.baseImp)}`, colX.subtotal, y + 6, { width: colSubtotal - 8, align: 'right' });
      y += rowH;
    }

    // ── Totales ─────────────────────────────────────────────────────────────
    y += 16;
    const totalsW = 220;
    const totalsX = rightEdge - totalsW;

    if (showIva) {
      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text('Importe Neto Gravado:', totalsX, y)
        .text(`$ ${formatMoney(data.amounts.impNeto)}`, totalsX + 130, y, { width: 90, align: 'right' });
      y += 15;
      doc.text('Importe Exento / No Gravado:', totalsX, y)
        .text(`$ ${formatMoney(data.amounts.impOpEx + data.amounts.impTotConc)}`, totalsX + 130, y, { width: 90, align: 'right' });
      y += 15;
      for (const item of data.amounts.ivaItems) {
        doc.text(`IVA ${IVA_RATE_LABEL[item.id]}:`, totalsX, y)
          .text(`$ ${formatMoney(item.importe)}`, totalsX + 130, y, { width: 90, align: 'right' });
        y += 15;
      }
      y += 2;
    }

    doc.rect(totalsX, y, totalsW, 28).stroke(BLACK);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
      .text('Importe Total: $', totalsX + 8, y + 8)
      .text(formatMoney(data.amounts.impTotal), totalsX + 120, y + 8, { width: 90, align: 'right' });

    y += 28 + 10;
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(GRAY)
      .text(`Son: ${amountToWordsEs(data.amounts.impTotal)}`, leftCol, y, { width: pageWidth });

    // ── CAE + QR ────────────────────────────────────────────────────────────
    const caeY = doc.page.height - 140;
    const qrSize = 70;
    const caeBoxX = leftCol + qrSize + 10;
    const caeBoxW = pageWidth - qrSize - 10;

    doc.image(qrBuffer, leftCol, caeY, { width: qrSize, height: qrSize });

    doc.rect(caeBoxX, caeY, caeBoxW, qrSize).stroke(BLACK);
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text('CAE N°:', caeBoxX + 8, caeY + 16)
      .text('Fecha de Vto. de CAE:', caeBoxX + 8, caeY + 36);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9)
      .text(data.cae, caeBoxX + 70, caeY + 16)
      .text(formatAfipDate(data.caeDueDate), caeBoxX + 140, caeY + 36);

    doc.font('Helvetica').fontSize(7).fillColor(GRAY)
      .text('Comprobante emitido en los términos de la R.G. N° 1415/03 de AFIP',
        leftCol, caeY + qrSize + 8, { width: pageWidth, align: 'center' });
    doc.text('Comprobante generado por SimpleComm.com',
      leftCol, caeY + qrSize + 20, { width: pageWidth, align: 'center' });

    doc.end();
  });
}
