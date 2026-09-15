'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../integracion.module.css';

type Mode = 'AUTOMATIC' | 'CONFIRMATION' | 'PAUSED';

function getInitialStatus(): 'idle' | 'connected' | 'error' {
  if (typeof window === 'undefined') return 'idle';
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === '1') return 'connected';
  if (params.get('error')) return 'error';
  return 'idle';
}

const MODE_OPTIONS: { value: Mode; label: string; desc: string }[] = [
  { value: 'AUTOMATIC', label: 'Automática', desc: 'Cada venta de Mercado Libre y cada cobro de Facturación Rápida se factura solo, sin que tengas que hacer nada.' },
  { value: 'CONFIRMATION', label: 'Con confirmación', desc: 'Te avisamos de cada venta de Mercado Libre y vos aprobás antes de que se emita la factura. Los cobros de Facturación Rápida se facturan igual, sin pasar por esta cola.' },
  { value: 'PAUSED', label: 'Pausada', desc: 'No se emite factura por las ventas de Mercado Libre. Los cobros de Facturación Rápida siguen funcionando igual.' },
];

export default function MercadoPagoPage() {
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>(getInitialStatus);
  const [loading, setLoading] = useState(() => getInitialStatus() === 'idle');
  const [mode, setMode] = useState<Mode>('AUTOMATIC');
  const [savingMode, setSavingMode] = useState(false);
  const [modeMsg, setModeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const initialStatus = getInitialStatus();
    if (initialStatus === 'idle') setLoading(true);

    fetch('/api/integraciones/mercadopago/status')
      .then(r => r.json())
      .then(d => {
        if (initialStatus === 'idle') setStatus(d.connected ? 'connected' : 'idle');
        setMode((d.mode as Mode) ?? 'AUTOMATIC');
      })
      .catch(() => { if (initialStatus === 'idle') setStatus('idle'); })
      .finally(() => setLoading(false));
  }, []);

  async function desconectar() {
    if (!confirm('¿Desconectar Mercado Pago?')) return;
    await fetch('/api/integraciones/mercadopago/disconnect', { method: 'DELETE' });
    setStatus('idle');
  }

  async function cambiarModo(nuevoModo: Mode) {
    setSavingMode(true); setModeMsg(null);
    const prev = mode;
    setMode(nuevoModo);
    try {
      const res = await fetch('/api/integraciones/mercadopago/modo', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: nuevoModo }),
      });
      const data = await res.json();
      if (!res.ok) { setMode(prev); setModeMsg({ ok: false, text: data.error ?? 'No se pudo guardar' }); }
      else setModeMsg({ ok: true, text: '✓ Modalidad guardada.' });
    } catch {
      setMode(prev);
      setModeMsg({ ok: false, text: 'No se pudo guardar — revisá tu conexión.' });
    } finally {
      setSavingMode(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/integraciones" className={styles.backLink}>← Volver a Integraciones</Link>

      <div className={styles.header}>
        <div className={styles.logo}>💳</div>
        <div>
          <h1 className={styles.title}>Mercado Pago</h1>
          <p className={styles.subtitle}>Facturación automática de tus ventas de Mercado Libre y de los cobros que generás con Facturación Rápida.</p>
        </div>
        {status === 'connected' && <span className="badge badge-success">● Conectado</span>}
      </div>

      {loading ? (
        <div className={`card ${styles.loadingCard}`}>Verificando conexión...</div>
      ) : status === 'connected' ? (
        <>
          <div className={`card ${styles.connectedCard}`}>
            <div className={styles.connectedIcon}>✅</div>
            <h2 className={styles.connectedTitle}>¡Mercado Pago conectado!</h2>
            <p className={styles.connectedDesc}>
              Tus ventas de Mercado Libre y los cobros de Facturación Rápida se facturarán según la modalidad que elijas abajo (A, B o C según el comprador).
            </p>
            <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
              ⚠ Mercado Pago solo nos avisa de los pagos que pasan por acá o por Mercado Libre — un cobro que generes vos directo desde la app de Mercado Pago (link, QR, Point) no nos llega, aunque la plata entre a la misma cuenta. Es una limitación de cómo funciona Mercado Pago para cualquier integración, no algo que podamos arreglar de nuestro lado.
            </p>
            <div className={styles.connectedActions}>
              <Link href="/dashboard/billing" className="btn btn-primary">Ver facturas →</Link>
              <button onClick={desconectar} className="btn btn-ghost">Desconectar</button>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Modalidad de facturación</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
              {MODE_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer', padding: '0.6rem', borderRadius: 'var(--radius)', border: `1px solid ${mode === opt.value ? 'var(--blue)' : 'var(--border)'}` }}>
                  <input type="radio" name="mp-mode" checked={mode === opt.value} onChange={() => cambiarModo(opt.value)} disabled={savingMode} style={{ marginTop: '0.2rem' }} />
                  <span>
                    <strong style={{ display: 'block' }}>{opt.label}</strong>
                    <span className="text-sm text-muted">{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            {modeMsg && (
              <p className="text-sm" style={{ color: modeMsg.ok ? 'var(--success)' : 'var(--error)', marginTop: '0.75rem' }}>{modeMsg.text}</p>
            )}
            {mode === 'CONFIRMATION' && (
              <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
                Revisá los cobros esperando aprobación en <Link href="/dashboard/facturas-pendientes" style={{ color: 'var(--blue)' }}>Pendientes de aprobación</Link>.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>¿Qué hace esta integración?</h2>
            <ul className={styles.featureList}>
              <li>✓ Detecta en tiempo real tus ventas de Mercado Libre y los cobros de Facturación Rápida</li>
              <li>✓ Emite Factura A si el comprador tiene CUIT (responsable inscripto)</li>
              <li>✓ Emite Factura B a consumidor final (DNI o sin datos)</li>
              <li>✓ Emite Factura C si el vendedor es monotributista</li>
            </ul>
            <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
              No detecta cobros que generes vos directo desde la app de Mercado Pago (link, QR, Point) — Mercado Pago solo notifica pagos que pasan por Mercado Libre o por una integración como la nuestra.
            </p>
          </div>

          {status === 'error' && (
            <div className={styles.errorBanner}>❌ Error al conectar. Intentá de nuevo.</div>
          )}

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Conectar cuenta</h2>
            <p className={styles.stepDesc}>
              Autorizá a SimpleComm para facturar tus ventas de Mercado Libre y los cobros que generés con Facturación Rápida.
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
