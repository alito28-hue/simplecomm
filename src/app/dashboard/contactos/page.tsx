'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { suggestFiscalTreatment } from '@/lib/fiscal';
import AttachmentsPanel from '@/components/AttachmentsPanel';
import styles from './contactos.module.css';

interface Contact {
  id: string;
  businessName: string;
  docType: string;
  docNumber: string;
  emailContact?: string | null;
  phone?: string | null;
  fiscalTreatment?: string;
  costCenterId?: string | null;
}

interface CostCenter { id: string; name: string; }

const DOC_TYPES = ['CUIT', 'CUIL', 'DNI', 'PASAPORTE', 'CONSUMIDOR_FINAL'];
const EMPTY_FORM: Omit<Contact, 'id'> = {
  businessName: '', docType: 'DNI', docNumber: '', emailContact: '', phone: '', fiscalTreatment: 'CONSUMIDOR_FINAL', costCenterId: null,
};

type PadronStatus = 'idle' | 'loading' | 'found' | 'multiple' | 'not_found' | 'error';

interface PadronData {
  cuil: string;
  nombre: string;
  tipoPersona: string;
  estadoClave: string;
  domicilio?: { localidad?: string; provincia?: string };
  monotributo?: boolean;
  ivaCondition?: 'INSCRIPTO' | 'EXENTO' | null;
}

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
      {!activo && <p className={styles.padronWarn}>Este documento figura como {data.estadoClave} en ARCA. Verificá antes de facturar.</p>}
    </div>
  );
}

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/['"]/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return row;
  });
}

function mapCSVRow(row: Record<string, string>) {
  return {
    businessName: row.nombre || row.name || row.business_name || '',
    docType: (row.tipo_doc || row.doc_type || 'DNI').toUpperCase(),
    docNumber: (row.numero_doc || row.doc_number || row.dni || row.cuit || '').replace(/\D/g, ''),
    emailContact: row.email || row.email_contacto || '',
    phone: row.telefono || row.phone || '',
  };
}

interface HistorialInvoice {
  invoice_id?: string;
  invoice_number: string | null;
  total_amount: number;
  created_at: string;
  status: string;
}

export default function ContactosPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'none' | 'add' | 'edit' | 'import' | 'historial' | 'adjuntos'>('none');
  const [attachmentsContact, setAttachmentsContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<Omit<Contact, 'id'>>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ReturnType<typeof mapCSVRow>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [historialContact, setHistorialContact] = useState<Contact | null>(null);
  const [historialInvoices, setHistorialInvoices] = useState<HistorialInvoice[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  const [padronStatus, setPadronStatus] = useState<PadronStatus>('idle');
  const [padronData, setPadronData] = useState<PadronData | null>(null);
  const [padronCandidates, setPadronCandidates] = useState<PadronData[]>([]);
  const skipPadronRef = useRef(false);

  // Al cargar un CUIT/CUIL/DNI válido en el formulario, consultamos el Padrón
  // de ARCA y completamos nombre y condición fiscal automáticamente.
  useEffect(() => {
    if (modal !== 'add' && modal !== 'edit') return;
    if (skipPadronRef.current) { skipPadronRef.current = false; return; }

    const clean = form.docNumber.replace(/\D/g, '');
    setPadronCandidates([]);

    if (!['CUIT', 'CUIL', 'DNI'].includes(form.docType) || clean.length < 7) {
      setPadronStatus('idle'); setPadronData(null);
      return;
    }

    const isCuilLike = form.docType !== 'DNI' && clean.length === 11;
    const isDni = form.docType === 'DNI' && clean.length >= 7 && clean.length <= 8;
    if (!isCuilLike && !isDni) { setPadronStatus('idle'); setPadronData(null); return; }

    setPadronStatus('loading');
    setPadronData(null);

    const handle = setTimeout(async () => {
      try {
        if (isCuilLike) {
          const res = await fetch(`/api/padron/${clean}`);
          const info: PadronData = await res.json();
          if (res.ok && info.nombre) {
            setPadronData(info);
            setPadronStatus('found');
            const suggestion = suggestFiscalTreatment({ monotributo: info.monotributo, ivaCondition: info.ivaCondition });
            setForm(f => ({
              ...f,
              businessName: f.businessName.trim() ? f.businessName : info.nombre,
              fiscalTreatment: suggestion ?? f.fiscalTreatment,
            }));
          } else {
            setPadronStatus(res.status === 404 ? 'not_found' : 'error');
          }
        } else {
          const res = await fetch(`/api/padron/dni/${clean}`);
          const data = await res.json();
          if (res.ok) {
            const { resultados } = data as { resultados: PadronData[] };
            if (resultados.length === 1) {
              setPadronData(resultados[0]);
              setPadronStatus('found');
              setForm(f => ({ ...f, businessName: f.businessName.trim() ? f.businessName : resultados[0].nombre }));
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
    }, 600);

    return () => clearTimeout(handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.docNumber, form.docType, modal]);

  function selectCandidate(c: PadronData) {
    setPadronData(c);
    setPadronCandidates([]);
    setPadronStatus('found');
    setForm(f => ({ ...f, docNumber: c.cuil, businessName: c.nombre }));
  }

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clientes?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setContacts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchContacts, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchContacts, search]);

  useEffect(() => {
    fetch('/api/organizacion/centros-costo')
      .then(r => r.json())
      .then(d => setCostCenters(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  function resetPadron() { setPadronStatus('idle'); setPadronData(null); setPadronCandidates([]); }

  function openAdd() { setForm(EMPTY_FORM); setEditId(null); resetPadron(); setModal('add'); }
  function openEdit(c: Contact) {
    skipPadronRef.current = true;
    setForm({ businessName: c.businessName, docType: c.docType, docNumber: c.docNumber, emailContact: c.emailContact ?? '', phone: c.phone ?? '', fiscalTreatment: c.fiscalTreatment ?? 'CONSUMIDOR_FINAL', costCenterId: c.costCenterId ?? null });
    setEditId(c.id);
    resetPadron();
    setModal('edit');
  }

  async function saveContact() {
    if (!form.businessName.trim()) return;
    setSaving(true);
    const body = { ...form, docNumber: form.docNumber.replace(/\D/g, '') || '0' };
    const res = editId
      ? await fetch(`/api/clientes/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) { setModal('none'); fetchContacts(); }
  }

  async function deleteContact(id: string) {
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    fetchContacts();
  }

  function handleCSVChange(text: string) {
    setImportText(text);
    setImportResult(null);
    const rows = parseCSV(text).map(mapCSVRow).filter(r => r.businessName);
    setImportPreview(rows.slice(0, 5));
  }

  async function runImport() {
    const rows = parseCSV(importText).map(mapCSVRow).filter(r => r.businessName);
    if (rows.length === 0) return;
    setImporting(true);
    const res = await fetch('/api/clientes/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      setImportResult(`✓ ${data.imported} contactos importados`);
      fetchContacts();
      setImportText(''); setImportPreview([]);
    } else {
      setImportResult(`Error: ${data.error}`);
    }
  }

  function emitirFactura(c: Contact) {
    const params = new URLSearchParams({
      name: c.businessName,
      docType: c.docType,
      docNumber: c.docNumber,
      ...(c.emailContact ? { email: c.emailContact } : {}),
    });
    router.push(`/dashboard/facturacion/simplificada?${params.toString()}`);
  }

  async function openHistorial(c: Contact) {
    setHistorialContact(c);
    setHistorialInvoices([]);
    setHistorialLoading(true);
    setModal('historial');
    try {
      const res = await fetch(`/api/clientes/${c.id}/facturas`);
      const data = await res.json();
      setHistorialInvoices(data.invoices ?? []);
    } finally {
      setHistorialLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Contactos</h1>
          <p className={styles.subtitle}>{contacts.length > 0 ? `${contacts.length} contacto${contacts.length !== 1 ? 's' : ''}` : 'Tu directorio de compradores frecuentes'}</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setImportText(''); setImportPreview([]); setImportResult(null); setModal('import'); }}>⬆ Importar CSV</button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Nuevo contacto</button>
        </div>
      </div>

      <div className="card">
        <div className={styles.searchRow}>
          <input
            className={styles.search}
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Documento</th><th>Email</th><th>Teléfono</th><th></th></tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className={styles.empty}>Cargando...</td></tr>
              )}
              {!loading && contacts.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>
                  {search ? `Sin resultados para "${search}"` : 'Sin contactos aún. Agregá el primero o importá un CSV.'}
                </td></tr>
              )}
              {contacts.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.businessName}</strong></td>
                  <td className="mono text-sm">{c.docType} {c.docNumber !== '0' ? c.docNumber : '—'}</td>
                  <td className="text-sm">{c.emailContact || '—'}</td>
                  <td className="text-sm">{c.phone || '—'}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button className="btn btn-primary btn-sm" onClick={() => emitirFactura(c)}>+ Factura</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openHistorial(c)}>Historial</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAttachmentsContact(c); setModal('adjuntos'); }}>📎 Adjuntos</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Editar</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => setDeleteId(c.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className={styles.modalOverlay} onClick={() => setModal('none')}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{modal === 'add' ? 'Nuevo contacto' : 'Editar contacto'}</h2>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Nombre *</label>
                <input className="input" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Juan Pérez / ACME SA" />
              </div>
              <div className={styles.field}>
                <label>Tipo documento</label>
                <select className="input" value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>N° documento</label>
                <input className="input" value={form.docNumber} onChange={e => setForm(f => ({ ...f, docNumber: e.target.value }))} placeholder="12345678" />
                {padronStatus === 'loading'   && <p className={styles.padronLoading}>Consultando Padrón ARCA...</p>}
                {padronStatus === 'not_found' && <p className={styles.padronWarn}>No encontramos ese documento en el Padrón. Completá los datos manualmente.</p>}
                {padronStatus === 'error'     && <p className={styles.padronHint}>No se pudo consultar el Padrón ahora. Completá los datos manualmente.</p>}
                {padronStatus === 'found' && padronData && <PersonaCard data={padronData} />}
                {padronStatus === 'multiple' && (
                  <div className={styles.candidatesList}>
                    <p className={styles.padronHint}>Encontramos varias personas con ese DNI, elegí una:</p>
                    {padronCandidates.map(c => (
                      <button key={c.cuil} type="button" className={styles.candidateBtn} onClick={() => selectCandidate(c)}>
                        {c.nombre} — CUIL {c.cuil}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input className="input" type="email" value={form.emailContact ?? ''} onChange={e => setForm(f => ({ ...f, emailContact: e.target.value }))} placeholder="juan@ejemplo.com" />
              </div>
              <div className={styles.field}>
                <label>Teléfono</label>
                <input className="input" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+54 9 11 1234 5678" />
              </div>
              <div className={styles.field}>
                <label>Centro de costo</label>
                <select className="input" value={form.costCenterId ?? ''} onChange={e => setForm(f => ({ ...f, costCenterId: e.target.value || null }))}>
                  <option value="">Sin asignar</option>
                  {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal('none')}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveContact} disabled={saving || !form.businessName.trim()}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Eliminar contacto</h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>¿Confirmás que querés eliminar este contacto? Esta acción no se puede deshacer.</p>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: 'var(--error)' }} onClick={() => deleteContact(deleteId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de facturas modal */}
      {modal === 'historial' && historialContact && (
        <div className={styles.modalOverlay} onClick={() => setModal('none')}>
          <div className={`${styles.modal} ${styles.modalWide}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <h2 className={styles.modalTitle}>Historial — {historialContact.businessName}</h2>
            {historialLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
            ) : historialInvoices.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Sin facturas emitidas para este contacto.
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Fecha</th><th>N° Factura</th><th>Monto</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                      {historialInvoices.map((inv, i) => (
                        <tr key={inv.invoice_id ?? i}>
                          <td className="text-sm text-muted">{new Date(inv.created_at).toLocaleDateString('es-AR')}</td>
                          <td className="mono text-sm">{inv.invoice_number ?? '—'}</td>
                          <td><strong>${inv.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                          <td>
                            {inv.status === 'issued' && <span className="badge badge-success">✓ Emitida</span>}
                            {inv.status === 'pending' && <span className="badge badge-warning">⏳ Pendiente</span>}
                            {inv.status === 'error' && <span className="badge badge-error">✗ Error</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--border)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span className="text-muted">{historialInvoices.length} comprobante{historialInvoices.length !== 1 ? 's' : ''}</span>
                  <strong>Total: ${historialInvoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.total_amount, 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                </div>
              </>
            )}
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal('none')}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjuntos modal */}
      {modal === 'adjuntos' && attachmentsContact && (
        <div className={styles.modalOverlay} onClick={() => setModal('none')}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 className={styles.modalTitle}>Adjuntos — {attachmentsContact.businessName}</h2>
            <AttachmentsPanel relatedType="cliente" relatedId={attachmentsContact.id} />
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal('none')}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV modal */}
      {modal === 'import' && (
        <div className={styles.modalOverlay} onClick={() => setModal('none')}>
          <div className={`${styles.modal} ${styles.modalWide}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Importar contactos desde CSV</h2>
            <p className={styles.importHint}>
              Columnas aceptadas: <code>nombre, tipo_doc, numero_doc, email, telefono</code><br />
              El tipo de documento acepta: DNI, CUIT, CUIL, PASAPORTE.<br />
              Si ya existe un contacto con el mismo número de documento, se actualiza.
            </p>

            <div className={styles.importActions}>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const csv = 'nombre,tipo_doc,numero_doc,email,telefono\nJuan Pérez,DNI,12345678,juan@email.com,+5491112345678\nACME SA,CUIT,30123456789,contacto@acme.com,';
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'plantilla_contactos.csv'; a.click();
                URL.revokeObjectURL(url);
              }}>⬇ Descargar plantilla</button>
            </div>

            <textarea
              className={styles.csvArea}
              placeholder={'nombre,tipo_doc,numero_doc,email,telefono\nJuan Pérez,DNI,12345678,juan@email.com,...'}
              value={importText}
              onChange={e => handleCSVChange(e.target.value)}
              rows={7}
            />

            {importPreview.length > 0 && (
              <div className={styles.preview}>
                <p className={styles.previewLabel}>Vista previa (primeras {importPreview.length} filas):</p>
                {importPreview.map((r, i) => (
                  <div key={i} className={styles.previewRow}>
                    <strong>{r.businessName}</strong>
                    <span>{r.docType} {r.docNumber}</span>
                    {r.emailContact && <span>{r.emailContact}</span>}
                  </div>
                ))}
                <p className={styles.previewCount}>{parseCSV(importText).filter(r => mapCSVRow(r).businessName).length} contactos en total</p>
              </div>
            )}

            {importResult && (
              <p className={`${styles.importResult} ${importResult.startsWith('✓') ? styles.importOk : styles.importErr}`}>{importResult}</p>
            )}

            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal('none')}>Cerrar</button>
              <button className="btn btn-primary" onClick={runImport}
                disabled={importing || parseCSV(importText).filter(r => mapCSVRow(r).businessName).length === 0}>
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
