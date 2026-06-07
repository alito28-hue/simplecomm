import { BankTransaction } from './types';
import { randomUUID } from 'crypto';

// Santander PDF text parser.
// pdf-parse extracts continuous text per page; this parser handles the
// "Movimientos en pesos" section of the standard Santander Argentina PDF statement.

const DATE_RE = /^(\d{2}\/\d{2}\/\d{2})\s/;
const MONEY_RE = /(-?\$\s?[\d.,]+)/g;
const CUIT_RE = /\b(\d{11})\b/;

function parseArAmount(s: string): number {
  // "$  200.000,00" or "-$ 358.925,00"
  const clean = s.replace(/[$ ]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

function parseDate(s: string): string {
  // "04/05/26" → "2026-05-04"
  const [d, m, y] = s.split('/');
  const fullYear = parseInt(y) + 2000;
  return `${fullYear}-${m}-${d}`;
}

// Lines that represent bank fees, taxes, or balance rows — never client income
const SKIP_PATTERNS = [
  /saldo inicial/i,
  /saldo total/i,
  /pago de tarjeta/i,
  /pago interes/i,
  /comision por/i,
  /iva\s+\d+%/i,
  /impuesto/i,
  /ing\. brutos/i,
  /percepcion/i,
  /cargo por/i,
];

function shouldSkip(description: string): boolean {
  return SKIP_PATTERNS.some(re => re.test(description));
}

function extractCuit(text: string): string {
  const m = text.match(CUIT_RE);
  return m ? m[1] : '';
}

function extractPayerName(description: string, cuit: string): string {
  if (!cuit) return '';
  const idx = description.indexOf(cuit);
  if (idx === -1) return '';
  // Everything before the CUIT, after the movement type keyword
  const before = description.slice(0, idx).trim();
  // Strip known movement-type prefixes
  const cleaned = before
    .replace(/^pago haberes interbanking externa\s*/i, '')
    .replace(/^transferencia ctas mobile banking\s*/i, '')
    .replace(/^transferencia\s*/i, '')
    .replace(/^trf\s+inmed\s*/i, '')
    .replace(/^acreditacion\s*/i, '')
    .trim();
  return cleaned || '';
}

export function parseSantanderPDF(pdfText: string): BankTransaction[] {
  // Find the movimientos en pesos section
  const startIdx = pdfText.search(/movimientos en pesos/i);
  if (startIdx === -1) return [];

  // End at movimientos en dólares or "Saldo total" section
  let endIdx = pdfText.search(/movimientos en d[oó]lares/i);
  if (endIdx === -1 || endIdx < startIdx) endIdx = pdfText.length;

  const section = pdfText.slice(startIdx, endIdx);
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);

  const transactions: BankTransaction[] = [];

  for (const line of lines) {
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const rest = line.slice(dateMatch[0].length);

    // Extract all money values from the line
    const moneyMatches = [...rest.matchAll(MONEY_RE)].map(m => m[1]);
    if (moneyMatches.length === 0) continue;

    // The first money value is the transaction amount (last one is usually saldo)
    // Credits have positive first amount, debits have negative
    const firstAmount = parseArAmount(moneyMatches[0]);
    if (firstAmount <= 0) continue;

    // Description is everything before the first money sign
    const moneyStart = rest.search(/-?\$\s?[\d.,]/);
    const description = moneyStart > 0 ? rest.slice(0, moneyStart).trim() : rest;

    if (shouldSkip(description)) continue;

    // Try to extract CUIT and payer name from description
    // Leading number in the description is the comprobante / operation code
    const compMatch = description.match(/^(\d+)\s+/);
    const reference = compMatch ? compMatch[1] : '';
    const descClean = description.replace(/^\d+\s+/, '').trim();
    const cuit = extractCuit(descClean);
    const payerName = extractPayerName(descClean.toLowerCase(), cuit) || descClean;

    transactions.push({
      id: randomUUID(),
      date: parseDate(dateStr),
      description: descClean,
      amount: firstAmount,
      payerName: payerName || 'Desconocido',
      payerCuit: cuit,
      reference,
      bank: 'santander',
    });
  }

  return transactions;
}
