import Link from 'next/link';
import Logo from '@/components/Logo';
import styles from './page.module.css';

const channels = ['Mercado Libre', 'Tiendanube', 'Shopify', 'Mercado Pago'];

const flowSteps = [
  {
    eyebrow: 'Venta nueva',
    title: 'Entra un pedido o lo cargás vos',
    copy: 'SimpleComm detecta la venta desde tus canales conectados, o la cargás en segundos desde Facturación Rápida.',
  },
  {
    eyebrow: 'Factura lista',
    title: 'Se emite el comprobante',
    copy: 'Validamos con ARCA, obtenemos CAE y enviamos la factura sin que cargues datos a mano.',
  },
  {
    eyebrow: 'Negocio claro',
    title: 'Ves dónde parás',
    copy: 'IVA, Ganancias, categoría de Monotributo y rentabilidad por producto, siempre actualizados — no solo facturas emitidas.',
  },
];

const profiles = [
  {
    kicker: 'Para Responsables Inscriptos',
    title: 'Tu empresa',
    body: 'Vendas productos o servicios, SimpleComm arma el panorama completo: cuánto facturás, cuánto cobrás y cuánto te queda después de Ganancias.',
    bullets: [
      'Facturas A, B y C con CAE en segundos',
      'Posición de IVA: ventas menos compras, mes a mes, con el detalle de cada comprobante',
      'Posición de Ganancias: ganancia estimada e Impuesto a las Ganancias, respetando tu ejercicio fiscal (no todas las empresas cierran en diciembre)',
      'Rentabilidad por producto: costo, margen y % de ganancia de cada venta',
      'Compras: cargalas a mano, con una foto (IA completa los datos), o importalas directo de ARCA',
      'Facturación por lotes y facturas programadas para servicios recurrentes',
    ],
  },
  {
    kicker: 'Para Monotributistas',
    title: 'Tu monotributo',
    body: 'Facturá sin pelearte con ARCA, y enterate a tiempo si estás por pasarte de categoría — antes de que sea un problema.',
    bullets: [
      'Facturación C automática, sin formularios de ARCA',
      'Alerta de categoría: te avisamos si te acercás al tope, con la ventana móvil de 365 días que exige ARCA (no por año calendario)',
      'Importá tu historial de ARCA de los últimos 12 meses al sumarte, para no arrancar sin datos',
      'Facturación por delegación si todavía no tenés certificado digital propio — nosotros lo gestionamos',
      'Rentabilidad por producto, si además de servicios vendés productos',
      'Facturas programadas para tus clientes recurrentes',
    ],
  },
];

const extras = [
  {
    title: 'Multi-canal',
    body: 'Mercado Libre, Tiendanube, Shopify y Mercado Pago conectados — la venta entra sola.',
  },
  {
    title: 'Lotes y conciliación bancaria',
    body: 'Muchos pedidos juntos se convierten en comprobantes sin cargar uno por uno, y podés facturar directo sobre lo que ya cobraste por transferencia.',
  },
  {
    title: 'Publicidad',
    body: 'Inversión, ventas y ROAS de tus campañas en lenguaje simple, no como un Ads Manager más.',
  },
];

const plans = [
  {
    name: 'Inicial',
    price: '$4.990',
    period: '/ mes',
    icon: '50',
    description: 'Ideal para tiendas que están empezando',
    features: ['50 comprobantes por mes', 'Facturas A, B y C', 'Integración con Mercado Libre', 'Soporte por email', 'Dashboard básico'],
    cta: 'Contratar Inicial',
    highlighted: false,
  },
  {
    name: 'Intermedio',
    price: '$9.990',
    period: '/ mes',
    icon: '200',
    description: 'Para e-commerce con operación activa',
    features: ['200 comprobantes por mes', 'Facturas A, B y C', 'Todas las integraciones incluidas', 'Soporte prioritario', 'Importación de lotes (CSV)', 'Dashboard con métricas'],
    cta: 'Contratar Intermedio',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: 'A consultar',
    period: '',
    icon: '∞',
    description: 'Para tiendas con volumen alto o campañas que disparan muchos pedidos.',
    features: ['Comprobantes ilimitados', 'Facturación masiva (batch API)', 'Todas las integraciones', 'Soporte dedicado', 'API personalizada', 'Onboarding con el equipo técnico'],
    cta: 'Contactar ventas',
    highlighted: false,
  },
];

const comparisons = [
  ['ARCA manual', 'Sirve, pero consume tiempo y te obliga a copiar datos.'],
  ['ERP tradicional', 'Tiene de todo, pero suele sobrar para una tienda o un monotributo simple.'],
  ['Facturador genérico', 'Resuelve comprobantes, no necesariamente tu posición de IVA o Ganancias.'],
  ['SimpleComm', 'Factura y además te dice cómo está parado tu negocio.'],
];

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Principal">
        <Logo size="md" />
        <div className={styles.navLinks}>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#perfiles">Para vos</a>
          <a href="#planes">Planes</a>
          <a href="#diferencia">Diferencia</a>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className="btn btn-ghost">Iniciar sesión</Link>
          <Link href="/register" className="btn btn-primary">Empezar gratis</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroBadge}>Facturación electrónica de ARCA para empresas y Monotributistas</p>
          <h1 className={styles.heroTitle}>
            Facturá, cobrá y entendé tu negocio sin perseguir planillas.
          </h1>
          <p className={styles.heroDesc}>
            Automatizá tus facturas de ARCA, conectá tus canales de venta, y seguí tu posición de IVA, Ganancias o categoría de Monotributo — todo en un solo lugar, actualizado solo.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className="btn btn-primary btn-lg">Empezar prueba gratis</Link>
            <a href="#como-funciona" className="btn btn-ghost btn-lg">Ver cómo funciona</a>
          </div>
          <p className={styles.heroCta}>15 días gratis. Sin tarjeta. Sin convertir tu negocio en un ERP.</p>
        </div>

        <div className={styles.heroScene} aria-label="Resumen visual de SimpleComm">
          <div className={styles.scenePanel}>
            <div className={styles.sceneHeader}>
              <span>Hoy en tu negocio</span>
              <strong>Online</strong>
            </div>
            <div className={styles.sceneGrid}>
              <div>
                <small>Facturas emitidas</small>
                <strong>38</strong>
                <span>sin carga manual</span>
              </div>
              <div>
                <small>Posición de IVA</small>
                <strong>A favor</strong>
                <span>este mes</span>
              </div>
              <div>
                <small>Categoría Monotributo</small>
                <strong>68%</strong>
                <span>de tu tope anual</span>
              </div>
            </div>
            <div className={styles.sceneList}>
              <span>ML #8492</span>
              <strong>Factura A emitida</strong>
              <em>CAE aprobado</em>
            </div>
            <div className={styles.sceneList}>
              <span>Rentabilidad</span>
              <strong>Margen 34% este mes</strong>
              <em>Ver detalle</em>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.channels} aria-label="Canales conectados">
        <span>Conectá lo que ya usás</span>
        <div>
          {channels.map((channel) => (
            <strong key={channel}>{channel}</strong>
          ))}
        </div>
      </section>

      <section className={styles.section} id="como-funciona">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Cómo funciona</p>
          <h2>De venta a factura, y de factura a saber cómo estás parado.</h2>
          <p>
            El frente del producto tiene que sentirse como una bandeja de trabajo: qué pasó, qué se resolvió y qué necesita tu atención.
          </p>
        </div>

        <div className={styles.flow}>
          {flowSteps.map((step, index) => (
            <article className={styles.flowCard} key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{step.eyebrow}</p>
              <h3>{step.title}</h3>
              <small>{step.copy}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="perfiles">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Para vos</p>
          <h2>Empresa o Monotributo — cada uno ve lo que le sirve.</h2>
          <p>
            No es la misma pregunta la de un Responsable Inscripto que la de un Monotributista. SimpleComm arma el panel según tu condición fiscal.
          </p>
        </div>

        <div className={styles.profilesGrid}>
          {profiles.map((profile) => (
            <article className={styles.planCard} key={profile.title}>
              <p className={styles.kicker}>{profile.kicker}</p>
              <h3 className={styles.planName}>{profile.title}</h3>
              <p className={styles.planDesc}>{profile.body}</p>
              <ul className={styles.planFeatures}>
                {profile.bullets.map((bullet) => (
                  <li key={bullet}><span>✓</span>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.modules} aria-label="Además">
        {extras.map((extra) => (
          <article className={styles.module} key={extra.title}>
            <div>
              <h2 style={{ fontSize: '1.4rem' }}>{extra.title}</h2>
              <p>{extra.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.section} id="planes">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Planes</p>
          <h2>Planes simples según cuántos comprobantes emitís.</h2>
          <p>
            La idea es que el precio acompañe el tamaño de tu negocio, sin obligarte a comprar un ERP completo.
          </p>
        </div>

        <div className={styles.plans}>
          {plans.map((plan) => (
            <article
              className={`${styles.planCard} ${plan.highlighted ? styles.planHighlighted : ''}`}
              key={plan.name}
            >
              {plan.highlighted && <div className={styles.planBadge}>Más popular</div>}

              <div className={styles.planIcon}>{plan.icon}</div>
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planDesc}>{plan.description}</p>

              <div className={styles.priceWrap}>
                <span className={styles.price}>{plan.price}</span>
                {plan.period && <span className={styles.period}>{plan.period}</span>}
              </div>

              <ul className={styles.planFeatures}>
                {plan.features.map((feature) => (
                  <li key={feature}><span>✓</span>{feature}</li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-outline'} ${styles.planCta}`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="diferencia">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Diferencia</p>
          <h2>No competimos por ser el sistema más grande. Competimos por sacarte tareas de encima.</h2>
          <p>
            SimpleComm debe vender foco: menos administración, menos copia manual y mejores señales para decidir.
          </p>
        </div>

        <div className={styles.comparison}>
          {comparisons.map(([name, copy]) => (
            <article className={name === 'SimpleComm' ? styles.highlightComparison : ''} key={name}>
              <h3>{name}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.kicker}>Operación simple, negocio enfocado</p>
        <h2>Empezá por automatizar la facturación. Después vas viendo IVA, Ganancias y rentabilidad.</h2>
        <div className={styles.heroActions}>
          <Link href="/register" className="btn btn-primary btn-lg">Crear cuenta</Link>
          <Link href="/login" className="btn btn-ghost btn-lg">Ya tengo cuenta</Link>
        </div>
      </section>
    </main>
  );
}
