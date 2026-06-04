'use client';

import { useState } from 'react';
import styles from './TopBar.module.css';

interface TopBarProps {
  title?: string;
  userInitials?: string;
  userName?: string;
}

export default function TopBar({ title, userInitials = 'U', userName }: TopBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className={styles.topbar}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search invoices or integrations..."
          className={`${styles.search} ${searchFocused ? styles.focused : ''}`}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn} title="Notifications">
          🔔
        </button>
        <button className={styles.iconBtn} title="Help">
          ⓘ
        </button>
        <a href="/dashboard/soporte" className={styles.supportBtn}>
          Support
        </a>
        <button className={`btn btn-primary btn-sm ${styles.campaignBtn}`}>
          New Campaign
        </button>
        <div className={styles.avatar} title={userName}>
          {userInitials}
        </div>
      </div>
    </header>
  );
}
