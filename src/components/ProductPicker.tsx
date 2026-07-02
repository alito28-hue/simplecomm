'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ContactPicker.module.css';

export interface ProductOption {
  id: string;
  code: string;
  description: string;
  netPrice: number;
  ivaRate: string;
  stock: number | null;
}

interface Props {
  onSelect: (p: ProductOption) => void;
}

export default function ProductPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/organizacion/productos?q=${encodeURIComponent(q)}`);
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

  function handleSelect(p: ProductOption) {
    onSelect(p);
    setOpen(false);
    setQ('');
    setResults([]);
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={styles.trigger} onClick={() => setOpen(o => !o)}>
        📦 Elegir producto
      </button>
      {open && (
        <div className={styles.dropdown}>
          <input
            ref={inputRef}
            className={styles.search}
            placeholder="Código o descripción..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className={styles.results}>
            {loading && <div className={styles.hint}>Buscando...</div>}
            {!loading && q.length === 0 && results.length === 0 && (
              <div className={styles.hint}>Escribí para buscar entre tus productos</div>
            )}
            {!loading && q.length > 0 && results.length === 0 && (
              <div className={styles.hint}>Sin resultados para "{q}"</div>
            )}
            {results.map(p => (
              <button
                key={p.id}
                type="button"
                className={styles.resultItem}
                onClick={() => handleSelect(p)}
                disabled={p.stock === 0}
              >
                <span className={styles.resultName}>{p.description}</span>
                <span className={styles.resultDoc}>
                  {p.code} · ${Number(p.netPrice).toLocaleString('es-AR')}
                  {p.stock !== null && ` · Stock: ${p.stock}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
