import Link from 'next/link';
import Logo from '@/components/Logo';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Logo size="md" />
        <div className={styles.navActions}>
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/register" className="btn btn-primary">Get started free</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>🇦🇷 Built for Argentine e-commerce</div>
          <h1 className={styles.heroTitle}>
            Automate your<br />
            <span className={styles.heroHighlight}>e-commerce invoicing</span>
          </h1>
          <p className={styles.heroDesc}>
            SimpleComm connects your storefronts, automates AFIP/ARCA electronic invoicing,
            and gives you real-time visibility across all your operations.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className="btn btn-primary btn-lg">
              Start free trial →
            </Link>
            <Link href="/login" className="btn btn-ghost btn-lg">
              Sign in
            </Link>
          </div>
          <p className={styles.heroCta}>15-day free trial · No credit card required</p>
        </div>
      </section>

      <section className={styles.features}>
        {[
          { icon: '⚡', title: 'Automated Invoicing', desc: 'Issue Factura A, B, C automatically when orders are paid.' },
          { icon: '🔗', title: 'Multi-platform Sync', desc: 'Connect Mercado Libre, Shopify, Tiendanube and more.' },
          { icon: '📊', title: 'Real-time Analytics', desc: 'Track revenue, pending syncs, and ROAS across channels.' },
          { icon: '🔒', title: 'ARCA Compliant', desc: 'Fully compliant with AFIP/ARCA regulations and CAE issuance.' },
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
