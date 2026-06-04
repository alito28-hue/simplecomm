'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';
import { LogoWhite } from './Logo';
import { useI18n } from '@/lib/i18n/context';
import styles from './Sidebar.module.css';

const NAV_KEYS = [
  { href: '/dashboard',                        key: 'dashboard',    icon: '⊞' },
  { href: '/dashboard/billing',                key: 'billing',      icon: '⚡' },
  { href: '/dashboard/facturacion/simplificada', key: 'billing',    icon: '🧾', label: 'Facturar' },
  { href: '/dashboard/cobranzas',              key: 'billing',      icon: '💰', label: 'Cobranzas' },
  { href: '/dashboard/integraciones',          key: 'integrations', icon: '🔗' },
  { href: '/dashboard/ads',                    key: 'ads',          icon: '📈' },
  { href: '/dashboard/tutoriales',             key: 'tutorials',    icon: '📚' },
  { href: '/dashboard/organizacion',           key: 'settings',     icon: '⚙' },
] as const;

interface SidebarProps {
  orgName?: string;
  userEmail?: string;
}

export default function Sidebar({ orgName = 'Mi Organización', userEmail }: SidebarProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Link href="/dashboard">
          <LogoWhite size="sm" />
        </Link>
        {orgName && <span className={styles.orgName}>{orgName}</span>}
      </div>

      <nav className={styles.nav}>
        {NAV_KEYS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const label = 'label' in item ? item.label : t.nav[item.key];
          return (
            <Link key={item.href} href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ''}`}>
              <span className={styles.icon}>{item.icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottom}>
        {/* Language toggle */}
        <div className={styles.langToggle}>
          <button onClick={() => setLocale('es')}
            className={`${styles.langBtn} ${locale === 'es' ? styles.langActive : ''}`}>
            ES
          </button>
          <button onClick={() => setLocale('en')}
            className={`${styles.langBtn} ${locale === 'en' ? styles.langActive : ''}`}>
            EN
          </button>
        </div>

        <div className={styles.upgradeBanner}>
          <div className={styles.upgradeTitle}>{t.nav.upgrade}</div>
          <div className={styles.upgradeText}>
            {locale === 'es' ? 'Desbloqueá todas las funciones' : 'Unlock all features'}
          </div>
          <Link href="/dashboard/suscripcion" className={styles.upgradeBtn}>
            {locale === 'es' ? 'Mejorar →' : 'Upgrade →'}
          </Link>
        </div>

        <div className={styles.userSection}>
          {userEmail && <span className={styles.userEmail}>{userEmail}</span>}
          <Link href="/dashboard/soporte" className={styles.bottomLink}>{t.nav.support}</Link>
          <form action={logout}>
            <button type="submit" className={styles.bottomLink}>{t.nav.signOut}</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
