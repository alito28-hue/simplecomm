/**
 * Calcula los importes de una factura B según AFIP.
 *
 * Para Factura B con consumidor final:
 *   - El total incluye IVA
 *   - IVA 21%: neto = total / 1.21, iva = neto * 0.21
 *   - IVA 10.5%: neto = total / 1.105, iva = neto * 0.105
 *
 * ID de alícuota IVA en WSFE:
 *   2 = No Gravado
 *   3 = Exento
 *   4 = 10.5%
 *   5 = 21%
 *   6 = 27%
 */

export type IvaRateId = 2 | 3 | 4 | 5 | 6;

export interface InvoiceAmounts {
  impNeto: number;
  impIVA: number;
  impTotal: number;
  impTotConc: number;   // No gravado (siempre 0 en Factura B simple)
  impOpEx: number;      // Exento (siempre 0 en Factura B simple)
  impTrib: number;      // Otros tributos (siempre 0 en Factura B simple)
  ivaItems: { id: IvaRateId; baseImp: number; importe: number }[];
}

const IVA_RATES: Record<IvaRateId, number> = {
  2: 0,
  3: 0,
  4: 0.105,
  5: 0.21,
  6: 0.27,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula los importes para una Factura B dado el total final con IVA.
 * Por defecto usa IVA 21% (id=5).
 */
export function calculateFacturaB(
  totalConIva: number,
  ivaRateId: IvaRateId = 5
): InvoiceAmounts {
  const rate = IVA_RATES[ivaRateId];

  let impNeto: number;
  let impIVA: number;

  if (rate === 0) {
    // Exento o No Gravado
    impNeto = round2(totalConIva);
    impIVA = 0;
  } else {
    impNeto = round2(totalConIva / (1 + rate));
    impIVA = round2(impNeto * rate);
  }

  // Ajuste por redondeo para que total = neto + iva exactamente
  const impTotal = round2(totalConIva);
  const diff = round2(impTotal - impNeto - impIVA);
  if (diff !== 0) {
    // Ajustar el IVA para que cuadre
    impIVA = round2(impIVA + diff);
  }

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
 * Convierte fecha a formato YYYYMMDD requerido por WSFE.
 */
export function toAfipDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Determina el tipo de documento AFIP según el string recibido.
 */
export function docTypeToAfipId(docType: string): number {
  const map: Record<string, number> = {
    CUIT: 80,
    CUIL: 86,
    CDI: 87,
    DNI: 96,
    PASAPORTE: 94,
    CONSUMIDOR_FINAL: 99,
  };
  return map[docType.toUpperCase()] ?? 99;
}

/**
 * Formatea el número de comprobante: PPPP-NNNNNNNN
 */
export function formatInvoiceNumber(ptoVta: number, cbteNro: number): string {
  return `${String(ptoVta).padStart(4, '0')}-${String(cbteNro).padStart(8, '0')}`;
}
