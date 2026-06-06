'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import NotificationBell from './NotificationBell';
import styles from './TopBar.module.css';

interface TopBarProps {
  userInitials?: string;
  userName?: string;
  onHamburger?: () => void;
}

interface SearchInvoice {
  invoice_id?: string;
  invoice_number?: string | null;
  buyer_name?: string;
  total_amount?: number;
}

interface SearchContact {
  id: string;
  businessName: string;
  docType: string;
  docNumber: string;
}

interface SearchResults {
  invoices: SearchInvoice[];
  contacts: SearchContact[];
}

export default function TopBar({ userInitials = 'U', userName, onHamburger }: TopBarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      setResults(data);
      setOpen(true);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function formatMoney(n?: number) {
    if (n == null) return '';
    return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
  }

  const hasResults = results && (results.invoices.length > 0 || results.contacts.length > 0);

  return (
    <header className={styles.topbar}>
      <button className={styles.hamburger} onClick={onHamburger} aria-label="Abrir menú">
        <span /><span /><span />
      </button>

      <div className={styles.searchWrap} ref={wrapRef}>
        <span className={styles.searchIcon}>{searching ? '⏳' : '🔍'}</span>
        <input
          type="text"
          placeholder={t.topbar.search}
          className={styles.search}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (hasResults) setOpen(true); }}
          autoComplete="off"
        />

        {open && (
          <div className={styles.dropdown}>
            {!hasResults && (
              <div className={styles.dropEmpty}>Sin resultados para &ldquo;{query}&rdquo;</div>
            )}

            {results && results.invoices.length > 0 && (
              <div className={styles.dropSection}>
                <div className={styles.dropLabel}>Facturas</div>
                {results.invoices.map((inv, i) => (
                  <button
                    key={inv.invoice_id ?? i}
                    className={styles.dropItem}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/dashboard/billing?q=${encodeURIComponent(query)}`);
                    }}
                  >
                    <span className={styles.dropMain}>{inv.invoice_number ?? '—'} · {inv.buyer_name}</span>
                    <span className={styles.dropSub}>{formatMoney(inv.total_amount)}</span>
                  </button>
                ))}
              </div>
            )}

            {results && results.contacts.length > 0 && (
              <div className={styles.dropSection}>
                <div className={styles.dropLabel}>Contactos</div>
                {results.contacts.map(c => (
                  <button
                    key={c.id}
                    className={styles.dropItem}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/dashboard/contactos?q=${encodeURIComponent(query)}`);
                    }}
                  >
                    <span className={styles.dropMain}>{c.businessName}</span>
                    <span className={styles.dropSub}>{c.docType} {c.docNumber !== '0' ? c.docNumber : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Link href="/dashboard/soporte" className={styles.iconBtn} title="Soporte">🎫</Link>
        <Link href="/faq" className={styles.iconBtn} title="FAQ">❓</Link>
        <NotificationBell />
        <Link href="/dashboard/facturacion/simplificada" className="btn btn-primary btn-sm">
          + Nueva factura
        </Link>
        <div className={styles.avatar} title={userName}>{userInitials}</div>
      </div>
    </header>
  );
}
