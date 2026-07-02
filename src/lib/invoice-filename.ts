const CBTE_TYPE: Record<string, number> = { A: 1, B: 6, C: 11 };

/**
 * Nombre de archivo estándar AFIP para comprobantes: {CUIT}_{tipoCbte:3}_{ptoVta:5}_{nroCbte:8}.pdf
 */
export function buildInvoiceFilename(cuit: string, invoiceLetter: string, invoiceNumber: string): string {
  const [ptoVta, nro] = invoiceNumber.split('-');
  const tipo = CBTE_TYPE[invoiceLetter] ?? 6;
  return `${cuit}_${String(tipo).padStart(3, '0')}_${String(Number(ptoVta)).padStart(5, '0')}_${String(Number(nro)).padStart(8, '0')}.pdf`;
}
