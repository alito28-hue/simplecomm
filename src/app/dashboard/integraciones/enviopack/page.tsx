'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../integracion.module.css';

export default function EnviopackPage() {
  const [status, setStatus] = useState<'idle' | 'connected'>('idle');
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [direccionEnvioId, setDireccionEnvioId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/integraciones/enviopack/status')
      .then(r => r.json())
      .then(d => {
        setStatus(d.connected ? 'connected' : 'idle');
        setDireccionEnvioId(d.direccionEnvioId ?? '');
      })
      .catch(() => setStatus('idle'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function conectar() {
    setError('');
    if (!apiKey || !secretKey) { setError('Completá api-key y secret-key.'); return; }
    setConnecting(true);
    try {
      const res = await fetch('/api/integraciones/enviopack/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, secretKey, direccionEnvioId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo conectar');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar');
    } finally {
      setConnecting(false);
    }
  }

  async function desconectar() {
    if (!confirm('¿Desconectar Envíopack?')) return;
    await fetch('/api/integraciones/enviopack/disconnect', { method: 'DELETE' });
    setApiKey(''); setSecretKey('');
    setStatus('idle');
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/integraciones" className={styles.backLink}>← Volver a Integraciones</Link>

      <div className={styles.header}>
        <div className={styles.logo}>📦</div>
        <div>
          <h1 className={styles.title}>Envíopack</h1>
          <p className={styles.subtitle}>Cotizá y generá guías de envío con múltiples correos desde una sola integración.</p>
        </div>
        {status === 'connected' && <span className="badge badge-success">● Conectado</span>}
      </div>

      {loading ? (
        <div className={`card ${styles.loadingCard}`}>Verificando conexión...</div>
      ) : status === 'connected' ? (
        <div className={`card ${styles.connectedCard}`}>
          <div className={styles.connectedIcon}>✅</div>
          <h2 className={styles.connectedTitle}>¡Envíopack conectado!</h2>
          <p className={styles.connectedDesc}>
            Ya podés cotizar y generar guías desde la sección Envíos.
          </p>
          <div className={styles.connectedActions}>
            <Link href="/dashboard/envios" className="btn btn-primary">Ir a Envíos →</Link>
            <button onClick={desconectar} className="btn btn-ghost">Desconectar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>¿Qué hace esta integración?</h2>
            <ul className={styles.featureList}>
              <li>✓ Cotiza envío a domicilio y a sucursal por múltiples correos (Andreani, OCA, Correo Argentino, etc.)</li>
              <li>✓ Genera la guía en PDF con un clic</li>
              <li>✓ Actualiza el estado del envío automáticamente por notificación (sin polling)</li>
            </ul>
            <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
              Necesitás una cuenta de Envíopack. Las credenciales (api-key y secret-key) se generan
              desde tu panel de Envíopack, y la Dirección de Despacho también se configura ahí primero.
            </p>
          </div>

          {error && <div className={styles.errorBanner}>❌ {error}</div>}

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Conectar cuenta</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 420 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>API Key *</label>
                <input className="input" value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Secret Key *</label>
                <input className="input" type="password" value={secretKey} onChange={e => setSecretKey(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  ID de Dirección de Despacho (opcional por ahora)
                </label>
                <input className="input" value={direccionEnvioId} onChange={e => setDireccionEnvioId(e.target.value)}
                  placeholder="Lo configurás primero en tu panel de Envíopack" />
              </div>
              <button onClick={conectar} className={`btn btn-primary ${styles.connectBtn}`} disabled={connecting}>
                {connecting ? 'Conectando...' : '📦 Conectar con Envíopack'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
