import { signLoginTicket } from '../signer/index';
import { buildTra } from './tra';

export interface AuthTicket {
  token: string;
  sign: string;
  expiresAt: Date;
  signer: string;
}

interface WsaaCredentials {
  certPem: string;
  keyPem: string;
  chainPem: string;
}

function extractFromXml(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.trim() ?? '';
}

function htmlDecode(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Realiza el loginCms contra WSAA y devuelve el TA (token + sign + vencimiento).
 * Lanza error si WSAA responde con fault o si la respuesta no tiene token/sign.
 */
export async function loginCms(
  wsaaUrl: string,
  credentials: WsaaCredentials,
  service: string = 'wsfe'
): Promise<AuthTicket> {
  // 1. Generar TRA
  const traXml = buildTra(service);

  // 2. Firmar (openssl si está disponible, pkijs como fallback)
  const { cmsBase64, signer } = await signLoginTicket(
    traXml,
    credentials.certPem,
    credentials.keyPem,
    credentials.chainPem
  );

  // 3. Construir envelope SOAP
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  // 4. Llamar a WSAA
  const response = await fetch(wsaaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    },
    body: soapEnvelope,
    signal: AbortSignal.timeout(30_000),
  });

  const responseText = await response.text();

  // 5. Verificar errores SOAP
  if (responseText.includes('<faultstring>') || responseText.includes(':faultstring>')) {
    const fault = extractFromXml(responseText, 'faultstring') ||
      (responseText.match(/:faultstring>([^<]*)/)?.[1] ?? 'Error desconocido');
    throw new Error(`WSAA fault: ${fault}`);
  }

  if (!response.ok) {
    throw new Error(`WSAA respondió HTTP ${response.status}: ${responseText.slice(0, 500)}`);
  }

  // 6. Extraer loginCmsReturn (HTML-encoded XML)
  const returnMatch = responseText.match(/<(?:.*?:)?loginCmsReturn>([\s\S]*?)<\/(?:.*?:)?loginCmsReturn>/);
  if (!returnMatch) {
    throw new Error(`No se encontró loginCmsReturn en la respuesta WSAA: ${responseText.slice(0, 500)}`);
  }

  const taXml = htmlDecode(returnMatch[1]);

  // 7. Log diagnóstico (temporal) — muestra el TA hasta antes de las credenciales
  const credentialsIdx = taXml.indexOf('<credentials>');
  const taHeader = credentialsIdx > 0 ? taXml.slice(0, credentialsIdx) : taXml.slice(0, 800);
  console.log(`[wsaa] TA header raw:\n${taHeader}`);

  // 8. Parsear token, sign y vencimiento
  const token = extractFromXml(taXml, 'token');
  const sign = extractFromXml(taXml, 'sign');
  const expirationTimeStr = extractFromXml(taXml, 'expirationTime');

  if (!token || !sign) {
    throw new Error(`WSAA devolvió respuesta sin token/sign: ${taXml.slice(0, 500)}`);
  }

  const expiresAt = expirationTimeStr ? new Date(expirationTimeStr) : new Date(Date.now() + 12 * 60 * 60 * 1000);

  return { token, sign, expiresAt, signer };
}
