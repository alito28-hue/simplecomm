import { XMLParser } from 'fast-xml-parser';
import type { AuthTicket } from '../wsaa/client';

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });

async function soapCall(url: string, body: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:a4="http://a4.soap.ws.server.puc.sr/">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
    body: envelope,
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();

  if (text.includes('<faultstring>') || text.includes(':faultstring>')) {
    const fault = text.match(/(?::)?faultstring>([^<]*)/)?.[1] ?? 'Error desconocido';
    throw new Error(`Padrón A4 SOAP fault: ${fault}`);
  }

  return text;
}

/**
 * Devuelve los CUILs/CUITs asociados a un DNI.
 * Puede retornar 0, 1 o 2 resultados (masculino y/o femenino).
 */
export async function getPersonaListByDocumento(
  padronA4Url: string,
  ticket: AuthTicket,
  cuitRepresentada: string,
  dni: string
): Promise<string[]> {
  const body = `<a4:getPersonaListByDocumento>
    <token>${ticket.token}</token>
    <sign>${ticket.sign}</sign>
    <cuitRepresentada>${cuitRepresentada}</cuitRepresentada>
    <idPersona>${dni}</idPersona>
    <tipoIdPersona>96</tipoIdPersona>
  </a4:getPersonaListByDocumento>`;

  const xml = await soapCall(padronA4Url, body);
  const parsed = parser.parse(xml);

  const ret = parsed?.Envelope?.Body?.getPersonaListByDocumentoResponse?.personaListReturn;
  if (!ret) return [];

  const lista = ret.listaPersona;
  if (!lista) return [];

  const cuils = Array.isArray(lista) ? lista : [lista];
  return cuils.map(c => String(c)).filter(c => /^\d{11}$/.test(c));
}
