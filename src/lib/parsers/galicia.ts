import { BankTransaction } from './types';
import { randomUUID } from 'crypto';

function parseArAmount(s: string): number {
  // "17851343,40" → 17851343.40
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseDateAR(s: string): string {
  // "07/05/2026" → "2026-05-07"
  const [d, m, y] = s.split('/');
  return `${y}-${m}-${d}`;
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) result.push(current.trim());
  return result;
}

function extractCuit(values: string[]): string {
  for (const v of values) {
    const m = v.match(/\b(\d{11})\b/);
    if (m) return m[1];
  }
  return '';
}

function extractName(leyendas: string[], cuit: string): string {
  for (const v of leyendas) {
    const clean = v.replace(cuit, '').trim();
    if (clean && clean.length > 2 && !/^\d+$/.test(clean)) {
      return clean;
    }
  }
  return '';
}

// Descriptions that indicate bank fees / taxes — not client income
const SKIP_DESCRIPTIONS = [
  'imp. deb.', 'imp. cre.', 'imp. ing.', 'percep.',
  'comision serv', 'iva', 'acred.haberes', 'haberes',
  'ing. brutos', 'sircreb',
];

function shouldSkip(description: string): boolean {
  const lower = description.toLowerCase();
  return SKIP_DESCRIPTIONS.some(s => lower.includes(s));
}

export function parseGaliciaCSV(text: string): BankTransaction[] {
  // Strip BOM if present
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map(h => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const idx = (name: string) => headers.findIndex(h => h.includes(name));

  const iDate   = idx('fecha');
  const iDesc   = idx('descripci');
  const iDebit  = idx('d') !== -1 ? headers.findIndex(h => h.startsWith('d') && h.includes('bito')) : -1;
  const iCredit = headers.findIndex(h => h.includes('cr'));
  const iComp   = headers.findIndex(h => h.includes('comprobante'));
  // Leyendas Adicionales columns (there are 4: indices after Nro Comprobante)
  const leyStart = iComp + 1;

  const transactions: BankTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    if (cols.length < 4) continue;

    const creditStr = cols[iCredit] ?? '0';
    const credit = parseArAmount(creditStr);
    if (credit <= 0) continue;

    const description = cols[iDesc] ?? '';
    if (shouldSkip(description)) continue;

    // Gather all leyenda columns (up to 4 after comprobante)
    const leyendas = [
      cols[leyStart] ?? '',
      cols[leyStart + 1] ?? '',
      cols[leyStart + 2] ?? '',
      cols[leyStart + 3] ?? '',
    ].filter(Boolean);

    const cuit = extractCuit(leyendas);
    const payerName = extractName(leyendas, cuit) || description;

    transactions.push({
      id: randomUUID(),
      date: parseDateAR(cols[iDate] ?? ''),
      description,
      amount: credit,
      payerName,
      payerCuit: cuit,
      reference: cols[iComp] ?? '',
      bank: 'galicia',
    });
  }

  return transactions;
}
