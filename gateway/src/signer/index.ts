/**
 * Signer selector: intenta openssl primero (funciona en Mac y Railway),
 * cae a pkijs si openssl no está disponible.
 *
 * En NINGÚN caso usa node-forge — causa rechazo en WSAA producción.
 */

import { isOpensslAvailable, signLoginTicket as opensslSign, SIGNER_NAME as OPENSSL } from './openssl';
import { signLoginTicket as pkijsSign, SIGNER_NAME as PKIJS } from './pkijs';

export interface SignResult {
  cmsBase64: string;
  signer: string;
}

let _cachedSigner: 'openssl' | 'pkijs' | null = null;

function resolveSigner(): 'openssl' | 'pkijs' {
  if (_cachedSigner) return _cachedSigner;
  _cachedSigner = isOpensslAvailable() ? 'openssl' : 'pkijs';
  console.log(`[signer] Usando: ${_cachedSigner}`);
  return _cachedSigner;
}

export async function signLoginTicket(
  traXml: string,
  certPem: string,
  keyPem: string,
  chainPem: string
): Promise<SignResult> {
  const signer = resolveSigner();

  if (signer === 'openssl') {
    const cmsBase64 = await opensslSign(traXml, certPem, keyPem, chainPem);
    return { cmsBase64, signer: OPENSSL };
  }

  const cmsBase64 = await pkijsSign(traXml, certPem, keyPem, chainPem);
  return { cmsBase64, signer: PKIJS };
}

export const SIGNER_NAME = resolveSigner();
