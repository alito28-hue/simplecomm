'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ContactPicker, { type ContactOption } from '@/components/ContactPicker';
import ProductPicker, { type ProductOption } from '@/components/ProductPicker';
import { getAllowedInvoiceLetters, getDefaultInvoiceLetter, type InvoiceLetter } from '@/lib/fiscal';
import styles from './simplificada.module.css';

const IVA_RATE_PCT: Record<string, number> = {
  EXENTO: 0, NO_GRAVADO: 0, IVA_2_5: 2.5, IVA_5: 5, IVA_10_5: 10.5, IVA_21: 21, IVA_27: 27,
};

type PadronStatus = 'idle' | 'loading' | 'found' | 'multiple' | 'not_found' | 'error';

interface PadronData {
  cuil: string;
  nombre: string;
  tipoPersona: string;
  estadoClave: string;
  domicilio?: { localidad?: string; provincia?: string; };
}

const LETTER_INFO = {
  A: { label: 'Factura A', desc: 'Para clientes con CUIT (Resp. Inscripto → Resp. Inscripto). IVA discriminado.', inputLabel: 'Monto neto (sin IVA)' },
  B: { label: 'Factura B', desc: 'Para consumidores finales. IVA incluido en el precio.', inputLabel: 'Monto final (IVA incluido)' },
  C: { label: 'Factura C', desc: 'Para monotributistas. Sin IVA.', inputLabel: 'Monto total' },
};

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

export default function FacturacionSimplificadaPage() {
  const [letter, setLetter] = useState<InvoiceLetter>('B');
  const [allowedLetters, setAllowedLetters] = useState<InvoiceLetter[]>(['A', 'B', 'C']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ invoiceNumber: string; cae: string; caeDueDate: string; pdfBase64: string; emailSent?: boolean } | null>(null);
  const [error, setError] = useState('');

  const [docNumber, setDocNumber] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [padronData, setPadronData] = useState<PadronData | null>(null);
  const [padronCandidates, setPadronCandidates] = useState<PadronData[]>([]);
  const [padronStatus, setPadronStatus] = useState<PadronStatus>('idle');
  const [resolvedCuil, setResolvedCuil] = useState<string | null>(null);

  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const amountRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const ivaRateRef = useRef<HTMLSelectElement>(null);

  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPadronRef = useRef(false);
  const searchParams = useSearchParams();
  const info = LETTER_INFO[letter];

  function applyProduct(p: ProductOption, qty: number, currentLetter: InvoiceLetter) {
    const ivaPct = IVA_RATE_PCT[p.ivaRate] ?? 21;
    const netTotal = Number(p.netPrice) * qty;
    const amount = currentLetter === 'B' ? netTotal * (1 + ivaPct / 100) : netTotal;
    if (amountRef.current) amountRef.current.value = amount.toFixed(2);
    if (descRef.current) descRef.current.value = qty === 1 ? p.description : `${p.description} x${qty}`;
  }

  function handleProductSelect(p: ProductOption) {
    setSelectedProduct(p);
    setQuantity(1);
    applyProduct(p, 1, letter);
  }

  function handleQuantityChange(qty: number) {
    setQuantity(qty);
    if (selectedProduct) applyProduct(selectedProduct, qty, letter);
  }

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

  // Pre-fill from contact "Emitir factura" link
  useEffect(() => {
    const name = searchParams.get('name');
    const dt   = searchParams.get('docType');
    const dn   = searchParams.get('docNumber');
    const em   = searchParams.get('email');
    if (name || dn) {
      skipPadronRef.current = true;
      if (name) setBuyerName(name);
      if (dn)   setDocNumber(dn);
      if (em)   { setRecipientEmail(em); setSendEmail(true); }
      setPadronStatus('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const clean = docNumber.replace(/[-\s]/g, '');

    if (skipPadronRef.current) { skipPadronRef.current = false; return; }

    if (clean.length < 7) {
      setPadronStatus('idle'); setPadronData(null);
      setPadronCandidates([]); setResolvedCuil(null);
      return;
    }

    const isCuil = clean.length === 11;
    const isDni  = clean.length >= 7 && clean.length <= 8 && letter !== 'A';

    if (!isCuil && !isDni) return;

    setPadronStatus('loading');
    setPadronData(null); setPadronCandidates([]); setResolvedCuil(null); setBuyerName('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        if (isCuil) {
          const res = await fetch(`/api/padron/${clean}`);
          const data = await res.json();
          if (res.ok && data.nombre) {
            setBuyerName(data.nombre);
            setPadronData({ ...data, cuil: clean });
            setPadronStatus('found');
          } else {
            setPadronStatus(res.status === 404 ? 'not_found' : 'error');
          }
        } else {
          // DNI lookup via a4
          const res = await fetch(`/api/padron/dni/${clean}`);
          const data = await res.json();
          if (res.ok) {
            const { resultados } = data as { resultados: PadronData[] };
            if (resultados.length === 1) {
              setBuyerName(resultados[0].nombre);
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
      } catch {
        setPadronStatus('error');
      }
    }, 700);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [docNumber, letter]);

  function handleContactSelect(c: ContactOption) {
    skipPadronRef.current = true;
    setDocNumber(c.docNumber);
    setBuyerName(c.businessName);
    if (c.emailContact) { setRecipientEmail(c.emailContact); setSendEmail(true); }
    setPadronData(null); setPadronCandidates([]); setResolvedCuil(null); setPadronStatus('idle');
  }

  function selectCandidate(c: PadronData) {
    setBuyerName(c.nombre);
    setPadronData(c);
    setResolvedCuil(c.cuil);
    setPadronCandidates([]);
    setPadronStatus('found');
  }

  function changeLetter(l: InvoiceLetter) {
    setLetter(l); setDocNumber(''); setBuyerName('');
    setPadronData(null); setPadronCandidates([]); setResolvedCuil(null);
    setPadronStatus('idle'); setError(''); setResult(null); setPaymentLink(null);
    if (selectedProduct) applyProduct(selectedProduct, quantity, l);
  }

  function resetForm() {
    setDocNumber(''); setBuyerName('');
    setPadronData(null); setPadronCandidates([]); setResolvedCuil(null);
    setPadronStatus('idle'); setResult(null); setPaymentLink(null);
    setSelectedProduct(null); setQuantity(1);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError('');
    const form = new FormData(e.currentTarget);
    const amount = parseFloat(form.get('amount') as string);
    const description = form.get('description') as string;
    const ivaRate = parseFloat(form.get('ivaRate') as string || '21');
    const clean = docNumber.replace(/[-\s]/g, '');

    if (letter === 'A' && !clean) {
      setError('Para Factura A necesitás el CUIT del receptor.');
      setLoading(false); return;
    }

    // Si el DNI fue resuelto a CUIL, usamos ese; si no, usamos lo que ingresaron
    const effectiveDoc = resolvedCuil ?? (clean || undefined);
    const effectiveType = letter === 'A' ? 'CUIT'
      : resolvedCuil ? 'CUIL'
      : clean.length === 11 ? 'CUIL'
      : clean ? 'DNI'
      : 'CONSUMIDOR_FINAL';

    try {
      const res = await fetch('/api/invoices/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, description, invoiceLetter: letter, ivaRate,
          docNumber: effectiveDoc,
          docType:   effectiveType,
          buyerName: buyerName || undefined,
          recipientEmail: sendEmail && recipientEmail ? recipientEmail : undefined,
          productId: selectedProduct?.id,
          quantity:  selectedProduct ? quantity : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al emitir');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally { setLoading(false); }
  }

  async function generarLinkPago() {
    setError('');
    const amount = parseFloat(amountRef.current?.value ?? '');
    const description = descRef.current?.value ?? '';
    const ivaRate = parseFloat(ivaRateRef.current?.value ?? '21');
    const clean = docNumber.replace(/[-\s]/g, '');

    if (!amount || amount <= 0) { setError('Ingresá un monto válido.'); return; }
    if (letter === 'A' && !clean) { setError('Para Factura A necesitás el CUIT del receptor.'); return; }

    const effectiveDoc = resolvedCuil ?? (clean || undefined);
    const effectiveType = letter === 'A' ? 'CUIT'
      : resolvedCuil ? 'CUIL'
      : clean.length === 11 ? 'CUIL'
      : clean ? 'DNI'
      : 'CONSUMIDOR_FINAL';

    setGeneratingLink(true);
    try {
      const res = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, description, invoiceLetter: letter, ivaRate,
          docNumber: effectiveDoc,
          docType:   effectiveType,
          buyerName: buyerName || undefined,
          recipientEmail: sendEmail && recipientEmail ? recipientEmail : undefined,
          productId: selectedProduct?.id,
          quantity:  selectedProduct ? quantity : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo generar el link');
      setPaymentLink(data.paymentLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally { setGeneratingLink(false); }
  }

  function copiarLink() {
    if (paymentLink) navigator.clipboard.writeText(paymentLink);
  }

  function compartirWhatsapp() {
    if (!paymentLink) return;
    const texto = `¡Hola! Te paso el link para abonar${buyerName ? ` — ${buyerName}` : ''}: ${paymentLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Facturación Rápida</h1>
        <p className={styles.pageSubtitle}>Emití una factura al instante.</p>
      </div>

      <div className={styles.layout}>
        <div className={`card ${styles.formCard}`}>
          <div className={styles.letterSelector}>
            {allowedLetters.map(l => (
              <button key={l} type="button" onClick={() => changeLetter(l)}
                className={`${styles.letterBtn} ${letter === l ? styles.letterActive : ''}`}>
                <span className={styles.letterCode}>{l}</span>
                <span className={styles.letterName}>{LETTER_INFO[l].label}</span>
              </button>
            ))}
          </div>

          <div className={styles.letterDesc}>{info.desc}</div>
          {error && <div className={styles.error}>{error}</div>}

          {paymentLink ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>🔗</div>
              <h3 className={styles.successTitle}>Link de pago generado</h3>
              <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
                Cuando el cliente pague, la factura se emite sola y se descuenta el stock — no hace falta hacer nada más acá.
              </p>
              <div className={styles.successDetail} style={{ marginTop: '0.75rem' }}>
                <input className="input mono text-sm" readOnly value={paymentLink} onFocus={e => e.target.select()} />
              </div>
              <div className={styles.successActions}>
                <button className="btn btn-primary" onClick={compartirWhatsapp}>💬 Compartir por WhatsApp</button>
                <button className="btn btn-outline" onClick={copiarLink}>📋 Copiar link</button>
                <button className="btn btn-ghost" onClick={resetForm}>Nueva venta</button>
              </div>
            </div>
          ) : result ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✅</div>
              <h3 className={styles.successTitle}>¡{info.label} emitida!</h3>
              <div className={styles.successDetail}>
                <div className={styles.detailRow}><span>N° Comprobante</span><strong className="mono">{result.invoiceNumber}</strong></div>
                <div className={styles.detailRow}><span>CAE</span><strong className="mono">{result.cae}</strong></div>
              </div>
              {result.emailSent && (
                <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '0.75rem' }}>
                  ✉ Comprobante enviado a {recipientEmail}
                </p>
              )}
              <div className={styles.successActions}>
                <button className="btn btn-primary" onClick={downloadPdf}>⬇ Descargar PDF</button>
                <button className="btn btn-outline" onClick={resetForm}>Emitir otra</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label style={{ margin: 0 }}>{letter === 'A' ? 'CUIT del receptor *' : 'CUIL, CUIT o DNI del receptor (opcional)'}</label>
                  <ContactPicker onSelect={handleContactSelect} />
                </div>
                <input
                  type="text"
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value)}
                  placeholder={letter === 'A' ? '30-12345678-9' : 'Ej: 20123456789 o 12345678'}
                  className="input"
                  required={letter === 'A'}
                />

                {padronStatus === 'loading'   && <p className={styles.padronLoading}>Consultando Padrón AFIP...</p>}
                {padronStatus === 'not_found' && <p className={styles.padronWarn}>No encontrado en el Padrón AFIP</p>}
                {padronStatus === 'error'     && <p className={styles.padronHint}>No se pudo consultar el Padrón. Podés ingresar el nombre manualmente.</p>}

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

                {padronStatus === 'found' && padronData && <PersonaCard data={padronData} />}
              </div>

              <div className={styles.field}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label style={{ margin: 0 }}>Monto</label>
                  <ProductPicker onSelect={handleProductSelect} />
                </div>
                <div className={styles.amountField}>
                  <span className={styles.currencySign}>$</span>
                  <input ref={amountRef} name="amount" type="number" step="0.01" min="0.01" required
                    placeholder={info.inputLabel} className={styles.amountInput} />
                </div>
                {selectedProduct && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                    <span className="text-sm text-muted">{selectedProduct.code} · Cantidad</span>
                    <input type="number" min="1" step="1" value={quantity} className="input" style={{ width: 70 }}
                      onChange={e => handleQuantityChange(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                    {selectedProduct.stock !== null && quantity > selectedProduct.stock && (
                      <span className="text-sm" style={{ color: 'var(--warning)' }}>⚠ Stock disponible: {selectedProduct.stock}</span>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedProduct(null)}>✕ Quitar</button>
                  </div>
                )}
              </div>

              {letter === 'A' && (
                <div className={styles.field}>
                  <label>Alícuota IVA</label>
                  <select name="ivaRate" ref={ivaRateRef} className="select">
                    <option value="21">21%</option>
                    <option value="10.5">10,5%</option>
                    <option value="27">27%</option>
                    <option value="0">Exento</option>
                  </select>
                </div>
              )}

              <textarea ref={descRef} name="description" placeholder="¿Qué vendiste? (opcional)"
                className={`input ${styles.descArea}`} rows={3} />

              {/* Nombre editable: siempre para A, o cuando padron no encontró / error */}
              {(letter === 'A' || (padronStatus !== 'idle' && padronStatus !== 'found' && padronStatus !== 'multiple')) && (
                <div className={styles.field}>
                  <label>Nombre / Razón social{letter === 'A' ? ' *' : ' (opcional)'}</label>
                  <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)}
                    placeholder="Ej: GARCIA, MARTIN" className="input" required={letter === 'A'} />
                </div>
              )}

              <div>
                <div className={styles.emailRow}>
                  <span className={styles.emailLabel}>Enviar por email</span>
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

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading || generatingLink} style={{ flex: 1 }}>
                  {loading ? 'Emitiendo...' : `Emitir ${info.label}`}
                </button>
                <button type="button" className="btn btn-outline" disabled={loading || generatingLink} onClick={generarLinkPago} style={{ flex: 1 }}>
                  {generatingLink ? 'Generando...' : '🔗 Cobrar con link de MP'}
                </button>
              </div>
              <p className="text-sm text-muted" style={{ marginTop: '0.4rem' }}>
                &quot;Cobrar con link de MP&quot; genera un link de Mercado Pago para compartir por WhatsApp — la factura se emite y el stock se descuenta recién cuando el cliente paga.
              </p>
            </form>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={`card ${styles.infoCard}`}>
            <h3 className={styles.infoTitle}>Diferencias entre tipos</h3>
            <div className={styles.infoTable}>
              <div className={styles.infoRow}><strong>Factura A</strong><span>Neto + IVA discriminado</span></div>
              <div className={styles.infoRow}><strong>Factura B</strong><span>Total con IVA incluido</span></div>
              <div className={styles.infoRow}><strong>Factura C</strong><span>Sin IVA (monotributistas)</span></div>
            </div>
          </div>
          <div className={`card ${styles.infoCard}`}>
            <p className={styles.infoText}>
              Con <strong>CUIL/CUIT</strong> (11 dígitos) consultamos el Padrón AFIP y completamos el nombre automáticamente.
              Con solo <strong>DNI</strong> hacemos lo mismo buscando el CUIL correspondiente.
            </p>
          </div>
          <div className={`card ${styles.infoCard}`}>
            <Link href="/dashboard/facturacion/manual" style={{ color: 'var(--blue)', fontSize: '0.875rem', fontWeight: '600' }}>
              ¿Necesitás más opciones? → Comprobante Manual
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
