'use client';

import { useRef, useState } from 'react';
import ImportCsvModal, { type ImportCsvStatus } from '@/components/ImportCsvModal';

/**
 * Único punto de importación de "Mis Comprobantes emitidos" de ARCA en toda la app — antes
 * estaba duplicado en la página de IVA y en la tarjeta de Monotributo, cada uno con su propio
 * botón, lo cual era confuso porque lo que se importa son comprobantes, y el lugar donde se
 * ven los comprobantes es acá (Comprobantes / Facturación), no en esos reportes derivados.
 */
export default function ImportarVentasButton() {
  const [modal, setModal] = useState<{ status: ImportCsvStatus; message: string | null } | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  async function importVentas(file: File) {
    setModal({ status: 'importing', message: null });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizacion/iva/importar-emitidos', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo importar el archivo');
      setModal({ status: 'success', message: `${d.rowCount} comprobantes (${d.newCount} nuevos, ${d.updatedCount} actualizados).` });
      window.dispatchEvent(new Event('comprobantes:refresh'));
      window.dispatchEvent(new Event('onboarding:refresh'));
    } catch (e) {
      setModal({ status: 'error', message: e instanceof Error ? e.message : 'Error al importar el archivo' });
    } finally {
      if (csvRef.current) csvRef.current.value = '';
    }
  }

  return (
    <>
      <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) importVentas(f); }} />
      <button className="btn btn-outline btn-sm" onClick={() => csvRef.current?.click()} disabled={modal?.status === 'importing'}>
        📥 Importar de ARCA
      </button>
      {modal && <ImportCsvModal status={modal.status} message={modal.message} onClose={() => setModal(null)} />}
    </>
  );
}
