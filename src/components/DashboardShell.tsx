'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './DashboardShell.module.css';

interface Props {
  orgName: string;
  userEmail?: string;
  userInitials: string;
  userName?: string;
  children: React.ReactNode;
}

const COLLAPSE_KEY = 'simplecomm_sidebar_collapsed';

export default function DashboardShell({ orgName, userEmail, userInitials, userName, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Se lee después del montaje (no en el initializer de useState) porque
    // localStorage no existe durante el render en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className={styles.shell}>
      <Sidebar
        orgName={orgName}
        userEmail={userEmail}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={`${styles.content} ${collapsed ? styles.contentCollapsed : ''}`}>
        <TopBar
          userInitials={userInitials}
          userName={userName}
          onHamburger={() => setSidebarOpen(true)}
        />
        {children}
      </div>
    </div>
  );
}
