'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../integracion.module.css';

function getInitialStatus(): 'idle' | 'connected' | 'error' {
  if (typeof window === 'undefined') return 'idle';
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === '1') return 'connected';
  if (params.get('error')) return 'error';
  return 'idle';
}

export default function ShopifyPage() {
  const [status, setStatus]   = useState<'idle' | 'connected' | 'error'>(getInitialStatus);
  const [loading, setLoading] = useState(() => getInitialStatus() === 'idle');
  const [shops, setShops]     = useState<string[]>([]);
  const [shop, setShop]       = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (getInitialStatus() !== 'idle') { setLoading(false); return; }
    fetch('/api/integraciones/shopify/status')
      .then(r => r.json())
      .then(d => { setStatus(d.connected ? 'connected' : 'idle'); setShops(d.shops ?? []); })
      .catch(() => setStatus('idle'))
      .finally(() => setLoading(false));
  }, []);

  function conectar(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setConnecting(true);
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    window.location.href = `/api/integraciones/shopify/connect?shop=${encodeURIComponent(shopDomain)}`;
  }

  async function desconectar(shopDomain: string) {
    if (!confirm(`¿Desconectar ${shopDomain}?`)) return;
    await fetch(`/api/integraciones/shopify/disconnect?shop=${encodeURIComponent(shopDomain)}`, { method: 'DELETE' });
    setShops(prev => prev.filter(s => s !== shopDomain));
    if (shops.length <= 1) setStatus('idle');
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/integraciones" className={styles.backLink}>← Volver a Integraciones</Link>

      <div className={styles.header}>
        <div className={styles.logo}>🟩</div>
        <div>
          <h1 className={styles.title}>Shopify</h1>
          <p className={styles.subtitle}>Facturación automática por cada pedido pagado en Shopify.</p>
        </div>
        {status === 'connected' && <span className="badge badge-success">● Conectado</span>}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 className={styles.sectionTitle}>¿Qué hace esta integración?</h2>
        <ul className={styles.featureList}>
          <li>✓ Detecta pedidos pagados en tiempo real via webhook</li>
          <li>✓ Emite Factura A si el pedido tiene CUIT en los datos del cliente</li>
          <li>✓ Emite Factura B a consumidor final por defecto</li>
          <li>✓ Emite Factura C si el vendedor es monotributista</li>
          <li>✓ Soporta múltiples tiendas bajo la misma cuenta</li>
        </ul>
      </div>

      {loading ? (
        <div className={`card ${styles.loadingCard}`}>Verificando conexión...</div>
      ) : (
        <>
          {status === 'connected' && shops.length > 0 && (
            <div className={`card ${styles.connectedCard}`}>
              <h2 className={styles.connectedTitle}>Tiendas conectadas</h2>
              {shops.map(s => (
                <div key={s} className={styles.connectedActions} style={{ marginTop: '0.75rem' }}>
                  <span style={{ flex: 1 }}>🟩 {s}</span>
                  <Link href="/dashboard/facturacion" className="btn btn-primary btn-sm">Ver facturas</Link>
                  <button onClick={() => desconectar(s)} className="btn btn-ghost btn-sm">Desconectar</button>
                </div>
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className={styles.errorBanner}>❌ Error al conectar. Verificá el nombre de la tienda.</div>
          )}

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>
              {status === 'connected' ? 'Agregar otra tienda' : 'Conectar tienda Shopify'}
            </h2>
            <p className={styles.stepDesc}>
              Ingresá el nombre de tu tienda Shopify (subdominio de .myshopify.com).
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
                <button type="submit" className="btn btn-primary" disabled={connecting}>
                  {connecting ? 'Conectando...' : '🟩 Conectar con Shopify'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
