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
