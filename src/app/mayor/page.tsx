import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import styles from './mayor.module.css';

async function getStats() {
  const supabase = createAdminClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: totalClients }, { count: newClients }, { count: openTickets }, { count: totalTickets }] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).gte('createdAt', weekAgo),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
  ]);

  return { totalClients: totalClients ?? 0, newClients: newClients ?? 0, openTickets: openTickets ?? 0, totalTickets: totalTickets ?? 0 };
}

async function getRecentClients() {
  const supabase = createAdminClient();
  const { data } = await supabase.from('organizations').select('id,name,cuit,subscriptionStatus,createdAt')
    .order('createdAt', { ascending: false }).limit(5);
  return data ?? [];
}

async function getRecentTickets() {
  const supabase = createAdminClient();
  const { data } = await supabase.from('support_tickets').select('id,subject,status,priority,createdAt,organizationId')
    .eq('status', 'open').order('createdAt', { ascending: false }).limit(5);
  return data ?? [];
}

export default async function AdminDashboard() {
  const [stats, recentClients, recentTickets] = await Promise.all([
    getStats(), getRecentClients(), getRecentTickets(),
  ]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Administración</h1>
        <p className={styles.subtitle}>Bienvenido al centro de control de SimpleComm.</p>
      </div>

      <div className={styles.alertsGrid}>
        <div className={`card ${styles.alertCard} ${stats.newClients > 0 ? styles.alertBlue : ''}`}>
          <div className={styles.alertIcon}>👥</div>
          <div className={styles.alertBody}>
            <div className={styles.alertNum}>{stats.newClients}</div>
            <div className={styles.alertLabel}>Nuevos clientes (7 días)</div>
          </div>
          <Link href="/mayor/clientes" className={styles.alertLink}>Ver todos →</Link>
        </div>
        <div className={`card ${styles.alertCard} ${stats.openTickets > 0 ? styles.alertRed : ''}`}>
          <div className={styles.alertIcon}>🎫</div>
          <div className={styles.alertBody}>
            <div className={styles.alertNum}>{stats.openTickets}</div>
            <div className={styles.alertLabel}>Tickets abiertos</div>
          </div>
          <Link href="/mayor/tickets" className={styles.alertLink}>Responder →</Link>
        </div>
        <div className="card">
          <div className={styles.alertCard}>
            <div className={styles.alertIcon}>🏢</div>
            <div className={styles.alertBody}>
              <div className={styles.alertNum}>{stats.totalClients}</div>
              <div className={styles.alertLabel}>Total de clientes</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className={styles.alertCard}>
            <div className={styles.alertIcon}>📊</div>
            <div className={styles.alertBody}>
              <div className={styles.alertNum}>{stats.totalTickets}</div>
              <div className={styles.alertLabel}>Total de tickets</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionsGrid}>
        {[
          { href: '/mayor/clientes', icon: '👥', title: 'Gestión de Clientes',  desc: 'Ver todos los clientes, su plan, estado y actividad.' },
          { href: '/mayor/tickets',  icon: '🎫', title: 'Soporte y Tickets',    desc: 'Gestionar tickets de soporte, responder y cambiar estado.' },
        ].map(s => (
          <Link key={s.href} href={s.href} className={`card ${styles.sectionCard}`}>
            <div className={styles.sectionIcon}>{s.icon}</div>
            <h3 className={styles.sectionTitle}>{s.title}</h3>
            <p className={styles.sectionDesc}>{s.desc}</p>
            <span className={styles.sectionArrow}>→</span>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Últimos clientes registrados</h2>
          <Link href="/mayor/clientes" className={styles.viewAll}>Ver todos →</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Empresa</th><th>CUIT</th><th>Plan</th><th>Fecha registro</th><th></th></tr></thead>
            <tbody>
              {recentClients.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin clientes aún</td></tr>
              ) : recentClients.map((c: { id: string; name: string; cuit: string; subscriptionStatus: string; createdAt: string }) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td className="mono text-sm">{c.cuit || '—'}</td>
                  <td><span className={`badge ${c.subscriptionStatus === 'ACTIVE' ? 'badge-success' : c.subscriptionStatus === 'CANCELLED' ? 'badge-error' : 'badge-gray'}`}>{c.subscriptionStatus}</span></td>
                  <td className="text-sm text-muted">{new Date(c.createdAt).toLocaleDateString('es-AR')}</td>
                  <td><Link href={`/mayor/clientes/${c.id}`} className="btn btn-ghost btn-sm">Ver →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recentTickets.length > 0 && (
        <div className="card">
          <div className={styles.tableHeader}>
            <h2 className={styles.sectionTitle}>Tickets abiertos</h2>
            <Link href="/mayor/tickets" className={styles.viewAll}>Ver todos →</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Asunto</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
              <tbody>
                {recentTickets.map((t: { id: string; subject: string; priority: string; status: string; createdAt: string }) => (
                  <tr key={t.id}>
                    <td>{t.subject}</td>
                    <td><span className={`badge ${t.priority === 'high' ? 'badge-error' : t.priority === 'normal' ? 'badge-warning' : 'badge-gray'}`}>{t.priority}</span></td>
                    <td><span className="badge badge-blue">{t.status}</span></td>
                    <td className="text-sm text-muted">{new Date(t.createdAt).toLocaleDateString('es-AR')}</td>
                    <td><Link href={`/mayor/tickets/${t.id}`} className="btn btn-primary btn-sm">Responder</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
