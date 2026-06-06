'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ContactPicker.module.css';

export interface ContactOption {
  id: string;
  businessName: string;
  docType: string;
  docNumber: string;
  emailContact?: string | null;
}

interface Props {
  onSelect: (c: ContactOption) => void;
}

export default function ContactPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleSelect(c: ContactOption) {
    onSelect(c);
    setOpen(false);
    setQ('');
    setResults([]);
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={styles.trigger} onClick={() => setOpen(o => !o)}>
        👤 Buscar contacto
      </button>
      {open && (
        <div className={styles.dropdown}>
          <input
            ref={inputRef}
            className={styles.search}
            placeholder="Nombre o número de documento..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className={styles.results}>
            {loading && <div className={styles.hint}>Buscando...</div>}
            {!loading && q.length === 0 && results.length === 0 && (
              <div className={styles.hint}>Escribí para buscar entre tus contactos</div>
            )}
            {!loading && q.length > 0 && results.length === 0 && (
              <div className={styles.hint}>Sin resultados para "{q}"</div>
            )}
            {results.map(c => (
              <button
                key={c.id}
                type="button"
                className={styles.resultItem}
                onClick={() => handleSelect(c)}
              >
                <span className={styles.resultName}>{c.businessName}</span>
                <span className={styles.resultDoc}>{c.docType} {c.docNumber}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
