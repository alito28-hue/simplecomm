export interface BankTransaction {
  id: string;
  date: string;           // ISO date string
  description: string;    // raw bank description
  amount: number;         // always positive (credits only)
  payerName: string;      // extracted or 'Consumidor Final'
  payerCuit: string;      // extracted 11-digit CUIT or ''
  reference: string;      // comprobante / reference number (operation code)
  bank: 'galicia' | 'santander';
}

/**
 * Stable key to detect the same bank movement across re-uploads of a statement.
 * Prefers the bank's own operation/comprobante number; falls back to a
 * composite of date + amount + payer when the bank doesn't expose one.
 */
export function transactionRef(t: Pick<BankTransaction, 'reference' | 'date' | 'amount' | 'payerCuit' | 'payerName'>): string {
  if (t.reference) return t.reference;
  return `${t.date}_${t.amount}_${t.payerCuit || t.payerName}`;
}
