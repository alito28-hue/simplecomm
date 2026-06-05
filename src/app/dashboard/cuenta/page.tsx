'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PLANS, type PlanId } from '@/lib/plans';

interface Payment {
  id: string; planId: string; amount: number; currency: string;
  status: string; mpPayerEmail: string | null; periodStart: string | null;
  periodEnd: string | null; createdAt: string;
}
interface Usage {
  planId: PlanId; planLabel: string; monthlyLimit: number;
  currentCount: number; remaining: number; percentage: number;
  subscriptionStatus: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

export default function CuentaPage() {
  const params      = useSearchParams();
  const [usage, setUsage]       = useState<Usage | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState<string | null>(null);
  const [confirm, setConfirm]   = useState<string | null>(null);

  const pagoStatus = params.get('pago');

  useEffect(() => {
    fetch('/api/cuenta')
      .then(r => r.json())
      .then(d => { setUsage(d.usage); setPayments(d.payments ?? []); })
      .finally(() => setLoading(false));
  }, []);

  async function pagar(planId: string) {
    setPaying(planId);
    setConfirm(null);
    const res = await fetch('/api/cuenta/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, returnUrl: '/dashboard/cuenta' }),
    });
    const data = await res.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      alert('Error al iniciar el pago: ' + (data.error ?? 'desconocido'));
      setPaying(null);
    }
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-muted)' }}>Cargando...</div>;

  const plan = usage ? (PLANS[usage.planId] ?? PLANS.plan_starter) : PLANS.plan_starter;

  const PLAN_PRICES: Record<PlanId, string> = {
    plan_starter: '$4.990', plan_pro: '$9.990', plan_enterprise: '$24.990',
  };
  const confirmPlan = confirm ? PLANS[confirm as PlanId] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Modal confirmación */}
      {confirm && confirmPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: '2rem', maxWidth: 420, width: '90%' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Confirmar pago</h2>
            {usage && usage.planId !== confirm && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                Cambiás de <strong>{PLANS[usage.planId]?.label}</strong> a <strong>{confirmPlan.label}</strong>.
              </p>
            )}
            <div style={{ background: 'var(--surface-low)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem' }}>
              <p style={{ fontWeight: 700 }}>{confirmPlan.label}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{confirmPlan.monthlyLimit} comprobantes / mes</p>
              <p style={{ fontWeight: 800, fontSize: '1.5rem', marginTop: '0.5rem' }}>
                {PLAN_PRICES[confirm as PlanId]}<span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/mes</span>
              </p>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Serás redirigido a Mercado Pago. El plan se activa automáticamente al confirmar el pago.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={paying !== null}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => pagar(confirm)} disabled={paying !== null}>
                {paying ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>DASHBOARD › CUENTA</p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Estado de cuenta</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tu plan, uso mensual e historial de pagos.</p>
      </div>

      {pagoStatus === 'ok' && (
        <div className="card" style={{ padding: '1rem 1.5rem', background: 'var(--success-bg, #f0fdf4)', border: '1px solid var(--success)', color: 'var(--success)' }}>
          ✅ ¡Pago confirmado! Tu plan fue activado correctamente.
        </div>
      )}
      {pagoStatus === 'error' && (
        <div className="card" style={{ padding: '1rem 1.5rem', color: 'var(--error)' }}>
          ❌ El pago no se completó. Podés intentarlo de nuevo.
        </div>
      )}
      {pagoStatus === 'pendiente' && (
        <div className="card" style={{ padding: '1rem 1.5rem', color: 'var(--warning)' }}>
          ⏳ Pago pendiente de confirmación. Te notificaremos cuando se acredite.
        </div>
      )}

      {/* Plan actual + uso */}
      {usage && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Plan actual</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{plan.label}</span>
                <span className={`badge ${usage.subscriptionStatus === 'ACTIVE' ? 'badge-success' : usage.subscriptionStatus === 'TRIAL' ? 'badge-warning' : 'badge-error'}`}>
                  {usage.subscriptionStatus}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {plan.monthlyLimit} comprobantes / mes
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Uso este mes</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {usage.currentCount} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {usage.monthlyLimit}</span>
              </p>
            </div>
          </div>
          <div style={{ margin: '1rem 0 0.25rem', background: 'var(--border)', borderRadius: 6, height: 10 }}>
            <div style={{
              width: `${usage.percentage}%`,
              background: usage.percentage >= 90 ? 'var(--error)' : 'var(--blue)',
              height: '100%', borderRadius: 6, transition: 'width 0.4s',
            }} />
          </div>
          <p className="text-sm text-muted">{usage.percentage}% del cupo mensual utilizado · {usage.remaining} restantes</p>
        </div>
      )}

      {/* Medio de pago — contratar/renovar plan */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Medio de pago</h2>
        <p className="text-sm text-muted" style={{ marginBottom: '1.25rem' }}>Pagá tu suscripción con Mercado Pago. El plan se activa automáticamente al confirmar el pago.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {(Object.entries(PLANS) as [PlanId, { label: string; monthlyLimit: number }][]).map(([pid, p]) => {
            const isCurrent = usage?.planId === pid;
            return (
              <div key={pid} className="card" style={{ padding: '1.25rem', border: isCurrent ? '2px solid var(--blue)' : undefined }}>
                {isCurrent && <p style={{ fontSize: '0.7rem', color: 'var(--blue)', fontWeight: 700, marginBottom: '0.25rem' }}>✓ PLAN ACTUAL</p>}
                <p style={{ fontWeight: 700 }}>{p.label}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{p.monthlyLimit} comprobantes/mes</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>{PLAN_PRICES[pid]}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mes</span></p>
                <button
                  onClick={() => setConfirm(pid)}
                  disabled={paying !== null}
                  className={`btn btn-sm ${isCurrent ? 'btn-outline' : 'btn-primary'}`}
                  style={{ width: '100%' }}
                >
                  {paying === pid ? 'Redirigiendo...' : isCurrent ? 'Renovar' : 'Pagar con MP'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historial de pagos */}
      <div className="card">
        <h2 style={{ fontWeight: 700, padding: '1.25rem 1.5rem 0' }}>Historial de pagos</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Plan</th><th>Monto</th><th>Email MP</th><th>Período</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin pagos registrados aún.</td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td className="text-sm text-muted">{fmt(p.createdAt)}</td>
                  <td><span className="badge badge-blue">{PLANS[p.planId as PlanId]?.label ?? p.planId}</span></td>
                  <td><strong>{money(p.amount)}</strong></td>
                  <td className="text-sm">{p.mpPayerEmail ?? '—'}</td>
                  <td className="text-sm text-muted">
                    {p.periodStart && p.periodEnd ? `${fmt(p.periodStart)} → ${fmt(p.periodEnd)}` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>
                      {p.status === 'approved' ? 'Aprobado' : p.status === 'pending' ? 'Pendiente' : p.status}
                    </span>
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
