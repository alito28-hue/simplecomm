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

export default function MercadoPagoPage() {
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>(getInitialStatus);
  const [loading, setLoading] = useState(() => getInitialStatus() === 'idle');

  useEffect(() => {
    if (getInitialStatus() !== 'idle') return;
    fetch('/api/integraciones/mercadopago/status')
      .then(r => r.json())
      .then(d => setStatus(d.connected ? 'connected' : 'idle'))
      .catch(() => setStatus('idle'))
      .finally(() => setLoading(false));
  }, []);

  async function desconectar() {
    if (!confirm('¿Desconectar Mercado Pago?')) return;
    await fetch('/api/integraciones/mercadopago/disconnect', { method: 'DELETE' });
    setStatus('idle');
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/integraciones" className={styles.backLink}>← Volver a Integraciones</Link>

      <div className={styles.header}>
        <div className={styles.logo}>💳</div>
        <div>
          <h1 className={styles.title}>Mercado Pago</h1>
          <p className={styles.subtitle}>Facturación automática por cada pago aprobado.</p>
        </div>
        {status === 'connected' && <span className="badge badge-success">● Conectado</span>}
      </div>

      {loading ? (
        <div className={`card ${styles.loadingCard}`}>Verificando conexión...</div>
      ) : status === 'connected' ? (
        <div className={`card ${styles.connectedCard}`}>
          <div className={styles.connectedIcon}>✅</div>
          <h2 className={styles.connectedTitle}>¡Mercado Pago conectado!</h2>
          <p className={styles.connectedDesc}>
            Los pagos aprobados generarán facturas automáticamente (A, B o C según el comprador).
          </p>
          <div className={styles.connectedActions}>
            <Link href="/dashboard/facturacion" className="btn btn-primary">Ver facturas →</Link>
            <button onClick={desconectar} className="btn btn-ghost">Desconectar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>¿Qué hace esta integración?</h2>
            <ul className={styles.featureList}>
              <li>✓ Detecta pagos aprobados en tiempo real via webhook</li>
              <li>✓ Emite Factura A si el comprador tiene CUIT (responsable inscripto)</li>
              <li>✓ Emite Factura B a consumidor final (DNI o sin datos)</li>
              <li>✓ Emite Factura C si el vendedor es monotributista</li>
              <li>✓ Funciona con pagos por link, QR, checkout y suscripciones</li>
            </ul>
          </div>

          {status === 'error' && (
            <div className={styles.errorBanner}>❌ Error al conectar. Intentá de nuevo.</div>
          )}

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Conectar cuenta</h2>
            <p className={styles.stepDesc}>
              Autorizá a SimpleComm para recibir notificaciones de pago de tu cuenta de Mercado Pago.
            </p>
            <button
              onClick={() => window.location.href = '/api/integraciones/mercadopago/connect'}
              className={`btn btn-primary ${styles.connectBtn}`}>
              💳 Conectar con Mercado Pago
            </button>
          </div>
        </>
      )}
    </div>
  );
}
