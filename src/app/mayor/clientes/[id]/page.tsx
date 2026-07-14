import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlan, PLANS, type PlanId } from '@/lib/usage';
import VerificarArcaButton from './VerificarArcaButton';
import styles from '../../mayor.module.css';

async function getOrgDetail(id: string) {
  const supabase = createAdminClient();

  const [
    { data: org },
    { data: integrations },
    { count: ticketCount },
    { data: payments },
    { data: plans },
  ] = await Promise.all([
    supabase.from('organizations')
      .select('id, name, cuit, fiscalTreatment, emailAlerts, subscriptionStatus, planId, invoiceCountMonth, invoiceCountResetAt, gatewayApiKey, afipAuthMethod, afipRelationVerifiedAt, createdAt')
      .eq('id', id)
      .single(),
    supabase.from('integrations')
      .select('platform, status')
      .eq('organizationId', id),
    supabase.from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('organizationId', id),
    supabase.from('subscription_payments')
      .select('id, planId, amount, currency, status, mpPayerEmail, periodStart, periodEnd, createdAt')
      .eq('organizationId', id)
      .order('createdAt', { ascending: false })
      .limit(10),
    supabase.from('plans')
      .select('id, name, monthlyLimit, priceARS, isActive')
      .eq('isActive', true)
      .order('priceARS', { ascending: true }),
  ]);

  return {
    org,
    integrations: integrations ?? [],
    ticketCount: ticketCount ?? 0,
    payments: payments ?? [],
    dbPlans: plans ?? [],
  };
}

function Step({ done, label, custom }: { done: boolean; label: string; custom?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{custom ? '🔧' : done ? '✅' : '❌'}</span>
      <span style={{ color: done || custom ? 'var(--text)' : 'var(--text-muted)', fontSize: '0.9rem', flex: 1 }}>{label}</span>
      {custom && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Custom</span>}
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function money(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, integrations, ticketCount, payments, dbPlans } = await getOrgDetail(id);
  if (!org) notFound();

  const plan = getPlan(org.planId);
  const connectedIntegrations = integrations.filter(i => i.status === 'CONNECTED');

  // Detect custom client: ACTIVE but no gateway key (bypasses normal onboarding)
  const isCustom = org.subscriptionStatus === 'ACTIVE' && !org.gatewayApiKey;

  // Raw invoice count (no reset logic — admin view should show real DB value)
  const rawCount  = org.invoiceCountMonth ?? 0;
  const hasEmpresa = !!(org.name && org.cuit);
  const hasAfip   = !!org.gatewayApiKey || isCustom;
  const hasInteg  = connectedIntegrations.length > 0 || isCustom;
  const hasFactura = rawCount > 0 || isCustom;

  // Usage display (with reset logic for accurate current-month count)
  const now     = new Date();
  const resetAt = org.invoiceCountResetAt ? new Date(org.invoiceCountResetAt) : new Date(0);
  const needsReset = now.getFullYear() !== resetAt.getFullYear() || now.getMonth() !== resetAt.getMonth();
  const currentCount = needsReset ? 0 : rawCount;
  const usagePct = Math.min(100, Math.round((currentCount / plan.monthlyLimit) * 100));

  // Build plan list for admin selector (prefer DB plans, fallback to hardcoded)
  const planOptions = dbPlans.length > 0
    ? dbPlans
    : (Object.entries(PLANS) as [PlanId, { label: string; monthlyLimit: number }][]).map(([pid, p]) => ({
        id: pid, name: p.label, monthlyLimit: p.monthlyLimit, priceARS: 0, isActive: true,
      }));

  const lastPayment = payments[0] ?? null;

  return (
    <div className={styles.page} style={{ maxWidth: 1100 }}>
      <Link href="/mayor/clientes" className={styles.backLink} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>← Volver a Clientes</Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className={styles.title}>{org.name || '(sin nombre)'}</h1>
          <p className={styles.subtitle}>CUIT {org.cuit || '—'} · {org.emailAlerts || '—'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {isCustom && <span className="badge badge-warning">Custom</span>}
          <span className={`badge ${
            org.subscriptionStatus === 'ACTIVE'    ? 'badge-success' :
            org.subscriptionStatus === 'CANCELLED' ? 'badge-error'   : 'badge-gray'
          }`}>{org.subscriptionStatus ?? 'Sin estado'}</span>
          <span className="badge badge-blue">{plan.label}</span>
        </div>
      </div>

      {/* Row 1: Onboarding + Uso */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem' }}>

        {/* Onboarding */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Estado del alta</h2>
          <Step done label="Cuenta creada" />
          <Step done={hasEmpresa} label={hasEmpresa ? 'Datos de empresa completos' : 'Falta completar datos de empresa'} />
          <Step done={hasAfip} custom={isCustom && !org.gatewayApiKey}
            label={isCustom && !org.gatewayApiKey ? 'Conexión ARCA custom' : hasAfip ? 'ARCA / AFIP configurado' : 'Falta configurar ARCA'} />
          <Step done={hasInteg} custom={isCustom && connectedIntegrations.length === 0}
            label={isCustom && connectedIntegrations.length === 0 ? 'Integraciones custom' : hasInteg ? `${connectedIntegrations.length} integración(es) conectada(s)` : 'Sin integraciones conectadas'} />
          <Step done={hasFactura} custom={isCustom && rawCount === 0}
            label={isCustom && rawCount === 0 ? 'Facturación via sistema custom' : hasFactura ? 'Primera factura emitida' : 'Aún no emitió facturas'} />
        </div>

        {/* Uso + Cambio de plan */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Uso este mes</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: usagePct >= 90 ? 'var(--error)' : 'var(--text)', lineHeight: 1 }}>
            {currentCount}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}> / {plan.monthlyLimit}</span>
          </div>
          <div style={{ margin: '0.75rem 0', background: 'var(--border)', borderRadius: 6, height: 8 }}>
            <div style={{ width: `${usagePct}%`, background: usagePct >= 90 ? 'var(--error)' : 'var(--blue)', height: '100%', borderRadius: 6 }} />
          </div>
          <p className="text-sm text-muted">{usagePct}% del límite mensual usado</p>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ marginBottom: '0.5rem' }}><strong>Cambiar plan:</strong></p>
            <form action={`/api/admin/organizaciones/${id}/plan`} method="POST" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {planOptions.map((p) => (
                <button key={p.id} name="planId" value={p.id} type="submit"
                  className={`btn btn-sm ${org.planId === p.id ? 'btn-primary' : 'btn-outline'}`}>
                  {p.name} ({p.monthlyLimit}/mes)
                </button>
              ))}
            </form>
          </div>
        </div>
      </div>

      {/* ARCA / delegación pendiente */}
      {org.afipAuthMethod === 'delegation' && (
        <div className="card" style={{ padding: '1.25rem', borderLeft: org.afipRelationVerifiedAt ? undefined : '3px solid var(--warning, #d97706)' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>Estado ARCA (delegación)</h2>
          {org.afipRelationVerifiedAt ? (
            <p className="text-sm">✅ Relación verificada el {fmt(org.afipRelationVerifiedAt)}.</p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              ⏳ Este cliente usa delegación y todavía no verificaste que ARCA la haya aceptado.
              Seguí los pasos de la <a href="/mayor/guia-alta-cliente" style={{ color: 'var(--blue)' }}>Guía de alta ARCA</a> (aceptar + vincular Computador Fiscal) y después verificá acá.
            </p>
          )}
          <VerificarArcaButton orgId={org.id} />
        </div>
      )}

      {/* Row 2: Info + Facturación */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem' }}>

        {/* Información general */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Información</h2>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Empresa',    org.name || '—'],
                ['CUIT',       org.cuit || '—'],
                ['Condición',  org.fiscalTreatment || '—'],
                ['Email',      org.emailAlerts || '—'],
                ['Registro',   fmt(org.createdAt)],
                ['Tickets',    String(ticketCount)],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.45rem 0', color: 'var(--text-muted)', width: '40%' }}>{k}</td>
                  <td style={{ padding: '0.45rem 0', fontWeight: k === 'CUIT' ? 500 : 400 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ticketCount > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <Link href={`/mayor/tickets?org=${id}`} className="btn btn-ghost btn-sm">Ver {ticketCount} ticket(s) →</Link>
            </div>
          )}
        </div>

        {/* Facturación / Cuenta */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Cuenta y pagos</h2>

          {/* Estado de suscripción */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span className="text-sm text-muted">Estado suscripción</span>
            <span className={`badge ${org.subscriptionStatus === 'ACTIVE' ? 'badge-success' : 'badge-gray'}`}>
              {org.subscriptionStatus ?? 'Sin suscripción'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span className="text-sm text-muted">Plan actual</span>
            <span className="badge badge-blue">{plan.label}</span>
          </div>

          {lastPayment ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="text-sm text-muted">Último pago</span>
                <span className="text-sm">{fmt(lastPayment.createdAt)} — <strong>{money(lastPayment.amount)}</strong></span>
              </div>
              {lastPayment.mpPayerEmail && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="text-sm text-muted">Email MP</span>
                  <span className="text-sm">{lastPayment.mpPayerEmail}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                <p className="text-sm" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Historial de pagos</p>
                {payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                    <span className="text-muted">{fmt(p.createdAt)}</span>
                    <span>{getPlan(p.planId as PlanId)?.label ?? p.planId}</span>
                    <strong>{money(p.amount)}</strong>
                    <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-error'}`} style={{ fontSize: '0.65rem' }}>
                      {p.status === 'approved' ? 'Aprobado' : p.status === 'pending' ? 'Pendiente' : p.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted" style={{ fontStyle: 'italic', marginTop: '0.5rem' }}>
              {isCustom ? 'Cliente con facturación custom — sin pagos vía MP.' : 'Sin pagos registrados.'}
            </p>
          )}
        </div>
      </div>

      {/* Row 3: Integraciones */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Integraciones</h2>
        {integrations.length === 0 ? (
          <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>
            {isCustom ? 'Integraciones via sistema custom — no registradas en la plataforma.' : 'Sin integraciones configuradas.'}
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {integrations.map(i => (
              <div key={i.platform} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'var(--surface-low)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
                <span>{i.platform.replace(/_/g, ' ')}</span>
                <span className={`badge ${i.status === 'CONNECTED' ? 'badge-success' : i.status === 'ERROR' ? 'badge-error' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                  {i.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
