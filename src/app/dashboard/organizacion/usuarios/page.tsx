'use client';

import { useEffect, useState } from 'react';
import styles from '../clientes/clientes.module.css';

interface Usuario { id: string; email: string; firstName: string | null; lastName: string | null; role: string; }

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/organizacion/usuarios')
      .then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function invite() {
    if (!inviteEmail) return;
    setSending(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/organizacion/usuarios/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSuccess(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
      setModal(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSending(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Usuarios</h1>
          <p className={styles.pageSubtitle}>Miembros del equipo con acceso a SimpleComm.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setModal(true); setError(''); }}>
          + Invitar usuario
        </button>
      </div>

      {success && <div className={styles.success ?? ''}>{success}</div>}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Email</th><th>Nombre</th><th>Rol</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>Cargando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)', fontStyle:'italic' }}>Sin usuarios registrados aún.</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-blue' : 'badge-gray'}`}>{u.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className={styles.overlay} onClick={() => setModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Invitar usuario</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalForm}>
              <div className={styles.field}>
                <label>Email</label>
                <input className="input" type="email" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colega@empresa.com" />
              </div>
              <p className="text-sm text-muted">El usuario recibirá un email para crear su cuenta.</p>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={invite} disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar invitación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
