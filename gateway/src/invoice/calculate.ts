/**
 * Cálculo de importes para Facturas A, B y C según AFIP.
 *
 * Factura A (RI → RI): El precio de entrada es NETO (sin IVA).
 *   impTotal = impNeto + impIVA. IVA se DISCRIMINA en el comprobante.
 *
 * Factura B (RI → Consumidor Final): El precio de entrada es el FINAL (con IVA).
 *   impNeto = impTotal / 1.21. IVA NO se discrimina.
 *
 * Factura C (Monotributista → Cualquiera): Sin IVA. impTotal = impNeto.
 *
 * Tipos WSFE: A=1, B=6, C=11, NC-A=3, NC-B=8, NC-C=12
 */

export type IvaRateId = 2 | 3 | 4 | 5 | 6;

export interface InvoiceAmounts {
  impNeto: number;
  impIVA: number;
  impTotal: number;
  impTotConc: number;
  impOpEx: number;
  impTrib: number;
  ivaItems: { id: IvaRateId; baseImp: number; importe: number }[];
}

export type InvoiceLetterType = 'A' | 'B' | 'C';

export const CBTE_TYPE: Record<InvoiceLetterType, number> = {
  A: 1,
  B: 6,
  C: 11,
};

export const NC_TYPE: Record<InvoiceLetterType, number> = {
  A: 3,
  B: 8,
  C: 12,
};

const IVA_RATES: Record<IvaRateId, number> = {
  2: 0,       // No Gravado
  3: 0,       // Exento
  4: 0.105,   // 10.5%
  5: 0.21,    // 21%
  6: 0.27,    // 27%
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula importes para Factura B.
 * El `totalConIva` es el precio FINAL pagado por el consumidor (IVA incluido).
 * El IVA NO se discrimina en el comprobante.
 */
export function calculateFacturaB(
  totalConIva: number,
  ivaRateId: IvaRateId = 5
): InvoiceAmounts {
  const rate = IVA_RATES[ivaRateId];

  let impNeto: number;
  let impIVA: number;

  if (rate === 0) {
    impNeto = round2(totalConIva);
    impIVA = 0;
  } else {
    impNeto = round2(totalConIva / (1 + rate));
    impIVA = round2(impNeto * rate);
    const diff = round2(totalConIva - impNeto - impIVA);
    if (diff !== 0) impIVA = round2(impIVA + diff);
  }

  return {
    impNeto,
    impIVA,
    impTotal: round2(totalConIva),
    impTotConc: 0,
    impOpEx: 0,
    impTrib: 0,
    ivaItems: rate > 0 ? [{ id: ivaRateId, baseImp: impNeto, importe: impIVA }] : [],
  };
}

/**
 * Calcula importes para Factura A.
 * El `netoAmount` es el precio NETO (sin IVA) — IVA se suma encima.
 * El IVA SÍ se discrimina en el comprobante.
 */
export function calculateFacturaA(
  netoAmount: number,
  ivaRateId: IvaRateId = 5
): InvoiceAmounts {
  const rate = IVA_RATES[ivaRateId];
  const impNeto = round2(netoAmount);
  const impIVA = rate > 0 ? round2(impNeto * rate) : 0;
  const impTotal = round2(impNeto + impIVA);

  return {
    impNeto,
    impIVA,
    impTotal,
    impTotConc: 0,
    impOpEx: 0,
    impTrib: 0,
    ivaItems: rate > 0 ? [{ id: ivaRateId, baseImp: impNeto, importe: impIVA }] : [],
  };
}

/**
 * Calcula importes para Factura C (monotributistas).
 * Sin IVA. El monto ingresado es directamente el total.
 */
export function calculateFacturaC(totalAmount: number): InvoiceAmounts {
  const impNeto = round2(totalAmount);
  return {
    impNeto,
    impIVA: 0,
    impTotal: impNeto,
    impTotConc: 0,
    impOpEx: 0,
    impTrib: 0,
    ivaItems: [],
  };
}

/**
 * Calcula importes según el tipo de factura.
 * Para A: el input es el NETO.
 * Para B: el input es el TOTAL (IVA incluido).
 * Para C: el input es el TOTAL (sin IVA).
 */
export function calculateByType(
  amount: number,
  invoiceLetter: InvoiceLetterType,
  ivaRateId: IvaRateId = 5
): InvoiceAmounts {
  switch (invoiceLetter) {
    case 'A': return calculateFacturaA(amount, ivaRateId);
    case 'C': return calculateFacturaC(amount);
    default:  return calculateFacturaB(amount, ivaRateId);
  }
}

/** Parsea el IVA desde string al ID de alícuota AFIP */
export function parseIvaRate(iva: string | number): IvaRateId {
  const n = typeof iva === 'string' ? parseFloat(iva) : iva;
  if (n === 21 || n === 0.21) return 5;
  if (n === 10.5 || n === 0.105) return 4;
  if (n === 27 || n === 0.27) return 6;
  if (n === 0) return 3; // Exento
  return 5; // Default 21%
}

export function toAfipDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Convierte una fecha ISO "YYYY-MM-DD" al formato AFIP "YYYYMMDD". */
export function isoToAfipDate(iso: string): string {
  return iso.replace(/-/g, '');
}

export function docTypeToAfipId(docType: string): number {
  const map: Record<string, number> = {
    CUIT: 80, CUIL: 86, CDI: 87, DNI: 96,
    PASAPORTE: 94, CONSUMIDOR_FINAL: 99,
    '80': 80, '86': 86, '87': 87, '96': 96, '94': 94, '99': 99,
  };
  return map[docType?.toUpperCase()] ?? 99;
}

export function formatInvoiceNumber(ptoVta: number, cbteNro: number): string {
  return `${String(ptoVta).padStart(4, '0')}-${String(cbteNro).padStart(8, '0')}`;
}
