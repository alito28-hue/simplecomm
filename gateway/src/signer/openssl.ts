/**
 * Signer CMS usando el binario openssl CLI.
 * Funciona en Mac (desarrollo) y Railway/Linux (producción).
 * NO funciona en Vercel Lambda (OpenSSL roto en ese runtime).
 *
 * Equivale exactamente a:
 *   openssl cms -sign -in tra.xml -signer cert.pem -inkey key.pem
 *     -out cms.der -outform DER -binary -nodetach -md sha1 -certfile chain.pem
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const SIGNER_NAME = 'openssl';

/**
 * Verifica si el binario openssl está disponible y funciona.
 */
export function isOpensslAvailable(): boolean {
  try {
    const result = spawnSync('openssl', ['version'], { timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Firma el TRA XML con openssl cms -sign.
 * Escribe archivos temporales, firma, lee el resultado y limpia.
 */
export async function signLoginTicket(
  traXml: string,
  certPem: string,
  keyPem: string,
  chainPem: string
): Promise<string> {
  const id = randomUUID();
  const tmp = tmpdir();

  const traFile   = join(tmp, `tra_${id}.xml`);
  const certFile  = join(tmp, `cert_${id}.pem`);
  const keyFile   = join(tmp, `key_${id}.pem`);
  const chainFile = join(tmp, `chain_${id}.pem`);
  const outFile   = join(tmp, `cms_${id}.der`);

  try {
    writeFileSync(traFile,   traXml,   'utf8');
    writeFileSync(certFile,  certPem,  'utf8');
    writeFileSync(keyFile,   keyPem,   'utf8');
    writeFileSync(chainFile, chainPem, 'utf8');

    const result = spawnSync('openssl', [
      'cms', '-sign',
      '-in',       traFile,
      '-signer',   certFile,
      '-inkey',    keyFile,
      '-out',      outFile,
      '-outform',  'DER',
      '-binary',
      '-nodetach',
      '-md',       'sha1',
      '-certfile', chainFile,
    ], { timeout: 15_000 });

    if (result.status !== 0) {
      const stderr = result.stderr?.toString() ?? '';
      throw new Error(`openssl cms falló (exit ${result.status}): ${stderr}`);
    }

    if (!existsSync(outFile)) {
      throw new Error('openssl no generó el archivo DER de salida');
    }

    return readFileSync(outFile).toString('base64');

  } finally {
    for (const f of [traFile, certFile, keyFile, chainFile, outFile]) {
      try { if (existsSync(f)) unlinkSync(f); } catch {}
    }
  }
}
