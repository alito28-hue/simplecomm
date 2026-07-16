import Link from 'next/link';
import Logo, { LogoWhite } from '@/components/Logo';
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
    icon: '✳',
    title: 'Multi-canal',
    body: 'Mercado Libre, Tiendanube, Shopify y Mercado Pago conectados — la venta entra sola.',
  },
  {
    icon: '◎',
    title: 'Lotes y conciliación bancaria',
    body: 'Muchos pedidos juntos se convierten en comprobantes sin cargar uno por uno, y podés facturar directo sobre lo que ya cobraste por transferencia.',
  },
];

const plans = [
  {
    name: 'Inicial',
    eyebrow: 'Hasta 50',
    price: '$4.990',
    period: '/ mes',
    description: 'Ideal para quienes arrancan.',
    features: ['50 comprobantes por mes', 'Facturas A, B y C', 'Integración con Mercado Libre', 'Reporte de IVA', 'Soporte básico'],
    cta: 'Contratar Inicial',
    highlighted: false,
  },
  {
    name: 'Intermedio',
    eyebrow: 'Hasta 200',
    price: '$9.990',
    period: '/ mes',
    description: 'Para el volumen que ya opera todos los días.',
    features: ['200 comprobantes por mes', 'Facturas A, B y C', 'Todos los canales conectados', 'Reporte de IVA y Ganancias', 'Soporte prioritario'],
    cta: 'Contratar Intermedio',
    highlighted: true,
  },
  {
    name: 'Pro',
    eyebrow: 'Alto volumen',
    price: 'A consultar',
    period: '',
    description: 'Para negocios con alto volumen de operaciones.',
    features: ['Comprobantes ilimitados', 'Facturación masiva y multi-RUT', 'API personalizada', 'Onboarding dedicado'],
    cta: 'Contactar ventas',
    highlighted: false,
  },
];

const comparisons = [
  { name: 'ARCA manual', copy: 'Cliente carga cada comprobante a mano, sin cruzar con las ventas reales.', dark: false },
  { name: 'ERP tradicional', copy: 'Resuelve mucho más de lo que necesita, con semanas de implementación.', dark: false },
  { name: 'SimpleComm', copy: 'Rápido y sin fricción. Anda listo en minutos y se adapta a tu operación, no al revés.', dark: true },
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
          <a href="#eficiencia">Eficiencia</a>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className="btn btn-ghost">Iniciar sesión</Link>
          <Link href="/register" className="btn btn-primary">Empezar gratis</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroBadge}>Facturación electrónica ARCA</p>
          <h1 className={styles.heroTitle}>
            Facturá, cobrá y entendé tu negocio sin perseguir planillas.
          </h1>
          <p className={styles.heroDesc}>
            Automatizá tus facturas de ARCA, conectá tus canales de venta y entendé tu posición de IVA, Ganancias y categoría de Monotributo — todo en un solo lugar.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className="btn btn-primary btn-lg">Empezá gratis</Link>
            <a href="#como-funciona" className="btn btn-ghost btn-lg">Ver cómo funciona</a>
          </div>
          <p className={styles.heroCta}>Sin tarjeta. Configurás tu cuenta en un minuto.</p>
        </div>

        <div className={styles.heroCard} aria-label="Resumen visual de SimpleComm">
          <div className={styles.heroCardTitle}>Hoy en tu negocio</div>
          <div className={styles.heroStatsGrid}>
            <div>
              <small>Comprobantes hoy</small>
              <strong>38</strong>
            </div>
            <div>
              <small>Posición de IVA</small>
              <strong className={styles.statGreen}>A favor</strong>
            </div>
            <div>
              <small>Cat. Monotributo</small>
              <strong>66%</strong>
            </div>
          </div>
          <div className={styles.heroBanner}>
            <div>
              <small>MP MERCADO</small>
              <span>120 pendientes</span>
            </div>
            <div className={styles.heroBannerCta}>Facturar lote</div>
          </div>
          <div className={styles.heroProgress}>
            <div className={styles.heroProgressLabel}>
              <span>Rentabilidad</span><span>Margen 34% este mes</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: '34%' }} />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.channels} aria-label="Canales conectados">
        <span>Conectate con tus canales de venta</span>
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
            El mismo producto que resuelve tu bandeja de trabajo diaria y te da el panel que necesitás para tomar decisiones.
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

      <section className={styles.paraVos} id="perfiles">
        <div className={styles.paraVosInner}>
          <p className={styles.kickerLight}>Para vos</p>
          <h2 className={styles.paraVosTitle}>Empresa o Monotributo — cada uno lo ve a su manera.</h2>

          <div className={styles.profilesGrid}>
            {profiles.map((profile, index) => (
              <article
                className={index === 0 ? styles.profileCardDark : styles.profileCardLight}
                key={profile.title}
              >
                <h3>{profile.title}</h3>
                <ul>
                  {profile.bullets.map((bullet) => (
                    <li key={bullet}><span>✓</span>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.extrasSection}>
        <div className={styles.extras}>
          {extras.map((extra) => (
            <article className={styles.extraCard} key={extra.title}>
              <div className={styles.extraIcon}>{extra.icon}</div>
              <h3>{extra.title}</h3>
              <p>{extra.body}</p>
            </article>
          ))}
        </div>

        <div className={styles.publicidadBanner}>
          <div>
            <p className={styles.kickerLight}>Publicidad</p>
            <h3>Inversión, ventas y ROAS de tus campañas en un lenguaje simple, sin Ads Manager complejo.</h3>
          </div>
          <div className={styles.roasCard}>
            <span>ROAS total</span>
            <strong>14.2x</strong>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: '75%' }} />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="planes">
        <div className={styles.sectionHeader} style={{ margin: '0 auto 3.5rem', textAlign: 'center' }}>
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
              {plan.highlighted && <div className={styles.planBadge}>Más elegido</div>}

              <p className={styles.planEyebrow}>{plan.eyebrow}</p>
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

      <section className={styles.section} id="eficiencia">
        <div className={styles.sectionHeader} style={{ margin: '0 auto 3.5rem', textAlign: 'center' }}>
          <h2 style={{ maxWidth: '720px', margin: '0 auto 0.75rem' }}>No competimos por ser el sistema más grande. Competimos por sacarte tareas de encima.</h2>
          <p>SimpleComm debe vender bien, menos administración, menos copiar y pegar, menos señales para decidir.</p>
        </div>

        <div className={styles.comparison}>
          {comparisons.map((item) => (
            <article className={item.dark ? styles.comparisonDark : ''} key={item.name}>
              <h4>{item.name}</h4>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.kicker}>Integración simple, negocio ordenado</p>
        <h2>Empezá por automatizar la facturación. Después vas viendo IVA, Ganancias y rentabilidad.</h2>
        <div className={styles.heroActions} style={{ justifyContent: 'center' }}>
          <Link href="/register" className="btn btn-primary btn-lg">Crear cuenta</Link>
          <Link href="/login" className="btn btn-outline btn-lg">Hablar con ventas</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <LogoWhite size="md" />
            <p>La plataforma de gestión financiera diseñada para e-commerce que buscan eficiencia sin complicaciones técnicas.</p>
          </div>
          <div>
            <h4>Producto</h4>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#planes">Planes</a>
            <a href="#perfiles">Para vos</a>
          </div>
          <div>
            <h4>Compañía</h4>
            <Link href="/terminos">Términos</Link>
            <Link href="/faq">Ayuda y soporte</Link>
            <Link href="/login">Iniciar sesión</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} SimpleComm. Todos los derechos reservados.</span>
          <span>Conectado con ARCA vía WSFE</span>
        </div>
      </footer>
    </main>
  );
}
