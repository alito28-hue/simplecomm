'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './NotificationBell.module.css';

interface Notif {
  id: string; type: string; title: string; body: string | null;
  isRead: boolean; actionUrl: string | null; createdAt: string;
}

export default function NotificationBell() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [open, setOpen]       = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.isRead).length;

  useEffect(() => {
    fetch('/api/notificaciones').then(r => r.json()).then(d => setNotifs(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAllRead() {
    await fetch('/api/notificaciones/leer-todo', { method: 'POST' });
    setNotifs(n => n.map(x => ({ ...x, isRead: true })));
  }

  return (
    <div ref={ref} className={styles.wrap}>
      <button className={styles.bell} onClick={() => setOpen(!open)} title="Notificaciones">
        🔔
        {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Notificaciones</span>
            {unread > 0 && (
              <button className={styles.markAll} onClick={markAllRead}>Marcar todas como leídas</button>
            )}
          </div>

          <div className={styles.list}>
            {notifs.length === 0 ? (
              <div className={styles.empty}>Sin notificaciones</div>
            ) : notifs.map(n => (
              <div key={n.id} className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}>
                <div className={styles.dot} style={{
                  background: n.type === 'success' ? 'var(--success)' : n.type === 'error' ? 'var(--error)' : 'var(--blue)',
                }} />
                <div className={styles.content}>
                  <p className={styles.title}>{n.title}</p>
                  {n.body && <p className={styles.body}>{n.body}</p>}
                  <p className={styles.time}>{new Date(n.createdAt).toLocaleDateString('es-AR')}</p>
                </div>
                {n.actionUrl && (
                  <Link href={n.actionUrl} className={styles.action} onClick={() => setOpen(false)}>→</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
