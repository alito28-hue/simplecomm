/**
 * Traduce errores técnicos de ARCA/WSFE (que llegan crudos desde el Gateway)
 * a mensajes que un usuario no técnico pueda entender y accionar.
 */
export function translateGatewayError(raw: string | undefined | null): string {
  const msg = raw ?? '';

  if (msg.includes('No aparecio CUIT en lista de relaciones')) {
    return 'Tu cuenta todavía no fue habilitada para facturar en ARCA. Nuestro equipo tiene que aprobar tu autorización — ya fue notificado. Si pasaron varias horas y seguís viendo este mensaje, escribinos por soporte.';
  }

  if (/punto de venta/i.test(msg) && /(no existe|no.*habilitad|no.*registrad|inexistente)/i.test(msg)) {
    return 'El punto de venta configurado no existe (o no está habilitado) en ARCA. Revisá que lo hayas dado de alta con el mismo número en el portal de ARCA.';
  }

  if (msg.includes('ValidacionDeToken')) {
    return 'ARCA rechazó la autorización de esta cuenta. Nuestro equipo fue notificado para revisarlo.';
  }

  if (msg.includes('fetch failed') || msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
    return 'No pudimos conectar con ARCA en este momento. Probá de nuevo en unos minutos.';
  }

  return msg || 'Ocurrió un error al emitir el comprobante.';
}
