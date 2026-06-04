'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import styles from './TopBar.module.css';

interface TopBarProps {
  userInitials?: string;
  userName?: string;
}

export default function TopBar({ userInitials = 'U', userName }: TopBarProps) {
  const { t } = useI18n();

  return (
    <header className={styles.topbar}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input type="text" placeholder={t.topbar.search}
          className={styles.search} readOnly style={{ cursor: 'default' }} />
      </div>

      <div className={styles.actions}>
        <Link href="/dashboard/soporte" className={styles.iconBtn} title="Soporte">🎫</Link>
        <Link href="/faq" className={styles.iconBtn} title="FAQ">❓</Link>
        <Link href="/dashboard/facturacion/simplificada" className="btn btn-primary btn-sm">
          + Nueva factura
        </Link>
        <div className={styles.avatar} title={userName}>{userInitials}</div>
      </div>
    </header>
  );
}
