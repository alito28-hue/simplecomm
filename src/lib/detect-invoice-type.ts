/**
 * Detecta el tipo de factura según:
 * - Condición fiscal del VENDEDOR: si es monotributista → siempre C
 * - Datos del COMPRADOR: CUIT → Responsable Inscripto (Factura A), DNI identificado → Factura B
 *   identificada, sin datos → Factura B consumidor final.
 * Misma lógica que ya usan los webhooks de ML y MP — acá centralizada para no triplicarla en
 * el poller de Mercado Pago.
 */
export function detectInvoiceType(
  sellerFiscalTreatment: string,
  buyerDocType: string | null,
  buyerDocNumber: string | null,
): { letter: 'A' | 'B' | 'C'; docType: string; docNumber: string } {
  if (sellerFiscalTreatment === 'MONOTRIBUTISTA') {
    return { letter: 'C', docType: buyerDocType ?? 'CONSUMIDOR_FINAL', docNumber: buyerDocNumber ?? '0' };
  }
  if (buyerDocType === 'CUIT' && buyerDocNumber && buyerDocNumber !== '0') {
    return { letter: 'A', docType: 'CUIT', docNumber: buyerDocNumber };
  }
  if (buyerDocType === 'DNI' && buyerDocNumber && buyerDocNumber !== '0') {
    return { letter: 'B', docType: 'DNI', docNumber: buyerDocNumber };
  }
  return { letter: 'B', docType: 'CONSUMIDOR_FINAL', docNumber: '0' };
}
