import type { Metadata } from 'next';
import Link from 'next/link';
import Logo from '@/components/Logo';
import styles from './desarrolladores.module.css';

export const metadata: Metadata = {
  title: 'API para desarrolladores — SimpleComm',
  description: 'Documentación de la API de facturación electrónica de SimpleComm: emitir facturas, notas de crédito y notas de débito autorizadas por ARCA directo desde tu sistema.',
};

const BASE_URL = 'https://simplecomm-production.up.railway.app';

function CodeBlock({ label, children }: { label: string; children: string }) {
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}><span>{label}</span></div>
      <pre><code>{children}</code></pre>
    </div>
  );
}

const TOC = [
  {
    group: 'Empezar',
    items: [
      ['introduccion', 'Introducción'],
      ['autenticacion', 'Autenticación'],
      ['inicio-rapido', 'Inicio rápido'],
    ],
  },
  {
    group: 'Endpoints',
    items: [
      ['emitir-comprobante', 'Emitir un comprobante'],
      ['consultar-comprobante', 'Consultar un comprobante'],
      ['nota-de-credito', 'Nota de crédito'],
      ['nota-de-debito', 'Nota de débito'],
    ],
  },
  {
    group: 'Referencia',
    items: [
      ['idempotencia', 'Idempotencia'],
      ['errores', 'Errores'],
      ['limites', 'Límites del Plan API'],
      ['buenas-practicas', 'Buenas prácticas'],
    ],
  },
];

export default function DesarrolladoresPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/"><Logo size="sm" /></Link>
        <div className={styles.headerActions}>
          <Link href="/faq" className="btn btn-ghost">Centro de ayuda</Link>
          <Link href="/dashboard/organizacion/api" className="btn btn-primary">Generar mi API key</Link>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.toc} aria-label="Contenidos">
          {TOC.map(g => (
            <div key={g.group}>
              <div className={styles.tocGroup}>{g.group}</div>
              {g.items.map(([id, label]) => (
                <a key={id} href={`#${id}`} className={styles.tocLink}>{label}</a>
              ))}
            </div>
          ))}
        </nav>

        <main className={styles.content}>
          <div className={styles.hero}>
            <div className={styles.eyebrow}>Documentación de la API</div>
            <h1 className={styles.heroTitle}>Facturación electrónica argentina, por API</h1>
            <p className={styles.heroDesc}>
              Emití facturas A/B/C, notas de crédito y notas de débito autorizadas por ARCA directo desde tu sistema —
              e-commerce propio, ERP, o cualquier backend que ya tengas. Mismo motor que usa el dashboard de SimpleComm,
              sin pasar por él.
            </p>
            <div className={styles.heroMeta}>
              <span className={styles.pill}>REST · JSON</span>
              <span className={styles.pill}>Autenticación Bearer</span>
              <span className={styles.pill}>CAE real de ARCA</span>
            </div>
          </div>

          <section id="introduccion" className={styles.section}>
            <h2 className={styles.sectionTitle}>Introducción</h2>
            <p className={styles.sectionDesc}>
              La API de SimpleComm te deja emitir comprobantes electrónicos válidos ante ARCA (ex AFIP) con una sola
              llamada HTTP: mandás el monto, los datos del comprador y el tipo de comprobante, y recibís de vuelta el
              CAE, el número de comprobante y el PDF listo para descargar. No hace falta que manejes certificados ni
              te conectes vos mismo a los webservices de ARCA — eso ya lo resuelve SimpleComm.
            </p>
            <div className={styles.note}>
              Todos los comprobantes emitidos por API son reales y quedan registrados en ARCA — no hay un modo
              "sandbox" separado. Probá primero con un monto chico si es tu primera integración.
            </div>
          </section>

          <section id="autenticacion" className={styles.section}>
            <h2 className={styles.sectionTitle}>Autenticación</h2>
            <p className={styles.sectionDesc}>
              Todas las llamadas requieren una API key en el header <code>Authorization</code>, formato Bearer.
              Generá la tuya desde{' '}
              <Link href="/dashboard/organizacion/api" style={{ color: 'var(--blue)' }}>Configuración → API</Link>{' '}
              en tu dashboard — se muestra una única vez al crearla, así que guardala en un lugar seguro.
            </p>
            <CodeBlock label="Header en cada request">
{`Authorization: Bearer sc_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
            </CodeBlock>
            <div className={styles.warn}>
              Tu API key da acceso a emitir comprobantes fiscales reales a tu nombre. No la pongas en código
              frontend ni la subas a un repositorio público — usala solo desde tu backend.
            </div>
          </section>

          <section id="inicio-rapido" className={styles.section}>
            <h2 className={styles.sectionTitle}>Inicio rápido</h2>
            <p className={styles.sectionDesc}>
              La URL base de la API es:
            </p>
            <CodeBlock label="Base URL">{BASE_URL}</CodeBlock>
            <p className={styles.sectionDesc}>Un ejemplo completo — emitir una Factura B a un consumidor final:</p>
            <CodeBlock label="curl">
{`curl -X POST ${BASE_URL}/v1/invoices/issue \\
  -H "Authorization: Bearer sc_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "idempotency_key": "pedido-10234",
    "invoice": {
      "total_amount": 15000,
      "invoice_letter": "B"
    },
    "buyer": {
      "full_name": "Consumidor Final"
    }
  }'`}
            </CodeBlock>
            <CodeBlock label="JavaScript (fetch)">
{`const res = await fetch("${BASE_URL}/v1/invoices/issue", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sc_live_xxxxxxxxxxxxxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    idempotency_key: \`pedido-\${orderId}\`,
    invoice: {
      total_amount: 15000,
      invoice_letter: "B",
    },
    buyer: {
      full_name: "Consumidor Final",
    },
  }),
});

const data = await res.json();
console.log(data.invoice_number, data.cae);`}
            </CodeBlock>
            <CodeBlock label="Respuesta">
{`{
  "status": "issued",
  "invoice_id": "clx4k9j8e0001abc123",
  "invoice_number": "0004-00000123",
  "cae": "75312457896541",
  "cae_due_date": "20261015",
  "pdf_base64": "JVBERi0xLjQKJcOkw7zDtsO..."
}`}
            </CodeBlock>
          </section>

          <section id="emitir-comprobante" className={styles.section}>
            <h2 className={styles.sectionTitle}>Emitir un comprobante</h2>
            <div className={styles.endpointRow}>
              <span className={`${styles.method} ${styles.post}`}>POST</span>
              <span className={styles.path}>/v1/invoices/issue</span>
            </div>
            <p className={styles.sectionDesc}>
              Emite una Factura A, B o C. El monto se interpreta distinto según la letra: para Factura A es el
              <strong> neto</strong> (sin IVA, que se suma aparte); para B y C es el <strong>total</strong> (con IVA
              incluido en B, sin IVA en C porque los monotributistas no lo discriminan).
            </p>

            <h3 className={styles.subTitle}>Body — invoice</h3>
            <div className={styles.tableWrap}>
              <table className={styles.fieldTable}>
                <thead><tr><th>Campo</th><th>Tipo</th><th></th><th>Descripción</th></tr></thead>
                <tbody>
                  <tr><td><code>total_amount</code></td><td>number</td><td className={styles.req}>requerido</td><td>Neto para Factura A, total (con IVA) para B/C.</td></tr>
                  <tr><td><code>invoice_letter</code></td><td>&quot;A&quot; | &quot;B&quot; | &quot;C&quot;</td><td className={styles.opt}>opcional</td><td>Por defecto &quot;B&quot;. Tu condición fiscal en ARCA determina qué letras podés emitir.</td></tr>
                  <tr><td><code>iva_rate</code></td><td>number</td><td className={styles.opt}>opcional</td><td>21, 10.5, 27 o 0 (exento). Por defecto 21.</td></tr>
                  <tr><td><code>concept</code></td><td>1 | 2 | 3</td><td className={styles.opt}>opcional</td><td>1=Productos (default), 2=Servicios, 3=Ambos. Si es 2 o 3, ARCA exige el período facturado.</td></tr>
                  <tr><td><code>description</code></td><td>string</td><td className={styles.opt}>opcional</td><td>Detalle que aparece en el PDF del comprobante.</td></tr>
                  <tr><td><code>pto_vta</code></td><td>number</td><td className={styles.opt}>opcional</td><td>Punto de venta a usar. Por defecto, el punto de venta principal de tu cuenta.</td></tr>
                  <tr><td><code>service_date_from</code></td><td>string</td><td className={styles.opt}>opcional*</td><td>YYYY-MM-DD. Requerido si <code>concept</code> es 2 o 3.</td></tr>
                  <tr><td><code>service_date_to</code></td><td>string</td><td className={styles.opt}>opcional*</td><td>YYYY-MM-DD. Requerido si <code>concept</code> es 2 o 3.</td></tr>
                  <tr><td><code>payment_due_date</code></td><td>string</td><td className={styles.opt}>opcional*</td><td>YYYY-MM-DD. Requerido si <code>concept</code> es 2 o 3.</td></tr>
                  <tr><td><code>currency</code></td><td>&quot;PES&quot; | &quot;DOL&quot;</td><td className={styles.opt}>opcional</td><td>Por defecto pesos.</td></tr>
                  <tr><td><code>exchange_rate</code></td><td>number</td><td className={styles.opt}>opcional*</td><td>Requerido y mayor a 1 si <code>currency</code> es &quot;DOL&quot;.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className={styles.subTitle}>Body — buyer</h3>
            <div className={styles.tableWrap}>
              <table className={styles.fieldTable}>
                <thead><tr><th>Campo</th><th>Tipo</th><th></th><th>Descripción</th></tr></thead>
                <tbody>
                  <tr><td><code>full_name</code></td><td>string</td><td className={styles.req}>requerido</td><td>Nombre o razón social del comprador.</td></tr>
                  <tr><td><code>doc_type</code></td><td>string</td><td className={styles.opt}>opcional</td><td>&quot;CUIT&quot;, &quot;CUIL&quot;, &quot;DNI&quot; o &quot;CONSUMIDOR_FINAL&quot;. Por defecto &quot;CONSUMIDOR_FINAL&quot;. Factura A requiere CUIT.</td></tr>
                  <tr><td><code>doc_number</code></td><td>string</td><td className={styles.opt}>opcional</td><td>Solo dígitos. Por defecto &quot;0&quot;.</td></tr>
                  <tr><td><code>email</code></td><td>string</td><td className={styles.opt}>opcional</td><td>No se usa para enviar el comprobante — el envío por email es responsabilidad tuya.</td></tr>
                  <tr><td><code>address</code></td><td>string</td><td className={styles.opt}>opcional</td><td>Aparece en el PDF si se provee.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className={styles.subTitle}>Body — nivel raíz</h3>
            <div className={styles.tableWrap}>
              <table className={styles.fieldTable}>
                <thead><tr><th>Campo</th><th>Tipo</th><th></th><th>Descripción</th></tr></thead>
                <tbody>
                  <tr><td><code>idempotency_key</code></td><td>string</td><td className={styles.req}>requerido</td><td>Ver <a href="#idempotencia" style={{ color: 'var(--blue)' }}>Idempotencia</a>. 1-255 caracteres.</td></tr>
                  <tr><td><code>external_ref</code></td><td>string</td><td className={styles.opt}>opcional</td><td>Tu propio ID de referencia (ej. número de pedido) — se guarda pero no se usa para nada más.</td></tr>
                  <tr><td><code>source_app</code></td><td>string</td><td className={styles.opt}>opcional</td><td>Identificador libre de tu integración, útil para tus propios logs.</td></tr>
                  <tr><td><code>metadata</code></td><td>object</td><td className={styles.opt}>opcional</td><td>Cualquier dato adicional que quieras asociar al comprobante.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className={styles.subTitle}>Respuesta</h3>
            <p className={styles.sectionDesc}>
              <span className={`${styles.statusCode} ${styles.s2xx}`}>201</span> si se emitió, o{' '}
              <span className={`${styles.statusCode} ${styles.s2xx}`}>200</span> si ya la habías emitido antes con
              esa misma <code>idempotency_key</code>.
            </p>
            <CodeBlock label="200 / 201">
{`{
  "status": "issued",       // o "duplicate" si ya existía
  "invoice_id": "clx4k9j8e0001abc123",
  "invoice_number": "0004-00000123",
  "cae": "75312457896541",
  "cae_due_date": "20261015",  // YYYYMMDD
  "pdf_base64": "..."          // PDF del comprobante, en base64
}`}
            </CodeBlock>

            <h3 className={styles.subTitle}>Ejemplo — Factura A a un Responsable Inscripto</h3>
            <CodeBlock label="curl">
{`curl -X POST ${BASE_URL}/v1/invoices/issue \\
  -H "Authorization: Bearer sc_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "idempotency_key": "pedido-10235",
    "invoice": {
      "total_amount": 50000,
      "invoice_letter": "A",
      "iva_rate": 21,
      "description": "Servicio de consultoría — septiembre"
    },
    "buyer": {
      "full_name": "Comercial del Sur S.A.",
      "doc_type": "CUIT",
      "doc_number": "30712345671"
    }
  }'`}
            </CodeBlock>
          </section>

          <section id="consultar-comprobante" className={styles.section}>
            <h2 className={styles.sectionTitle}>Consultar un comprobante</h2>
            <div className={styles.endpointRow}>
              <span className={`${styles.method} ${styles.get}`}>GET</span>
              <span className={styles.path}>/v1/invoices/:id</span>
            </div>
            <p className={styles.sectionDesc}>
              Devuelve el estado actual de un comprobante emitido por vos, identificado por el <code>invoice_id</code>{' '}
              que te devolvió <code>/v1/invoices/issue</code>.
            </p>
            <CodeBlock label="Respuesta">
{`{
  "invoice_id": "clx4k9j8e0001abc123",
  "status": "issued",             // "issued" | "pending" | "error"
  "invoice_number": "0004-00000123",
  "invoice_number_int": 123,
  "pto_vta": 4,
  "invoice_type": 6,               // código AFIP: 1=Fact.A, 6=Fact.B, 11=Fact.C
  "cae": "75312457896541",
  "cae_due_date": "20261015",
  "total_amount": 15000,
  "net_amount": 12396.69,
  "iva_amount": 2603.31,
  "concept": 1,
  "buyer_name": "Consumidor Final",
  "buyer_doc_type": "CONSUMIDOR_FINAL",
  "buyer_doc_number": "0",
  "created_at": "2026-09-11T14:32:08.000Z",
  "error": null
}`}
            </CodeBlock>
          </section>

          <section id="nota-de-credito" className={styles.section}>
            <h2 className={styles.sectionTitle}>Nota de crédito</h2>
            <div className={styles.endpointRow}>
              <span className={`${styles.method} ${styles.post}`}>POST</span>
              <span className={styles.path}>/v1/invoices/:id/credit-note</span>
            </div>
            <p className={styles.sectionDesc}>
              Anula por completo un comprobante ya emitido. La letra, el receptor, el punto de venta y el monto se
              toman directo de la factura original — no hace falta (ni se puede) reenviarlos. Hoy solo soporta notas
              de crédito totales, no parciales.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.fieldTable}>
                <thead><tr><th>Campo</th><th>Tipo</th><th></th><th>Descripción</th></tr></thead>
                <tbody>
                  <tr><td><code>idempotency_key</code></td><td>string</td><td className={styles.req}>requerido</td><td>Igual que en la emisión — usá una nueva por cada intento real.</td></tr>
                  <tr><td><code>source_app</code></td><td>string</td><td className={styles.opt}>opcional</td><td>Identificador libre de tu integración.</td></tr>
                </tbody>
              </table>
            </div>
            <CodeBlock label="curl">
{`curl -X POST ${BASE_URL}/v1/invoices/clx4k9j8e0001abc123/credit-note \\
  -H "Authorization: Bearer sc_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "idempotency_key": "nc-pedido-10234" }'`}
            </CodeBlock>
            <p className={styles.sectionDesc}>La respuesta tiene la misma forma que la de emisión.</p>
          </section>

          <section id="nota-de-debito" className={styles.section}>
            <h2 className={styles.sectionTitle}>Nota de débito</h2>
            <div className={styles.endpointRow}>
              <span className={`${styles.method} ${styles.post}`}>POST</span>
              <span className={styles.path}>/v1/invoices/:id/debit-note</span>
            </div>
            <p className={styles.sectionDesc}>
              A diferencia de la nota de crédito, esta no anula nada — suma un cargo adicional asociado a una factura
              ya emitida (ej. intereses por mora, un ajuste de precio). Vos definís el monto y el motivo; la letra,
              el receptor y el punto de venta se toman de la factura original.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.fieldTable}>
                <thead><tr><th>Campo</th><th>Tipo</th><th></th><th>Descripción</th></tr></thead>
                <tbody>
                  <tr><td><code>idempotency_key</code></td><td>string</td><td className={styles.req}>requerido</td><td></td></tr>
                  <tr><td><code>amount</code></td><td>number</td><td className={styles.req}>requerido</td><td>Monto del cargo, mayor a cero. Interpretado igual que <code>total_amount</code> en la emisión (neto para A, total para B/C).</td></tr>
                  <tr><td><code>reason</code></td><td>string</td><td className={styles.req}>requerido</td><td>Motivo del cargo — queda impreso en el comprobante. 1-255 caracteres.</td></tr>
                  <tr><td><code>source_app</code></td><td>string</td><td className={styles.opt}>opcional</td><td></td></tr>
                </tbody>
              </table>
            </div>
            <CodeBlock label="curl">
{`curl -X POST ${BASE_URL}/v1/invoices/clx4k9j8e0001abc123/debit-note \\
  -H "Authorization: Bearer sc_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "idempotency_key": "nd-pedido-10234",
    "amount": 1500,
    "reason": "Intereses por pago fuera de término"
  }'`}
            </CodeBlock>
          </section>

          <section id="idempotencia" className={styles.section}>
            <h2 className={styles.sectionTitle}>Idempotencia</h2>
            <p className={styles.sectionDesc}>
              Todo endpoint que emite un comprobante requiere <code>idempotency_key</code>. Si repetís la misma
              llamada con la misma key (por ejemplo, porque tu request original tuvo timeout y reintentaste), la API
              no emite un comprobante duplicado — te devuelve el mismo resultado de la primera vez, con{' '}
              <code>status: &quot;duplicate&quot;</code> y código <span className={`${styles.statusCode} ${styles.s2xx}`}>200</span> en vez de{' '}
              <span className={`${styles.statusCode} ${styles.s2xx}`}>201</span>.
            </p>
            <div className={styles.note}>
              Usá algo determinístico y único por operación real — el ID de tu pedido es una buena opción (ej.{' '}
              <code>{'`pedido-${orderId}`'}</code>). No generes una key nueva en cada reintento: ahí perdés la
              protección contra duplicados.
            </div>
          </section>

          <section id="errores" className={styles.section}>
            <h2 className={styles.sectionTitle}>Errores</h2>
            <div className={styles.tableWrap}>
              <table className={styles.fieldTable}>
                <thead><tr><th>Código</th><th>Significa</th></tr></thead>
                <tbody>
                  <tr><td><span className={`${styles.statusCode} ${styles.s4xx}`}>400</span></td><td>Payload inválido — el body no cumple el formato esperado. El campo <code>details</code> de la respuesta indica qué falló.</td></tr>
                  <tr><td><span className={`${styles.statusCode} ${styles.s4xx}`}>401</span></td><td>API key faltante, inválida o revocada.</td></tr>
                  <tr><td><span className={`${styles.statusCode} ${styles.s4xx}`}>402</span></td><td>Alcanzaste el cupo mensual de tu API key. Ver <a href="#limites" style={{ color: 'var(--blue)' }}>Límites</a>.</td></tr>
                  <tr><td><span className={`${styles.statusCode} ${styles.s4xx}`}>404</span></td><td>El comprobante (o la factura original, en notas de crédito/débito) no existe o no te pertenece.</td></tr>
                  <tr><td><span className={`${styles.statusCode} ${styles.s5xx}`}>502</span></td><td>Error al emitir contra ARCA — el body incluye un mensaje explicando la causa (rechazo de ARCA, timeout, etc.).</td></tr>
                </tbody>
              </table>
            </div>
            <CodeBlock label="Ejemplo de error 400">
{`{
  "error": "Payload inválido",
  "details": {
    "invoice": ["Required"]
  }
}`}
            </CodeBlock>
          </section>

          <section id="limites" className={styles.section}>
            <h2 className={styles.sectionTitle}>Límites del Plan API</h2>
            <p className={styles.sectionDesc}>
              El acceso directo por API es independiente del plan de tu dashboard — tiene su propio cupo mensual de
              comprobantes, que ves reflejado en{' '}
              <Link href="/dashboard/organizacion/api" style={{ color: 'var(--blue)' }}>Configuración → API</Link>{' '}
              junto a cada key. El cupo se resetea el primer día de cada mes.
            </p>
            <p className={styles.sectionDesc}>
              Si lo superás, vas a recibir <span className={`${styles.statusCode} ${styles.s4xx}`}>402</span> hasta el
              próximo reseteo. Si tu volumen creció y necesitás más, escribinos a{' '}
              <a href="mailto:soporte@simplecomm.com.ar" style={{ color: 'var(--blue)' }}>soporte@simplecomm.com.ar</a>.
            </p>
          </section>

          <section id="buenas-practicas" className={styles.section}>
            <h2 className={styles.sectionTitle}>Buenas prácticas</h2>
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Guardá siempre <code>invoice_id</code>, <code>invoice_number</code> y <code>cae</code> apenas los recibís — son los datos que después necesitás para una nota de crédito/débito o para mostrarle el comprobante al comprador.</li>
              <li>Descargá y guardá el <code>pdf_base64</code> en tu propio storage si necesitás servirlo después — la API no lo re-expone en <code>GET /v1/invoices/:id</code>.</li>
              <li>Verificá el campo <code>status</code> de la respuesta: un <code>&quot;duplicate&quot;</code> no es un error, es la protección de idempotencia funcionando.</li>
              <li>Para Factura A siempre mandá <code>doc_type: &quot;CUIT&quot;</code> con un CUIT válido — ARCA la rechaza sin eso.</li>
              <li>Manejá el <span className={`${styles.statusCode} ${styles.s5xx}`}>502</span> con reintento manual, no automático inmediato: un rechazo de ARCA casi nunca se resuelve reintentando al instante con los mismos datos.</li>
            </ul>
          </section>

          <div className={styles.ctaBox}>
            <div>
              <h3>¿Listo para integrar?</h3>
              <p>Generá tu API key desde el dashboard y emitís tu primer comprobante en minutos.</p>
            </div>
            <Link href="/dashboard/organizacion/api" className="btn btn-primary">Generar mi API key</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
