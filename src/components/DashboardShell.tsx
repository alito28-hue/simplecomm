'use client';

import { useState } from 'react';
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

export default function DashboardShell({ orgName, userEmail, userInitials, userName, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar
        orgName={orgName}
        userEmail={userEmail}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={styles.content}>
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
