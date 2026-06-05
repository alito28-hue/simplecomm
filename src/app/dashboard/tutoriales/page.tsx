import styles from './tutoriales.module.css';

const CATEGORIAS = [
  { icon: '🚀', titulo: 'Primeros pasos',      desc: 'Los fundamentos para tener tu tienda funcionando en minutos.' },
  { icon: '⚡', titulo: 'Facturación automática', desc: 'Configurá ciclos de facturación y pagos automáticos.' },
  { icon: '🔗', titulo: 'Conectar plataformas', desc: 'Sincronizá con Shopify, Mercado Libre, y más.' },
  { icon: '🔧', titulo: 'Solución de problemas', desc: 'Resolvé errores comunes de API y sincronización.' },
];

const TUTORIALES = [
  {
    tag: 'PRINCIPIANTE', tagColor: 'success',
    titulo: 'Configurar tu primera cuenta de vendedor',
    desc: 'Aprendé a configurar tus datos bancarios y verificar tu identidad fiscal...',
    actualizado: 'hace 2 días', vistas: '1.3k', tipo: 'video',
  },
  {
    tag: 'INTERMEDIO', tagColor: 'warning',
    titulo: 'Facturación automática: Triggers condicionales',
    desc: 'Cómo configurar triggers automáticos basados en el comportamiento del cliente...',
    lecturaMin: '9 min', tipo: 'articulo',
  },
  {
    tag: 'EXPERTO', tagColor: 'error',
    titulo: 'API Sync: Resolver latencia en webhooks',
    desc: 'Guía técnica para optimizar tus endpoints de API en tiempo real...',
    actualizado: 'reciente', tipo: 'video',
  },
];

export default function TutorialesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.heroSection}>
        <div className={styles.heroSearch}>
          <span className={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Buscar tutoriales, artículos o videos..."
            className={styles.searchInput} />
        </div>
        <h1 className={styles.heroTitle}>¿En qué podemos ayudarte hoy?</h1>
        <p className={styles.heroSubtitle}>
          Explorá nuestra guía completa de tutoriales y documentación para dominar
          la suite de operaciones de e-commerce de SimpleComm.
        </p>
      </div>

      <div className={styles.categoriesGrid}>
        {CATEGORIAS.map((cat) => (
          <div key={cat.titulo} className={`card ${styles.catCard}`}>
            <div className={styles.catIcon}>{cat.icon}</div>
            <h3 className={styles.catTitle}>{cat.titulo}</h3>
            <p className={styles.catDesc}>{cat.desc}</p>
          </div>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Últimos tutoriales</h2>
          <p className={styles.sectionSub}>Contenido curado para mejorar tu eficiencia operativa.</p>
        </div>
        <div className={styles.viewToggle}>
          <button className={`${styles.toggleBtn} ${styles.active}`}>Grilla</button>
          <button className={styles.toggleBtn}>Lista</button>
        </div>
      </div>

      <div className={styles.tutGrid}>
        {TUTORIALES.map((tut) => (
          <div key={tut.titulo} className={`card ${styles.tutCard}`}>
            <div className={`${styles.tutThumb} ${tut.tipo === 'video' ? styles.videoThumb : styles.articleThumb}`}>
              {tut.tipo === 'video' && <div className={styles.playBtn}>▶</div>}
              <span className={`badge badge-${tut.tagColor}`}>{tut.tag}</span>
            </div>
            <div className={styles.tutBody}>
              {tut.actualizado && <span className={styles.tutMeta}>🕐 Actualizado {tut.actualizado}</span>}
              {tut.lecturaMin && <span className={styles.tutMeta}>📖 {tut.lecturaMin} de lectura</span>}
              <h3 className={styles.tutTitle}>{tut.titulo}</h3>
              <p className={styles.tutDesc}>{tut.desc}</p>
              <div className={styles.tutActions}>
                {tut.tipo === 'video'
                  ? <button className="btn btn-outline btn-sm">▶ Ver tutorial</button>
                  : <button className="btn btn-outline btn-sm">Leer artículo →</button>
                }
                {tut.vistas && <span className={styles.tutViews}>👁 {tut.vistas} vistas</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-outline">Ver todos los tutoriales</button>
      </div>

      <div className={`card ${styles.supportBanner}`}>
        <div>
          <h3 className={styles.supportTitle}>¿No encontrás lo que buscás?</h3>
          <p className={styles.supportDesc}>
            Nuestro equipo de soporte está disponible 24/7 para ayudarte con configuración técnica,
            consultas de facturación o solicitudes de funciones. Únete a nuestra comunidad de desarrolladores.
          </p>
        </div>
        <div className={styles.supportBtns}>
          <button className="btn btn-navy">Ir al Centro de Ayuda</button>
          <button className="btn btn-outline">Documentación para devs</button>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }}>
          💬 Contactar soporte
        </button>
      </div>
    </div>
  );
}
