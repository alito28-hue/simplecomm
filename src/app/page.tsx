import Link from 'next/link';
import Logo from '@/components/Logo';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Logo size="md" />
        <div className={styles.navActions}>
          <Link href="/login" className="btn btn-ghost">Iniciar sesión</Link>
          <Link href="/register" className="btn btn-primary">Empezar gratis</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroBadge}>🇦🇷 Hecho para el e-commerce argentino</div>
        <h1 className={styles.heroTitle}>
          Automatizá tu<br />
          <span className={styles.heroHighlight}>facturación electrónica</span>
        </h1>
        <p className={styles.heroDesc}>
          SimpleComm conecta tus tiendas online, automatiza la facturación electrónica con AFIP/ARCA,
          y te da visibilidad en tiempo real sobre todas tus operaciones.
        </p>
        <div className={styles.heroActions}>
          <Link href="/register" className="btn btn-primary btn-lg">Empezar prueba gratis →</Link>
          <Link href="/login" className="btn btn-ghost btn-lg">Iniciar sesión</Link>
        </div>
        <p className={styles.heroCta}>15 días gratis · Sin tarjeta de crédito</p>
      </section>

      <section className={styles.features}>
        {[
          { icon: '⚡', title: 'Facturación automática',    desc: 'Emití Facturas A, B y C automáticamente cuando se pagan los pedidos.' },
          { icon: '🔗', title: 'Sincronización multi-plataforma', desc: 'Conectá Mercado Libre, Shopify, Tiendanube y más.' },
          { icon: '📊', title: 'Analíticas en tiempo real', desc: 'Seguí ingresos, sincronizaciones pendientes y ROAS por canal.' },
          { icon: '🔒', title: 'Cumplimiento ARCA',         desc: 'Totalmente compatible con la normativa AFIP/ARCA y emisión de CAE.' },
        ].map((f) => (
          <div key={f.title} className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
