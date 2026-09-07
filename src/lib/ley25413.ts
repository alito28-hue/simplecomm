export type CategoriaPyme = 'GENERAL' | 'MICRO_PEQUENA' | 'MEDIANA_TRAMO1_MANUFACTURERA';

/**
 * % del Impuesto a los Créditos y Débitos (Ley 25413) computable como pago a cuenta directo
 * del Impuesto a las Ganancias, según categoría Pyme (RG y Decreto reglamentario — ver
 * spec_costos_bancarios_cobro_y_posicion_iibb.md). El resto queda como costo bancario real
 * (no se descuenta de Ganancias automáticamente: la deducibilidad exacta del resto está
 * pendiente de confirmar con el contador).
 */
export function porcentajeComputableLey25413(categoria: string | null | undefined): number {
  switch (categoria) {
    case 'MICRO_PEQUENA': return 1.0;
    case 'MEDIANA_TRAMO1_MANUFACTURERA': return 0.6;
    default: return 0.33; // GENERAL
  }
}
