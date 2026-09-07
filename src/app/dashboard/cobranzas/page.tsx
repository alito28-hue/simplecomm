'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import pageStyles from '../organizacion/clientes/clientes.module.css';
import dashStyles from '../dashboard.module.css';
import { IconWallet } from '@/components/AppIcons';

interface Pendiente {
  invoice_id: string;
  invoice_number: string | null;
  buyer_name: string;
  buyer_doc: string | null;
  total_amount: number;
  created_at: string;
  origin: string;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function diasPendiente(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Cuentas por cobrar: facturas emitidas que todavía no se marcaron como cobradas, de
 * cualquier mes — no solo el actual. "Marcar como cobrada" (con retención, IIBB, Ley 25413,
 * etc.) sigue viviendo en Comprobantes, donde está todo ese detalle — acá solo se linkea
 * directo a la factura puntual para no duplicar ese modal.
 */
export default function CobranzasPage() {
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pagos/pendientes')
      .then(r => r.json())
      .then(d => { setPendientes(d.data ?? []); setTotal(d.totalPendiente ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.pageTitle}>Cobranzas</h1>
          <p className={pageStyles.pageSubtitle}>
            Facturas emitidas que todavía no cobraste, de cualquier mes — no solo el actual.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted">
        ¿Buscás plata que ya entró pero todavía no facturaste (Mercado Pago, extracto bancario)? Esa es otra
        sección: <Link href="/dashboard/cobros-sin-facturar" style={{ color: 'var(--blue)' }}>Cobros sin facturar</Link>.
      </p>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : pendientes.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No tenés facturas pendientes de cobro. 🎉
        </div>
      ) : (
        <>
          <div className={dashStyles.statCardsRow}>
            <div className={`card ${dashStyles.statCardV2}`}>
              <div className={dashStyles.statCardV2Head}>
                <div className={dashStyles.statCardV2Icon} style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                  <IconWallet size={19} />
                </div>
              </div>
              <div className={dashStyles.statCardV2Label}>Total pendiente de cobro</div>
              <div className={dashStyles.statCardV2Value} style={{ color: 'var(--error)' }}>{money(total)}</div>
              <div className={dashStyles.statCardV2Caption}>{pendientes.length} comprobante{pendientes.length === 1 ? '' : 's'}</div>
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>N° Comprobante</th>
                    <th>Receptor</th>
                    <th>Monto</th>
                    <th>Pendiente hace</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map(p => {
                    const dias = diasPendiente(p.created_at);
                    const q = p.buyer_doc || p.buyer_name;
                    return (
                      <tr key={p.invoice_id}>
                        <td className="text-sm text-muted">{new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                        <td>{p.invoice_number ? <span className="mono text-sm">{p.invoice_number}</span> : <span className="text-muted text-sm">—</span>}</td>
                        <td>{p.buyer_name}</td>
                        <td><strong>{money(p.total_amount)}</strong></td>
                        <td>
                          <span className={`badge ${dias > 60 ? 'badge-error' : dias > 30 ? 'badge-warning' : 'badge-gray'} text-xs`}>
                            {dias === 0 ? 'hoy' : `${dias} día${dias === 1 ? '' : 's'}`}
                          </span>
                        </td>
                        <td>
                          <Link href={`/dashboard/billing?q=${encodeURIComponent(q)}`} className="btn btn-outline btn-sm">
                            Marcar como cobrada →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
