import { getSharedGatewayKey, GATEWAY_URL } from '@/lib/gateway';

/**
 * Detecta el tipo de factura según:
 * - Condición fiscal del VENDEDOR: si es monotributista → siempre C
 * - Datos del COMPRADOR: CUIT → Responsable Inscripto (Factura A), DNI identificado → Factura B
 *   identificada, sin datos → Factura B consumidor final.
 *
 * ⚠️ Versión heurística — un CUIT/CUIL no implica por sí solo ser Responsable Inscripto (los
 * primeros dos dígitos 20/23/24/27 son de persona física, que puede perfectamente ser
 * monotributista o no estar inscripta en IVA). Preferir detectInvoiceTypeWithPadron cuando se
 * pueda consultar el Padrón real; esta queda como fallback síncrono.
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

/**
 * Igual que detectInvoiceType, pero para un comprador con CUIT/CUIL consulta el Padrón real de
 * ARCA (ws_sr_padron_a13) para confirmar si de verdad está inscripto en IVA, en vez de asumirlo
 * por el solo hecho de tener un CUIT — un CUIT/CUIL de persona física (empieza con 20/23/24/27)
 * puede ser de un monotributista o de alguien sin inscripción en IVA, y facturarle A por error
 * es un rechazo real de ARCA. Si el Padrón no responde o no confirma inscripción, cae a
 * Factura B (con el CUIT/CUIL igual como dato del comprador) — más seguro subfacturar a B que
 * emitir una A que ARCA puede rechazar.
 */
export async function detectInvoiceTypeWithPadron(
  sellerFiscalTreatment: string,
  buyerDocType: string | null,
  buyerDocNumber: string | null,
): Promise<{ letter: 'A' | 'B' | 'C'; docType: string; docNumber: string }> {
  if (sellerFiscalTreatment === 'MONOTRIBUTISTA') {
    return { letter: 'C', docType: buyerDocType ?? 'CONSUMIDOR_FINAL', docNumber: buyerDocNumber ?? '0' };
  }

  const isCuitLike = (buyerDocType === 'CUIT' || buyerDocType === 'CUIL') && buyerDocNumber && /^\d{11}$/.test(buyerDocNumber);
  if (isCuitLike) {
    try {
      const res = await fetch(`${GATEWAY_URL}/v1/padron/${buyerDocNumber}`, {
        headers: { Authorization: `Bearer ${getSharedGatewayKey()}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const persona = await res.json();
        if (persona?.ivaCondition === 'INSCRIPTO') {
          return { letter: 'A', docType: 'CUIT', docNumber: buyerDocNumber! };
        }
      }
    } catch {
      // Best-effort — si el Padrón no responde, seguimos y caemos a Factura B más abajo.
    }
    // Tiene CUIT/CUIL pero el Padrón no confirmó IVA Inscripto (es monotributista, exento, o
    // no se pudo consultar) — Factura B, conservando el CUIT/CUIL como dato del comprador.
    return { letter: 'B', docType: buyerDocType!, docNumber: buyerDocNumber! };
  }

  if (buyerDocType === 'DNI' && buyerDocNumber && buyerDocNumber !== '0') {
    return { letter: 'B', docType: 'DNI', docNumber: buyerDocNumber };
  }
  return { letter: 'B', docType: 'CONSUMIDOR_FINAL', docNumber: '0' };
}
