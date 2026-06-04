'use client';

import { useState, useRef } from 'react';
import styles from './lotes.module.css';

interface ParsedRow { buyerName: string; amount: number; docType: string; docNumber: string; description: string; }
interface Result { row: number; status: 'ok' | 'error'; invoiceNumber?: string; cae?: string; error?: string; }

export default function LotesPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState<'upload' | 'api' | 'historial'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  async function parseFile(file: File) {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const parsed: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/['"]/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });
      if (!row.monto && !row.amount && !row.total) continue;
      parsed.push({
        buyerName:   row.nombre || row.name || row.buyer_name || 'Consumidor Final',
        amount:      parseFloat(row.monto || row.amount || row.total || '0'),
        docType:     row.tipo_doc || row.doc_type || 'CONSUMIDOR_FINAL',
        docNumber:   row.numero_doc || row.doc_number || '0',
        description: row.descripcion || row.description || 'Venta',
      });
    }
    setRows(parsed);
  }

  async function procesarLote() {
    if (rows.length === 0) return;
    setProcessing(true); setProgress(0); setResults([]);
    const res: Result[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const r = await fetch('/api/invoices/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: row.amount, description: row.description }),
        });
        const data = await r.json();
        res.push({ row: i+1, status: r.ok ? 'ok' : 'error', invoiceNumber: data.invoiceNumber, cae: data.cae, error: data.error });
      } catch (e) {
        res.push({ row: i+1, status: 'error', error: e instanceof Error ? e.message : 'Error' });
      }
      setProgress(Math.round(((i+1)/rows.length)*100));
    }
    setResults(res);
    setProcessing(false);
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const err = results.filter(r => r.status === 'error').length;

  const BATCH_URL = typeof window !== 'undefined' ? window.location.origin : 'https://simplecomm.com.ar';

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Facturación Masiva</h1>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'upload' ? styles.active : ''}`} onClick={() => setTab('upload')}>⬆ Subir CSV</button>
        <button className={`${styles.tab} ${tab === 'api' ? styles.active : ''}`} onClick={() => setTab('api')}>🔌 API Batch</button>
        <button className={`${styles.tab} ${tab === 'historial' ? styles.active : ''}`} onClick={() => setTab('historial')}>🕐 Historial</button>
      </div>

      {tab === 'upload' && (
        <div className={`card ${styles.uploadCard}`}>
          <h2 className={styles.sectionTitle}>Importar desde CSV</h2>
          <p className={styles.desc}>Para lotes de hasta 500 facturas. Para volúmenes mayores usá la API Batch.</p>

          <div className={styles.dropZone} onClick={() => fileRef.current?.click()}>
            <span className={styles.dropIcon}>⬆</span>
            <p>Arrastrá el archivo o <span className={styles.link}>hacé clic aquí</span></p>
            <p className={styles.dropHint}>CSV con columnas: nombre, monto, tipo_doc, numero_doc, descripcion</p>
            <input ref={fileRef} type="file" accept=".csv" className={styles.fileInput}
              onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])} />
          </div>

          {rows.length > 0 && (
            <div className={styles.preview}>
              <p className={styles.previewInfo}>✓ {rows.length} filas detectadas</p>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>#</th><th>Receptor</th><th>Monto</th><th>Descripción</th></tr></thead>
                  <tbody>
                    {rows.slice(0,5).map((r,i) => (
                      <tr key={i}><td>{i+1}</td><td>{r.buyerName}</td><td>${r.amount.toLocaleString('es-AR',{minimumFractionDigits:2})}</td><td>{r.description}</td></tr>
                    ))}
                    {rows.length > 5 && <tr><td colSpan={4} className="text-muted text-sm" style={{textAlign:'center'}}>... y {rows.length-5} más</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {processing && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}><div className={styles.progressFill} style={{width:`${progress}%`}} /></div>
              <span className="text-sm text-muted">{progress}% completado...</span>
            </div>
          )}

          {results.length > 0 && (
            <div className={styles.results}>
              <strong style={{color: ok > 0 ? 'var(--success)' : 'var(--text-primary)'}}>{ok} emitidas</strong>
              {err > 0 && <span style={{color:'var(--error)'}}> · {err} con error</span>}
            </div>
          )}

          <div className={styles.actions}>
            <button className="btn btn-primary" onClick={procesarLote} disabled={rows.length === 0 || processing}>
              {processing ? `Procesando ${progress}%...` : 'Emitir todas'}
            </button>
            <button className="btn btn-ghost" onClick={() => {setRows([]); setResults([]);}}>Limpiar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const csv = 'nombre,monto,tipo_doc,numero_doc,descripcion\nJuan Pérez,1210.00,DNI,12345678,Servicio\nConsumidor Final,550.00,CONSUMIDOR_FINAL,,Producto';
              const blob = new Blob([csv],{type:'text/csv'});
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href=url; a.download='plantilla_lote.csv'; a.click(); URL.revokeObjectURL(url);
            }}>⬇ Plantilla</button>
          </div>
        </div>
      )}

      {tab === 'api' && (
        <div className={`card ${styles.apiCard}`}>
          <h2 className={styles.sectionTitle}>API de Facturación Masiva (Batch)</h2>
          <p className={styles.desc}>
            Para lotes de miles de facturas (ej: ClubSorteos post-cierre de sorteo).
            Enviá el lote completo y recibís el resultado por ítem con su PDF.
          </p>

          <div className={styles.apiSection}>
            <div className={styles.apiLabel}>Endpoint</div>
            <code className={styles.apiCode}>POST {BATCH_URL}/api/batches/invoices</code>
          </div>

          <div className={styles.apiSection}>
            <div className={styles.apiLabel}>Autenticación</div>
            <code className={styles.apiCode}>Authorization: Bearer YOUR_TOKEN</code>
          </div>

          <div className={styles.apiSection}>
            <div className={styles.apiLabel}>Payload de ejemplo</div>
            <pre className={styles.codeBlock}>{JSON.stringify({
              batchId: "lote-sorteo-001",
              raffle: { id: "raffle-id", name: "Sorteo Mayo 2026" },
              items: [
                {
                  batchItemId: "item-1",
                  buyer: { email: "juan@email.com", fullName: "Juan Pérez", documentType: "96", documentNumber: "12345678", billingMode: "identified" },
                  invoice: { type: "B", currency: "ARS", totalAmount: 1500, purchaseCount: 2, firstPurchaseAt: null, lastPurchaseAt: null },
                  metadata: { raffleId: "raffle-id", userId: "user-123" }
                }
              ]
            }, null, 2)}</pre>
          </div>

          <div className={styles.apiSection}>
            <div className={styles.apiLabel}>Respuesta</div>
            <pre className={styles.codeBlock}>{JSON.stringify({
              batchId: "lote-sorteo-001",
              status: "completed",
              summary: { total: 1, issued: 1, failed: 0, durationMs: 1842 },
              items: [
                { batchItemId: "item-1", status: "issued", invoiceNumber: "0004-00000001", cae: "86238297447940", caeDueDate: "20260614", pdfBase64: "JVBERi..." }
              ]
            }, null, 2)}</pre>
          </div>

          <div className={styles.apiNote}>
            <strong>⚡ Concurrencia:</strong> El Gateway procesa 5 facturas simultáneas contra AFIP.
            Para 3000 ítems, el tiempo estimado es ~20 minutos. Usá el endpoint GET para consultar el estado.
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="card" style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)',fontStyle:'italic'}}>
          El historial de lotes procesados aparecerá aquí próximamente.
        </div>
      )}
    </div>
  );
}
