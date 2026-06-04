'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../integracion.module.css';

export default function MercadoLibrePage() {
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si ya está conectado
    fetch('/api/integraciones/mercadolibre/status')
      .then(r => r.json())
      .then(d => setStatus(d.connected ? 'connected' : 'idle'))
      .catch(() => setStatus('idle'))
      .finally(() => setLoading(false));

    // Verificar si vuelve de OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') setStatus('connected');
    if (params.get('error')) setStatus('error');
  }, []);

  function conectar() {
    window.location.href = '/api/integraciones/mercadolibre/connect';
  }

  async function desconectar() {
    if (!confirm('¿Desconectar Mercado Libre?')) return;
    await fetch('/api/integraciones/mercadolibre/disconnect', { method: 'DELETE' });
    setStatus('idle');
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/integraciones" className={styles.backLink}>← Volver a Integraciones</Link>

      <div className={styles.header}>
        <div className={styles.logo}>🛒</div>
        <div>
          <h1 className={styles.title}>Mercado Libre</h1>
          <p className={styles.subtitle}>Sincronizá tus ventas y automatizá la facturación de pedidos.</p>
        </div>
        {status === 'connected' && <span className="badge badge-success">● Conectado</span>}
      </div>

      {loading ? (
        <div className={`card ${styles.loadingCard}`}>Verificando conexión...</div>
      ) : status === 'connected' ? (
        <div className={`card ${styles.connectedCard}`}>
          <div className={styles.connectedIcon}>✅</div>
          <h2 className={styles.connectedTitle}>¡Mercado Libre conectado!</h2>
          <p className={styles.connectedDesc}>
            Tus ventas de Mercado Libre se facturarán automáticamente cuando se paguen.
          </p>
          <div className={styles.connectedActions}>
            <Link href="/dashboard/billing" className="btn btn-primary">Ver facturas →</Link>
            <button onClick={desconectar} className="btn btn-ghost">Desconectar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>¿Qué hace esta integración?</h2>
            <ul className={styles.featureList}>
              <li>✓ Detecta automáticamente los pedidos pagados</li>
              <li>✓ Emite Factura B a consumidor final por cada venta</li>
              <li>✓ Sincroniza datos del comprador (nombre, DNI/CUIT si disponible)</li>
              <li>✓ Guarda el CAE asociado a cada pedido</li>
            </ul>
          </div>

          {status === 'error' && (
            <div className={styles.errorBanner}>
              ❌ Error al conectar. Intentá de nuevo.
            </div>
          )}

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Conectar cuenta</h2>
            <p className={styles.stepDesc}>
              Hacé clic en el botón para autorizar a SimpleComm a acceder a tu cuenta de Mercado Libre.
              Serás redirigido a Mercado Libre y de vuelta aquí automáticamente.
            </p>
            <button onClick={conectar} className={`btn btn-primary ${styles.connectBtn}`}>
              🛒 Conectar con Mercado Libre
            </button>
          </div>
        </>
      )}
    </div>
  );
}
