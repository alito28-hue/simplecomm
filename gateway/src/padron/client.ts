import { XMLParser } from 'fast-xml-parser';
import type { AuthTicket } from '../wsaa/client';

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });

export interface PersonaResult {
  cuil: string;
  nombre: string;
  tipoPersona: 'FISICA' | 'JURIDICA' | string;
  estadoClave: string;
  domicilio?: {
    direccion?: string;
    localidad?: string;
    provincia?: string;
    codPostal?: string;
  };
}

async function soapCall(padronUrl: string, body: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:a5="http://a4.soap.ws.server.puc.sr/">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(padronUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    },
    body: envelope,
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();

  if (!res.ok || text.includes('<faultstring>') || text.includes(':faultstring>')) {
    const fault = text.match(/(?::)?faultstring>([^<]*)/)?.[1] ?? `HTTP ${res.status}`;
    // Log raw response (first 1000 chars) so Railway shows the exact AFIP message
    console.error('[padron] SOAP fault raw:', text.slice(0, 1000));
    throw new Error(`Padrón SOAP fault: ${fault}`);
  }

  return text;
}

export async function getPersona(
  padronUrl: string,
  ticket: AuthTicket,
  cuitRepresentada: string,
  idPersona: string
): Promise<PersonaResult> {
  const body = `<a5:getPersona>
    <token>${ticket.token}</token>
    <sign>${ticket.sign}</sign>
    <cuitRepresentada>${cuitRepresentada}</cuitRepresentada>
    <idPersona>${idPersona}</idPersona>
  </a5:getPersona>`;

  const xml = await soapCall(padronUrl, body);
  const parsed = parser.parse(xml);

  const responseBody = parsed?.Envelope?.Body;
  const personaReturn = responseBody?.getPersonaResponse?.personaReturn;

  // AFIP returns errorConstancia when CUIL not found (instead of a fault)
  if (personaReturn?.errorConstancia) {
    const desc = personaReturn.errorConstancia?.codigoDescripcion?.descripcion
      ?? 'CUIL no encontrado en el Padrón';
    throw new Error(`Padrón: ${desc}`);
  }

  const ret = personaReturn?.persona;
  if (!ret) {
    throw new Error(`Respuesta inesperada del Padrón: ${JSON.stringify(responseBody)}`);
  }

  // Persona física: apellido + nombre; Persona jurídica: razonSocial
  let nombre = '';
  if (ret.tipoPersona === 'FISICA') {
    const apellido = ret.apellido ?? '';
    const apNombre = ret.nombre ?? '';
    nombre = apellido + (apNombre ? `, ${apNombre}` : '');
  } else {
    nombre = ret.razonSocial ?? '';
  }

  const dom = ret.domicilioFiscal;
  return {
    cuil: String(idPersona),
    nombre: nombre.trim(),
    tipoPersona: ret.tipoPersona ?? 'FISICA',
    estadoClave: ret.estadoClave ?? 'DESCONOCIDO',
    domicilio: dom ? {
      direccion: dom.direccion,
      localidad: dom.localidad,
      provincia: dom.descripcionProvincia,
      codPostal: dom.codPostal ? String(dom.codPostal) : undefined,
    } : undefined,
  };
}
