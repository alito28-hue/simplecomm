'use client';

import { useEffect, useState } from 'react';
import { PERMISSIONS } from '@/lib/permissions';
import styles from '../clientes/clientes.module.css';

interface Usuario { id: string; email: string; firstName: string | null; lastName: string | null; role: string; permissions: string[] | null; }

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [editRole, setEditRole] = useState('OPERATOR');
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  function load() {
    setLoading(true);
    fetch('/api/organizacion/usuarios')
      .then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openEdit(u: Usuario) {
    setEditUser(u);
    setEditRole(u.role);
    setEditPerms(u.permissions ?? []);
  }

  function togglePerm(key: string) {
    setEditPerms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  }

  async function saveEdit() {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/organizacion/usuarios/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, permissions: editRole === 'ADMIN' ? [] : editPerms }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setEditUser(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSavingEdit(false);
    }
  }

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
              <tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Permisos</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>Cargando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)', fontStyle:'italic' }}>Sin usuarios registrados aún.</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-blue' : 'badge-gray'}`}>{u.role}</span></td>
                  <td className="text-sm text-muted">
                    {u.role === 'ADMIN' ? 'Acceso total' : (u.permissions?.length ? `${u.permissions.length} permiso(s)` : 'Sin permisos asignados')}
                  </td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏ Editar</button></td>
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

      {editUser && (
        <div className={styles.overlay} onClick={() => setEditUser(null)}>
          <div className={styles.modal} style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Editar {editUser.email}</h2>
              <button className={styles.closeBtn} onClick={() => setEditUser(null)}>✕</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.field}>
                <label>Rol</label>
                <select className="select" value={editRole} onChange={e => setEditRole(e.target.value)}>
                  <option value="ADMIN">Admin (acceso total)</option>
                  <option value="OPERATOR">Operador (permisos personalizados)</option>
                </select>
              </div>
              {editRole === 'OPERATOR' && (
                <div className={styles.field}>
                  <label>Permisos</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {PERMISSIONS.map(p => (
                      <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editPerms.includes(p.key)} onChange={() => togglePerm(p.key)} />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setEditUser(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
