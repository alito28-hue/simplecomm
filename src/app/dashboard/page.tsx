import styles from './dashboard.module.css';
import Link from 'next/link';

const RECENT_INVOICES = [
  { id: 'INV-2024-001', platform: 'Mercado Libre', date: 'Oct 24, 2023', amount: '$1,240.00', status: 'sent' },
  { id: 'INV-2024-002', platform: 'Amazon Global',  date: 'Oct 24, 2023', amount: '$890.50',  status: 'error' },
  { id: 'INV-2024-003', platform: 'Shopify Store',  date: 'Oct 23, 2023', amount: '$2,105.00', status: 'sent' },
];

const STAT_CARDS = [
  { label: 'Total Invoiced/Month', value: '$142,560.00', delta: '+12.4%', positive: true },
  { label: 'Pending Sync',         value: '24',          delta: null,     positive: true },
  { label: 'Approx. next cycle',   value: '14 mins',     delta: null,     positive: true },
];

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Billing Overview</h1>
          <p className={styles.pageSubtitle}>Manage your transactional cycles and sync performance.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.autoSync}>
            <span>Automate Sync</span>
            <div className={styles.toggle}>
              <div className={styles.toggleThumb} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {STAT_CARDS.map((stat) => (
          <div key={stat.label} className="card">
            <div className={styles.statCard}>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue}>{stat.value}</div>
              {stat.delta && (
                <div className={`${styles.statDelta} ${stat.positive ? styles.positive : styles.negative}`}>
                  {stat.delta}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Most active integration */}
        <div className={`card ${styles.activeIntCard}`}>
          <div className={styles.activeIntLabel}>Most Active Integration</div>
          <div className={styles.activeIntName}>Mercado Libre</div>
          <div className={styles.activeIntStat}>4,892 calls today</div>
          <span className="badge badge-success" style={{ marginTop: '0.5rem' }}>Online</span>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Recent Invoices</h2>
          <Link href="/dashboard/billing" className={styles.viewAll}>View Report →</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Platform</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_INVOICES.map((inv) => (
                <tr key={inv.id}>
                  <td><span className="mono text-sm">{inv.id}</span></td>
                  <td>{inv.platform}</td>
                  <td className="text-muted text-sm">{inv.date}</td>
                  <td><strong>{inv.amount}</strong></td>
                  <td>
                    <span className={`badge ${inv.status === 'sent' ? 'badge-success' : 'badge-error'}`}>
                      {inv.status === 'sent' ? '✓ Sent' : '✗ Error'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.tablePagination}>
          <span className="text-muted text-sm">Showing 3 of 28 recent transactions</span>
          <div className={styles.paginationBtns}>
            <button className="btn btn-ghost btn-sm">Prev</button>
            <button className="btn btn-ghost btn-sm">Next</button>
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className={styles.bottomGrid}>
        <div className={`card ${styles.syncCard}`}>
          <h3 className={styles.sectionTitle}>Sync Intelligence</h3>
          <p className="text-muted text-sm" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            Our AI detected 12 potential duplicates in your Mercado Libre integration. Review them to optimize your billing costs.
          </p>
          <button className="btn btn-outline btn-sm">Review Discrepancies</button>
        </div>
        <div className={`card ${styles.proTipCard}`}>
          <div className={styles.proTipBadge}>PRO TIP</div>
          <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Use custom tags to categorize high-volume Mercado Libre invoices for faster reconciliations.
          </p>
          <Link href="/dashboard/tutoriales" className={styles.exploreLink}>Explore Docs →</Link>
        </div>
      </div>
    </div>
  );
}
