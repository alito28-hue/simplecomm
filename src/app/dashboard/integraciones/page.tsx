import styles from './integraciones.module.css';

const INTEGRATIONS = [
  {
    name: 'Mercado Libre',
    desc: 'Automate order fulfillment and sync inventory across all of Latam\'s largest marketplace.',
    status: 'connected', category: 'marketplace', logo: '🛒'
  },
  {
    name: 'Tiendanube',
    desc: 'Sync your cloud store products and centralize sales management in real-time.',
    status: 'disconnected', category: 'ecommerce', logo: '☁'
  },
  {
    name: 'Shopify',
    desc: 'Connect your international Shopify stores for global unified reporting.',
    status: 'disconnected', category: 'ecommerce', logo: '🟩'
  },
  {
    name: 'Magento',
    desc: 'Enterprise-grade sync for your online Comission and Magento Open Source platforms.',
    status: 'disconnected', category: 'ecommerce', logo: '🧲'
  },
  {
    name: 'WooCommerce',
    desc: 'Seamlessly integrate your WordPress-based storefront with our advanced ops dashboard.',
    status: 'connected', category: 'ecommerce', logo: '🛍'
  },
  {
    name: 'VTEX',
    desc: 'Powerful enterprise commerce platform with multi-channel capabilities.',
    status: 'connected', category: 'ecommerce', logo: '🔺'
  },
  {
    name: 'Mercado Pago',
    desc: 'Sync payments and reconcile transactions across Mercado Pago automatically.',
    status: 'connected', category: 'marketplace', logo: '💳'
  },
  {
    name: 'Empretienda',
    desc: 'Import and automate invoicing for your Empretienda orders.',
    status: 'disconnected', category: 'ecommerce', logo: '🏪'
  },
];

const TABS = ['All Integrations', 'Marketplaces', 'E-commerce Platforms', 'Marketing Tools'];

export default function IntegracionesPage() {
  const connected = INTEGRATIONS.filter(i => i.status === 'connected').length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.breadcrumb}>DASHBOARD › INTEGRATIONS</p>
          <h1 className={styles.pageTitle}>External Platforms</h1>
          <p className={styles.pageSubtitle}>
            Connect your existing e-commerce storefronts and marketplaces to synchronize
            inventory, orders, and customer data across your entire operation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab, i) => (
          <button key={tab} className={`${styles.tab} ${i === 0 ? styles.activeTab : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {INTEGRATIONS.map((int) => (
          <div key={int.name} className={`card ${styles.intCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.intLogo}>{int.logo}</div>
              <span className={`badge ${int.status === 'connected' ? 'badge-success' : 'badge-gray'}`}>
                {int.status === 'connected' ? '● Connected' : '○ Disconnected'}
              </span>
            </div>
            <h3 className={styles.intName}>{int.name}</h3>
            <p className={styles.intDesc}>{int.desc}</p>
            <div className={styles.cardActions}>
              {int.status === 'connected' ? (
                <button className="btn btn-primary btn-sm">Configure</button>
              ) : (
                <button className="btn btn-outline btn-sm">Connect</button>
              )}
              {int.status === 'connected' && (
                <button className="btn btn-ghost btn-sm">No</button>
              )}
            </div>
          </div>
        ))}

        {/* Request Integration */}
        <div className={`card ${styles.requestCard}`}>
          <div className={styles.requestPlus}>+</div>
          <p className={styles.requestText}>
            Can&apos;t find your platform? Let us know!
          </p>
          <button className="btn btn-outline btn-sm">Request Integration</button>
        </div>
      </div>

      {/* API Status Bar */}
      <div className={`card ${styles.apiBar}`}>
        <div className={styles.apiStat}>
          <span className={styles.apiNum}>{connected}/5</span>
          <span className={styles.apiLabel}>All integration tools are currently running at 98.95% uptime.</span>
        </div>
        <div className={styles.apiDivider} />
        <div className={styles.apiStat}>
          <span className={styles.apiNum}>1.2k</span>
          <span className={styles.apiLabel}>Avg. latency across all connected channels.</span>
        </div>
        <div className={styles.apiDivider} />
        <div className={styles.apiStat}>
          <span className={styles.apiNum}>342k</span>
          <span className={styles.apiLabel}>Daily synced records.</span>
        </div>
      </div>
    </div>
  );
}
