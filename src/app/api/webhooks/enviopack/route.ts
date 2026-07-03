import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Recibe la notificación "envio-cambio-condicion" de Envíopack. Hay que responder 200 dentro
 * de 5 segundos o reintenta cada 2 minutos hasta 10 veces. Envíopack no permite consultar
 * tracking por polling — el estado del envío se actualiza únicamente por acá.
 *
 * ⚠️ Shape exacto del payload sin confirmar contra la API real — se intenta leer los nombres
 * de campo más probables (envio_id/id, estado/condicion) de forma defensiva. Verificar con la
 * primera notificación real que llegue y ajustar si hace falta.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const envioId = String(body.envio_id ?? body.id ?? body.envio ?? '');
  const nuevoEstado = String(body.estado ?? body.condicion ?? body.status ?? '');

  if (!envioId) return NextResponse.json({ ok: true });

  const db = createAdminClient();
  const { error } = await db.from('shipments')
    .update({ estado: nuevoEstado || 'ACTUALIZADO', updatedAt: new Date().toISOString() })
    .eq('enviopackEnvioId', envioId);

  if (error) {
    console.error('[Envíopack webhook] Error actualizando envío', envioId, error.message);
  } else {
    console.log(`[Envíopack webhook] Envío ${envioId} → estado ${nuevoEstado}`);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
