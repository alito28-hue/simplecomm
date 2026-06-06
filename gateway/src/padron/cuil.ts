/**
 * Deriva los CUIL/CUIT candidatos a partir de un DNI.
 * El CUIL es determinístico: prefijo (20/23/27) + DNI (8 dígitos) + dígito verificador (módulo 11).
 * Prefijos: 20 = masculino, 27 = femenino, 23 = casos especiales (doble nacionalidad, etc.)
 */
export function derivarCuils(dni: string): string[] {
  const clean = dni.replace(/\D/g, '').padStart(8, '0');
  return [20, 23, 27]
    .map(prefix => buildCuil(prefix, clean))
    .filter((c): c is string => c !== null);
}

function buildCuil(prefix: number, dni8: string): string | null {
  const digits = `${prefix}${dni8}`;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = digits.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
  const rest = 11 - (sum % 11);
  if (rest === 10) return null; // combinación prefix+DNI inválida para módulo 11
  const check = rest === 11 ? 0 : rest;
  return `${digits}${check}`;
}
