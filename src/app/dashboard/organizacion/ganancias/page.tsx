'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../../dashboard.module.css';
import pageStyles from '../clientes/clientes.module.css';
import { IconCart, IconReceipt, IconPercent } from '@/components/LandingIcons';
import { IconBanknote, IconWallet, IconScale, IconInfo } from '@/components/AppIcons';

interface MesGanancia {
  year: number;
  month: number;
  label: string;
  ventasNetas: number;
  comprasNetas: number;
  ganancia: number;
  retencionesPercepciones: number;
  retencionGananciasVentas: number;
  ley25413Computable: number;
  ley25413NoComputable: number;
}

interface AnticipoInfo {
  aplica: boolean;
  ejercicioBase?: string;
  ejercicioBaseAnio?: number;
  baseImponible?: number;
  baseAuto?: number | null;
  baseEsManual?: boolean;
  cantidadCuotas?: number;
  porcentaje?: number;
  montoPorCuota?: number;
  sinEjercicioAnteriorCerrado?: boolean;
}

interface GananciasData {
  applicable: boolean;
  configured?: boolean;
  ejercicio?: { label: string; from: string; to: string; anio?: number };
  ventasNetas?: number;
  comprasNetas?: number;
  ganancia?: number;
  alicuota?: number | null;
  impuestoEstimado?: number | null;
  retenciones?: number;
  percepciones?: number;
  retencionGananciasVentas?: number;
  retencionesVentasSinAplicar?: number;
  ley25413Total?: number;
  ley25413Computable?: number;
  ley25413NoComputable?: number;
  comisionFinanciera?: number;
  porcentajeComputable?: number;
  resultadoRealEstimado?: number;
  saldoAPagar?: number | null;
  saldoAPagarAuto?: number | null;
  saldoAPagarEsManual?: boolean;
  ajusteNotas?: string | null;
  anticipo?: AnticipoInfo;
  meses?: MesGanancia[];
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function GananciasPage() {
  const [data, setData] = useState<GananciasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ejercicio, setEjercicio] = useState(0);
  const [ajusteValor, setAjusteValor] = useState('');
  const [ajusteEditando, setAjusteEditando] = useState(false);
  const [ajusteSaving, setAjusteSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/dashboard/ganancias-position?ejercicio=${ejercicio}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [ejercicio]);

  async function guardarAjuste(anio: number | undefined) {
    if (!anio) return;
    const monto = parseFloat(ajusteValor);
    if (!Number.isFinite(monto)) return;
    setAjusteSaving(true);
    try {
      await fetch('/api/organizacion/ganancias/ajuste-ejercicio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio, impuestoDeterminado: monto }),
      });
      setAjusteEditando(false);
      load();
    } finally {
      setAjusteSaving(false);
    }
  }

  async function borrarAjuste(anio: number | undefined) {
    if (!anio) return;
    setAjusteSaving(true);
    try {
      await fetch(`/api/organizacion/ganancias/ajuste-ejercicio?anio=${anio}`, { method: 'DELETE' });
      setAjusteEditando(false);
      load();
    } finally {
      setAjusteSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={pageStyles.page}>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    );
  }

  if (!data || !data.applicable) {
    return (
      <div className={pageStyles.page}>
        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Posición de Ganancias</h1>
            <p className={pageStyles.pageSubtitle}>Esta sección solo aplica para organizaciones Responsables Inscriptas.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className={pageStyles.page}>
        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Posición de Ganancias</h1>
            <p className={pageStyles.pageSubtitle}>Estimación de ganancia (ventas − compras) e Impuesto a las Ganancias.</p>
          </div>
        </div>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
            Falta configurar el mes de cierre de tu ejercicio fiscal — no todas las empresas cierran en diciembre.
          </p>
          <Link href="/dashboard/organizacion/empresa" className="btn btn-primary btn-sm">Configurar en Empresa →</Link>
        </div>
      </div>
    );
  }

  const ganancia = data.ganancia ?? 0;

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.pageTitle}>Posición de Ganancias</h1>
          <p className={pageStyles.pageSubtitle}>Ganancia estimada (ventas netas − compras netas) e Impuesto a las Ganancias, por ejercicio fiscal.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEjercicio(e => e + 1)}>‹ Ejercicio anterior</button>
          <span className="text-sm" style={{ fontWeight: 600 }}>{data.ejercicio?.label}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setEjercicio(e => Math.max(0, e - 1))} disabled={ejercicio === 0}>
            Ejercicio siguiente ›
          </button>
        </div>
      </div>

      <p className="text-sm text-muted">
        Período: {data.ejercicio && `${formatDate(data.ejercicio.from)} — ${formatDate(data.ejercicio.to)}`}. Ventas y compras se
        toman de <Link href="/dashboard/billing" style={{ color: 'var(--blue)' }}>Comprobantes</Link> y{' '}
        <Link href="/dashboard/organizacion/compras" style={{ color: 'var(--blue)' }}>Compras</Link>, en su monto neto (sin IVA).
      </p>

      <div className={styles.statCardsRow}>
        <div className={`card ${styles.statCardV2}`}>
          <div className={styles.statCardV2Head}>
            <div className={styles.statCardV2Icon} style={{ background: 'var(--blue-light)', color: 'var(--blue-hover)' }}><IconCart size={19} /></div>
          </div>
          <div className={styles.statCardV2Label}>Ventas netas</div>
          <div className={styles.statCardV2Value}>{money(data.ventasNetas ?? 0)}</div>
        </div>
        <div className={`card ${styles.statCardV2}`}>
          <div className={styles.statCardV2Head}>
            <div className={styles.statCardV2Icon} style={{ background: 'var(--surface-low)', color: 'var(--text-secondary)' }}><IconReceipt size={19} /></div>
          </div>
          <div className={styles.statCardV2Label}>Compras netas</div>
          <div className={styles.statCardV2Value}>{money(data.comprasNetas ?? 0)}</div>
        </div>
        <div className={`card ${styles.statCardV2}`}>
          <div className={styles.statCardV2Head}>
            <div className={styles.statCardV2Icon} style={{ background: ganancia >= 0 ? 'var(--success-bg)' : 'var(--error-bg)', color: ganancia >= 0 ? 'var(--success)' : 'var(--error)' }}><IconBanknote size={19} /></div>
          </div>
          <div className={styles.statCardV2Label}>Ganancia estimada</div>
          <div className={styles.statCardV2Value} style={{ color: ganancia >= 0 ? 'var(--success)' : 'var(--error)' }}>{money(ganancia)}</div>
        </div>
        <div className={`card ${styles.statCardV2}`}>
          <div className={styles.statCardV2Head}>
            <div className={styles.statCardV2Icon} style={{ background: '#f1ebff', color: '#8B5CF6' }}><IconPercent size={19} /></div>
          </div>
          <div className={styles.statCardV2Label}>Impuesto estimado{data.alicuota != null && ` (${data.alicuota}%)`}</div>
          <div className={styles.statCardV2Value}>
            {data.alicuota != null ? money(data.impuestoEstimado ?? 0) : (
              <span className="text-sm text-muted" style={{ fontWeight: 400 }}>
                Falta cargar la alícuota en <Link href="/dashboard/organizacion/empresa" style={{ color: 'var(--blue)' }}>Empresa</Link>
              </span>
            )}
          </div>
        </div>
        <div className={`card ${styles.statCardV2}`}>
          <div className={styles.statCardV2Head}>
            <div className={styles.statCardV2Icon} style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><IconWallet size={19} /></div>
          </div>
          <div className={styles.statCardV2Label}>Retención Ganancias sufrida</div>
          <div className={styles.statCardV2Value} style={{ color: 'var(--success)' }}>{money(data.retencionGananciasVentas ?? 0)}</div>
        </div>
        <div className={`card ${styles.statCardV2}`}>
          <div className={styles.statCardV2Head}>
            <div className={styles.statCardV2Icon} style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><IconScale size={19} /></div>
          </div>
          <div className={styles.statCardV2Label}>Crédito Ley 25413 ({Math.round((data.porcentajeComputable ?? 0.33) * 100)}% computable)</div>
          <div className={styles.statCardV2Value} style={{ color: 'var(--success)' }}>{money(data.ley25413Computable ?? 0)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        {data.alicuota != null && (
          <p className="text-sm">
            Saldo estimado si el ejercicio cerrara hoy (impuesto menos retención de Ganancias y el % computable de Ley 25413) —{' '}
            <strong>esto no es un anticipo</strong>, es una proyección del resultado final de este ejercicio en curso:{' '}
            <strong style={{ color: (data.saldoAPagar ?? 0) >= 0 ? 'var(--text-primary)' : 'var(--success)' }}>
              {money(data.saldoAPagar ?? 0)}
            </strong>
          </p>
        )}

        {((data.ley25413NoComputable ?? 0) + (data.comisionFinanciera ?? 0)) > 0 && (
          <p className="text-sm text-muted" style={{ marginTop: '0.4rem' }}>
            Costos reales del cobro, no descontados del impuesto: {money(data.ley25413NoComputable ?? 0)} de Ley 25413
            (parte no computable){(data.comisionFinanciera ?? 0) > 0 && <> + {money(data.comisionFinanciera ?? 0)} de comisiones por descuento de cheques</>}.
            Resultado real estimado (ganancia menos esos costos): <strong>{money(data.resultadoRealEstimado ?? 0)}</strong>.
            Pendiente confirmar con tu contador si son además deducibles de la base imponible.
          </p>
        )}

        {((data.retenciones ?? 0) + (data.percepciones ?? 0) + (data.retencionesVentasSinAplicar ?? 0)) > 0 ? (
          <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--warning)' }}>
            ⚠ Aparte tenés {money((data.retenciones ?? 0) + (data.percepciones ?? 0) + (data.retencionesVentasSinAplicar ?? 0))}{' '}
            en retenciones/percepciones sin clasificar como Ganancias (de Compras, o al cobrar sin indicar el
            impuesto) — esas NO están descontadas arriba. Revisalas con tu contador; si son de Ganancias, marcalas
            como tal la próxima vez que las cargues.
          </p>
        ) : null}
      </div>

      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>Anticipos de Ganancias</h2>
        {data.anticipo?.aplica ? (
          <>
            <p className="text-sm">
              Régimen general ARCA: {data.anticipo.cantidadCuotas} anticipos del {Math.round((data.anticipo.porcentaje ?? 0) * 10000) / 100}%
              sobre el impuesto determinado del <strong>{data.anticipo.ejercicioBase}</strong> (ya cerrado), neto de retenciones y créditos
              computables de ese período — {money(data.anticipo.baseImponible ?? 0)}
              {data.anticipo.baseEsManual ? ' (ajuste cargado por vos)' : ' (estimación de SimpleComm)'}.
            </p>
            <p className="text-sm" style={{ marginTop: '0.5rem' }}>
              Monto estimado por cada anticipo:{' '}
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{money(data.anticipo.montoPorCuota ?? 0)}</strong>
            </p>
            <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
              No calculamos la fecha exacta de cada cuota — depende del vencimiento de la DDJJ de {data.anticipo.ejercicioBase} y tu terminación
              de CUIT. Confirmá el cronograma en el calendario oficial de ARCA o con tu contador.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            {data.anticipo?.sinEjercicioAnteriorCerrado
              ? 'Todavía no hay un ejercicio anterior cerrado con actividad cargada — los anticipos se calculan sobre el impuesto determinado del ejercicio inmediato anterior, así que por ahora no corresponde ninguno (salvo que cargues el ajuste vos mismo abajo).'
              : 'El ejercicio anterior no generó impuesto determinado (o quedó por debajo del mínimo de $2.500), así que no corresponden anticipos para este ejercicio.'}
          </p>
        )}

        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
          {!ajusteEditando ? (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { setAjusteValor(data.anticipo?.baseImponible != null ? String(data.anticipo.baseImponible) : (data.anticipo?.baseAuto != null ? String(data.anticipo.baseAuto) : '')); setAjusteEditando(true); }}
            >
              {data.anticipo?.baseEsManual ? 'Editar ajuste del ' : '¿Tu contador cerró el '}{data.anticipo?.ejercicioBase} con otro monto?
            </button>
          ) : (
            <div>
              <label className="text-sm" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Impuesto determinado real de {data.anticipo?.ejercicioBase} (según tu contador)
                <input type="number" step="0.01" className="input" value={ajusteValor} onChange={e => setAjusteValor(e.target.value)} />
                {data.anticipo?.baseAuto != null && (
                  <span className="text-sm text-muted">Estimación automática de SimpleComm para ese ejercicio: {money(data.anticipo.baseAuto)}.</span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={() => guardarAjuste(data.anticipo?.ejercicioBaseAnio)} disabled={ajusteSaving}>
                  {ajusteSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAjusteEditando(false)} disabled={ajusteSaving}>Cancelar</button>
                {data.anticipo?.baseEsManual && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => borrarAjuste(data.anticipo?.ejercicioBaseAnio)} disabled={ajusteSaving}>
                    Quitar ajuste (volver a la estimación automática)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.infoBannerV2}>
        <IconInfo size={18} />
        <span>
          Estimación informativa. No contempla deducciones especiales, amortizaciones, quebrantos ni otros ajustes
          impositivos — no reemplaza la liquidación oficial ante ARCA. Consultá con tu contador o gestor.
        </span>
      </div>

      {data.meses && data.meses.length > 0 && (
        <div className="card">
          <div className={styles.tableHeader}>
            <h2 className={styles.sectionTitle}>Mes a mes — {data.ejercicio?.label}</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Ventas netas</th>
                  <th>Compras netas</th>
                  <th>Ret./Perc. Compras</th>
                  <th>Ret. Ganancias cobrada</th>
                  <th>Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {data.meses.map(m => (
                  <tr key={`${m.year}-${m.month}`}>
                    <td>{m.label} {m.year}</td>
                    <td className="text-sm">{money(m.ventasNetas)}</td>
                    <td className="text-sm">{money(m.comprasNetas)}</td>
                    <td className="text-sm">{m.retencionesPercepciones > 0 ? money(m.retencionesPercepciones) : '—'}</td>
                    <td className="text-sm">{m.retencionGananciasVentas > 0 ? money(m.retencionGananciasVentas) : '—'}</td>
                    <td className="text-sm" style={{ fontWeight: 700, color: m.ganancia >= 0 ? 'var(--success)' : 'var(--error)' }}>
                      {money(m.ganancia)}
                    </td>
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
