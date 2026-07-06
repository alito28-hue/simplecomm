import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/resend/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';
const SOURCE_URL = 'https://www.afip.gob.ar/monotributo/categorias.asp';
const CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const;

export interface SyncResult {
  status: 'actualizado' | 'sin_cambios' | 'error';
  detail: string;
}

/** "$10.277.988,13" (formato ARCA, miles con punto y decimales con coma) -> 10277988.13 */
function parseMontoArg(raw: string): number {
  return Number(raw.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.'));
}

async function notifyFailure(motivo: string): Promise<void> {
  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: '⚠ SimpleComm: no se pudo verificar la escala de Monotributo en ARCA',
      html: `
        <p>El chequeo automático de la escala de Monotributo (ARCA) falló y <strong>no se cargó ni modificó nada</strong>.</p>
        <p><strong>Motivo:</strong> ${motivo}</p>
        <p>Revisá manualmente <a href="${SOURCE_URL}">${SOURCE_URL}</a> y, si corresponde, cargá la escala a mano en /mayor/monotributo.</p>
      `,
    });
  } catch {
    // Si falla también el envío del email, no hay más canal — queda registrado en los logs del cron.
  }
}

async function notifySuccess(vigenteDesde: string, montos: Record<string, number>): Promise<void> {
  const filas = CATEGORIAS
    .map(c => `<tr><td>${c}</td><td>$${montos[c].toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td></tr>`)
    .join('');
  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `SimpleComm: nueva escala de Monotributo cargada automáticamente (vigente desde ${vigenteDesde})`,
      html: `
        <p>Se detectó y cargó automáticamente una nueva escala de Monotributo publicada por ARCA, vigente desde <strong>${vigenteDesde}</strong>.</p>
        <table border="1" cellpadding="6" style="border-collapse:collapse">
          <tr><th>Categoría</th><th>Tope de ingresos brutos anuales</th></tr>
          ${filas}
        </table>
        <p>Verificá que esté correcta en /mayor/monotributo.</p>
      `,
    });
  } catch {
    // No bloquea el guardado si el email falla.
  }
}

/**
 * Scrapea la página oficial de ARCA con las categorías de Monotributo, valida los datos con
 * cuidado (nunca carga algo que no pase todos los chequeos) y, si encuentra una vigencia más
 * nueva que la ya cargada, la inserta y avisa por mail al admin. Si el fetch falla, si la
 * página cambió de estructura, o si los valores no pasan la validación de sanidad, no toca la
 * base y avisa por mail igual — para que un cambio de formato en la página de ARCA nunca
 * termine cargando datos incorrectos en silencio.
 */
export async function syncMonotributoCategorias(): Promise<SyncResult> {
  let html: string;
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimpleCommBot/1.0)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await notifyFailure(`No se pudo descargar la página de ARCA (${message}).`);
    return { status: 'error', detail: message };
  }

  const fechaMatch = html.match(/Valores de aplicaci[oó]n desde el (\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!fechaMatch) {
    await notifyFailure('No se encontró el texto de "Valores de aplicación desde" en la página — probablemente ARCA cambió el formato.');
    return { status: 'error', detail: 'fecha de vigencia no encontrada' };
  }
  const [, dd, mm, yyyy] = fechaMatch;
  const vigenteDesde = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

  const montos: Record<string, number> = {};
  for (const cat of CATEGORIAS) {
    const re = new RegExp(`headers="th_${cat}_t15 th_ing_br_t15"[^>]*>\\s*\\$?([\\d.,]+)\\s*<`);
    const m = html.match(re);
    if (!m) {
      await notifyFailure(`No se encontró el tope de la Categoría ${cat} en la página — probablemente ARCA cambió el formato de la tabla.`);
      return { status: 'error', detail: `categoría ${cat} no encontrada` };
    }
    montos[cat] = parseMontoArg(m[1]);
  }

  const valores = CATEGORIAS.map(c => montos[c]);
  const sonValidos = valores.every(v => Number.isFinite(v) && v > 0)
    && valores.every((v, i) => i === 0 || v > valores[i - 1]);
  if (!sonValidos) {
    await notifyFailure(`Los valores parseados no pasaron la validación (deben ser 11 montos positivos y crecientes de A a K). Valores obtenidos: ${JSON.stringify(montos)}.`);
    return { status: 'error', detail: 'valores no válidos' };
  }

  const db = createAdminClient();
  const { data: ultima, error: errUltima } = await db
    .from('categorias_monotributo_vigentes')
    .select('vigenteDesde')
    .order('vigenteDesde', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errUltima) {
    await notifyFailure(`Se pudo parsear la página de ARCA pero falló la consulta a la base de datos: ${errUltima.message}.`);
    return { status: 'error', detail: errUltima.message };
  }

  if (ultima && ultima.vigenteDesde >= vigenteDesde) {
    return { status: 'sin_cambios', detail: `ARCA sigue publicando la vigencia ${vigenteDesde}, ya cargada.` };
  }

  const rows = CATEGORIAS.map(categoria => ({ categoria, topeIngresosBrutos: montos[categoria], vigenteDesde }));
  const { error: errInsert } = await db
    .from('categorias_monotributo_vigentes')
    .upsert(rows, { onConflict: 'categoria,vigenteDesde' });

  if (errInsert) {
    await notifyFailure(`Se detectó una nueva vigencia (${vigenteDesde}) pero falló al guardarla: ${errInsert.message}.`);
    return { status: 'error', detail: errInsert.message };
  }

  await notifySuccess(vigenteDesde, montos);
  return { status: 'actualizado', detail: vigenteDesde };
}
