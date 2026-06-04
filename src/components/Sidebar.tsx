'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';
import { LogoWhite } from './Logo';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/dashboard',               label: 'Dashboard',     icon: '⊞' },
  { href: '/dashboard/billing',       label: 'Billing',       icon: '⚡' },
  { href: '/dashboard/integraciones', label: 'Integrations',  icon: '🔗' },
  { href: '/dashboard/ads',           label: 'Ads',           icon: '📈' },
  { href: '/dashboard/tutoriales',    label: 'Tutorials',     icon: '📚' },
  { href: '/dashboard/organizacion',  label: 'Settings',      icon: '⚙' },
];

interface SidebarProps {
  orgName?: string;
  userEmail?: string;
}

export default function Sidebar({ orgName = 'My Organization', userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <Link href="/dashboard">
          <LogoWhite size="sm" />
        </Link>
        {orgName && <span className={styles.orgName}>{orgName}</span>}
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ''}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={styles.bottom}>
        <div className={styles.upgradeBanner}>
          <div className={styles.upgradeTitle}>Upgrade Plan</div>
          <div className={styles.upgradeText}>Unlock all features</div>
          <Link href="/dashboard/suscripcion" className={styles.upgradeBtn}>
            Upgrade →
          </Link>
        </div>

        <div className={styles.userSection}>
          {userEmail && (
            <span className={styles.userEmail}>{userEmail}</span>
          )}
          <Link href="/dashboard/soporte" className={styles.bottomLink}>
            Support
          </Link>
          <form action={logout}>
            <button type="submit" className={styles.bottomLink}>
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
