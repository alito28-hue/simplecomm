'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ContactPicker, { type ContactOption } from '@/components/ContactPicker';
import { getAllowedInvoiceLetters, getDefaultInvoiceLetter, type InvoiceLetter } from '@/lib/fiscal';
import styles from './programadas.module.css';

interface Schedule {
  id: string; buyerName: string; description: string; amount: number;
  nextEffectiveDate: string | null; mode: string; status: string;
  endType: string; endValue: number | null; processedMonths: number; issuedCount: number;
}

const EMPTY = {
  clientId: '', buyerName: '', docType: 'CUIT', docNumber: '', recipientEmail: '',
  description: '', amount: '', invoiceLetter: 'B', ivaRate: '21', concept: '1',
  firstDate: '', mode: 'CONFIRMATION', endType: 'NONE', endValue: '',
};

function money(value: number) {
  return `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

export default function ProgramadasPage() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [allowedLetters, setAllowedLetters] = useState<InvoiceLetter[]>(['A', 'B', 'C']);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch('/api/facturas-programadas');
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  // Filtrar tipos de comprobante según la condición fiscal de la organización
  useEffect(() => {
    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(data => {
        const allowed = getAllowedInvoiceLetters(data?.fiscalTreatment);
        setAllowedLetters(allowed);
        setForm(current => allowed.includes(current.invoiceLetter as InvoiceLetter)
          ? current
          : { ...current, invoiceLetter: getDefaultInvoiceLetter(data?.fiscalTreatment) });
      })
      .catch(() => {});
  }, []);

  function update(key: string, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }
  function selectContact(contact: ContactOption) {
    setForm(current => ({
      ...current,
      clientId: contact.id,
      buyerName: contact.businessName,
      docType: contact.docType,
      docNumber: contact.docNumber,
      recipientEmail: contact.emailContact ?? '',
    }));
  }
  async function lookupPadron() {
    const clean = form.docNumber.replace(/\D/g, '');
    if (clean.length !== 11) return setError('Ingresá un CUIT/CUIL de 11 dígitos.');
    const res = await fetch(`/api/padron/${clean}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? 'No se encontró el CUIT.');
    update('buyerName', data.nombre);
    setError('');
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setCreating(true); setError('');
    const res = await fetch('/api/facturas-programadas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) return setError(data.error ?? 'No se pudo crear la programación');
    setForm(EMPTY); setShowForm(false); load();
  }

  const active = items.filter(item => item.status === 'ACTIVE').length;
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Facturas programadas</h1><p className={styles.subtitle}>Una posible factura por mes, automática o sujeta a confirmación.</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(value => !value)}>{showForm ? 'Cerrar' : '+ Nueva programación'}</button>
      </div>
      <div className={styles.stats}>
        <div className={`card ${styles.stat}`}><div className={styles.statLabel}>Activas</div><div className={styles.statValue}>{active}</div></div>
        <div className={`card ${styles.stat}`}><div className={styles.statLabel}>Con confirmación</div><div className={styles.statValue}>{items.filter(i => i.mode === 'CONFIRMATION').length}</div></div>
        <div className={`card ${styles.stat}`}><div className={styles.statLabel}>Facturas emitidas</div><div className={styles.statValue}>{items.reduce((sum, i) => sum + i.issuedCount, 0)}</div></div>
      </div>

      {showForm && <form className={`card ${styles.card} ${styles.form}`} onSubmit={create}>
        <h2>Nueva programación mensual</h2>
        {error && <div className={styles.error}>{error}</div>}
        <ContactPicker onSelect={selectContact} />
        <div className={styles.grid}>
          <div className={styles.field}><label>Razón social *</label><input className="input" value={form.buyerName} onChange={e => update('buyerName', e.target.value)} required /></div>
          <div className={styles.field}><label>Tipo documento</label><select className="input" value={form.docType} onChange={e => update('docType', e.target.value)}><option>CUIT</option><option>CUIL</option><option>DNI</option><option>CONSUMIDOR_FINAL</option></select></div>
          <div className={styles.field}><label>Documento *</label><div className={styles.actions}><input className="input" value={form.docNumber} onChange={e => update('docNumber', e.target.value)} required /><button type="button" className="btn btn-ghost btn-sm" onClick={lookupPadron}>Padrón</button></div></div>
          <div className={`${styles.field} ${styles.wide}`}><label>Descripción repetitiva *</label><input className="input" value={form.description} onChange={e => update('description', e.target.value)} required /></div>
          <div className={styles.field}><label>Monto *</label><input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => update('amount', e.target.value)} required /></div>
          <div className={styles.field}><label>Tipo de factura</label><select className="input" value={form.invoiceLetter} onChange={e => update('invoiceLetter', e.target.value)}>{allowedLetters.map(l => <option key={l} value={l}>Factura {l}</option>)}</select></div>
          <div className={styles.field}><label>IVA</label><select className="input" value={form.ivaRate} onChange={e => update('ivaRate', e.target.value)}><option value="21">21%</option><option value="10.5">10,5%</option><option value="0">0%</option></select></div>
          <div className={styles.field}><label>Email receptor *</label><input className="input" type="email" value={form.recipientEmail} onChange={e => update('recipientEmail', e.target.value)} required /></div>
          <div className={styles.field}><label>Primera emisión *</label><input className="input" type="date" value={form.firstDate} onChange={e => update('firstDate', e.target.value)} required /></div>
          <div className={styles.field}><label>Modalidad</label><select className="input" value={form.mode} onChange={e => update('mode', e.target.value)}><option value="CONFIRMATION">Solicitar confirmación</option><option value="AUTOMATIC">Automática</option></select></div>
          <div className={styles.field}><label>Fin</label><select className="input" value={form.endType} onChange={e => update('endType', e.target.value)}><option value="NONE">Sin fecha límite</option><option value="MONTHS">Después de X meses</option><option value="INVOICES">Después de emitir X facturas</option></select></div>
          {form.endType !== 'NONE' && <div className={styles.field}><label>Cantidad</label><input className="input" type="number" min="1" value={form.endValue} onChange={e => update('endValue', e.target.value)} required /></div>}
        </div>
        <div className={styles.actions}><button className="btn btn-primary" disabled={creating}>{creating ? 'Creando...' : 'Crear programación'}</button><button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button></div>
      </form>}

      <div className="card">
        <div className="table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Descripción</th><th>Monto</th><th>Próxima</th><th>Modalidad</th><th>Progreso</th><th>Estado</th><th></th></tr></thead>
          <tbody>{items.length === 0 ? <tr><td colSpan={8} className={styles.empty}>Todavía no hay facturas programadas.</td></tr> : items.map(item => <tr key={item.id}>
            <td><strong>{item.buyerName}</strong></td><td>{item.description}</td><td>{money(item.amount)}</td>
            <td>{item.nextEffectiveDate ?? '—'}</td><td>{item.mode === 'AUTOMATIC' ? 'Automática' : 'Confirmación'}</td>
            <td>{item.endType === 'MONTHS' ? `${item.processedMonths}/${item.endValue} meses` : item.endType === 'INVOICES' ? `${item.issuedCount}/${item.endValue} facturas` : `${item.issuedCount} emitidas`}</td>
            <td><span className={`${styles.badge} ${item.status === 'ACTIVE' ? styles.active : styles.muted}`}>{item.status}</span></td>
            <td><Link className="btn btn-ghost btn-sm" href={`/dashboard/facturacion/programadas/${item.id}`}>Ver detalle</Link></td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}
