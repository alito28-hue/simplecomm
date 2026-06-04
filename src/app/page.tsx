import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1>SimpleComm</h1>
          <p>Facturación Electrónica Automática y Masiva</p>
        </header>

        <section className={styles.hero}>
          <div className={styles.card}>
            <h2>Bienvenido a SimpleComm</h2>
            <p>Simplificando las operaciones de e-commerce en Argentina.</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/login" className="btn btn-primary">Ingresar</Link>
              <Link href="/register" className="btn btn-primary">Crear cuenta</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
