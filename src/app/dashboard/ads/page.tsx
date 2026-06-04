import styles from './ads.module.css';

export default function AdsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Inversión en Publicidad</h1>

      {/* Overlay Próximamente */}
      <div className={styles.comingSoon}>
        <div className={styles.comingSoonBox}>
          <div className={styles.comingSoonIcon}>🚀</div>
          <h2 className={styles.comingSoonTitle}>Próximamente</h2>
          <p className={styles.comingSoonDesc}>
            El módulo de Publicidad te permitirá monitorear tu inversión en Meta Ads y TikTok Ads,
            ver el ROAS, conversiones y CPA en tiempo real desde un solo lugar.
          </p>
          <div className={styles.features}>
            <div className={styles.feature}><span>📊</span> Performance en tiempo real</div>
            <div className={styles.feature}><span>🎯</span> ROAS y conversiones por canal</div>
            <div className={styles.feature}><span>💰</span> Control de gasto vs. retorno</div>
            <div className={styles.feature}><span>📈</span> Campañas activas unificadas</div>
          </div>
        </div>
      </div>
    </div>
  );
}
