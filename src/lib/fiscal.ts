export type InvoiceLetter = 'A' | 'B' | 'C';

const ALLOWED_LETTERS: Record<string, InvoiceLetter[]> = {
  RESPONSABLE_INSCRIPTO: ['A', 'B'],
  MONOTRIBUTISTA: ['C'],
  EXENTO: ['C'],
};

export function getAllowedInvoiceLetters(fiscalTreatment?: string | null): InvoiceLetter[] {
  return ALLOWED_LETTERS[fiscalTreatment ?? ''] ?? ['A', 'B'];
}

export function getDefaultInvoiceLetter(fiscalTreatment?: string | null): InvoiceLetter {
  const allowed = getAllowedInvoiceLetters(fiscalTreatment);
  return allowed.includes('B') ? 'B' : allowed[0];
}

export interface PadronFiscalInfo {
  monotributo?: boolean;
  ivaCondition?: 'INSCRIPTO' | 'EXENTO' | null;
  tipoPersona?: string;
}

/**
 * Sugiere una condición fiscal a partir de los datos crudos del padrón de AFIP.
 * Devuelve null si el padrón no aporta información suficiente (no se debe forzar nada).
 * Una persona jurídica (empresa) siempre es Responsable Inscripto en Argentina — el
 * monotributo solo existe para personas físicas — así que ese dato prima incluso si
 * ivaCondition vino null desde el padrón.
 */
export function suggestFiscalTreatment(info: PadronFiscalInfo): 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | null {
  if (info.tipoPersona === 'JURIDICA') return 'RESPONSABLE_INSCRIPTO';
  if (info.monotributo) return 'MONOTRIBUTISTA';
  if (info.ivaCondition === 'EXENTO') return 'EXENTO';
  if (info.ivaCondition === 'INSCRIPTO') return 'RESPONSABLE_INSCRIPTO';
  return null;
}
