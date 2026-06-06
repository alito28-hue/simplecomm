'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';
import { LogoWhite } from './Logo';
import { useI18n } from '@/lib/i18n/context';
import styles from './Sidebar.module.css';

interface SidebarProps {
  orgName?: string;
  userEmail?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const FACTURACION_ITEMS = [
  { href: '/dashboard/facturacion/simplificada', label: '⚡ Facturación Rápida' },
  { href: '/dashboard/facturacion/manual',       label: '📄 Comprobante Manual' },
  { href: '/dashboard/facturacion/lotes',        label: '📦 Facturación Masiva' },
];

const NAV = [
  { href: '/dashboard/billing',       label: 'Comprobantes', icon: '🧾' },
  { href: '/dashboard/contactos',     label: 'Contactos',    icon: '👤' },
  { href: '/dashboard/cobranzas',     label: 'Cobranzas',    icon: '💰' },
  { href: '/dashboard/ads',           label: 'Publicidad',   icon: '📈' },
  { href: '/dashboard/tutoriales',    label: 'Tutoriales',   icon: '📚' },
  { href: '/dashboard/soporte',       label: 'Soporte',      icon: '🎫' },
  { href: '/dashboard/integraciones', label: 'Integraciones', icon: '🔗' },
  { href: '/dashboard/cuenta',        label: 'Mi cuenta',     icon: '💳' },
  { href: '/dashboard/organizacion',  label: 'Configuración', icon: '⚙' },
];

export default function Sidebar({ orgName = 'Mi Organización', userEmail, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();
  const isFacturacion = pathname.startsWith('/dashboard/facturacion');
  const [facturacionOpen, setFacturacionOpen] = useState(isFacturacion);

  const close = () => onMobileClose?.();

  return (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
      <button className={styles.closeBtn} onClick={close} aria-label="Cerrar menú">✕</button>

      <div className={styles.logo}>
        <Link href="/dashboard" onClick={close}><LogoWhite size="sm" /></Link>
        {orgName && <span className={styles.orgName}>{orgName}</span>}
      </div>

      <nav className={styles.nav}>
        <Link href="/dashboard" onClick={close}
          className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}>
          <span className={styles.icon}>⊞</span>
          <span>Dashboard</span>
        </Link>

        <div>
          <button
            className={`${styles.navItem} ${styles.navBtn} ${isFacturacion || facturacionOpen ? styles.active : ''}`}
            onClick={() => setFacturacionOpen(!facturacionOpen)}
          >
            <span className={styles.icon}>⚡</span>
            <span>Facturación</span>
            <span className={styles.chevron}>{facturacionOpen ? '▾' : '▸'}</span>
          </button>
          {facturacionOpen && (
            <div className={styles.subMenu}>
              {FACTURACION_ITEMS.map(item => (
                <Link key={item.href} href={item.href} onClick={close}
                  className={`${styles.subItem} ${pathname === item.href ? styles.subActive : ''}`}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link key={item.href} href={item.href} onClick={close}
              className={`${styles.navItem} ${active ? styles.active : ''}`}>
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.langToggle}>
          <button onClick={() => setLocale('es')} className={`${styles.langBtn} ${locale === 'es' ? styles.langActive : ''}`}>ES</button>
          <button onClick={() => setLocale('en')} className={`${styles.langBtn} ${locale === 'en' ? styles.langActive : ''}`}>EN</button>
        </div>

        <div className={styles.upgradeBanner}>
          <div className={styles.upgradeTitle}>Mejorar Plan</div>
          <div className={styles.upgradeText}>Desbloqueá todas las funciones</div>
          <Link href="/dashboard/suscripcion" onClick={close} className={styles.upgradeBtn}>Ver planes →</Link>
        </div>

        <div className={styles.userSection}>
          {userEmail && <span className={styles.userEmail}>{userEmail}</span>}
          <Link href="/dashboard/soporte" onClick={close} className={styles.bottomLink}>Soporte</Link>
          <form action={logout}>
            <button type="submit" className={styles.bottomLink}>Cerrar sesión</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
