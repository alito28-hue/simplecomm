'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../integracion.module.css';

export default function ShopifyPage() {
  const [shop, setShop] = useState('');
  const [loading, setLoading] = useState(false);

  function conectar(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setLoading(true);
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    window.location.href = `/api/integraciones/shopify/connect?shop=${encodeURIComponent(shopDomain)}`;
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/integraciones" className={styles.backLink}>← Volver a Integraciones</Link>

      <div className={styles.header}>
        <div className={styles.logo}>🟩</div>
        <div>
          <h1 className={styles.title}>Shopify</h1>
          <p className={styles.subtitle}>Conectá tus tiendas Shopify para facturación unificada.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 className={styles.sectionTitle}>¿Qué hace esta integración?</h2>
        <ul className={styles.featureList}>
          <li>✓ Detecta pedidos pagados via webhook de Shopify</li>
          <li>✓ Emite Factura B automáticamente</li>
          <li>✓ Soporta múltiples tiendas Shopify</li>
          <li>✓ Sincroniza datos de cliente y monto</li>
        </ul>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 className={styles.sectionTitle}>Conectar tienda Shopify</h2>
        <p className={styles.stepDesc}>
          Ingresá el nombre de tu tienda Shopify para iniciar la conexión.
        </p>
        <form onSubmit={conectar} className={styles.configSection}>
          <div className={styles.configField}>
            <label>Nombre de tu tienda</label>
            <input
              className="input"
              value={shop}
              onChange={e => setShop(e.target.value)}
              placeholder="mi-tienda (sin .myshopify.com)"
              required
            />
          </div>
          <div className={styles.configActions}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Conectando...' : '🟩 Conectar con Shopify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
