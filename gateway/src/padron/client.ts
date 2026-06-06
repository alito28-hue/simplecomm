import { XMLParser } from 'fast-xml-parser';
import type { AuthTicket } from '../wsaa/client';

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });

const NS = 'http://a13.soap.ws.server.puc.sr/';

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
  xmlns:a13="${NS}">
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
    console.error('[padron] SOAP fault raw:', text.slice(0, 1000));
    throw new Error(`Padrón SOAP fault: ${fault}`);
  }

  return text;
}

function parseDomicilioFiscal(domicilios: unknown): PersonaResult['domicilio'] {
  if (!domicilios) return undefined;
  const arr = Array.isArray(domicilios) ? domicilios : [domicilios];
  const fiscal = arr.find((d: Record<string, unknown>) =>
    String(d.tipoDomicilio ?? '').toUpperCase() === 'FISCAL'
  ) ?? arr[0];
  if (!fiscal) return undefined;
  return {
    direccion: (fiscal as Record<string, unknown>).direccion as string | undefined,
    localidad: (fiscal as Record<string, unknown>).localidad as string | undefined,
    provincia: (fiscal as Record<string, unknown>).descripcionProvincia as string | undefined,
    codPostal: (fiscal as Record<string, unknown>).codigoPostal
      ? String((fiscal as Record<string, unknown>).codigoPostal)
      : undefined,
  };
}

export async function getPersona(
  padronUrl: string,
  ticket: AuthTicket,
  cuitRepresentada: string,
  idPersona: string
): Promise<PersonaResult> {
  const body = `<a13:getPersona>
    <token>${ticket.token}</token>
    <sign>${ticket.sign}</sign>
    <cuitRepresentada>${cuitRepresentada}</cuitRepresentada>
    <idPersona>${idPersona}</idPersona>
  </a13:getPersona>`;

  const xml = await soapCall(padronUrl, body);
  const parsed = parser.parse(xml);

  const responseBody = parsed?.Envelope?.Body;
  const personaReturn = responseBody?.getPersonaResponse?.personaReturn;

  const ret = personaReturn?.persona;
  if (!ret) {
    throw new Error(`Respuesta inesperada del Padrón: ${JSON.stringify(responseBody)}`);
  }

  let nombre = '';
  if (ret.tipoPersona === 'FISICA') {
    const apellido = ret.apellido ?? '';
    const apNombre = ret.nombre ?? '';
    nombre = apellido + (apNombre ? `, ${apNombre}` : '');
  } else {
    nombre = ret.razonSocial ?? '';
  }

  return {
    cuil: String(idPersona),
    nombre: nombre.trim(),
    tipoPersona: ret.tipoPersona ?? 'FISICA',
    estadoClave: ret.estadoClave ?? 'DESCONOCIDO',
    domicilio: parseDomicilioFiscal(ret.domicilio),
  };
}

/**
 * Busca los CUILs/CUITs que corresponden a un número de documento (DNI).
 * Usa la operación getIdPersonaListByDocumento de personaServiceA13.
 * Devuelve array de strings con los CUILs encontrados.
 */
export async function getIdPersonaListByDocumento(
  padronUrl: string,
  ticket: AuthTicket,
  cuitRepresentada: string,
  documento: string
): Promise<string[]> {
  const body = `<a13:getIdPersonaListByDocumento>
    <token>${ticket.token}</token>
    <sign>${ticket.sign}</sign>
    <cuitRepresentada>${cuitRepresentada}</cuitRepresentada>
    <documento>${documento}</documento>
  </a13:getIdPersonaListByDocumento>`;

  const xml = await soapCall(padronUrl, body);
  const parsed = parser.parse(xml);

  const ret = parsed?.Envelope?.Body?.getIdPersonaListByDocumentoResponse?.idPersonaListReturn;
  if (!ret) return [];

  const ids = ret.idPersona;
  if (!ids) return [];
  const arr = Array.isArray(ids) ? ids : [ids];
  return arr.map(String);
}
