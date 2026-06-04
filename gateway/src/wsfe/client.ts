import { XMLParser } from 'fast-xml-parser';
import type { AuthTicket } from '../wsaa/client';

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });

export interface WsfeAuth {
  token: string;
  sign: string;
  cuit: string;
}

export interface LastVoucher {
  ptoVta: number;
  cbteType: number;
  cbteNro: number;
}

export interface InvoiceRequest {
  ptoVta: number;
  cbteType: number;       // 6 = Factura B
  concept: number;        // 1 = Productos, 2 = Servicios, 3 = Ambos
  docType: number;        // 80=CUIT, 86=CUIL, 96=DNI, 99=Consumidor Final
  docNumber: string;
  cbteDesde: number;
  cbteHasta: number;
  cbteFch: string;        // YYYYMMDD
  impTotal: number;
  impTotConc: number;     // No gravado
  impNeto: number;
  impOpEx: number;        // Exento
  impIVA: number;
  impTrib: number;        // Otros tributos
  ivaItems: IvaItem[];
}

export interface IvaItem {
  id: number;             // 5=21%, 4=10.5%, 6=27%, 3=0%, 2=exento
  baseImp: number;
  importe: number;
}

export interface InvoiceResult {
  cae: string;
  caeFchVto: string;      // YYYYMMDD
  cbteNro: number;
  resultado: string;      // 'A' = Aprobado, 'R' = Rechazado
  observaciones: string[];
}

function buildAuth(ticket: AuthTicket, cuit: string): string {
  return `<ar:Auth>
    <ar:Token>${ticket.token}</ar:Token>
    <ar:Sign>${ticket.sign}</ar:Sign>
    <ar:Cuit>${cuit}</ar:Cuit>
  </ar:Auth>`;
}

function formatAmount(n: number): string {
  return n.toFixed(2);
}

async function soapCall(
  wsfeUrl: string,
  action: string,
  body: string
): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(wsfeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `http://ar.gov.afip.dif.FEV1/${action}`,
    },
    body: envelope,
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();

  if (text.includes('<faultstring>') || text.includes(':faultstring>')) {
    const fault = text.match(/(?::)?faultstring>([^<]*)/)?.[1] ?? 'Error desconocido';
    throw new Error(`WSFE fault (${action}): ${fault}`);
  }

  return text;
}

/**
 * FEDummy — verifica conectividad con WSFE.
 * No requiere autenticación.
 */
export async function feDummy(wsfeUrl: string): Promise<{ app: string; db: string; auth: string }> {
  const xml = await soapCall(wsfeUrl, 'FEDummy', '<ar:FEDummy/>');
  const parsed = parser.parse(xml);

  const result =
    parsed?.Envelope?.Body?.FEDummyResponse?.FEDummyResult ??
    parsed?.Envelope?.Body?.['ar:FEDummyResponse']?.['ar:FEDummyResult'];

  return {
    app: result?.AppServer ?? 'desconocido',
    db: result?.DbServer ?? 'desconocido',
    auth: result?.AuthServer ?? 'desconocido',
  };
}

/**
 * FECompUltimoAutorizado — obtiene el último número de comprobante emitido.
 */
export async function feCompUltimoAutorizado(
  wsfeUrl: string,
  ticket: AuthTicket,
  cuit: string,
  ptoVta: number,
  cbteType: number
): Promise<number> {
  const body = `<ar:FECompUltimoAutorizado>
    ${buildAuth(ticket, cuit)}
    <ar:PtoVta>${ptoVta}</ar:PtoVta>
    <ar:CbteTipo>${cbteType}</ar:CbteTipo>
  </ar:FECompUltimoAutorizado>`;

  const xml = await soapCall(wsfeUrl, 'FECompUltimoAutorizado', body);
  const parsed = parser.parse(xml);

  const result =
    parsed?.Envelope?.Body?.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;

  if (result?.Errors?.Err) {
    const err = Array.isArray(result.Errors.Err) ? result.Errors.Err[0] : result.Errors.Err;
    throw new Error(`WSFE FECompUltimoAutorizado error ${err.Code}: ${err.Msg}`);
  }

  return Number(result?.CbteNro ?? 0);
}

/**
 * FECAESolicitar — solicita CAE para una factura.
 */
export async function feCAESolicitar(
  wsfeUrl: string,
  ticket: AuthTicket,
  cuit: string,
  req: InvoiceRequest
): Promise<InvoiceResult> {
  const ivaXml = req.ivaItems
    .map(
      (item) => `
          <ar:AlicIva>
            <ar:Id>${item.id}</ar:Id>
            <ar:BaseImp>${formatAmount(item.baseImp)}</ar:BaseImp>
            <ar:Importe>${formatAmount(item.importe)}</ar:Importe>
          </ar:AlicIva>`
    )
    .join('');

  const body = `<ar:FECAESolicitar>
    ${buildAuth(ticket, cuit)}
    <ar:FeCAEReq>
      <ar:FeCabReq>
        <ar:CantReg>1</ar:CantReg>
        <ar:PtoVta>${req.ptoVta}</ar:PtoVta>
        <ar:CbteTipo>${req.cbteType}</ar:CbteTipo>
      </ar:FeCabReq>
      <ar:FeDetReq>
        <ar:FECAEDetRequest>
          <ar:Concepto>${req.concept}</ar:Concepto>
          <ar:DocTipo>${req.docType}</ar:DocTipo>
          <ar:DocNro>${req.docNumber}</ar:DocNro>
          <ar:CbteDesde>${req.cbteDesde}</ar:CbteDesde>
          <ar:CbteHasta>${req.cbteHasta}</ar:CbteHasta>
          <ar:CbteFch>${req.cbteFch}</ar:CbteFch>
          <ar:ImpTotal>${formatAmount(req.impTotal)}</ar:ImpTotal>
          <ar:ImpTotConc>${formatAmount(req.impTotConc)}</ar:ImpTotConc>
          <ar:ImpNeto>${formatAmount(req.impNeto)}</ar:ImpNeto>
          <ar:ImpOpEx>${formatAmount(req.impOpEx)}</ar:ImpOpEx>
          <ar:ImpIVA>${formatAmount(req.impIVA)}</ar:ImpIVA>
          <ar:ImpTrib>${formatAmount(req.impTrib)}</ar:ImpTrib>
          <ar:MonId>PES</ar:MonId>
          <ar:MonCotiz>1.00</ar:MonCotiz>
          <ar:Iva>${ivaXml}
          </ar:Iva>
        </ar:FECAEDetRequest>
      </ar:FeDetReq>
    </ar:FeCAEReq>
  </ar:FECAESolicitar>`;

  const xml = await soapCall(wsfeUrl, 'FECAESolicitar', body);
  const parsed = parser.parse(xml);

  const response =
    parsed?.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult;

  // Errores de cabecera
  if (response?.Errors?.Err) {
    const err = Array.isArray(response.Errors.Err)
      ? response.Errors.Err[0]
      : response.Errors.Err;
    throw new Error(`WSFE FECAESolicitar error ${err.Code}: ${err.Msg}`);
  }

  const det = response?.FeDetResp?.FECAEDetResponse;
  if (!det) {
    throw new Error(`Respuesta WSFE inesperada: ${JSON.stringify(response)}`);
  }

  // Observaciones (errores blandos, no impiden la emisión)
  const obs: string[] = [];
  if (det.Observaciones?.Obs) {
    const items = Array.isArray(det.Observaciones.Obs)
      ? det.Observaciones.Obs
      : [det.Observaciones.Obs];
    obs.push(...items.map((o: { Code: number; Msg: string }) => `${o.Code}: ${o.Msg}`));
  }

  if (det.Resultado === 'R') {
    const errObs = obs.join(', ') || 'Comprobante rechazado por AFIP sin detalle';
    throw new Error(`AFIP rechazó el comprobante: ${errObs}`);
  }

  return {
    cae: String(det.CAE ?? ''),
    caeFchVto: String(det.CAEFchVto ?? ''),
    cbteNro: Number(det.CbteDesde ?? 0),
    resultado: String(det.Resultado ?? ''),
    observaciones: obs,
  };
}
