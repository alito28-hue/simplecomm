export interface BankTransaction {
  id: string;
  date: string;           // ISO date string
  description: string;    // raw bank description
  amount: number;         // always positive (credits only)
  payerName: string;      // extracted or 'Consumidor Final'
  payerCuit: string;      // extracted 11-digit CUIT or ''
  reference: string;      // comprobante / reference number
  bank: 'galicia' | 'santander';
}
