import styles from './ads.module.css';

const CAMPAIGNS = [
  { status: 'active',  name: 'Summer Sale – Meta',    spend: '$4,200', roas: '4.8x', conv: '412', cpa: '$10.19' },
  { status: 'active',  name: 'Retargeting TikTok',    spend: '$1,890', roas: '3.2x', conv: '220', cpa: '$8.59'  },
  { status: 'paused',  name: 'Brand Awareness – Meta', spend: '$890',  roas: '1.9x', conv: '44',  cpa: '$20.22' },
];

export default function AdsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ads Investment</h1>
          <p className={styles.pageSubtitle}>Global multi-channel performance monitoring across Meta and TikTok.</p>
        </div>
        <div className={styles.periodBtns}>
          <button className={`${styles.periodBtn} ${styles.active}`}>Last 30 Days</button>
          <button className={styles.periodBtn}>Last Quarter</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Total Ad Spend',  value: '$42,890.00', delta: '+12.4%' },
          { label: 'Avg ROAS',        value: '4.2x',       delta: '+0.8x'  },
          { label: 'Conversions',     value: '1,842',      delta: '-3.1%'  },
          { label: 'Avg CPA',         value: '$23.28',     delta: 'Stable' },
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

      {/* Chart placeholder + distribution */}
      <div className={styles.chartGrid}>
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Performance Over Time</h3>
          <p className={styles.chartSub}>Daily ROAS vs Spend visualization</p>
          <div className={styles.chartPlaceholder}>
            <span>📊 Chart — coming soon</span>
          </div>
          <div className={styles.chartLegend}>
            <span><span className={styles.dotBlue}></span> Meta Ads</span>
            <span><span className={styles.dotCyan}></span> TikTok Ads</span>
          </div>
        </div>

        <div className={`card ${styles.distCard}`}>
          <h3 className={styles.chartTitle}>Channel Distribution</h3>
          <div className={styles.distBar}>
            <div className={styles.distFill} style={{ width: '64%', background: 'var(--blue)' }} />
          </div>
          <div className={styles.distLabels}>
            <span><span className={styles.dotBlue}></span> Meta Ads — 64%</span>
            <span><span className={styles.dotCyan}></span> TikTok Ads — 36%</span>
          </div>
        </div>
      </div>

      {/* Campaigns table */}
      <div className="card">
        <div className={styles.tableHeader}>
          <h3 className={styles.chartTitle}>Active Campaigns</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm">⇅</button>
            <button className="btn btn-ghost btn-sm">↓</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Campaign Name</th>
                <th>Spend</th>
                <th>ROAS</th>
                <th>Conversions</th>
                <th>CPA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c) => (
                <tr key={c.name}>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.spend}</td>
                  <td><strong>{c.roas}</strong></td>
                  <td>{c.conv}</td>
                  <td>{c.cpa}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm">···</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
