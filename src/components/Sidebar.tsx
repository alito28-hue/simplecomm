'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';
import { LogoWhite } from './Logo';
import { hasPermission, type PermissionKey } from '@/lib/permissions';
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
  { href: '/dashboard/facturacion/programadas',  label: '🗓 Facturas Programadas' },
  { href: '/dashboard/facturacion/lotes',        label: '📦 Facturación Masiva' },
];
const FACTURACION_PERMISSION: PermissionKey = 'manage_invoices';

const NAV: { href: string; label: string; icon: string; permission?: PermissionKey }[] = [
  { href: '/dashboard/billing',       label: 'Comprobantes', icon: '🧾', permission: 'manage_invoices' },
  { href: '/dashboard/contactos',     label: 'Clientes',    icon: '👤', permission: 'manage_clients' },
  { href: '/dashboard/cobranzas',     label: 'Cobranzas',    icon: '💰', permission: 'view_reports' },
  { href: '/dashboard/ads',           label: 'Publicidad',   icon: '📈', permission: 'view_reports' },
  { href: '/dashboard/tutoriales',    label: 'Tutoriales',   icon: '📚' },
  { href: '/dashboard/soporte',       label: 'Soporte',      icon: '🎫' },
  { href: '/dashboard/integraciones', label: 'Integraciones', icon: '🔗', permission: 'manage_settings' },
  { href: '/dashboard/cuenta',        label: 'Mi cuenta',     icon: '💳' },
  { href: '/dashboard/organizacion',  label: 'Configuración', icon: '⚙', permission: 'manage_settings' },
];

export default function Sidebar({ orgName = 'Mi Organización', userEmail, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const isFacturacion = pathname.startsWith('/dashboard/facturacion');
  const [facturacionOpen, setFacturacionOpen] = useState(isFacturacion);
  const [afipConfigured, setAfipConfigured] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<{ role: string; permissions: string[] } | null>(null);

  useEffect(() => {
    fetch('/api/organizacion/afip-status')
      .then(r => r.json())
      .then(d => setAfipConfigured(d.configured ?? false))
      .catch(() => setAfipConfigured(false));
    fetch('/api/organizacion/mi-perfil')
      .then(r => r.json())
      .then(d => setProfile({ role: d.role ?? 'ADMIN', permissions: d.permissions ?? [] }))
      .catch(() => setProfile({ role: 'ADMIN', permissions: [] }));
  }, []);

  // Mientras carga el perfil, no ocultamos nada (evita parpadeo); una vez cargado, filtramos.
  const visibleNav = profile
    ? NAV.filter(item => !item.permission || hasPermission(profile, item.permission as PermissionKey))
    : NAV;
  const canSeeFacturacion = !profile || hasPermission(profile, FACTURACION_PERMISSION);

  const close = () => onMobileClose?.();

  return (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
      <button className={styles.closeBtn} onClick={close} aria-label="Cerrar menú">✕</button>

      <div className={styles.logo}>
        <Link href="/dashboard" onClick={close}><LogoWhite size="sm" /></Link>
        {orgName && <span className={styles.orgName}>{orgName}</span>}
        {afipConfigured === true && (
          <span className={`${styles.afipBadge} ${styles.afipOk}`}>● AFIP activo</span>
        )}
        {afipConfigured === false && (
          <Link href="/dashboard/organizacion" onClick={close} className={`${styles.afipBadge} ${styles.afipWarn}`}>
            ⚠ Configurar AFIP
          </Link>
        )}
      </div>

      <nav className={styles.nav}>
        <Link href="/dashboard" onClick={close}
          className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}>
          <span className={styles.icon}>⊞</span>
          <span>Dashboard</span>
        </Link>

        {canSeeFacturacion && (
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
        )}

        {visibleNav.map((item) => {
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
