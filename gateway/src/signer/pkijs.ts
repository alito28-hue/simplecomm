/**
 * CMS Signer para WSAA/AFIP usando pkijs (TypeScript puro, sin openssl CLI).
 *
 * Equivalente exacto a:
 *   openssl cms -sign -in tra.xml -signer cert.pem -inkey key.pem \
 *     -out cms.der -outform DER -binary -nodetach -md sha1 -certfile chain.pem
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeCrypto = require('node:crypto') as typeof import('node:crypto');
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

export const SIGNER_NAME = 'pkijs';

// Configura pkijs para usar WebCrypto nativo de Node.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cryptoEngine = new pkijs.CryptoEngine({ name: 'nodeEngine', crypto: nodeCrypto.webcrypto as any });
pkijs.setEngine('nodeEngine', cryptoEngine);

// ─── Utilidades PEM ────────────────────────────────────────────────────────

function parseCertificateBlock(block: string): pkijs.Certificate {
  const match = block.match(/-----BEGIN CERTIFICATE-----\n?([\s\S]+?)\n?-----END CERTIFICATE-----/);
  if (!match) throw new Error('Bloque de certificado inválido');
  const der = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
  const buf = der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer;
  const asn1 = asn1js.fromBER(buf);
  if (asn1.offset === -1) throw new Error('No se pudo parsear el DER del certificado');
  return new pkijs.Certificate({ schema: asn1.result });
}

function parseAllCertificates(pem: string): pkijs.Certificate[] {
  const normalized = pem.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const regex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
  return (normalized.match(regex) ?? []).map(parseCertificateBlock);
}

/**
 * Importa la clave privada como CryptoKey para SHA-1+RSA.
 * Soporta PKCS#8 ("BEGIN PRIVATE KEY") y PKCS#1 ("BEGIN RSA PRIVATE KEY").
 */
async function importPrivateKey(keyPem: string): Promise<CryptoKey> {
  const keyObject = nodeCrypto.createPrivateKey(keyPem);
  const pkcs8Der = keyObject.export({ type: 'pkcs8', format: 'der' }) as Buffer;
  const pkcs8Buf = pkcs8Der.buffer.slice(
    pkcs8Der.byteOffset,
    pkcs8Der.byteOffset + pkcs8Der.byteLength
  ) as ArrayBuffer;

  return nodeCrypto.webcrypto.subtle.importKey(
    'pkcs8',
    pkcs8Buf,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  ) as Promise<CryptoKey>;
}

// ─── Función principal ─────────────────────────────────────────────────────

/**
 * Firma el TRA XML y devuelve el CMS SignedData en DER codificado en base64.
 * Incluye la cadena CA completa para que WSAA producción valide la confianza.
 */
export async function signLoginTicket(
  traXml: string,
  certPem: string,
  keyPem: string,
  chainPem: string
): Promise<string> {
  const privateKey = await importPrivateKey(keyPem);

  const [signerCert] = parseAllCertificates(certPem.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  if (!signerCert) throw new Error('No se pudo parsear el certificado del firmante');

  const chainCerts = parseAllCertificates(chainPem);
  if (chainCerts.length === 0) {
    throw new Error('La cadena CA está vacía — WSAA producción requiere la cadena completa');
  }

  // Construir SignedData con todos los certificados
  const signedData = new pkijs.SignedData({
    version: 1,
    encapContentInfo: new pkijs.EncapsulatedContentInfo({
      eContentType: '1.2.840.113549.1.7.1', // id-data
    }),
    certificates: [signerCert, ...chainCerts],
  });

  // Agregar SignerInfo
  signedData.signerInfos.push(
    new pkijs.SignerInfo({
      version: 1,
      sid: new pkijs.IssuerAndSerialNumber({
        issuer: signerCert.issuer,
        serialNumber: signerCert.serialNumber,
      }),
    })
  );

  // Contenido como ArrayBuffer
  const contentBuf = Buffer.from(traXml, 'utf8');
  const contentArrayBuffer = contentBuf.buffer.slice(
    contentBuf.byteOffset,
    contentBuf.byteOffset + contentBuf.byteLength
  ) as ArrayBuffer;

  // Firmar — pkijs embebe el contenido y agrega authenticated attrs estándar
  await signedData.sign(privateKey, 0, 'SHA-1', contentArrayBuffer, cryptoEngine);

  // AFIP requiere el OID combinado sha1WithRSAEncryption (1.2.840.113549.1.1.5)
  // pkijs puede generar rsaEncryption (1.2.840.113549.1.1.1) que WSAA rechaza
  if (signedData.signerInfos[0]) {
    signedData.signerInfos[0].signatureAlgorithm = new pkijs.AlgorithmIdentifier({
      algorithmId: '1.2.840.113549.1.1.5', // sha1WithRSAEncryption
      algorithmParams: new asn1js.Null(),
    });
    signedData.signerInfos[0].digestAlgorithm = new pkijs.AlgorithmIdentifier({
      algorithmId: '1.3.14.3.2.26', // SHA-1
    });
  }

  // Envolver en ContentInfo
  const contentInfo = new pkijs.ContentInfo({
    contentType: '1.2.840.113549.1.7.2',
    content: signedData.toSchema(true),
  });

  const der = contentInfo.toSchema().toBER(false);
  return Buffer.from(der).toString('base64');
}
