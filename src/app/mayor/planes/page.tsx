import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PLANS, getPlan, type PlanId } from '@/lib/usage';
import styles from '../mayor.module.css';

async function getStats() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, cuit, planId, invoiceCountMonth, invoiceCountResetAt, subscriptionStatus');

  return orgs ?? [];
}

export default async function PlanesPage() {
  const orgs = await getStats();

  const now = new Date();

  const byPlan = (Object.keys(PLANS) as PlanId[]).map(pid => ({
    planId:  pid,
    plan:    PLANS[pid],
    clients: orgs.filter(o => (o.planId ?? 'plan_starter') === pid),
  }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Planes</h1>
        <p className={styles.subtitle}>Distribución de clientes por plan y uso mensual.</p>
      </div>

      {/* Resumen de planes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {byPlan.map(({ planId, plan, clients }) => (
          <div key={planId} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{clients.length}</div>
            <div style={{ fontWeight: 600, margin: '0.25rem 0' }}>{plan.label}</div>
            <div className="text-sm text-muted">Límite: {plan.monthlyLimit} facturas/mes</div>
          </div>
        ))}
      </div>

      {/* Tabla de todos los clientes con su plan y uso */}
      <div className="card">
        <h2 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Uso actual por cliente</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Uso este mes</th>
                <th>%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin clientes</td></tr>
              ) : orgs.map(org => {
                const plan = getPlan(org.planId);
                const resetAt = org.invoiceCountResetAt ? new Date(org.invoiceCountResetAt) : new Date(0);
                const stale = now.getFullYear() !== resetAt.getFullYear() || now.getMonth() !== resetAt.getMonth();
                const count = stale ? 0 : (org.invoiceCountMonth ?? 0);
                const pct   = Math.min(100, Math.round((count / plan.monthlyLimit) * 100));

                return (
                  <tr key={org.id}>
                    <td><strong>{org.name || '(sin nombre)'}</strong><br /><span className="text-sm text-muted mono">{org.cuit || '—'}</span></td>
                    <td><span className="badge badge-blue">{plan.label}</span></td>
                    <td>
                      <span className={`badge ${
                        org.subscriptionStatus === 'ACTIVE'    ? 'badge-success' :
                        org.subscriptionStatus === 'TRIAL'     ? 'badge-warning' :
                        org.subscriptionStatus === 'CANCELLED' ? 'badge-error'   : 'badge-gray'
                      }`}>{org.subscriptionStatus}</span>
                    </td>
                    <td>
                      <strong style={{ color: pct >= 90 ? 'var(--error)' : 'inherit' }}>{count}</strong>
                      <span className="text-muted"> / {plan.monthlyLimit}</span>
                    </td>
                    <td>
                      <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, width: 80 }}>
                        <div style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--error)' : 'var(--blue)', height: '100%', borderRadius: 4 }} />
                      </div>
                    </td>
                    <td><Link href={`/mayor/clientes/${org.id}`} className="btn btn-ghost btn-sm">Ver →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
