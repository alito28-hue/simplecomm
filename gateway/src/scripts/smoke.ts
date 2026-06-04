/**
 * SMOKE TEST — Valida el signer CMS y la conexión con WSAA/WSFE de producción.
 *
 * Ejecutar:
 *   npm run smoke
 *
 * Requiere las variables de entorno configuradas en .env
 *
 * Secuencia:
 *   1. Signer: firma un TRA de prueba con pkijs
 *   2. WSAA: envía el CMS a producción y obtiene TA
 *   3. WSFE Dummy: verifica conectividad con WSFE
 *   4. Last Voucher: consulta el último comprobante emitido
 *
 * Si todos los pasos pasan → el Gateway está listo para emitir facturas reales.
 */

import 'dotenv/config';
import { masterCredentials, endpoints, config } from '../config';
import { buildTra } from '../wsaa/tra';
import { signLoginTicket, SIGNER_NAME } from '../signer/index';
import { loginCms } from '../wsaa/client';
import { feDummy, feCompUltimoAutorizado } from '../wsfe/client';

const PTO_VTA = parseInt(process.env.SMOKE_PTO_VTA ?? '4');
const CBTE_TYPE = parseInt(process.env.SMOKE_CBTE_TYPE ?? '6'); // 6 = Factura B

function ok(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.log(`  ❌ ${msg}`); }
function info(msg: string) { console.log(`  ℹ  ${msg}`); }

async function run() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         SIMPLECOMM GATEWAY — SMOKE TEST          ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  info(`Ambiente: ${config.AFIP_ENV.toUpperCase()}`);
  info(`CUIT:     ${masterCredentials.cuit}`);
  info(`WSAA:     ${endpoints.wsaa}`);
  info(`WSFE:     ${endpoints.wsfe}`);
  console.log();

  let passed = 0;
  let failed = 0;

  // ── Paso 1: Signer ────────────────────────────────────────────────────────
  console.log(`── Paso 1: CMS Signer (${SIGNER_NAME}) ──────────────────────`);
  try {
    const traXml = buildTra('wsfe');
    info(`TRA generado (${traXml.length} chars)`);

    const { cmsBase64, signer } = await signLoginTicket(
      traXml,
      masterCredentials.certPem,
      masterCredentials.keyPem,
      masterCredentials.chainPem
    );

    ok(`CMS firmado correctamente (${cmsBase64.length} chars base64)`);
    ok(`Signer: ${signer}`);
    passed++;
  } catch (err) {
    fail(`Error en signer: ${err instanceof Error ? err.message : err}`);
    failed++;
    console.log('\n🚫 Smoke test abortado — el signer debe funcionar antes de continuar.\n');
    process.exit(1);
  }

  // ── Paso 2: WSAA loginCms ─────────────────────────────────────────────────
  console.log('\n── Paso 2: WSAA loginCms ───────────────────────────');
  let ticket: Awaited<ReturnType<typeof loginCms>> | null = null;
  try {
    const start = Date.now();
    ticket = await loginCms(endpoints.wsaa, masterCredentials, 'wsfe');
    const ms = Date.now() - start;

    ok(`TA obtenido en ${ms}ms`);
    ok(`Token: ${ticket.token.slice(0, 30)}...`);
    ok(`Sign:  ${ticket.sign.slice(0, 30)}...`);
    ok(`Expira: ${ticket.expiresAt.toISOString()}`);
    passed++;
  } catch (err) {
    fail(`Error en WSAA: ${err instanceof Error ? err.message : err}`);
    failed++;
    console.log('\n  🔍 Posibles causas:');
    console.log('     - Certificado expirado o no emitido por AC de confianza AFIP');
    console.log('     - Error en el formato del CMS (ver detalles del error)');
    console.log('     - Problema de red / firewall hacia wsaa.afip.gov.ar');
    console.log('     - Relación wsfe no habilitada para este CUIT en ARCA\n');
  }

  // ── Paso 3: WSFE FEDummy ──────────────────────────────────────────────────
  console.log('\n── Paso 3: WSFE FEDummy ────────────────────────────');
  try {
    const start = Date.now();
    const dummy = await feDummy(endpoints.wsfe);
    const ms = Date.now() - start;

    const allOk = dummy.app === 'OK' && dummy.db === 'OK' && dummy.auth === 'OK';
    if (allOk) {
      ok(`WSFE disponible en ${ms}ms`);
    } else {
      fail(`WSFE respondió pero con estado degradado: ${JSON.stringify(dummy)}`);
    }
    info(`AppServer: ${dummy.app} | DbServer: ${dummy.db} | AuthServer: ${dummy.auth}`);
    passed++;
  } catch (err) {
    fail(`Error en FEDummy: ${err instanceof Error ? err.message : err}`);
    failed++;
  }

  // ── Paso 4: Last Voucher ──────────────────────────────────────────────────
  if (ticket) {
    console.log('\n── Paso 4: FECompUltimoAutorizado ──────────────────');
    try {
      const lastNro = await feCompUltimoAutorizado(
        endpoints.wsfe, ticket, masterCredentials.cuit, PTO_VTA, CBTE_TYPE
      );
      ok(`Último comprobante PTO_VTA ${PTO_VTA}, tipo ${CBTE_TYPE}: N° ${lastNro}`);
      ok(`Próximo número a emitir: ${lastNro + 1}`);
      passed++;
    } catch (err) {
      fail(`Error en FECompUltimoAutorizado: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  if (failed === 0) {
    console.log(`║  ✅ SMOKE TEST PASADO — ${passed}/${passed} pasos OK               ║`);
    console.log('║  El Gateway está listo para emitir facturas.     ║');
  } else {
    console.log(`║  ❌ SMOKE TEST FALLIDO — ${passed} OK / ${failed} FALLIDOS         ║`);
    console.log('║  Revisar errores antes de desplegar.             ║');
  }
  console.log('╚══════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
