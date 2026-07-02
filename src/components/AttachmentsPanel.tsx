'use client';

import { useEffect, useState, useRef } from 'react';

interface Attachment {
  id: string;
  fileName: string;
  fileSizeKb: number | null;
  createdAt: string;
  signedUrl: string | null;
}

interface Props {
  relatedType: string;
  relatedId: string;
}

export default function AttachmentsPanel({ relatedType, relatedId }: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch(`/api/adjuntos?relatedType=${relatedType}&relatedId=${relatedId}`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [relatedType, relatedId]);

  async function handleUpload(file: File) {
    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('relatedType', relatedType);
      form.append('relatedId', relatedId);
      const res = await fetch('/api/adjuntos', { method: 'POST', body: form });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este archivo?')) return;
    await fetch(`/api/adjuntos/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input ref={fileRef} type="file" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
        <button type="button" className="btn btn-outline btn-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? 'Subiendo...' : '📎 Adjuntar archivo'}
        </button>
        <span className="text-sm text-muted">Máx. 10MB</span>
      </div>
      {error && <p className="text-sm" style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>{error}</p>}
      {loading ? (
        <p className="text-sm text-muted">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Sin archivos adjuntos.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {items.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.7rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <a href={a.signedUrl ?? '#'} target="_blank" rel="noreferrer" className="text-sm" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                📄 {a.fileName}
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="text-sm text-muted">{a.fileSizeKb ? `${a.fileSizeKb} KB` : ''}</span>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(a.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
