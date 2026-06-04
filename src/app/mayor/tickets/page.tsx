import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import styles from '../mayor.module.css';

export default async function AdminTicketsPage() {
  const supabase = await createClient();
  const { data: tickets } = await supabase.from('support_tickets')
    .select('*, organizations(name)')
    .order('createdAt', { ascending: false });

  const open = tickets?.filter(t => t.status === 'open').length ?? 0;
  const inProgress = tickets?.filter(t => t.status === 'in_progress').length ?? 0;
  const closed = tickets?.filter(t => t.status === 'closed').length ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tickets de Soporte</h1>
        <p className={styles.subtitle}>Gestión de consultas y solicitudes de los clientes.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '1rem 1.5rem', minWidth: 140 }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--error)' }}>{open}</div>
          <div className="text-sm text-muted">Abiertos</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.5rem', minWidth: 140 }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>{inProgress}</div>
          <div className="text-sm text-muted">En trámite</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.5rem', minWidth: 140 }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>{closed}</div>
          <div className="text-sm text-muted">Cerrados</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Asunto</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {!tickets || tickets.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin tickets</td></tr>
              ) : tickets.map((t) => (
                <tr key={t.id}>
                  <td className="text-sm">{(t.organizations as { name: string } | null)?.name ?? '—'}</td>
                  <td><strong>{t.subject}</strong></td>
                  <td><span className={`badge ${t.priority === 'high' ? 'badge-error' : t.priority === 'normal' ? 'badge-warning' : 'badge-gray'}`}>{t.priority}</span></td>
                  <td><span className={`badge ${t.status === 'open' ? 'badge-error' : t.status === 'in_progress' ? 'badge-warning' : 'badge-success'}`}>{t.status === 'open' ? 'Abierto' : t.status === 'in_progress' ? 'En trámite' : 'Cerrado'}</span></td>
                  <td className="text-sm text-muted">{new Date(t.createdAt).toLocaleDateString('es-AR')}</td>
                  <td><Link href={`/mayor/tickets/${t.id}`} className="btn btn-primary btn-sm">Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
