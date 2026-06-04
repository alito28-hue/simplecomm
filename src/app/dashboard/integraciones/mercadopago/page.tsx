'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../integracion.module.css';

export default function MercadoPagoPage() {
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') setStatus('connected');
    if (params.get('error')) setStatus('error');
  }, []);

  return (
    <div className={styles.page}>
      <Link href="/dashboard/integraciones" className={styles.backLink}>← Volver a Integraciones</Link>

      <div className={styles.header}>
        <div className={styles.logo}>💳</div>
        <div>
          <h1 className={styles.title}>Mercado Pago</h1>
          <p className={styles.subtitle}>Sincronizá pagos y conciliá transacciones automáticamente.</p>
        </div>
        {status === 'connected' && <span className="badge badge-success">● Conectado</span>}
      </div>

      {status === 'connected' ? (
        <div className={`card ${styles.connectedCard}`}>
          <div className={styles.connectedIcon}>✅</div>
          <h2 className={styles.connectedTitle}>¡Mercado Pago conectado!</h2>
          <p className={styles.connectedDesc}>Los pagos aprobados generarán facturas automáticamente.</p>
          <div className={styles.connectedActions}>
            <Link href="/dashboard/billing" className="btn btn-primary">Ver facturas →</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>¿Qué hace esta integración?</h2>
            <ul className={styles.featureList}>
              <li>✓ Detecta pagos aprobados en tiempo real via webhook</li>
              <li>✓ Emite Factura B automáticamente por cada pago</li>
              <li>✓ Concilia montos con los comprobantes emitidos</li>
              <li>✓ Soporta pagos por link, QR y checkout</li>
            </ul>
          </div>

          {status === 'error' && (
            <div className={styles.errorBanner}>❌ Error al conectar. Intentá de nuevo.</div>
          )}

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Conectar cuenta</h2>
            <p className={styles.stepDesc}>
              Autorizá a SimpleComm para acceder a tu cuenta de Mercado Pago y recibir notificaciones de pago.
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
