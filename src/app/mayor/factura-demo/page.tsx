'use client';

import { useEffect, useRef, useState } from 'react';
import { suggestFiscalTreatment, getAllowedInvoiceLetters, getDefaultInvoiceLetter, type InvoiceLetter } from '@/lib/fiscal';
import styles from './factura-demo.module.css';

interface PadronData {
  cuil: string;
  nombre: string;
  tipoPersona: string;
  estadoClave: string;
  domicilio?: { direccion?: string; localidad?: string; provincia?: string; codPostal?: string };
  monotributo?: boolean;
  ivaCondition?: 'INSCRIPTO' | 'EXENTO' | null;
}

type PadronStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

function domicilioStr(d?: PadronData['domicilio']): string {
  if (!d) return '';
  return [d.direccion, d.localidad, d.provincia].filter(Boolean).join(', ');
}

function usePadronLookup(cuit: string) {
  const [status, setStatus] = useState<PadronStatus>('idle');
  const [data, setData] = useState<PadronData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clean = cuit.replace(/\D/g, '');
    if (timer.current) clearTimeout(timer.current);
    if (clean.length !== 11) {
      setStatus('idle');
      setData(null);
      return;
    }
    timer.current = setTimeout(async () => {
      setStatus('loading');
      try {
        const res = await fetch(`/api/padron/${clean}`);
        if (res.status === 404) { setStatus('not_found'); setData(null); return; }
        if (!res.ok) { setStatus('error'); setData(null); return; }
        const info: PadronData = await res.json();
        setData(info);
        setStatus('found');
      } catch {
        setStatus('error');
        setData(null);
      }
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [cuit]);

  return { status, data };
}

export default function FacturaDemoPage() {
  const [emisorCuit, setEmisorCuit] = useState('');
  const [emisorName, setEmisorName] = useState('');
  const [emisorAddress, setEmisorAddress] = useState('');
  const emisorPadron = usePadronLookup(emisorCuit);

  const [receptorDocType, setReceptorDocType] = useState<'CUIT' | 'CUIL' | 'DNI' | 'CONSUMIDOR_FINAL'>('CUIT');
  const [receptorDocNumber, setReceptorDocNumber] = useState('');
  const [receptorName, setReceptorName] = useState('');
  const [receptorAddress, setReceptorAddress] = useState('');
  const receptorLookupCuit = (receptorDocType === 'CUIT' || receptorDocType === 'CUIL') ? receptorDocNumber : '';
  const receptorPadron = usePadronLookup(receptorLookupCuit);

  const [amount, setAmount] = useState('');
  const [letter, setLetter] = useState<InvoiceLetter>('B');
  const [letterTouched, setLetterTouched] = useState(false);
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ invoice_number: string; amount_total: number } | null>(null);

  // Autocompletar nombre del emisor al encontrarlo en el Padrón, y sugerir la letra
  // permitida según su condición fiscal (monotributo → solo C, etc.) — sin pisar una
  // elección manual que ya hizo el usuario.
  useEffect(() => {
    if (emisorPadron.status !== 'found' || !emisorPadron.data) return;
    setEmisorName(prev => prev.trim() ? prev : emisorPadron.data!.nombre);
    setEmisorAddress(prev => prev.trim() ? prev : domicilioStr(emisorPadron.data!.domicilio));
    if (!letterTouched) {
      const treatment = suggestFiscalTreatment(emisorPadron.data);
      setLetter(getDefaultInvoiceLetter(treatment));
    }
  }, [emisorPadron.status, emisorPadron.data, letterTouched]);

  useEffect(() => {
    if (receptorPadron.status !== 'found' || !receptorPadron.data) return;
    setReceptorName(prev => prev.trim() ? prev : receptorPadron.data!.nombre);
    setReceptorAddress(prev => prev.trim() ? prev : domicilioStr(receptorPadron.data!.domicilio));
  }, [receptorPadron.status, receptorPadron.data]);

  const allowedLetters = getAllowedInvoiceLetters(
    emisorPadron.data ? suggestFiscalTreatment(emisorPadron.data) : null
  );

  const cleanEmisorCuit = emisorCuit.replace(/\D/g, '');
  const canSubmit = emisorName.trim().length > 1 && cleanEmisorCuit.length === 11
    && receptorName.trim().length > 0 && Number(amount) > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/mayor/demo-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emisor: {
            name: emisorName.trim(),
            cuit: cleanEmisorCuit,
            address: emisorAddress.trim() || undefined,
          },
          receptor: {
            name: receptorName.trim(),
            doc_type: receptorDocType,
            doc_number: receptorDocType === 'CONSUMIDOR_FINAL' ? '0' : receptorDocNumber.replace(/\D/g, ''),
            address: receptorAddress.trim() || undefined,
          },
          invoice_letter: letter,
          amount: Number(amount),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error generando el comprobante');
        return;
      }

      const pdfBytes = Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-demo-${letter}-${data.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setResult({ invoice_number: data.invoice_number, amount_total: data.amount_total });
    } catch {
      setError('No se pudo conectar con el servidor. Reintentá en unos segundos.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Factura de Demo</h1>
        <p className={styles.subtitle}>
          Generá un comprobante de ejemplo (CAE ficticio, no autorizado por ARCA) para mostrarle
          a un prospecto en una demo o video. El QR del PDF lleva a la página de verificación
          de SimpleComm, no a ARCA real.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className={`card ${styles.section}`}>
          <div className={styles.sectionTitle}>Empresa que emite</div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>CUIT</label>
              <input
                className="input"
                value={emisorCuit}
                onChange={e => setEmisorCuit(e.target.value)}
                placeholder="30715819933"
                maxLength={11}
              />
              {emisorPadron.status === 'loading' && <span className={styles.padronLoading}>Consultando Padrón ARCA...</span>}
              {emisorPadron.status === 'found' && <span className={styles.padronFound}>✓ {emisorPadron.data?.nombre}</span>}
              {emisorPadron.status === 'not_found' && <span className={styles.padronHint}>No encontrado en el Padrón — completá manualmente.</span>}
            </div>
            <div className={styles.field}>
              <label>Razón Social</label>
              <input className="input" value={emisorName} onChange={e => setEmisorName(e.target.value)} placeholder="Digital Sistemas S.A." />
            </div>
          </div>
          <div className={styles.field}>
            <label>Domicilio (opcional)</label>
            <input className="input" value={emisorAddress} onChange={e => setEmisorAddress(e.target.value)} />
          </div>
        </div>

        <div className={`card ${styles.section}`}>
          <div className={styles.sectionTitle}>Cliente a quien se le emite</div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>Tipo de documento</label>
              <select className="select" value={receptorDocType} onChange={e => setReceptorDocType(e.target.value as typeof receptorDocType)}>
                <option value="CUIT">CUIT</option>
                <option value="CUIL">CUIL</option>
                <option value="DNI">DNI</option>
                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
              </select>
            </div>
            {receptorDocType !== 'CONSUMIDOR_FINAL' && (
              <div className={styles.field}>
                <label>Número de documento</label>
                <input className="input" value={receptorDocNumber} onChange={e => setReceptorDocNumber(e.target.value)} placeholder="30715371622" />
                {receptorPadron.status === 'loading' && <span className={styles.padronLoading}>Consultando Padrón ARCA...</span>}
                {receptorPadron.status === 'found' && <span className={styles.padronFound}>✓ {receptorPadron.data?.nombre}</span>}
                {receptorPadron.status === 'not_found' && <span className={styles.padronHint}>No encontrado — completá manualmente.</span>}
              </div>
            )}
          </div>
          <div className={styles.field}>
            <label>Nombre / Razón Social</label>
            <input className="input" value={receptorName} onChange={e => setReceptorName(e.target.value)} placeholder="Consumidor Final" />
          </div>
          <div className={styles.field}>
            <label>Domicilio (opcional)</label>
            <input className="input" value={receptorAddress} onChange={e => setReceptorAddress(e.target.value)} />
          </div>
        </div>

        <div className={`card ${styles.section}`}>
          <div className={styles.sectionTitle}>Comprobante</div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>Monto total</label>
              <input className="input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5961895.00" />
            </div>
            <div className={styles.field}>
              <label>Tipo de factura</label>
              <div className={styles.letterRow}>
                {(['A', 'B', 'C'] as InvoiceLetter[]).map(l => (
                  <button
                    key={l}
                    type="button"
                    disabled={!allowedLetters.includes(l)}
                    className={`${styles.letterBtn} ${letter === l ? styles.letterBtnActive : ''}`}
                    onClick={() => { setLetter(l); setLetterTouched(true); }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.field}>
            <label>Descripción (opcional)</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Venta" />
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {submitting ? 'Generando...' : 'Generar y descargar PDF'}
          </button>
        </div>

        {result && (
          <div className={`card ${styles.result}`}>
            <span className={styles.resultText}>
              ✓ Comprobante {letter} {result.invoice_number} por ${result.amount_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })} descargado.
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
