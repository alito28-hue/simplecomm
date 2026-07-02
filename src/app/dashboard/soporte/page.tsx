'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './soporte.module.css';

interface Ticket { id: string; subject: string; status: string; priority: string; createdAt: string; }

export default function SoportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'normal', message: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/soporte/tickets')
      .then(r => r.json())
      .then(d => setTickets(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function crear() {
    if (!form.subject || !form.message) { setError('Asunto y mensaje requeridos.'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch('/api/soporte/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Error al crear ticket');
      const d = await res.json();
      setTickets(prev => [d, ...prev]);
      setModal(false);
      setForm({ subject: '', category: 'general', priority: 'normal', message: '' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSending(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Soporte</h1>
          <p className={styles.pageSubtitle}>Creá tickets de soporte y seguí el estado de tus consultas.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/dashboard/faq" className="btn btn-outline btn-sm">📖 Ver FAQ</Link>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Nuevo ticket</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Asunto</th><th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>Cargando...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)', fontStyle:'italic' }}>
                  Sin tickets. Si tenés alguna consulta, creá uno.
                </td></tr>
              ) : tickets.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.subject}</strong></td>
                  <td className="text-sm text-muted">{t.priority}</td>
                  <td><span className={`badge ${t.priority === 'high' ? 'badge-error' : 'badge-warning'}`}>{t.priority === 'high' ? 'Alta' : 'Normal'}</span></td>
                  <td><span className={`badge ${t.status === 'open' ? 'badge-error' : t.status === 'in_progress' ? 'badge-warning' : 'badge-success'}`}>
                    {t.status === 'open' ? 'Abierto' : t.status === 'in_progress' ? 'En trámite' : 'Cerrado'}
                  </span></td>
                  <td className="text-sm text-muted">{new Date(t.createdAt).toLocaleDateString('es-AR')}</td>
                  <td><Link href={`/dashboard/soporte/${t.id}`} className="btn btn-ghost btn-sm">Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className={styles.overlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Nuevo ticket de soporte</h2>
              <button onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalForm}>
              <div className={styles.field}><label>Asunto *</label>
                <input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Describirlo brevemente" />
              </div>
              <div className={styles.row}>
                <div className={styles.field}><label>Categoría</label>
                  <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="general">General</option>
                    <option value="facturacion">Facturación</option>
                    <option value="integraciones">Integraciones</option>
                    <option value="cuenta">Cuenta</option>
                    <option value="tecnico">Técnico</option>
                  </select>
                </div>
                <div className={styles.field}><label>Prioridad</label>
                  <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}><label>Descripción *</label>
                <textarea className="input" rows={5} value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Describí tu consulta con el mayor detalle posible..." />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={crear} disabled={sending}>{sending ? 'Creando...' : 'Crear ticket'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
