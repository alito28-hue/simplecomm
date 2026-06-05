import Link from 'next/link';
import Logo from '@/components/Logo';
import styles from './page.module.css';

const channels = ['Mercado Libre', 'Tiendanube', 'Shopify', 'Mercado Pago'];

const flowSteps = [
  {
    eyebrow: 'Venta nueva',
    title: 'Entra un pedido pagado',
    copy: 'SimpleComm detecta la venta desde tus canales conectados y trae cliente, total y productos.',
  },
  {
    eyebrow: 'Factura lista',
    title: 'Se emite el comprobante',
    copy: 'Validamos con ARCA, obtenemos CAE y enviamos la factura sin que cargues datos a mano.',
  },
  {
    eyebrow: 'Panel claro',
    title: 'Ves que queda pendiente',
    copy: 'Errores, facturas emitidas y tareas importantes quedan en una bandeja pensada para actuar rápido.',
  },
];

const modules = [
  {
    kicker: 'Disponible primero',
    title: 'Facturación automática para tiendas online',
    body: 'La primera promesa es concreta: vender, facturar y seguir operando sin copiar pedidos entre plataformas.',
    bullets: ['Factura B para e-commerce', 'CAE y PDF en segundos', 'Estados claros para resolver errores'],
  },
  {
    kicker: 'Próxima capa',
    title: 'Meta Ads explicado como negocio',
    body: 'No queremos replicar Ads Manager. Queremos mostrar si la inversión está ayudando a vender o solo consumiendo margen.',
    bullets: ['Gasto, ventas y ROAS en lenguaje simple', 'Alertas para pausar o revisar campañas', 'Lectura por producto y canal'],
  },
];

const comparisons = [
  ['ARCA manual', 'Sirve, pero consume tiempo y te obliga a copiar datos.'],
  ['ERP tradicional', 'Tiene de todo, pero suele sobrar para una tienda simple.'],
  ['Facturador genérico', 'Resuelve comprobantes, no necesariamente tu operación diaria.'],
  ['SimpleComm', 'Automatiza tareas repetitivas para que puedas enfocarte en vender.'],
];

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Principal">
        <Logo size="md" />
        <div className={styles.navLinks}>
          <a href="#facturacion">Facturación</a>
          <a href="#anuncios">Anuncios</a>
          <a href="#diferencia">Diferencia</a>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className="btn btn-ghost">Iniciar sesión</Link>
          <Link href="/register" className="btn btn-primary">Empezar gratis</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroScene} aria-hidden="true">
          <div className={styles.scenePanel}>
            <div className={styles.sceneHeader}>
              <span>Hoy en tu tienda</span>
              <strong>Online</strong>
            </div>
            <div className={styles.sceneGrid}>
              <div>
                <small>Facturas emitidas</small>
                <strong>38</strong>
                <span>sin carga manual</span>
              </div>
              <div>
                <small>Pendientes</small>
                <strong>3</strong>
                <span>requieren acción</span>
              </div>
              <div>
                <small>Meta ROAS</small>
                <strong>4.2x</strong>
                <span>ayer</span>
              </div>
            </div>
            <div className={styles.sceneList}>
              <span>ML #8492</span>
              <strong>Factura B emitida</strong>
              <em>CAE aprobado</em>
            </div>
            <div className={styles.sceneList}>
              <span>Tiendanube #2031</span>
              <strong>Cliente sin DNI</strong>
              <em>Resolver</em>
            </div>
          </div>
        </div>

        <div className={styles.heroContent}>
          <p className={styles.heroBadge}>Hecho para tiendas online simples en Argentina</p>
          <h1 className={styles.heroTitle}>
            Tu tienda vende. SimpleComm se encarga del trabajo repetitivo.
          </h1>
          <p className={styles.heroDesc}>
            Automatizá facturas de ARCA, conectá tus canales de venta y prepará el camino para entender si tus anuncios de Meta están dejando plata o quemándola.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className="btn btn-primary btn-lg">Empezar prueba gratis</Link>
            <a href="#como-funciona" className="btn btn-ghost btn-lg">Ver cómo funciona</a>
          </div>
          <p className={styles.heroCta}>15 días gratis. Sin tarjeta. Sin convertir tu negocio en un ERP.</p>
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
          <h2>De venta online a factura enviada, sin perseguir pantallas.</h2>
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

      <section className={styles.modules}>
        {modules.map((module, index) => (
          <article
            className={styles.module}
            id={index === 0 ? 'facturacion' : 'anuncios'}
            key={module.title}
          >
            <div>
              <p className={styles.kicker}>{module.kicker}</p>
              <h2>{module.title}</h2>
              <p>{module.body}</p>
            </div>
            <ul>
              {module.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className={styles.section} id="diferencia">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Diferencia</p>
          <h2>No competimos por ser el sistema mas grande. Competimos por sacarte tareas de encima.</h2>
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
        <p className={styles.kicker}>Operación simple, tienda enfocada</p>
        <h2>Empezá por automatizar la facturación. Después medimos dónde conviene invertir.</h2>
        <div className={styles.heroActions}>
          <Link href="/register" className="btn btn-primary btn-lg">Crear cuenta</Link>
          <Link href="/login" className="btn btn-ghost btn-lg">Ya tengo cuenta</Link>
        </div>
      </section>
    </main>
  );
}
