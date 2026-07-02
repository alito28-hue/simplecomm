// Parser de los CSV que exporta el portal de ARCA en "Mis Comprobantes"
// (Consulta de comprobantes emitidos / recibidos). Vienen en Windows-1252,
// separados por ";", con montos en formato "1.234,56" — el caller debe
// decodificar el archivo con TextDecoder('windows-1252') antes de pasarlo acá.

function parseArAmount(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
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
  result.push(current.trim());
  return result;
}

function buildHeaderIndex(headerLine: string) {
  const headers = parseCsvRow(headerLine).map(h =>
    h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[".]/g, '').trim()
  );
  return (name: string) => headers.findIndex(h => h.includes(name));
}

export interface ArcaSaleRow {
  tipoComprobante: number;
  puntoVenta: number;
  numeroComprobante: number;
  numeroHasta: number | null;
  issueDate: string | null;
  cae: string;
  receptorCuit: string;
  receptorNombre: string;
  netAmount: number;
  ivaAmount: number;
  totalAmount: number;
}

export interface ArcaPurchaseRow {
  tipoComprobante: number;
  puntoVenta: number;
  numeroComprobante: number;
  numeroHasta: number | null;
  issueDate: string | null;
  issuerCuit: string;
  issuerName: string;
  netAmount: number;
  ivaAmount: number;
  totalAmount: number;
}

function toRows(text: string) {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { lines: [], idx: () => -1 };
  return { lines: lines.slice(1), idx: buildHeaderIndex(lines[0]) };
}

export function parseArcaEmitidosCSV(text: string): ArcaSaleRow[] {
  const { lines, idx } = toRows(text);
  if (!lines.length) return [];

  const iFecha  = idx('fecha de emision');
  const iTipo   = idx('tipo de comprobante');
  const iPtoVta = idx('punto de venta');
  const iDesde  = idx('numero desde');
  const iHasta  = idx('numero hasta');
  const iCae    = idx('cod') !== -1 ? idx('cod') : idx('autorizacion');
  const iRecCuit = idx('nro doc receptor');
  const iRecName = idx('denominacion receptor');
  const iNeto   = idx('imp neto gravado total');
  const iIva    = idx('total iva');
  const iTotal  = idx('imp total');

  const rows: ArcaSaleRow[] = [];
  for (const line of lines) {
    const cols = parseCsvRow(line);
    if (cols.length < 5) continue;
    const numeroComprobante = parseInt(cols[iDesde] ?? '', 10);
    const tipoComprobante = parseInt(cols[iTipo] ?? '', 10);
    const puntoVenta = parseInt(cols[iPtoVta] ?? '', 10);
    if (!Number.isFinite(numeroComprobante) || !Number.isFinite(tipoComprobante) || !Number.isFinite(puntoVenta)) continue;

    const numeroHastaRaw = parseInt(cols[iHasta] ?? '', 10);
    rows.push({
      tipoComprobante,
      puntoVenta,
      numeroComprobante,
      numeroHasta: Number.isFinite(numeroHastaRaw) ? numeroHastaRaw : null,
      issueDate: cols[iFecha] || null,
      cae: cols[iCae] ?? '',
      receptorCuit: (cols[iRecCuit] ?? '').replace(/[^0-9]/g, ''),
      receptorNombre: cols[iRecName] ?? '',
      netAmount: parseArAmount(cols[iNeto]),
      ivaAmount: parseArAmount(cols[iIva]),
      totalAmount: parseArAmount(cols[iTotal]),
    });
  }
  return rows;
}

export function parseArcaRecibidosCSV(text: string): ArcaPurchaseRow[] {
  const { lines, idx } = toRows(text);
  if (!lines.length) return [];

  const iFecha  = idx('fecha de emision');
  const iTipo   = idx('tipo de comprobante');
  const iPtoVta = idx('punto de venta');
  const iDesde  = idx('numero desde');
  const iHasta  = idx('numero hasta');
  const iEmiCuit = idx('nro doc emisor');
  const iEmiName = idx('denominacion emisor');
  const iNeto   = idx('imp neto gravado total');
  const iIva    = idx('total iva');
  const iTotal  = idx('imp total');

  const rows: ArcaPurchaseRow[] = [];
  for (const line of lines) {
    const cols = parseCsvRow(line);
    if (cols.length < 5) continue;
    const numeroComprobante = parseInt(cols[iDesde] ?? '', 10);
    const tipoComprobante = parseInt(cols[iTipo] ?? '', 10);
    const puntoVenta = parseInt(cols[iPtoVta] ?? '', 10);
    if (!Number.isFinite(numeroComprobante) || !Number.isFinite(tipoComprobante) || !Number.isFinite(puntoVenta)) continue;

    const numeroHastaRaw = parseInt(cols[iHasta] ?? '', 10);
    rows.push({
      tipoComprobante,
      puntoVenta,
      numeroComprobante,
      numeroHasta: Number.isFinite(numeroHastaRaw) ? numeroHastaRaw : null,
      issueDate: cols[iFecha] || null,
      issuerCuit: (cols[iEmiCuit] ?? '').replace(/[^0-9]/g, ''),
      issuerName: cols[iEmiName] ?? '',
      netAmount: parseArAmount(cols[iNeto]),
      ivaAmount: parseArAmount(cols[iIva]),
      totalAmount: parseArAmount(cols[iTotal]),
    });
  }
  return rows;
}
