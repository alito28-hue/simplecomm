'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import styles from './TopBar.module.css';

interface TopBarProps {
  userInitials?: string;
  userName?: string;
}

export default function TopBar({ userInitials = 'U', userName }: TopBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const { t } = useI18n();

  return (
    <header className={styles.topbar}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder={t.topbar.search}
          className={`${styles.search} ${searchFocused ? styles.focused : ''}`}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn} title="Notificaciones">🔔</button>
        <button className={styles.iconBtn} title="Ayuda">ⓘ</button>
        <a href="/dashboard/soporte" className={styles.supportBtn}>
          {t.nav.support}
        </a>
        <button className={`btn btn-primary btn-sm ${styles.campaignBtn}`}>
          {t.topbar.newCampaign}
        </button>
        <div className={styles.avatar} title={userName}>{userInitials}</div>
      </div>
    </header>
  );
}
