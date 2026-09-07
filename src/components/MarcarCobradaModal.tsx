'use client';

import { useEffect, useRef, useState } from 'react';

interface RetencionExtractMeta {
  titulo: string;
  codigoImpuestoAFIP: number | null;
  codigoRegimenAFIP: number | null;
  cuitAgenteRetencion: string;
  alicuota: number | null;
  importeOperacionBase: number | null;
  confidence: string;
  notes: string;
}

export interface PaymentStatus { invoiceId: string; status: 'PENDING' | 'PAID'; paidAt: string | null; source: string | null; paidAmount: number | null; }

interface Props {
  invoiceId: string;
  invoiceNumber: string | null;
  totalAmount: number;
  onClose: () => void;
  onSaved: (updated: PaymentStatus) => void;
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

/**
 * Modal de "Marcar como cobrada" — compartido entre Comprobantes (Emitidos) y Cobranzas, para
 * no duplicar esta lógica (retención de Ganancias sugerida por diferencia bancaria, lectura por
 * IA del comprobante de retención, costos automáticos del cobro para Responsables Inscriptos:
 * percepción de IIBB, Ley 25413 crédito/débito, comisión financiera). Cada consumidor solo se
 * ocupa de refrescar su propia lista cuando `onSaved` dispara.
 */
export default function MarcarCobradaModal({ invoiceId, invoiceNumber, totalAmount, onClose, onSaved }: Props) {
  const [alicuotaIibb, setAlicuotaIibb] = useState(2.5);
  const [isMonotributista, setIsMonotributista] = useState(false);

  const [montoCobrado, setMontoCobrado] = useState(String(totalAmount));
  const [montoTocado, setMontoTocado] = useState(false);
  const [retencion, setRetencion] = useState('0');
  const [retencionManual, setRetencionManual] = useState(false);
  const [tipoImpuesto, setTipoImpuesto] = useState<'SIN_CLASIFICAR' | 'GANANCIAS' | 'IVA' | 'IIBB'>('SIN_CLASIFICAR');
  const [retencionFile, setRetencionFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractMeta, setExtractMeta] = useState<RetencionExtractMeta | null>(null);
  const retencionFileRef = useRef<HTMLInputElement>(null);

  const [iibb, setIibb] = useState('');
  const [iibbManual, setIibbManual] = useState(false);
  const [jurisdiccionIibb, setJurisdiccionIibb] = useState('');
  const [ley25413Credito, setLey25413Credito] = useState('');
  const [ley25413CreditoManual, setLey25413CreditoManual] = useState(false);
  const [ley25413Debito, setLey25413Debito] = useState('');
  const [ley25413DebitoManual, setLey25413DebitoManual] = useState(false);
  const [comisionFinanciera, setComisionFinanciera] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(data => {
        if (data?.alicuotaIibb != null) setAlicuotaIibb(Number(data.alicuotaIibb));
        setIsMonotributista(data?.fiscalTreatment === 'MONOTRIBUTISTA');
      })
      .catch(() => {});
  }, []);

  // La "Retención/percepción de Ganancias" se recalcula sola como total facturado menos la
  // transferencia que efectivamente te acreditaron — NADA MÁS. IIBB, Ley 25413 y la comisión
  // financiera son descuentos que el banco aplica DESPUÉS, sobre esa misma acreditación, y no
  // tienen relación con la retención que practicó quien te pagó — no se restan acá, cada uno
  // se registra en su propio campo. Se detiene si el usuario edita el campo a mano (o subió
  // un comprobante que ya lo fijó).
  useEffect(() => {
    if (retencionManual || extractMeta) return;
    const cobrado = parseFloat(montoCobrado);
    if (!Number.isFinite(cobrado)) { setRetencion('0'); return; }
    const diferencia = totalAmount - cobrado;
    setRetencion(diferencia > 0 ? String(Math.round(diferencia * 100) / 100) : '0');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montoCobrado, retencionManual, extractMeta, totalAmount]);

  // IIBB y Ley 25413 son alícuotas fijas (Ley 25413 siempre 0,6%; IIBB según lo que
  // configuraste en Empresa) — se sugieren solas a partir de la transferencia acreditada,
  // así no hay que buscarlas ni calcularlas a mano en el extracto. Igual quedan editables:
  // si tu banco/jurisdicción aplica otra cosa, se corrige y deja de autocompletarse.
  useEffect(() => {
    if (iibbManual) return;
    const cobrado = parseFloat(montoCobrado);
    if (!Number.isFinite(cobrado) || cobrado <= 0) { setIibb(''); return; }
    setIibb(String(Math.round(cobrado * (alicuotaIibb / 100) * 100) / 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montoCobrado, alicuotaIibb, iibbManual]);

  useEffect(() => {
    if (ley25413CreditoManual) return;
    const cobrado = parseFloat(montoCobrado);
    if (!Number.isFinite(cobrado) || cobrado <= 0) { setLey25413Credito(''); return; }
    setLey25413Credito(String(Math.round(cobrado * 0.006 * 100) / 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montoCobrado, ley25413CreditoManual]);

  useEffect(() => {
    if (ley25413DebitoManual) return;
    const iibbNum = parseFloat(iibb);
    if (!Number.isFinite(iibbNum) || iibbNum <= 0) { setLey25413Debito(''); return; }
    setLey25413Debito(String(Math.round(iibbNum * 0.006 * 100) / 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iibb, ley25413DebitoManual]);

  async function handleRetencionFile(file: File) {
    setRetencionFile(file);
    setExtractError('');
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizacion/retenciones/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo extraer los datos');
      setRetencion(String(data.importe_retenido ?? ''));
      setTipoImpuesto(data.tipo_impuesto ?? 'SIN_CLASIFICAR');
      setExtractMeta({
        titulo: data.titulo ?? '',
        codigoImpuestoAFIP: data.codigo_impuesto_afip ?? null,
        codigoRegimenAFIP: data.codigo_regimen_afip ?? null,
        cuitAgenteRetencion: data.cuit_agente_retencion ?? '',
        alicuota: data.alicuota ?? null,
        importeOperacionBase: data.importe_operacion_base ?? null,
        confidence: data.confidence ?? '',
        notes: data.notes ?? '',
      });
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'Error al extraer los datos. Cargá los datos manualmente.');
    } finally {
      setExtracting(false);
    }
  }

  async function confirmarCobro() {
    setSaving(true);
    try {
      const res = await fetch(`/api/pagos/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          invoiceNumber,
          paidAmount: parseFloat(montoCobrado) || totalAmount,
        }),
      });
      if (!res.ok) return;
      const updated = await res.json();

      const monto = isMonotributista ? 0 : (parseFloat(retencion) || 0);
      if (monto > 0) {
        const fd = new FormData();
        fd.append('monto', String(monto));
        fd.append('tipoImpuesto', tipoImpuesto);
        fd.append('invoiceId', invoiceId);
        if (extractMeta) {
          // Hay comprobante leído por IA: el origen queda como evidencia auditable, con los
          // códigos AFIP que lo respaldan (ver spec_retenciones_percepciones_ganancias.md).
          fd.append('origen', 'COMPROBANTE_RETENCION');
          if (extractMeta.codigoImpuestoAFIP != null) fd.append('codigoImpuestoAFIP', String(extractMeta.codigoImpuestoAFIP));
          if (extractMeta.codigoRegimenAFIP != null) fd.append('codigoRegimenAFIP', String(extractMeta.codigoRegimenAFIP));
          if (extractMeta.cuitAgenteRetencion) fd.append('cuitAgenteRetencion', extractMeta.cuitAgenteRetencion);
          if (extractMeta.alicuota != null) fd.append('alicuota', String(extractMeta.alicuota));
          if (extractMeta.importeOperacionBase != null) fd.append('importeOperacionBase', String(extractMeta.importeOperacionBase));
          if (retencionFile) fd.append('file', retencionFile);
        } else {
          // Sin comprobante: si el usuario eligió el tipo a mano es una clasificación MANUAL
          // confiable; si dejó "Sin clasificar" sobre el monto sugerido por diferencia bancaria,
          // es solo una inferencia (ver spec, Caso 1).
          fd.append('origen', tipoImpuesto === 'SIN_CLASIFICAR' ? 'INFERIDO_BANCO' : 'MANUAL');
        }
        await fetch('/api/organizacion/retenciones', { method: 'POST', body: fd }).catch(() => {});
      }

      const movimientos: { tipo: string; monto: number; jurisdiccionIIBB?: string }[] = [];
      if (!isMonotributista) {
        const iibbNum = parseFloat(iibb) || 0;
        if (iibbNum > 0) movimientos.push({ tipo: 'PERCEPCION_IIBB_BANCO', monto: iibbNum, jurisdiccionIIBB: jurisdiccionIibb || undefined });
        const ley25413c = parseFloat(ley25413Credito) || 0;
        if (ley25413c > 0) movimientos.push({ tipo: 'LEY25413_CREDITO', monto: ley25413c });
        const ley25413d = parseFloat(ley25413Debito) || 0;
        if (ley25413d > 0) movimientos.push({ tipo: 'LEY25413_DEBITO', monto: ley25413d });
        const comision = parseFloat(comisionFinanciera) || 0;
        if (comision > 0) movimientos.push({ tipo: 'COMISION_FINANCIERA', monto: comision });
      }

      await Promise.all(movimientos.map(m => fetch('/api/organizacion/movimientos-cobro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...m, origen: 'MANUAL', invoiceId }),
      }).catch(() => {})));

      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={() => !saving && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Marcar como cobrada</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Facturaste <strong>{formatMoney(totalAmount)}</strong>
          {invoiceNumber ? ` (factura ${invoiceNumber})` : ''}.
          {isMonotributista
            ? ' Poné el monto que te acreditaron.'
            : ' Poné el monto de la transferencia que te acreditaron (la línea de ingreso en tu extracto, antes de cualquier descuento posterior del banco) — la retención de quien te pagó se calcula sola con la diferencia.'}
        </p>
        <label className="text-sm" style={{ display: 'block', marginBottom: '0.75rem' }}>
          Monto de la transferencia acreditada
          <input type="number" step="0.01" className="input" value={montoCobrado}
            style={!montoTocado ? { borderColor: 'var(--warning)', background: 'var(--warning-bg)' } : undefined}
            onChange={e => { setMontoCobrado(e.target.value); setMontoTocado(true); }} />
          {!montoTocado && (
            <span className="text-sm" style={{ display: 'block', color: 'var(--warning)', fontWeight: 600 }}>
              ⚠ Prellenado con el total facturado — confirmalo o corregilo con lo que realmente te transfirieron.
            </span>
          )}
        </label>

        {!isMonotributista && (
          <>
            <label className="text-sm" style={{ display: 'block', marginBottom: '0.75rem' }}>
              Retención/percepción de Ganancias sufrida
              <input type="number" step="0.01" className="input" value={retencion}
                onChange={e => { setRetencion(e.target.value); setRetencionManual(true); setExtractMeta(null); setRetencionFile(null); }} />
              <span className="text-sm text-muted">
                Se calcula sola: total facturado menos la transferencia acreditada. Editala si no aplica.
              </span>
            </label>

            {parseFloat(retencion) > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <input ref={retencionFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleRetencionFile(f); }} />
                {!extractMeta && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => retencionFileRef.current?.click()} disabled={extracting}>
                    {extracting ? 'Leyendo comprobante...' : '📎 Subí el comprobante de retención (opcional, clasifica solo)'}
                  </button>
                )}
                {extractError && <p className="text-sm" style={{ color: 'var(--error)', marginTop: '0.4rem' }}>{extractError}</p>}
                {extractMeta && (
                  <p className="text-sm" style={{ color: 'var(--success)', marginTop: '0.4rem' }}>
                    ✓ Comprobante leído: {extractMeta.titulo || 'retención/percepción'}
                    {extractMeta.codigoImpuestoAFIP != null ? ` (código Impuesto ${extractMeta.codigoImpuestoAFIP})` : ''}.
                    {extractMeta.confidence === 'low' ? ' Confianza baja — revisá el tipo antes de confirmar.' : ''}
                  </p>
                )}
              </div>
            )}

            {parseFloat(retencion) > 0 && (
              <label className="text-sm" style={{ display: 'block' }}>
                ¿De qué impuesto es?{!extractMeta && ' (si lo sabés)'}
                <select className="select" value={tipoImpuesto}
                  onChange={e => setTipoImpuesto(e.target.value as typeof tipoImpuesto)}>
                  <option value="SIN_CLASIFICAR">No sé / sin clasificar</option>
                  <option value="GANANCIAS">Ganancias (RG 830)</option>
                  <option value="IVA">IVA</option>
                  <option value="IIBB">Ingresos Brutos</option>
                </select>
                <span className="text-sm text-muted">
                  {tipoImpuesto === 'GANANCIAS'
                    ? 'Se va a descontar del Impuesto a las Ganancias estimado.'
                    : 'No se descuenta de ningún impuesto automáticamente — solo queda registrada.'}
                </span>
              </label>
            )}

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Costos del cobro (opcional)</p>
              <p className="text-sm text-muted" style={{ marginBottom: '0.6rem' }}>
                Se calculan solos a partir de la transferencia de arriba (IIBB al {alicuotaIibb}% que configuraste
                en Empresa, Ley 25413 al 0,6% fijo) — corregilos si tu extracto muestra otra cosa. Si cobraste en
                efectivo, dejalos en 0. Si cobraste con un cheque que descontaste en una financiera, usá el
                último campo.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <label className="text-sm">Percepción IIBB (banco)
                  <input type="number" step="0.01" className="input" placeholder="0" value={iibb}
                    onChange={e => { setIibb(e.target.value); setIibbManual(true); }} />
                </label>
                <label className="text-sm">Jurisdicción
                  <input className="input" placeholder="Ej: CABA" value={jurisdiccionIibb} onChange={e => setJurisdiccionIibb(e.target.value)} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <label className="text-sm">Ley 25413 (crédito)
                  <input type="number" step="0.01" className="input" placeholder="0" value={ley25413Credito}
                    onChange={e => { setLey25413Credito(e.target.value); setLey25413CreditoManual(true); }} />
                </label>
                <label className="text-sm">Ley 25413 (débito)
                  <input type="number" step="0.01" className="input" placeholder="0" value={ley25413Debito}
                    onChange={e => { setLey25413Debito(e.target.value); setLey25413DebitoManual(true); }} />
                </label>
              </div>
              <label className="text-sm" style={{ display: 'block' }}>
                Comisión por descontar un cheque en una financiera
                <input type="number" step="0.01" className="input" placeholder="0" value={comisionFinanciera} onChange={e => setComisionFinanciera(e.target.value)} />
              </label>
              <span className="text-sm text-muted" style={{ display: 'block', marginTop: '0.4rem' }}>
                La percepción de IIBB se acumula en Posición de IIBB. De Ley 25413 se descuenta de Ganancias
                solo el % computable según tu categoría Pyme (configurable en Empresa). La comisión de la
                financiera y el resto de Ley 25413 se muestran como costo real, aparte del impuesto estimado.
              </span>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={confirmarCobro} disabled={saving}>
            {saving ? 'Guardando...' : 'Confirmar cobro'}
          </button>
        </div>
      </div>
    </div>
  );
}
