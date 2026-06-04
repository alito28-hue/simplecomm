import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import styles from '../mayor.module.css';

export default async function AdminClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase.from('organizations').select('*').order('createdAt', { ascending: false });

  async function pausar(id: string, status: string) {
    'use server';
    const supabase = await createClient();
    await supabase.from('organizations').update({
      subscriptionStatus: status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE',
      updatedAt: new Date().toISOString(),
    }).eq('id', id);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Clientes</h1>
        <p className={styles.subtitle}>Todos los clientes registrados en SimpleComm.</p>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Empresa</th><th>CUIT</th><th>Email</th><th>Plan</th><th>Registro</th><th></th></tr>
            </thead>
            <tbody>
              {!clientes || clientes.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin clientes registrados</td></tr>
              ) : clientes.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name || '(sin nombre)'}</strong></td>
                  <td className="mono text-sm">{c.cuit || '—'}</td>
                  <td className="text-sm">{c.emailAlerts || '—'}</td>
                  <td>
                    <span className={`badge ${
                      c.subscriptionStatus === 'ACTIVE' ? 'badge-success' :
                      c.subscriptionStatus === 'TRIAL' ? 'badge-warning' :
                      'badge-error'
                    }`}>{c.subscriptionStatus}</span>
                  </td>
                  <td className="text-sm text-muted">{new Date(c.createdAt).toLocaleDateString('es-AR')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <Link href={`/mayor/clientes/${c.id}`} className="btn btn-ghost btn-sm">Ver</Link>
                      <form action={pausar.bind(null, c.id, c.subscriptionStatus)}>
                        <button type="submit" className={`btn btn-sm ${c.subscriptionStatus === 'CANCELLED' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ color: c.subscriptionStatus !== 'CANCELLED' ? 'var(--error)' : undefined }}>
                          {c.subscriptionStatus === 'CANCELLED' ? 'Activar' : 'Pausar'}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
