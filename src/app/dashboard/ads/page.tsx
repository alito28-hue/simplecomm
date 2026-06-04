import styles from './ads.module.css';

const CAMPANAS = [
  { estado: 'activa',  nombre: 'Verano — Meta',          gasto: '$4.200', roas: '4.8x', conv: '412', cpa: '$10,19' },
  { estado: 'activa',  nombre: 'Retargeting TikTok',      gasto: '$1.890', roas: '3.2x', conv: '220', cpa: '$8,59'  },
  { estado: 'pausada', nombre: 'Brand Awareness — Meta',  gasto: '$890',  roas: '1.9x', conv: '44',  cpa: '$20,22' },
];

export default function AdsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Inversión en Publicidad</h1>
          <p className={styles.pageSubtitle}>Monitoreo multicanal de performance en Meta y TikTok.</p>
        </div>
        <div className={styles.periodBtns}>
          <button className={`${styles.periodBtn} ${styles.active}`}>Últimos 30 días</button>
          <button className={styles.periodBtn}>Último trimestre</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {[
          { label: 'Gasto total en ads', value: '$42.890,00', delta: '+12,4%' },
          { label: 'ROAS promedio',      value: '4.2x',       delta: '+0.8x'  },
          { label: 'Conversiones',       value: '1.842',      delta: '-3,1%'  },
          { label: 'CPA promedio',       value: '$23,28',     delta: 'Estable' },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className={styles.statCard}>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statDelta}>{s.delta}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.chartGrid}>
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Performance en el tiempo</h3>
          <p className={styles.chartSub}>ROAS diario vs Gasto</p>
          <div className={styles.chartPlaceholder}>
            <span>📊 Gráfico — próximamente</span>
          </div>
          <div className={styles.chartLegend}>
            <span><span className={styles.dotBlue}></span> Meta Ads</span>
            <span><span className={styles.dotCyan}></span> TikTok Ads</span>
          </div>
        </div>
        <div className={`card ${styles.distCard}`}>
          <h3 className={styles.chartTitle}>Distribución por canal</h3>
          <div className={styles.distBar}>
            <div className={styles.distFill} style={{ width: '64%', background: 'var(--blue)' }} />
          </div>
          <div className={styles.distLabels}>
            <span><span className={styles.dotBlue}></span> Meta Ads — 64%</span>
            <span><span className={styles.dotCyan}></span> TikTok Ads — 36%</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className={styles.tableHeader}>
          <h3 className={styles.chartTitle}>Campañas activas</h3>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Nombre de campaña</th>
                <th>Gasto</th>
                <th>ROAS</th>
                <th>Conversiones</th>
                <th>CPA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {CAMPANAS.map((c) => (
                <tr key={c.nombre}>
                  <td>
                    <span className={`badge ${c.estado === 'activa' ? 'badge-success' : 'badge-warning'}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td><strong>{c.nombre}</strong></td>
                  <td>{c.gasto}</td>
                  <td><strong>{c.roas}</strong></td>
                  <td>{c.conv}</td>
                  <td>{c.cpa}</td>
                  <td><button className="btn btn-ghost btn-sm">···</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
