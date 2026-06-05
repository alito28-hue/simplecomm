import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPlan, PLANS, type PlanId } from '@/lib/usage';
import styles from '../../mayor.module.css';

async function getOrgDetail(id: string) {
  const supabase = await createClient();

  const [{ data: org }, { data: integrations }, { count: ticketCount }] = await Promise.all([
    supabase.from('organizations')
      .select('id, name, cuit, fiscalTreatment, emailAlerts, subscriptionStatus, planId, invoiceCountMonth, invoiceCountResetAt, gatewayApiKey, createdAt')
      .eq('id', id)
      .single(),
    supabase.from('integrations')
      .select('platform, status')
      .eq('organizationId', id),
    supabase.from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('organizationId', id),
  ]);

  return { org, integrations: integrations ?? [], ticketCount: ticketCount ?? 0 };
}

function OnboardingStep({ done, label }: { done: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '1.1rem' }}>{done ? '✅' : '❌'}</span>
      <span style={{ color: done ? 'var(--text)' : 'var(--text-muted)', fontSize: '0.9rem' }}>{label}</span>
    </div>
  );
}

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, integrations, ticketCount } = await getOrgDetail(id);
  if (!org) notFound();

  const plan = getPlan(org.planId);
  const connectedIntegrations = integrations.filter(i => i.status === 'CONNECTED');

  // Onboarding steps
  const hasEmpresa   = !!(org.name && org.cuit);
  const hasAfip      = !!org.gatewayApiKey;
  const hasInteg     = connectedIntegrations.length > 0;
  const hasFactura   = (org.invoiceCountMonth ?? 0) > 0;

  // Usage
  const now      = new Date();
  const resetAt  = org.invoiceCountResetAt ? new Date(org.invoiceCountResetAt) : new Date(0);
  const needsReset = now.getFullYear() !== resetAt.getFullYear() || now.getMonth() !== resetAt.getMonth();
  const currentCount = needsReset ? 0 : (org.invoiceCountMonth ?? 0);
  const usagePct = Math.min(100, Math.round((currentCount / plan.monthlyLimit) * 100));

  return (
    <div className={styles.page}>
      <Link href="/mayor/clientes" className={styles.backLink}>← Volver a Clientes</Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{org.name || '(sin nombre)'}</h1>
          <p className={styles.subtitle}>CUIT {org.cuit || '—'} · {org.emailAlerts || '—'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${
            org.subscriptionStatus === 'ACTIVE'    ? 'badge-success' :
            org.subscriptionStatus === 'TRIAL'     ? 'badge-warning' :
            org.subscriptionStatus === 'CANCELLED' ? 'badge-error'   : 'badge-gray'
          }`}>{org.subscriptionStatus}</span>
          <span className="badge badge-blue">{plan.label}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Onboarding */}
        <div className="card">
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Estado del alta</h2>
          <OnboardingStep done label="Cuenta creada" />
          <OnboardingStep done={hasEmpresa}  label={hasEmpresa  ? 'Datos de empresa completos'            : 'Falta completar datos de empresa'} />
          <OnboardingStep done={hasAfip}     label={hasAfip     ? 'ARCA / AFIP configurado'                : 'Falta configurar certificado AFIP'} />
          <OnboardingStep done={hasInteg}    label={hasInteg    ? `${connectedIntegrations.length} integración(es) conectada(s)` : 'Sin integraciones conectadas'} />
          <OnboardingStep done={hasFactura}  label={hasFactura  ? 'Primera factura emitida'                : 'Aún no emitió facturas'} />
        </div>

        {/* Uso mensual */}
        <div className="card">
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Uso este mes</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: usagePct >= 90 ? 'var(--error)' : 'var(--text)' }}>
            {currentCount} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {plan.monthlyLimit}</span>
          </div>
          <div style={{ margin: '0.75rem 0', background: 'var(--border)', borderRadius: 6, height: 8 }}>
            <div style={{ width: `${usagePct}%`, background: usagePct >= 90 ? 'var(--error)' : 'var(--blue)', height: '100%', borderRadius: 6, transition: 'width 0.3s' }} />
          </div>
          <p className="text-sm text-muted">{usagePct}% del límite mensual usado</p>

          <div style={{ marginTop: '1rem' }}>
            <p className="text-sm" style={{ marginBottom: '0.5rem' }}><strong>Cambiar plan:</strong></p>
            <form action={`/api/admin/organizaciones/${id}/plan`} method="POST" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(Object.entries(PLANS) as [PlanId, { label: string; monthlyLimit: number }][]).map(([pid, p]) => (
                <button key={pid} name="planId" value={pid} type="submit"
                  className={`btn btn-sm ${org.planId === pid ? 'btn-primary' : 'btn-outline'}`}>
                  {p.label} ({p.monthlyLimit}/mes)
                </button>
              ))}
            </form>
          </div>
        </div>

        {/* Info general */}
        <div className="card">
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Información</h2>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Empresa',    org.name || '—'],
                ['CUIT',       org.cuit || '—'],
                ['Condición',  org.fiscalTreatment || '—'],
                ['Email',      org.emailAlerts || '—'],
                ['Registro',   new Date(org.createdAt).toLocaleDateString('es-AR')],
                ['Tickets',    String(ticketCount)],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)', width: '40%' }}>{k}</td>
                  <td style={{ padding: '0.4rem 0' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Integraciones */}
        <div className="card">
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Integraciones</h2>
          {integrations.length === 0 ? (
            <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Sin integraciones configuradas</p>
          ) : (
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <tbody>
                {integrations.map(i => (
                  <tr key={i.platform} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.4rem 0' }}>{i.platform.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '0.4rem 0' }}>
                      <span className={`badge ${i.status === 'CONNECTED' ? 'badge-success' : i.status === 'ERROR' ? 'badge-error' : 'badge-gray'}`}>
                        {i.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {ticketCount > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <Link href={`/mayor/tickets?org=${id}`} className="btn btn-ghost btn-sm">
                Ver {ticketCount} ticket(s) →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
