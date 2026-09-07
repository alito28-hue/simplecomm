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
 *
 * Va con un contenedor de color a propósito — antes se confundía con cualquier otro <select>
 * gris de la página y quedaba "perdido" en el header. El chip "Mes actual" resuelve el otro
 * problema reportado: al entrar, no había ninguna señal de que el mes por defecto era el
 * mes en curso.
 *
 * Los <select> llevan un ancho fijo explícito (no min-width) a propósito: la clase ".select"
 * global tiene `width: 100%`, que dentro de este flex row hace que cada <select> intente
 * ocupar TODO el ancho del contenedor — con dos selects haciendo eso a la vez, se superponen
 * entre sí (y con lo que esté al lado). Fijar `width` en px anula ese 100% heredado.
 */
export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = (value || currentMonthStr).split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const isCurrentMonth = (value || currentMonthStr) === currentMonthStr;
  const currentYear = now.getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 4; y--) years.push(y);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        background: 'var(--blue-light)',
        border: '1.5px solid var(--blue)',
        flexShrink: 0,
      }}
    >
      <span aria-hidden style={{ fontSize: '0.95rem' }}>📅</span>
      <select
        className="select"
        value={month}
        style={{ width: 130, flexShrink: 0 }}
        onChange={e => onChange(`${year}-${String(Number(e.target.value)).padStart(2, '0')}`)}
      >
        {MESES.map((mes, i) => <option key={mes} value={i + 1}>{mes}</option>)}
      </select>
      <select
        className="select"
        value={year}
        style={{ width: 88, flexShrink: 0 }}
        onChange={e => onChange(`${e.target.value}-${String(month).padStart(2, '0')}`)}
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      {isCurrentMonth && (
        <span
          style={{
            background: 'var(--blue)',
            color: '#fff',
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-full)',
            whiteSpace: 'nowrap',
          }}
        >
          Mes actual
        </span>
      )}
    </div>
  );
}
