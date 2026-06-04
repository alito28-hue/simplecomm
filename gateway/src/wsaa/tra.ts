/**
 * Genera el TRA (Ticket de Requerimiento de Acceso) para WSAA.
 *
 * Estructura requerida por AFIP:
 *   <loginTicketRequest version="1.0">
 *     <header>
 *       <uniqueId>UNIX_TIMESTAMP</uniqueId>
 *       <generationTime>NOW - 10min (ISO8601)</generationTime>
 *       <expirationTime>NOW + 10min (ISO8601)</expirationTime>
 *     </header>
 *     <service>wsfe</service>
 *   </loginTicketRequest>
 */

function toAfipIso(date: Date): string {
  // UTC con Z — sin milisegundos, sin offset de zona horaria
  // No usar -03:00 con valores UTC: AFIP interpretaría el tiempo 3h en el futuro
  return date.toISOString().slice(0, 19) + 'Z';
}

export function buildTra(service: string = 'wsfe'): string {
  const now = new Date();
  const generationTime = new Date(now.getTime() - 10 * 60 * 1000);
  const expirationTime = new Date(now.getTime() + 10 * 60 * 1000);
  const uniqueId = Math.floor(now.getTime() / 1000);

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${toAfipIso(generationTime)}</generationTime>
    <expirationTime>${toAfipIso(expirationTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}
