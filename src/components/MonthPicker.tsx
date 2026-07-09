'use client';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

interface MonthPickerProps {
  /** 'YYYY-MM' */
  value: string;
  onChange: (value: string) => void;
}

/**
 * El <input type="month"> nativo sigue el idioma del navegador/sistema operativo, no el
 * lang="es" de la página — por eso mostraba los meses en inglés sin importar la configuración
 * del sitio. Este selector propio siempre muestra los meses en español.
 */
export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = (value || fallback).split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 4; y--) years.push(y);

  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      <select
        className="select"
        value={month}
        onChange={e => onChange(`${year}-${String(Number(e.target.value)).padStart(2, '0')}`)}
      >
        {MESES.map((mes, i) => <option key={mes} value={i + 1}>{mes}</option>)}
      </select>
      <select
        className="select"
        value={year}
        onChange={e => onChange(`${e.target.value}-${String(month).padStart(2, '0')}`)}
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
