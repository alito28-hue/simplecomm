'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ContactPicker, { type ContactOption } from '@/components/ContactPicker';
import { getAllowedInvoiceLetters, getDefaultInvoiceLetter, type InvoiceLetter } from '@/lib/fiscal';
import styles from './manual.module.css';

type PadronStatus = 'idle' | 'loading' | 'found' | 'multiple' | 'not_found' | 'error';

interface PadronData {
  cuil: string;
  nombre: string;
  tipoPersona: string;
  estadoClave: string;
  domicilio?: { localidad?: string; provincia?: string; };
}

const LETTER_INFO = {
  A: { label: 'Factura A', desc: 'Resp. Inscripto → Resp. Inscripto. IVA discriminado. Requiere CUIT del receptor.' },
  B: { label: 'Factura B', desc: 'Para consumidores finales o compradores con DNI/CUIL. IVA incluido.' },
  C: { label: 'Factura C', desc: 'Para monotributistas. Sin IVA.' },
};

const IVA_RATES = [
  { id: 'IVA_21',   label: 'IVA 21%',   rate: 0.21 },
  { id: 'IVA_10_5', label: 'IVA 10,5%', rate: 0.105 },
  { id: 'EXENTO',   label: 'Exento',    rate: 0 },
];

const DOC_TYPES_BC = ['CUIT', 'CUIL', 'DNI', 'CONSUMIDOR_FINAL'];

interface Item { description: string; quantity: number; unitPrice: number; ivaRate: string; }

function PersonaCard({ data }: { data: PadronData }) {
  const activo = data.estadoClave === 'ACTIVO';
  const lugar = [data.domicilio?.localidad, data.domicilio?.provincia].filter(Boolean).join(', ');
  return (
    <div className={`${styles.personaCard} ${!activo ? styles.personaCardWarn : ''}`}>
      <div className={styles.personaName}>{activo ? '✓' : '⚠'} {data.nombre}</div>
      <div className={styles.personaMeta}>
        <span>{data.tipoPersona === 'FISICA' ? 'Persona Física' : 'Persona Jurídica'}</span>
        <span className={activo ? styles.metaActivo : styles.metaInactivo}>{data.estadoClave}</span>
        {lugar && <span>{lugar}</span>}
      </div>
      {!activo && <p className={styles.personaWarnText}>Este CUIL figura como {data.estadoClave} en AFIP. Verificá antes de emitir.</p>}
    </div>
  );
}

export default function FacturacionManualPage() {
  const [letter, setLetter] = useState<InvoiceLetter>('B');
  const [allowedLetters, setAllowedLetters] = useState<InvoiceLetter[]>(['A', 'B', 'C']);
  const [buyer, setBuyer] = useState({ fullName: '', docType: 'CONSUMIDOR_FINAL', docNumber: '' });
  const [padronData, setPadronData] = useState<PadronData | null>(null);
  const [padronCandidates, setPadronCandidates] = useState<PadronData[]>([]);
  const [padronStatus, setPadronStatus] = useState<PadronStatus>('idle');
  const [resolvedCuil, setResolvedCuil] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unitPrice: 0, ivaRate: 'IVA_21' }]);
  const [concept, setConcept] = useState('1');
  const [serviceDateFrom, setServiceDateFrom] = useState('');
  const [serviceDateTo, setServiceDateTo] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [currency, setCurrency] = useState<'PES' | 'DOL'>('PES');
  const [exchangeRate, setExchangeRate] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ invoiceNumber: string; cae: string; pdfBase64: string; emailSent?: boolean } | null>(null);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPadronRef = useRef(false);
  const searchParams = useSearchParams();

  // Filtrar tipos de comprobante según la condición fiscal de la organización
  useEffect(() => {
    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(data => {
        const allowed = getAllowedInvoiceLetters(data?.fiscalTreatment);
        setAllowedLetters(allowed);
        setLetter(prev => allowed.includes(prev) ? prev : getDefaultInvoiceLetter(data?.fiscalTreatment));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const name = searchParams.get('name');
    const docType = searchParams.get('docType');
    const docNumber = searchParams.get('docNumber');
    const email = searchParams.get('email');
    if (name || docNumber) {
      skipPadronRef.current = true;
      setBuyer(b => ({ ...b, fullName: name ?? b.fullName, docType: docType ?? b.docType, docNumber: docNumber ?? b.docNumber }));
      if (email) { setRecipientEmail(email); setSendEmail(true); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetPadron() {
    setPadronData(null); setPadronCandidates([]); setResolvedCuil(null); setPadronStatus('idle');
  }

  function changeLetter(l: InvoiceLetter) {
    setLetter(l); setError(''); setResult(null); resetPadron();
    setBuyer(l === 'A'
      ? b => ({ ...b, docType: 'CUIT', docNumber: '', fullName: '' })
      : b => ({ ...b, docType: 'CONSUMIDOR_FINAL', docNumber: '', fullName: '' })
    );
  }

  function handleContactSelect(c: ContactOption) {
    skipPadronRef.current = true;
    setBuyer(b => ({ ...b, fullName: c.businessName, docType: c.docType, docNumber: c.docNumber }));
    if (c.emailContact) { setRecipientEmail(c.emailContact); setSendEmail(true); }
    setPadronData(null); setPadronCandidates([]); setResolvedCuil(null); setPadronStatus('idle');
  }

  useEffect(() => {
    if (skipPadronRef.current) { skipPadronRef.current = false; return; }
    const clean = buyer.docNumber.replace(/[-\s]/g, '');
    const isCuil = clean.length === 11;
    const isDni  = clean.length >= 7 && clean.length <= 8 && (letter === 'A' || buyer.docType === 'CUIT' || buyer.docType === 'CUIL' || buyer.docType === 'DNI');

    if (!isCuil && !isDni) { resetPadron(); return; }

    // Para DNI solo buscamos si el tipo es DNI (o si la longitud es correcta)
    const canLookupDni = isDni && (letter === 'A' || buyer.docType === 'CUIT' || buyer.docType === 'CUIL' || buyer.docType === 'DNI');

    if (!isCuil && !canLookupDni) { resetPadron(); return; }

    setPadronStatus('loading');
    setPadronData(null); setPadronCandidates([]); setResolvedCuil(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        if (isCuil) {
          const res = await fetch(`/api/padron/${clean}`);
          const data = await res.json();
          if (res.ok && data.nombre) {
            setBuyer(b => ({ ...b, fullName: data.nombre }));
            setPadronData({ ...data, cuil: clean });
            setPadronStatus('found');
          } else {
            setPadronStatus(res.status === 404 ? 'not_found' : 'error');
          }
        } else {
          const res = await fetch(`/api/padron/dni/${clean}`);
          const data = await res.json();
          if (res.ok) {
            const { resultados } = data as { resultados: PadronData[] };
            if (resultados.length === 1) {
              setBuyer(b => ({ ...b, fullName: resultados[0].nombre }));
              setPadronData(resultados[0]);
              setResolvedCuil(resultados[0].cuil);
              setPadronStatus('found');
            } else if (resultados.length > 1) {
              setPadronCandidates(resultados);
              setPadronStatus('multiple');
            } else {
              setPadronStatus('not_found');
            }
          } else {
            setPadronStatus(res.status === 404 ? 'not_found' : 'error');
          }
        }
      } catch { setPadronStatus('error'); }
    }, 700);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [buyer.docNumber, buyer.docType, letter]);

  function selectCandidate(c: PadronData) {
    setBuyer(b => ({ ...b, fullName: c.nombre }));
    setPadronData(c); setResolvedCuil(c.cuil);
    setPadronCandidates([]); setPadronStatus('found');
  }

  function addItem() { setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, ivaRate: 'IVA_21' }]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof Item, value: string | number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  // Total que paga el cliente (con IVA incluido) — para mostrar en pantalla.
  function calcTotal() {
    return items.reduce((sum, it) => {
      const rate = letter === 'C' ? 0 : (IVA_RATES.find(r => r.id === it.ivaRate)?.rate ?? 0.21);
      return sum + (it.quantity * it.unitPrice * (1 + rate));
    }, 0);
  }

  // Total neto (sin IVA) — es lo que espera el Gateway para Factura A.
  // Para B/C en cambio se envía el total con IVA incluido (calcTotal).
  function calcNetoTotal() {
    return items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
  }

  // El Gateway solo soporta una alícuota de IVA por comprobante. Si los ítems
  // mezclan alícuotas distintas, no hay forma correcta de facturarlos juntos acá.
  function getConsistentIvaRate(): { rate: string | null; error: string | null } {
    const withPrice = items.filter(it => it.description && it.unitPrice > 0);
    const rates = new Set(withPrice.map(it => it.ivaRate));
    if (rates.size > 1) {
      return { rate: null, error: 'Los ítems tienen alícuotas de IVA distintas — no se pueden facturar juntos en un mismo comprobante. Separalos en facturas distintas por alícuota.' };
    }
    return { rate: withPrice[0]?.ivaRate ?? 'IVA_21', error: null };
  }

  function getDocLabel() {
    if (letter === 'A') return 'N° CUIT *';
    switch (buyer.docType) {
      case 'CUIT': return 'N° CUIT';
      case 'CUIL': return 'N° CUIL';
      case 'DNI':  return 'N° DNI';
      default:     return 'N° documento';
    }
  }

  async function submit() {
    if (!items.some(it => it.description && it.unitPrice > 0)) {
      setError('Agregá al menos un ítem con descripción y precio.'); return;
    }
    if (letter === 'A' && !buyer.docNumber.replace(/\D/g, '')) {
      setError('Factura A requiere el CUIT del receptor.'); return;
    }
    if (currency !== 'PES' && (!exchangeRate || parseFloat(exchangeRate) <= 1)) {
      setError('Ingresá la cotización del día para facturar en moneda distinta a pesos.'); return;
    }
    const ivaCheck = letter !== 'C' ? getConsistentIvaRate() : { rate: null, error: null };
    if (ivaCheck.error) { setError(ivaCheck.error); return; }

    setLoading(true); setError('');
    try {
      const clean = buyer.docNumber.replace(/\D/g, '');
      const effectiveDoc  = resolvedCuil ?? (buyer.docType !== 'CONSUMIDOR_FINAL' ? clean : undefined);
      const effectiveType = letter === 'A' ? 'CUIT'
        : resolvedCuil ? 'CUIL'
        : buyer.docType;
      const ivaRatePct = ivaCheck.rate ? (IVA_RATES.find(r => r.id === ivaCheck.rate)?.rate ?? 0.21) * 100 : 0;

      const res = await fetch('/api/invoices/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Factura A: el Gateway espera el monto NETO (sin IVA). B/C: el total con IVA incluido.
          amount:         Math.round((letter === 'A' ? calcNetoTotal() : calcTotal()) * 100) / 100,
          description:    items.map(it => `${it.description} x${it.quantity}`).join(', '),
          invoiceLetter:  letter,
          ivaRate:        letter === 'C' ? 0 : ivaRatePct,
          docNumber:      effectiveDoc,
          docType:        effectiveType,
          buyerName:      buyer.fullName || 'Consumidor Final',
          concept:        parseInt(concept),
          serviceDateFrom: concept !== '1' ? serviceDateFrom : undefined,
          serviceDateTo:   concept !== '1' ? serviceDateTo : undefined,
          paymentDueDate:  concept !== '1' ? paymentDueDate : undefined,
          currency,
          exchangeRate: currency !== 'PES' ? parseFloat(exchangeRate) : undefined,
          recipientEmail: sendEmail && recipientEmail ? recipientEmail : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  }

  function downloadPdf() {
    if (!result?.pdfBase64) return;
    const bytes = atob(result.pdfBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = `factura-${result.invoiceNumber}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  if (result) return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Factura Emitida ✅</h1>
      <div className={`card ${styles.successCard}`}>
        <div className={styles.successRows}>
          <div><span>N° Comprobante</span><strong className="mono">{result.invoiceNumber}</strong></div>
          <div><span>CAE</span><strong className="mono">{result.cae}</strong></div>
        </div>
        {result.emailSent && <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginBottom: '1rem' }}>✉ Comprobante enviado a {recipientEmail}</p>}
        <div className={styles.successActions}>
          <button className="btn btn-primary" onClick={downloadPdf}>⬇ Descargar PDF</button>
          <button className="btn btn-outline" onClick={() => setResult(null)}>Emitir otra</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Comprobante Manual</h1>
      {error && <div className={styles.error}>{error}</div>}

      <div className="card" style={{ padding: '1.25rem' }}>
        <div className={styles.letterSelector}>
          {allowedLetters.map(l => (
            <button key={l} type="button" onClick={() => changeLetter(l)}
              className={`${styles.letterBtn} ${letter === l ? styles.letterActive : ''}`}>
              <span className={styles.letterCode}>{l}</span>
              <span className={styles.letterName}>{LETTER_INFO[l].label}</span>
            </button>
          ))}
        </div>
        <p className={styles.letterDesc}>{LETTER_INFO[letter].desc}</p>
      </div>

      <div className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Datos del receptor</h2>

        <div className={styles.grid3}>
          {letter !== 'A' && (
            <div className={styles.field}>
              <label>Tipo documento</label>
              <select className="select" value={buyer.docType}
                onChange={e => {
                  setBuyer(b => ({ ...b, docType: e.target.value, docNumber: '', fullName: '' }));
                  resetPadron();
                }}>
                {DOC_TYPES_BC.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          )}

          <div className={styles.field}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getDocLabel()}
              <ContactPicker onSelect={handleContactSelect} />
            </label>
            <input
              className="input"
              value={buyer.docNumber}
              onChange={e => setBuyer(b => ({ ...b, docNumber: e.target.value }))}
              placeholder={letter === 'A' ? '30-12345678-9' : buyer.docType === 'DNI' ? '12345678' : '20-12345678-9'}
              disabled={buyer.docType === 'CONSUMIDOR_FINAL' && letter !== 'A'}
              required={letter === 'A'}
            />
            {padronStatus === 'loading'   && <span className={styles.padronHint}>Consultando Padrón AFIP...</span>}
            {padronStatus === 'not_found' && <span className={styles.padronWarn}>No encontrado en el Padrón AFIP</span>}
            {padronStatus === 'error'     && <span className={styles.padronHint}>No se pudo consultar el Padrón</span>}
          </div>

          <div className={styles.field}>
            <label>Nombre / Razón social{letter === 'A' ? ' *' : ''}</label>
            <input
              className="input"
              value={buyer.fullName}
              onChange={e => setBuyer(b => ({ ...b, fullName: e.target.value }))}
              placeholder="Ej: GARCIA, MARTIN"
              required={letter === 'A'}
              disabled={buyer.docType === 'CONSUMIDOR_FINAL' && letter !== 'A'}
            />
          </div>
        </div>

        {/* Picker múltiple */}
        {padronStatus === 'multiple' && padronCandidates.length > 0 && (
          <div className={styles.candidatePicker}>
            <p className={styles.pickerLabel}>Encontramos {padronCandidates.length} personas con ese DNI. ¿Cuál es?</p>
            {padronCandidates.map(c => (
              <button key={c.cuil} type="button"
                className={`${styles.candidateBtn} ${resolvedCuil === c.cuil ? styles.candidateBtnActive : ''}`}
                onClick={() => selectCandidate(c)}>
                {c.nombre} · {c.tipoPersona === 'FISICA' ? 'Persona Física' : 'Empresa'}
              </button>
            ))}
          </div>
        )}

        {/* Tarjeta de confirmación */}
        {padronStatus === 'found' && padronData && <PersonaCard data={padronData} />}

        <div className={styles.grid3} style={{ marginTop: '1rem' }}>
          <div className={styles.field}>
            <label>Concepto</label>
            <select className="select" value={concept} onChange={e => setConcept(e.target.value)}>
              <option value="1">Productos</option>
              <option value="2">Servicios</option>
              <option value="3">Productos y Servicios</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Moneda</label>
            <select className="select" value={currency} onChange={e => setCurrency(e.target.value as 'PES' | 'DOL')}>
              <option value="PES">Pesos (ARS)</option>
              <option value="DOL">Dólares (USD)</option>
            </select>
          </div>
          {currency !== 'PES' && (
            <div className={styles.field}>
              <label>Cotización del día *</label>
              <input className="input" type="number" step="0.0001" min="1" value={exchangeRate}
                onChange={e => setExchangeRate(e.target.value)} placeholder="Ej: 1234.5678" />
            </div>
          )}
        </div>
        {currency !== 'PES' && (
          <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
            Los importes de los ítems se facturan en la moneda elegida (no se convierten). La cotización es solo informativa para ARCA.
          </p>
        )}

        {concept !== '1' && (
          <div className={styles.grid3} style={{ marginTop: '1rem' }}>
            <div className={styles.field}>
              <label>Período facturado desde</label>
<input className="input" type="date" value={serviceDateFrom} onChange={e => setServiceDateFrom(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>Período facturado hasta</label>
<input className="input" type="date" value={serviceDateTo} onChange={e => setServiceDateTo(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>Vencimiento para el pago</label>
<input className="input" type="date" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} required />
            </div>
          </div>
        )}
      </div>

      <div className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Detalle de ítems</h2>
        {items.map((it, i) => (
          <div key={i} className={styles.itemRow}>
            <div className={styles.field} style={{ flex: 3 }}>
              <label>Descripción</label>
              <input className="input" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} />
            </div>
            <div className={styles.field} style={{ flex: 1 }}>
              <label>Cantidad</label>
              <input className="input" type="number" min="1" value={it.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 1)} />
            </div>
            <div className={styles.field} style={{ flex: 1.5 }}>
              <label>Precio unitario</label>
              <input className="input" type="number" step="0.01" min="0" value={it.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
            </div>
            {letter !== 'C' && (
              <div className={styles.field} style={{ flex: 1.5 }}>
                <label>IVA</label>
                <select className="select" value={it.ivaRate} onChange={e => updateItem(i, 'ivaRate', e.target.value)}>
                  {IVA_RATES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            )}
            {items.length > 1 && (
              <button type="button" className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-end', color: 'var(--error)' }} onClick={() => removeItem(i)}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>+ Agregar ítem</button>
        <div className={styles.total}>
          <strong>Total{letter === 'C' ? '' : ' (con IVA)'}:</strong>
          <strong>${calcTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div className={styles.emailRow}>
          <span className={styles.emailLabel}>Enviar comprobante por email</span>
          <label className={styles.toggle}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
            <span className={styles.slider} />
          </label>
        </div>
        {sendEmail && (
          <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
            placeholder="email@destino.com" className="input" style={{ marginTop: '0.5rem' }} required />
        )}
      </div>

      <div className={styles.formActions}>
        <button className="btn btn-primary btn-lg" onClick={submit} disabled={loading}>
          {loading ? 'Emitiendo...' : `Emitir ${LETTER_INFO[letter].label}`}
        </button>
      </div>
    </div>
  );
}
