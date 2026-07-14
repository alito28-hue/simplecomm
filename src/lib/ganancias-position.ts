/**
 * Ventana del ejercicio fiscal, dado el mes de cierre configurado por la empresa (1-12) —
 * no todas cierran en diciembre (ej. Mocla S.A. cierra en junio). "exerciciosAtras=0" es el
 * ejercicio en curso (el que contiene hoy); "1" es el último ya cerrado; etc.
 */
export function fiscalYearRange(cierreFiscalMes: number, ejerciciosAtras: number = 0): { from: string; to: string; label: string } {
  const now = new Date();
  let endYear = now.getFullYear();
  if (now.getMonth() + 1 > cierreFiscalMes) endYear += 1;
  endYear -= ejerciciosAtras;

  const to = new Date(endYear, cierreFiscalMes, 0);       // último día del mes de cierre
  const from = new Date(endYear - 1, cierreFiscalMes, 1); // primer día del mes siguiente al cierre, un año antes

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to), label: `Ejercicio ${endYear}` };
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Los 12 meses calendario que componen el ejercicio, en orden (empieza el mes siguiente al cierre). */
export function fiscalYearMonths(cierreFiscalMes: number, ejerciciosAtras: number = 0) {
  const { from } = fiscalYearRange(cierreFiscalMes, ejerciciosAtras);
  const [startYear, startMonth] = from.split('-').map(Number);

  const months: { year: number; month: number; label: string; from: string; to: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(startYear, startMonth - 1 + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    months.push({
      year,
      month,
      label: MESES[month - 1],
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    });
  }
  return months;
}
