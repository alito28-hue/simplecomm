'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './simplificada.module.css';

export default function FacturacionSimplificadaPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ invoiceNumber: string; cae: string; caeDueDate: string; pdfBase64: string } | null>(null);
  const [error, setError] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError('');
    const form = new FormData(e.currentTarget);
    const amount = parseFloat(form.get('amount') as string);
    const description = form.get('description') as string;
    const docNumber = form.get('docNumber') as string;

    try {
      const res = await fetch('/api/invoices/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, docNumber: docNumber || undefined, sendEmail }),
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
    const blob = new Blob([arr], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `factura-${result.invoiceNumber}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Facturación Rápida</h1>
          <p className={styles.pageSubtitle}>Emití una Factura B al instante con el monto final.</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={`card ${styles.formCard}`}>
          <h2 className={styles.cardTitle}>Nuevo Comprobante</h2>

          {error && <div className={styles.error}>{error}</div>}

          {result ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✅</div>
              <h3 className={styles.successTitle}>¡Factura emitida!</h3>
              <div className={styles.successDetail}>
                <div className={styles.detailRow}><span>N° Comprobante</span><strong className="mono">{result.invoiceNumber}</strong></div>
                <div className={styles.detailRow}><span>CAE</span><strong className="mono">{result.cae}</strong></div>
                <div className={styles.detailRow}><span>Vto. CAE</span><strong>{result.caeDueDate ? `${result.caeDueDate.slice(6)}/${result.caeDueDate.slice(4,6)}/${result.caeDueDate.slice(0,4)}` : '—'}</strong></div>
              </div>
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
                  placeholder="Monto final (IVA incluido)" className={styles.amountInput} />
              </div>

              <textarea name="description" placeholder="¿Qué vendiste? (opcional)"
                className={`input ${styles.descArea}`} rows={3} />

              <input name="docNumber" type="text"
                placeholder="DNI o CUIT del receptor (opcional)" className="input" />

              <div className={styles.emailRow}>
                <span className={styles.emailLabel}>Enviar por email</span>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                  <span className={styles.slider} />
                </label>
              </div>

              <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                {loading ? 'Emitiendo...' : 'Emitir Factura'}
              </button>
            </form>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={`card ${styles.infoCard}`}>
            <h3 className={styles.infoTitle}>¿Cómo funciona?</h3>
            <ol className={styles.infoList}>
              <li>Ingresá el <strong>precio final</strong> (IVA ya incluido)</li>
              <li>Agregá una descripción (opcional)</li>
              <li>SimpleComm se conecta a ARCA y emite la Factura B</li>
              <li>Descargá el PDF o envialo por email</li>
            </ol>
          </div>
          <div className={`card ${styles.infoCard}`}>
            <h3 className={styles.infoTitle}>Nota sobre IVA</h3>
            <p className={styles.infoText}>
              En Factura B (Consumidor Final), el IVA está incluido en el precio
              y <strong>no se discrimina</strong> en el comprobante.
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
