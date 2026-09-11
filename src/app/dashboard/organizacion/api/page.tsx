'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../clientes/clientes.module.css';

interface ApiKeyRow {
  id: string; name: string; prefix: string; active: boolean;
  monthlyLimit: number | null; monthlyCount: number; createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantReady, setTenantReady] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState<{ apiKey: string; monthlyLimit: number } | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/organizacion/api-keys');
    const data = await res.json();
    setKeys(data.keys ?? []);
    setTenantReady(data.tenantReady !== false);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generar() {
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/organizacion/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewKey({ apiKey: data.apiKey, monthlyLimit: data.monthlyLimit });
      setCopied(false);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setCreating(false); }
  }

  async function revocar(id: string) {
    if (!confirm('¿Revocar esta API key? Cualquier integración que la use dejará de funcionar de inmediato.')) return;
    await fetch(`/api/organizacion/api-keys/${id}`, { method: 'DELETE' });
    load();
  }

  function copiar() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey.apiKey);
    setCopied(true);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>API</h1>
          <p className={styles.pageSubtitle}>
            Emití comprobantes electrónicos directo desde tu propio sistema, sin pasar por el dashboard.{' '}
            <Link href="/desarrolladores" target="_blank" style={{ color: 'var(--blue)' }}>Ver documentación completa →</Link>
          </p>
        </div>
        {tenantReady && (
          <div className={styles.headerActions}>
            <button className="btn btn-primary btn-sm" onClick={generar} disabled={creating}>
              {creating ? 'Generando...' : '+ Generar API key'}
            </button>
          </div>
        )}
      </div>

      {!tenantReady && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <p className="text-sm text-muted">
            Todavía no tenés tu certificado ARCA configurado — hace falta eso primero para poder emitir comprobantes,
            ya sea desde el dashboard o por API.{' '}
            <Link href="/dashboard/organizacion/empresa" style={{ color: 'var(--blue)' }}>Configurarlo ahora →</Link>
          </p>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '1rem', background: 'color-mix(in srgb, var(--error) 8%, transparent)', color: 'var(--error)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Key</th><th>Uso este mes</th><th>Creada</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : keys.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin API keys todavía.{tenantReady ? ' Generá la primera para empezar a integrar.' : ''}
                </td></tr>
              ) : keys.map(k => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td><span className="mono text-sm text-muted">{k.prefix}••••••••••••••••••••••••</span></td>
                  <td className="text-sm">
                    {k.monthlyCount} / {k.monthlyLimit} comprobantes
                  </td>
                  <td className="text-sm text-muted">{formatDate(k.createdAt)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => revocar(k.id)}>Revocar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {newKey && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>Tu nueva API key</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--error)', fontWeight: 600, marginBottom: '1rem' }}>
              ⚠ Guardala ahora — por seguridad no la vamos a poder mostrar de nuevo.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input readOnly className="input mono text-sm" style={{ flex: 1 }} value={newKey.apiKey} onFocus={e => e.target.select()} />
              <button className="btn btn-outline btn-sm" onClick={copiar}>{copied ? '✓ Copiada' : 'Copiar'}</button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: '1.25rem' }}>
              Incluye hasta {newKey.monthlyLimit} comprobantes por mes. Mandala como header{' '}
              <code className="mono">Authorization: Bearer {'<key>'}</code> — la{' '}
              <Link href="/desarrolladores" target="_blank" style={{ color: 'var(--blue)' }}>documentación</Link> tiene ejemplos completos.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setNewKey(null)}>Listo, ya la guardé</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
