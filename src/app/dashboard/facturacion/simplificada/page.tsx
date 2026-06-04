'use client';

import { useState } from 'react';
import styles from './simplificada.module.css';

export default function FacturacionSimplificadaPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ invoiceNumber: string; cae: string; pdfBase64: string } | null>(null);
  const [error, setError] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const form = new FormData(e.currentTarget);
    const amount = parseFloat(form.get('amount') as string);
    const description = form.get('description') as string;
    const docNumber = form.get('docNumber') as string;

    try {
      const res = await fetch('/api/invoices/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          docNumber: docNumber || undefined,
          sendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al emitir factura');

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!result?.pdfBase64) return;
    const bytes = atob(result.pdfBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${result.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quick Invoice</h1>
          <p className={styles.pageSubtitle}>Issue a Factura B instantly with just the amount.</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={`card ${styles.formCard}`}>
          <h2 className={styles.cardTitle}>New Comprobante</h2>

          {error && <div className={styles.error}>{error}</div>}

          {result ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✅</div>
              <h3 className={styles.successTitle}>Invoice issued!</h3>
              <div className={styles.successDetail}>
                <div className={styles.detailRow}>
                  <span>Invoice N°</span>
                  <strong className="mono">{result.invoiceNumber}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>CAE</span>
                  <strong className="mono">{result.cae}</strong>
                </div>
              </div>
              <div className={styles.successActions}>
                <button className="btn btn-primary" onClick={downloadPdf}>⬇ Download PDF</button>
                <button className="btn btn-outline" onClick={() => setResult(null)}>Issue another</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.amountField}>
                <span className={styles.currencySign}>$</span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Final amount (IVA included)"
                  className={styles.amountInput}
                />
              </div>

              <textarea
                name="description"
                placeholder="What did you sell? (optional)"
                className={`input ${styles.descArea}`}
                rows={3}
              />

              <input
                name="docNumber"
                type="text"
                placeholder="DNI or CUIT of buyer (optional)"
                className="input"
              />

              <div className={styles.emailRow}>
                <span className={styles.emailLabel}>Send by email</span>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                  <span className={styles.slider} />
                </label>
              </div>

              <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                {loading ? 'Issuing...' : 'Issue Invoice'}
              </button>
            </form>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={`card ${styles.infoCard}`}>
            <h3 className={styles.infoTitle}>How it works</h3>
            <ol className={styles.infoList}>
              <li>Enter the <strong>final price</strong> (IVA already included)</li>
              <li>Add description (optional)</li>
              <li>SimpleComm connects to ARCA and issues a Factura B</li>
              <li>Download the PDF or send it by email</li>
            </ol>
          </div>
          <div className={`card ${styles.infoCard}`}>
            <h3 className={styles.infoTitle}>IVA Note</h3>
            <p className={styles.infoText}>
              For Factura B (Consumidor Final), IVA is included in the price and
              is <strong>not discriminated</strong> on the invoice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
