'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './simplificada.module.css';

type InvoiceLetter = 'A' | 'B' | 'C';

const LETTER_INFO = {
  A: { label: 'Factura A', desc: 'Para clientes con CUIT (Resp. Inscripto → Resp. Inscripto). IVA discriminado.', requiresCuit: true, inputLabel: 'Monto neto (sin IVA)', code: '01' },
  B: { label: 'Factura B', desc: 'Para consumidores finales. IVA incluido en el precio.', requiresCuit: false, inputLabel: 'Monto final (IVA incluido)', code: '06' },
  C: { label: 'Factura C', desc: 'Para monotributistas. Sin IVA.', requiresCuit: false, inputLabel: 'Monto total', code: '11' },
};

export default function FacturacionSimplificadaPage() {
  const [letter, setLetter] = useState<InvoiceLetter>('B');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ invoiceNumber: string; cae: string; caeDueDate: string; pdfBase64: string; emailSent?: boolean } | null>(null);
  const [error, setError] = useState('');
  const [sendEmail, setSendEmail]       = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const info = LETTER_INFO[letter];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError('');
    const form = new FormData(e.currentTarget);
    const amount = parseFloat(form.get('amount') as string);
    const description = form.get('description') as string;
    const docNumber = form.get('docNumber') as string;
    const ivaRate = parseFloat(form.get('ivaRate') as string || '21');

    if (letter === 'A' && !docNumber) {
      setError('Para Factura A necesitás el CUIT del receptor.');
      setLoading(false); return;
    }

    try {
      const res = await fetch('/api/invoices/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, description, invoiceLetter: letter, ivaRate,
          docNumber: letter !== 'B' ? docNumber : undefined,
          docType: letter === 'A' ? 'CUIT' : (docNumber ? 'DNI' : 'CONSUMIDOR_FINAL'),
          recipientEmail: sendEmail && recipientEmail ? recipientEmail : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al emitir');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally { setLoading(false); }
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
          {/* Selector de tipo */}
          <div className={styles.letterSelector}>
            {(['A','B','C'] as InvoiceLetter[]).map(l => (
              <button key={l}
                type="button"
                onClick={() => { setLetter(l); setError(''); setResult(null); }}
                className={`${styles.letterBtn} ${letter === l ? styles.letterActive : ''}`}>
                <span className={styles.letterCode}>{l}</span>
                <span className={styles.letterName}>{LETTER_INFO[l].label}</span>
              </button>
            ))}
          </div>

          <div className={styles.letterDesc}>{info.desc}</div>

          {error && <div className={styles.error}>{error}</div>}

          {result ? (
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
                <button className="btn btn-outline" onClick={() => setResult(null)}>Emitir otra</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.amountField}>
                <span className={styles.currencySign}>$</span>
                <input name="amount" type="number" step="0.01" min="0.01" required
                  placeholder={info.inputLabel} className={styles.amountInput} />
              </div>

              {letter === 'A' && (
                <div className={styles.field}>
                  <label>Alícuota IVA</label>
                  <select name="ivaRate" className="select">
                    <option value="21">21%</option>
                    <option value="10.5">10,5%</option>
                    <option value="27">27%</option>
                    <option value="0">Exento</option>
                  </select>
                </div>
              )}

              <textarea name="description" placeholder="¿Qué vendiste? (opcional)"
                className={`input ${styles.descArea}`} rows={3} />

              <div className={styles.field}>
                <label>{letter === 'A' ? 'CUIT del receptor *' : 'DNI o CUIT del receptor (opcional)'}</label>
                <input name="docNumber" type="text"
                  placeholder={letter === 'A' ? '30-12345678-9' : 'DNI o CUIT (opcional)'}
                  className="input" required={letter === 'A'} />
              </div>

              <div>
                <div className={styles.emailRow}>
                  <span className={styles.emailLabel}>Enviar por email</span>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                    <span className={styles.slider} />
                  </label>
                </div>
                {sendEmail && (
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    placeholder="email@destino.com"
                    className="input"
                    style={{ marginTop: '0.5rem' }}
                    required
                  />
                )}
              </div>

              <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                {loading ? 'Emitiendo...' : `Emitir ${info.label}`}
              </button>
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
            <Link href="/dashboard/facturacion/manual" style={{ color: 'var(--blue)', fontSize: '0.875rem', fontWeight: '600' }}>
              ¿Necesitás más opciones? → Comprobante Manual
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
