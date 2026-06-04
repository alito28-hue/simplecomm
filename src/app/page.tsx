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
            <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Comenzar</button>
          </div>
        </section>
      </div>
    </main>
  );
}
