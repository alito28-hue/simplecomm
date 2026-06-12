'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../programadas.module.css';

interface Occurrence {
  id: string; month: string; scheduledDate: string; effectiveDate: string; status: string;
  invoiceNumber: string | null; emailStatus: string; confirmedAt: string | null; errorMessage: string | null;
}
interface Detail {
  schedule: { id: string; buyerName: string; description: string; amount: number; recipientEmail: string; mode: string; status: string; nextEffectiveDate: string | null; endType: string; endValue: number | null; processedMonths: number; issuedCount: number; };
  occurrences: Occurrence[];
}

export default function ProgramadaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState('');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ description: '', amount: '', recipientEmail: '', mode: 'CONFIRMATION' });
  async function load() {
    const res = await fetch(`/api/facturas-programadas/${id}`);
    const data = await res.json();
    if (res.ok) {
      setDetail(data);
      setEdit({
        description: data.schedule.description,
        amount: String(data.schedule.amount),
        recipientEmail: data.schedule.recipientEmail,
        mode: data.schedule.mode,
      });
    }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);
  async function state(action: string) {
    setBusy(action);
    await fetch(`/api/facturas-programadas/${id}/estado`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    setBusy(''); load();
  }
  async function occurrenceAction(occurrenceId: string, action: 'confirmar' | 'reintentar') {
    setBusy(occurrenceId);
    await fetch(`/api/facturas-programadas/oportunidades/${occurrenceId}/${action}`, { method: 'POST' });
    setBusy(''); load();
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); setBusy('edit');
    await fetch(`/api/facturas-programadas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...edit, amount: Number(edit.amount) }),
    });
    setBusy(''); setEditing(false); load();
  }
  if (!detail) return <div className={styles.empty}>Cargando programación...</div>;
  const { schedule, occurrences } = detail;
  return <div className={styles.page}>
    <Link className={styles.back} href="/dashboard/facturacion/programadas">← Volver a programadas</Link>
    <div className={styles.header}><div><h1 className={styles.title}>{schedule.buyerName}</h1><p className={styles.subtitle}>{schedule.description}</p></div>
      <div className={styles.actions}>
        {schedule.status === 'ACTIVE' && <button className="btn btn-ghost" disabled={!!busy} onClick={() => state('pause')}>Pausar</button>}
        {schedule.status === 'PAUSED' && <button className="btn btn-primary" disabled={!!busy} onClick={() => state('resume')}>Reanudar</button>}
        {!['CANCELLED', 'FINISHED'].includes(schedule.status) && <button className="btn btn-ghost" disabled={!!busy} onClick={() => setEditing(value => !value)}>Editar futuro</button>}
        {!['CANCELLED', 'FINISHED'].includes(schedule.status) && <button className="btn btn-ghost" disabled={!!busy} onClick={() => state('cancel')}>Cancelar</button>}
      </div>
    </div>
    <div className={styles.stats}>
      <div className={`card ${styles.stat}`}><div className={styles.statLabel}>Monto</div><div className={styles.statValue}>${Number(schedule.amount).toLocaleString('es-AR')}</div></div>
      <div className={`card ${styles.stat}`}><div className={styles.statLabel}>Próxima fecha</div><div className={styles.statValue}>{schedule.nextEffectiveDate ?? '—'}</div></div>
      <div className={`card ${styles.stat}`}><div className={styles.statLabel}>Emitidas</div><div className={styles.statValue}>{schedule.issuedCount}</div></div>
    </div>
    <div className={`card ${styles.card}`}>
      <div className={styles.grid}><div><strong>Modalidad</strong><p>{schedule.mode === 'AUTOMATIC' ? 'Automática' : 'Con confirmación'}</p></div><div><strong>Email receptor</strong><p>{schedule.recipientEmail}</p></div><div><strong>Estado</strong><p>{schedule.status}</p></div></div>
    </div>
    {editing && <form className={`card ${styles.card} ${styles.form}`} onSubmit={saveEdit}>
      <h2>Editar próximas oportunidades</h2>
      <div className={styles.grid}>
        <div className={`${styles.field} ${styles.wide}`}><label>Descripción</label><input className="input" value={edit.description} onChange={e => setEdit(value => ({ ...value, description: e.target.value }))} required /></div>
        <div className={styles.field}><label>Monto</label><input className="input" type="number" min=".01" step=".01" value={edit.amount} onChange={e => setEdit(value => ({ ...value, amount: e.target.value }))} required /></div>
        <div className={styles.field}><label>Email receptor</label><input className="input" type="email" value={edit.recipientEmail} onChange={e => setEdit(value => ({ ...value, recipientEmail: e.target.value }))} required /></div>
        <div className={styles.field}><label>Modalidad</label><select className="input" value={edit.mode} onChange={e => setEdit(value => ({ ...value, mode: e.target.value }))}><option value="CONFIRMATION">Con confirmación</option><option value="AUTOMATIC">Automática</option></select></div>
      </div>
      <div className={styles.actions}><button className="btn btn-primary" disabled={busy === 'edit'}>Guardar cambios</button><button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>Cancelar</button></div>
    </form>}
    <div className={`card ${styles.card}`}>
      <div className={styles.historyHeader}><h2>Historial mensual</h2><span className={styles.muted}>{occurrences.length} oportunidades</span></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Mes</th><th>Fecha modelo</th><th>Fecha efectiva</th><th>Estado</th><th>Factura</th><th>Email</th><th>Motivo</th><th></th></tr></thead>
        <tbody>{occurrences.length === 0 ? <tr><td colSpan={8} className={styles.empty}>La primera oportunidad aparecerá en la fecha programada.</td></tr> : occurrences.map(item => <tr key={item.id}>
          <td>{item.month}</td><td>{item.scheduledDate}</td><td>{item.effectiveDate}</td><td><span className={`${styles.badge} ${item.status === 'ISSUED' ? styles.active : item.status === 'ERROR' ? styles.error : item.status === 'PENDING_CONFIRMATION' ? styles.pending : styles.muted}`}>{item.status}</span></td>
          <td>{item.invoiceNumber ?? '—'}</td><td>{item.emailStatus}</td><td>{item.errorMessage ?? '—'}</td>
          <td>{item.status === 'PENDING_CONFIRMATION' ? <button className="btn btn-primary btn-sm" disabled={busy === item.id} onClick={() => occurrenceAction(item.id, 'confirmar')}>Confirmar y emitir</button> : item.status === 'ERROR' ? <button className="btn btn-ghost btn-sm" disabled={busy === item.id} onClick={() => occurrenceAction(item.id, 'reintentar')}>Reintentar</button> : null}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
  </div>;
}
