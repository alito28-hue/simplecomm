'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface VentanaFormal {
  label: string;
  from: string;
  to: string;
  total: number;
  categoriaSugerida: string | null;
}

interface MonotributoStatus {
  applicable: boolean;
  reason?: string;
  categoria?: string;
  tope?: number;
  facturacion12m?: number;
  porcentaje?: number;
  level?: 'green' | 'yellow' | 'red' | 'exclusion';
  categoriaEfectiva?: string | null;
  lastSalesImportAt?: string | null;
  topeEfectivo?: number | null;
  porcentajeEfectivo?: number | null;
  topeMaximo?: number;
  ventanaFormal?: VentanaFormal;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatFecha(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const LEVEL_META = {
  green:     { color: 'var(--success)', bg: 'var(--success-bg)', label: '✓ Dentro de tu categoría' },
  yellow:    { color: '#92400e',        bg: 'var(--warning-bg)', label: '⚠ Acercándote al límite' },
  red:       { color: '#fff',           bg: 'var(--error)',      label: '✗ Superaste el tope de tu categoría' },
  exclusion: { color: '#fff',           bg: '#7f1d1d',           label: '⛔ Superaste el tope máximo del Monotributo' },
} as const;

export default function MonotributoStatusCard() {
  const [data, setData] = useState<MonotributoStatus | null>(null);
  const [importing, setImporting] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/dashboard/monotributo-status')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }

  useEffect(load, []);

  async function importarVentas(file: File) {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizacion/iva/importar-emitidos', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo importar el archivo');
      alert(`Importación completa: ${d.rowCount} comprobantes (${d.newCount} nuevos, ${d.updatedCount} actualizados).`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al importar el archivo');
    } finally {
      setImporting(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  }

  if (!data) return null;

  if (!data.applicable) {
    if (data.reason === 'no_categoria') {
      return (
        <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>Posición de Monotributo</h2>
          <p className="text-sm text-muted">
            Configurá tu categoría actual para ver tu posición frente al tope de facturación.{' '}
            <Link href="/dashboard/organizacion/empresa" style={{ color: 'var(--blue)' }}>Configurar categoría →</Link>
          </p>
        </div>
      );
    }
    return null;
  }

  const level = data.level ?? 'green';
  const meta = LEVEL_META[level];
  // Mientras esté dentro de su categoría, se muestra el % contra su propio tope; si ya se
  // pasó (red), se muestra el % contra la categoría efectiva (la que realmente le corresponde).
  const porcentajeMostrado = level === 'red' ? (data.porcentajeEfectivo ?? 0) : (data.porcentaje ?? 0);

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 className={styles.sectionTitle}>Posición de Monotributo — Categoría {data.categoria}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) importarVentas(f); }} />
          <button className={styles.viewAll} style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => csvRef.current?.click()} disabled={importing}>
            {importing ? 'Importando...' : '📥 Importar comprobantes emitidos de ARCA'}
          </button>
          <Link href="/dashboard/organizacion/empresa" className={styles.viewAll}>Cambiar categoría →</Link>
        </div>
      </div>

      {!data.lastSalesImportAt && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', color: '#92400e', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          ⚠ Todavía no importaste tus comprobantes emitidos de ARCA — la facturación de abajo solo cuenta lo emitido desde SimpleComm, y probablemente te falte historial de antes de sumarte.
          Para una estimación correcta: entrá a ARCA → <strong>Mis Comprobantes</strong> → <strong>Emitidos</strong> → filtrá por fecha (los últimos 12 meses) → exportá el CSV, y subilo acá con el botón de arriba.
        </div>
      )}
      {data.lastSalesImportAt && (
        <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
          Última importación de ARCA: {formatFechaHora(data.lastSalesImportAt)}
        </p>
      )}

      <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: meta.bg, color: meta.color, fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>
        {level === 'exclusion' && (
          <>⛔ Tu facturación de los últimos 12 meses ({money(data.facturacion12m ?? 0)}) superó el tope máximo del régimen ({money(data.topeMaximo ?? 0)}, Categoría K). Ya no correspondería seguir en Monotributo — consultá con tu contador o gestor y actualizá tu condición fiscal a Responsable Inscripto en Configuración → Empresa.</>
        )}
        {level === 'red' && (
          <>✗ Superaste el tope de tu Categoría {data.categoria} ({money(data.tope ?? 0)}). Tu categoría real ahora sería <strong>{data.categoriaEfectiva}</strong>, con tope {money(data.topeEfectivo ?? 0)} — llevás usado el {porcentajeMostrado}% de ese nuevo tope. Consultá con tu contador o gestor para recategorizarte.</>
        )}
        {level === 'yellow' && (
          <>⚠ Acercándote al límite de tu Categoría {data.categoria} — llevás usado el {porcentajeMostrado}% del tope anual.</>
        )}
        {level === 'green' && (
          <>✓ Dentro de tu Categoría {data.categoria} — llevás usado el {porcentajeMostrado}% del tope anual.</>
        )}
      </div>

      <div className={styles.statsGrid}>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Facturación últimos 12 meses (móvil)</div>
            <div className={styles.statValue}>{money(data.facturacion12m ?? 0)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{level === 'red' ? `Tope Categoría ${data.categoriaEfectiva}` : `Tope Categoría ${data.categoria}`}</div>
            <div className={styles.statValue}>{money((level === 'red' ? data.topeEfectivo : data.tope) ?? 0)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>% usado del tope</div>
            <div className={styles.statValue} style={{ color: meta.color === '#fff' ? 'var(--error)' : meta.color }}>{porcentajeMostrado}%</div>
          </div>
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 'var(--radius-full)', background: 'var(--surface-low)', marginTop: '1rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(porcentajeMostrado, 100)}%`, background: meta.color === '#fff' ? 'var(--error)' : meta.color, transition: 'width 0.3s' }} />
      </div>

      <p className="text-sm text-muted" style={{ marginTop: '0.85rem' }}>
        Estimación informativa en base a tu facturación real (propia + importada de ARCA), calculada con ventana móvil de 365 días como exige ARCA (no por año calendario). No reemplaza el cálculo oficial.
        {(level === 'red' || level === 'exclusion') && <> Simplecomm no da asesoramiento impositivo.</>}
      </p>

      {data.ventanaFormal && (
        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ fontWeight: 600 }}>{data.ventanaFormal.label} (corte fijo: {formatFecha(data.ventanaFormal.from)} — {formatFecha(data.ventanaFormal.to)})</p>
          <p className="text-sm text-muted" style={{ marginTop: '0.15rem' }}>
            Facturación de ese período: {money(data.ventanaFormal.total)}
            {data.ventanaFormal.categoriaSugerida && data.ventanaFormal.categoriaSugerida !== data.categoria && (
              <> — correspondería a la Categoría {data.ventanaFormal.categoriaSugerida}</>
            )}
            {data.ventanaFormal.categoriaSugerida === data.categoria && <> — dentro de tu categoría actual</>}
            {!data.ventanaFormal.categoriaSugerida && <> — superó el tope máximo del régimen</>}
          </p>
        </div>
      )}
    </div>
  );
}
