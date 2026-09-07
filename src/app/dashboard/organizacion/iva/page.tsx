'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../clientes/clientes.module.css';
import dashStyles from '../../dashboard.module.css';
import ivaStyles from './iva.module.css';
import { IconReceipt, IconChart } from '@/components/LandingIcons';
import { IconWallet, IconScale, IconCalendar, IconInfo, IconDownload } from '@/components/AppIcons';

interface IvaPosition {
  applicable: boolean;
  salesIva?: number;
  salesUpdatedAt?: string | null;
  purchasesIva?: number;
  purchasesCount?: number;
  lastPurchasesImportAt?: string | null;
  position?: number;
  salesIvaDeltaPercent?: number | null;
  purchasesIvaDeltaPercent?: number | null;
}

interface HistorialMes {
  year: number;
  month: number;
  monthLabel: string;
  salesIva: number;
  purchasesIva: number;
  position: number;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const HISTORIAL_PAGE_SIZE = 6;

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DeltaBadge({ value }: { value?: number | null }) {
  if (value == null) return <span className={`${dashStyles.deltaBadge} ${dashStyles.deltaNeutral}`}>—</span>;
  const cls = value > 0 ? dashStyles.deltaPositive : value < 0 ? dashStyles.deltaNegative : dashStyles.deltaNeutral;
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '—';
  return <span className={`${dashStyles.deltaBadge} ${cls}`}>{arrow} {Math.abs(value)}%</span>;
}

interface VentaRow {
  invoice_id: string;
  invoice_number: string | null;
  created_at: string;
  buyer_name: string;
  total_amount: number;
  origin?: string;
}

interface CompraRow {
  id: string;
  issueDate: string | null;
  issuerName: string;
  invoiceLetter: string;
  invoiceNumber: string;
  netAmount: string | number;
  ivaAmount: string | number;
  totalAmount: string | number;
}

interface Detalle { tipo: 'ventas' | 'compras'; year: number; month: number; monthLabel: string; ivaTotal: number }

const DETALLE_LIMIT = 20;
const EMPTY_META = { page: 1, limit: DETALLE_LIMIT, total: 0, pages: 1 };

function IvaDetalleModal({ detalle, onClose }: { detalle: Detalle; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(EMPTY_META);

  useEffect(() => {
    const monthStr = `${detalle.year}-${String(detalle.month).padStart(2, '0')}`;
    setLoading(true);
    if (detalle.tipo === 'ventas') {
      fetch(`/api/facturas?month=${monthStr}&status=issued&page=${page}&limit=${DETALLE_LIMIT}`)
        .then(r => r.json())
        .then(d => { setVentas(d.data ?? []); setMeta(d.meta ?? EMPTY_META); })
        .catch(() => { setVentas([]); setMeta(EMPTY_META); })
        .finally(() => setLoading(false));
    } else {
      const lastDay = new Date(detalle.year, detalle.month, 0).getDate();
      const from = `${monthStr}-01`;
      const to = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
      fetch(`/api/organizacion/compras?from=${from}&to=${to}&page=${page}&limit=${DETALLE_LIMIT}`)
        .then(r => r.json())
        .then(d => { setCompras(d.data ?? []); setMeta(d.meta ?? EMPTY_META); })
        .catch(() => { setCompras([]); setMeta(EMPTY_META); })
        .finally(() => setLoading(false));
    }
  }, [detalle, page]);

  // Al abrir un mes/tipo distinto, siempre se vuelve a la página 1.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [detalle.tipo, detalle.year, detalle.month]);

  const isVentas = detalle.tipo === 'ventas';
  const rows = isVentas ? ventas : compras;

  return (
    <div className={ivaStyles.overlay} onClick={onClose}>
      <div className={ivaStyles.modal} onClick={e => e.stopPropagation()}>
        <div className={ivaStyles.header}>
          <div>
            <div className={ivaStyles.title}>{isVentas ? 'IVA Ventas' : 'IVA Compras'}</div>
            <div className={ivaStyles.subtitle}>{detalle.monthLabel} {detalle.year} — comprobantes que componen este total</div>
          </div>
          <button type="button" className={ivaStyles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={ivaStyles.summary}>
          <span>{meta.total} comprobante{meta.total === 1 ? '' : 's'}</span>
          <span>IVA total del mes: <span className={ivaStyles.summaryTotal}>{money(detalle.ivaTotal)}</span></span>
        </div>

        <div className={ivaStyles.body}>
          {loading && rows.length === 0 ? (
            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '2.5rem' }}>Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '2.5rem' }}>
              Sin comprobantes de {isVentas ? 'venta' : 'compra'} este mes.
            </p>
          ) : isVentas ? (
            // Al cambiar de página se mantienen las filas anteriores atenuadas mientras
            // llega la respuesta, en vez de taparlas con un "Cargando..." — eso es lo que
            // se sentía como que "recargaba la página" en cada clic de paginado.
            <div className="table-wrap" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
              <table className="table">
                <thead><tr><th>Fecha</th><th>N° Comprobante</th><th>Receptor</th><th>Origen</th><th>Monto</th></tr></thead>
                <tbody>
                  {ventas.map(v => (
                    <tr key={v.invoice_id}>
                      <td className="text-sm text-muted">{new Date(v.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</td>
                      <td><span className="mono text-sm">{v.invoice_number ?? '—'}</span></td>
                      <td>{v.buyer_name}</td>
                      <td><span className="badge badge-gray text-xs">{v.origin ?? 'manual'}</span></td>
                      <td><strong>{money(v.total_amount)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
              <table className="table">
                <thead><tr><th>Fecha</th><th>Emisor</th><th>Comprobante</th><th>Neto</th><th>IVA</th><th>Total</th></tr></thead>
                <tbody>
                  {compras.map(c => (
                    <tr key={c.id}>
                      <td className="text-sm text-muted">{c.issueDate ? c.issueDate.slice(8, 10) + '/' + c.issueDate.slice(5, 7) : '—'}</td>
                      <td>{c.issuerName || '(sin nombre)'}</td>
                      <td className="text-sm">{c.invoiceLetter} {c.invoiceNumber}</td>
                      <td className="text-sm">{money(Number(c.netAmount))}</td>
                      <td className="text-sm">{money(Number(c.ivaAmount))}</td>
                      <td><strong>{money(Number(c.totalAmount))}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {meta.pages > 1 && (
          <div className={dashStyles.tablePagination}>
            <span className="text-muted text-sm">
              Mostrando {Math.min(page * DETALLE_LIMIT, meta.total)} de {meta.total}
            </span>
            <div className={dashStyles.paginationBtns}>
              <button type="button" className={dashStyles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                ‹ Anterior
              </button>
              <span className={dashStyles.pageIndicator}>Página {page} de {meta.pages}</span>
              <button type="button" className={dashStyles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= meta.pages}>
                Siguiente ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IvaPage() {
  const [data, setData] = useState<IvaPosition | null>(null);
  const [loading, setLoading] = useState(true);

  const [historial, setHistorial] = useState<HistorialMes[]>([]);
  const [vencimientoGrupo, setVencimientoGrupo] = useState<string | null>(null);
  const [historialLoading, setHistorialLoading] = useState(true);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [historialPage, setHistorialPage] = useState(1);

  function load() {
    fetch('/api/dashboard/iva-position')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function loadHistorial() {
    setHistorialLoading(true);
    fetch('/api/dashboard/iva-position/historial')
      .then(r => r.json())
      .then(d => {
        setHistorial(d.months ?? []);
        setVencimientoGrupo(d.vencimientoGrupo ?? null);
      })
      .catch(() => {})
      .finally(() => setHistorialLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistorial();
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    );
  }

  if (!data || !data.applicable) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>IVA</h1>
            <p className={styles.pageSubtitle}>Esta sección solo aplica para organizaciones Responsables Inscriptas.</p>
          </div>
        </div>
      </div>
    );
  }

  const position = data.position ?? 0;
  const owes = position > 0;
  const now = new Date();
  const mesActual = `${MESES[now.getMonth()]} ${now.getFullYear()}`;
  const mesVacioConHistorial = (data.purchasesCount ?? 0) === 0 && !!data.lastPurchasesImportAt;

  const anioActual = now.getFullYear();
  const mesesDelAnio = historial.filter(m => m.year === anioActual);
  const anualVentas = mesesDelAnio.reduce((s, m) => s + m.salesIva, 0);
  const anualCompras = mesesDelAnio.reduce((s, m) => s + m.purchasesIva, 0);
  const anualPosicion = anualVentas - anualCompras;

  const historialPages = Math.max(1, Math.ceil(historial.length / HISTORIAL_PAGE_SIZE));
  const historialPageRows = historial.slice((historialPage - 1) * HISTORIAL_PAGE_SIZE, historialPage * HISTORIAL_PAGE_SIZE);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>IVA</h1>
          <p className={styles.pageSubtitle}>Posición de IVA (ventas menos compras).</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/billing" className="btn btn-outline btn-sm">
            Importar ventas de ARCA →
          </Link>
          <Link href="/dashboard/organizacion/compras" className="btn btn-primary btn-sm">
            Ir a Compras →
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted">
        Los comprobantes de venta se importan desde <Link href="/dashboard/billing" style={{ color: 'var(--blue)' }}>Comprobantes</Link>, y
        los de compra desde <Link href="/dashboard/organizacion/compras" style={{ color: 'var(--blue)' }}>Compras</Link>. Esta página solo
        muestra la posición calculada a partir de esos comprobantes.
      </p>

      {mesVacioConHistorial && (
        <div className={dashStyles.infoBannerV2}>
          <IconInfo size={18} />
          <span>
            Todavía no hay compras cargadas de {mesActual} — los números de abajo están en $0 porque este mes recién empieza.
            Tu importación de ARCA sí se guardó: mirá <strong>Posición por mes</strong> más abajo para ver meses anteriores.
          </span>
        </div>
      )}

      <div className={dashStyles.statCardsRow}>
        <div className={`card ${dashStyles.statCardV2}`}>
          <div className={dashStyles.statCardV2Head}>
            <div className={dashStyles.statCardV2Icon} style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <IconWallet size={19} />
            </div>
            <DeltaBadge value={data.salesIvaDeltaPercent} />
          </div>
          <div className={dashStyles.statCardV2Label}>IVA Ventas</div>
          <div className={dashStyles.statCardV2Value}>{money(data.salesIva ?? 0)}</div>
          {data.salesUpdatedAt && (
            <div className={dashStyles.statCardV2Caption}>Actualizado: {formatDateTime(data.salesUpdatedAt)}</div>
          )}
        </div>

        <div className={`card ${dashStyles.statCardV2}`}>
          <div className={dashStyles.statCardV2Head}>
            <div className={dashStyles.statCardV2Icon} style={{ background: 'var(--blue-light)', color: 'var(--blue-hover)' }}>
              <IconReceipt size={19} />
            </div>
            <DeltaBadge value={data.purchasesIvaDeltaPercent} />
          </div>
          <div className={dashStyles.statCardV2Label}>IVA Compras ({data.purchasesCount ?? 0})</div>
          <div className={dashStyles.statCardV2Value}>{money(data.purchasesIva ?? 0)}</div>
          {data.lastPurchasesImportAt && (
            <div className={dashStyles.statCardV2Caption}>Última importación ARCA: {formatDateTime(data.lastPurchasesImportAt)}</div>
          )}
        </div>

        <div className={`card ${dashStyles.statCardV2}`}>
          <div className={dashStyles.statCardV2Head}>
            <div className={dashStyles.statCardV2Icon} style={{ background: '#fce7f3', color: '#be185d' }}>
              <IconScale size={19} />
            </div>
            <span className={`${dashStyles.deltaBadge} ${owes ? dashStyles.deltaNegative : dashStyles.deltaPositive}`}>
              {owes ? 'A pagar' : 'A favor'}
            </span>
          </div>
          <div className={dashStyles.statCardV2Label}>Posición</div>
          <div className={dashStyles.statCardV2Value} style={{ color: owes ? 'var(--error)' : 'var(--success)' }}>
            {money(Math.abs(position))}
          </div>
        </div>

        <div className={`card ${dashStyles.statCardV2}`}>
          <div className={dashStyles.statCardV2Head}>
            <div className={dashStyles.statCardV2Icon} style={{ background: 'var(--blue-light)', color: 'var(--blue-hover)' }}>
              <IconCalendar size={19} />
            </div>
          </div>
          <div className={dashStyles.statCardV2Label}>Vencimiento</div>
          <div className={dashStyles.statCardV2Value}>{vencimientoGrupo ?? '—'}</div>
          <div className={dashStyles.statCardV2Caption}>Según terminación de CUIT</div>
        </div>
      </div>

      <div className={dashStyles.infoBannerV2}>
        <IconInfo size={18} />
        <span>Estimación informativa. No reemplaza la liquidación oficial ante ARCA.</span>
      </div>

      <div className={dashStyles.withSidePanel}>
        <div className="card" id="posicion-por-mes">
          <div className={dashStyles.tableHeader}>
            <h2 className={dashStyles.sectionTitle}>Posición por mes</h2>
            {vencimientoGrupo && (
              <span className="text-sm text-muted">
                Tu vencimiento: {vencimientoGrupo} (según terminación de CUIT) — {' '}
                <a href="https://www.afip.gob.ar/genericos/guiaDeTramites/calendarioFiscal.asp" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
                  ver fecha exacta ↗
                </a>
              </span>
            )}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>IVA Compras</th>
                  <th>IVA Ventas</th>
                  <th>Posición</th>
                  <th>Vencimiento</th>
                  <th>Descarga</th>
                </tr>
              </thead>
              <tbody>
                {historialLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
                ) : historial.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin datos.</td></tr>
                ) : historialPageRows.map(m => (
                  <tr key={`${m.year}-${m.month}`}>
                    <td>{m.monthLabel} {m.year}</td>
                    <td className="text-sm">
                      <button
                        onClick={() => setDetalle({ tipo: 'compras', year: m.year, month: m.month, monthLabel: m.monthLabel, ivaTotal: m.purchasesIva })}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', textDecoration: 'underline', font: 'inherit' }}
                      >
                        {money(m.purchasesIva)}
                      </button>
                    </td>
                    <td className="text-sm">
                      <button
                        onClick={() => setDetalle({ tipo: 'ventas', year: m.year, month: m.month, monthLabel: m.monthLabel, ivaTotal: m.salesIva })}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', textDecoration: 'underline', font: 'inherit' }}
                      >
                        {money(m.salesIva)}
                      </button>
                    </td>
                    <td className="text-sm" style={{ fontWeight: 700, color: m.position > 0 ? 'var(--error)' : 'var(--success)' }}>
                      {money(Math.abs(m.position))} {m.position > 0 ? '(a pagar)' : '(a favor)'}
                    </td>
                    <td className="text-sm text-muted">{vencimientoGrupo ?? '—'}</td>
                    <td className="text-sm">
                      <a
                        href={`/api/organizacion/iva/export?month=${m.year}-${String(m.month).padStart(2, '0')}`}
                        className="btn btn-outline btn-sm"
                      >
                        <IconDownload size={13} /> CSV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!historialLoading && historial.length > 0 && (
            <div className={dashStyles.tablePagination}>
              <span className="text-muted text-sm">Mostrando {historialPageRows.length} de {historial.length} meses</span>
              {historialPages > 1 && (
                <div className={dashStyles.paginationBtns}>
                  <button type="button" className={dashStyles.pageBtn} onClick={() => setHistorialPage(p => Math.max(1, p - 1))} disabled={historialPage === 1}>‹</button>
                  <span className={dashStyles.pageIndicator}>{historialPage}</span>
                  <button type="button" className={dashStyles.pageBtn} onClick={() => setHistorialPage(p => Math.min(historialPages, p + 1))} disabled={historialPage === historialPages}>›</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={dashStyles.sidePanel}>
          <div className={`card ${dashStyles.sideCard}`}>
            <div className={dashStyles.sideCardHead}>
              <div className={dashStyles.sideCardIcon}><IconInfo size={16} /></div>
              <div className={dashStyles.sideCardTitle}>Información importante</div>
            </div>
            <p className={dashStyles.sideCardBody}>
              El cálculo de la posición de IVA puede verse afectado por ajustes en los comprobantes de ARCA. Te recomendamos revisar periódicamente la carga de comprobantes.
            </p>
            <Link href="/dashboard/tutoriales" className="btn btn-outline btn-sm" style={{ marginTop: '0.9rem', width: '100%', justifyContent: 'center' }}>
              Ver más en documentación →
            </Link>
          </div>

          <div className={`card ${dashStyles.sideCard}`}>
            <div className={dashStyles.sideCardHead}>
              <div className={dashStyles.sideCardIcon}><IconChart size={16} /></div>
              <div className={dashStyles.sideCardTitle}>Resumen {anioActual}</div>
            </div>
            <div className={dashStyles.sideCardRow}><span className="text-muted">IVA Ventas</span><strong>{money(anualVentas)}</strong></div>
            <div className={dashStyles.sideCardRow}><span className="text-muted">IVA Compras</span><strong>{money(anualCompras)}</strong></div>
            <div className={dashStyles.sideCardRow}>
              <span className="text-muted">Posición anual</span>
              <strong style={{ color: anualPosicion > 0 ? 'var(--error)' : 'var(--success)' }}>
                {money(Math.abs(anualPosicion))} {anualPosicion > 0 ? '(a pagar)' : '(a favor)'}
              </strong>
            </div>
            <a href="#posicion-por-mes" className="btn btn-outline btn-sm" style={{ marginTop: '0.9rem', width: '100%', justifyContent: 'center' }}>
              Ver detalle por mes →
            </a>
          </div>
        </div>
      </div>

      {detalle && <IvaDetalleModal detalle={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
