import styles from './integraciones.module.css';

const INTEGRATIONS = [
  { name: 'Mercado Libre', available: true, logo: '🛒' },
  { name: 'Empretienda', available: true, logo: '🏪' },
  { name: 'Tiendanube', available: true, logo: '☁' },
  { name: 'Mercado Shops', available: true, logo: '🏬' },
  { name: 'Producteca', available: false, logo: '📦' },
  { name: 'Accenture Song', available: false, logo: '🎵' },
  { name: 'eTres', available: false, logo: '3️' },
  { name: 'SAP', available: false, logo: '💼' },
  { name: 'Magento', available: false, logo: '🧲' },
  { name: 'WooCommerce', available: true, logo: '🛍' },
  { name: 'VTEX', available: true, logo: '🔺' },
  { name: 'Mobbex', available: true, logo: '💳' },
  { name: 'Zapier', available: false, logo: '⚡' },
  { name: 'Shopify', available: true, logo: '🟩' },
  { name: 'Thomson Reuters', available: true, logo: '📰' },
  { name: 'Facturante API', available: true, logo: '🔌' },
];

export default function IntegracionesPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Integraciones</h1>

      <div className={styles.grid}>
        {INTEGRATIONS.map((integration) => (
          <div key={integration.name} className={styles.card}>
            <div className={styles.logo}>
              <span className={styles.logoEmoji}>{integration.logo}</span>
            </div>
            {integration.available ? (
              <button className={styles.connectBtn}>Conectar</button>
            ) : (
              <span className={styles.soon}>Próximamente disponible</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
