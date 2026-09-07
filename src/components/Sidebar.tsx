'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';
import { LogoWhite } from './Logo';
import { hasPermission, type PermissionKey } from '@/lib/permissions';
import {
  IconCart, IconReceipt, IconCard, IconChart, IconBank, IconBox, IconMegaphone, IconUser, IconPercent,
} from './LandingIcons';
import {
  IconUsers, IconWallet, IconBanknote, IconCalendar, IconTruck, IconLink, IconTag, IconFolder,
  IconBook, IconHelp, IconGear, IconBolt, IconHome,
} from './AppIcons';
import styles from './Sidebar.module.css';

interface SidebarProps {
  orgName?: string;
  userEmail?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type IconComponent = (props: { size?: number }) => React.ReactElement;

const FACTURACION_ITEMS: { href: string; label: string; Icon: IconComponent }[] = [
  { href: '/dashboard/facturacion/simplificada', label: 'Facturación Rápida', Icon: IconBolt },
  { href: '/dashboard/facturacion/manual',       label: 'Comprobante Manual', Icon: IconReceipt },
  { href: '/dashboard/facturacion/programadas',  label: 'Facturas Programadas', Icon: IconCalendar },
  { href: '/dashboard/facturacion/lotes',        label: 'Facturación Masiva', Icon: IconBox },
];
const FACTURACION_PERMISSION: PermissionKey = 'manage_invoices';

type NavItem = { href: string; label: string; Icon: IconComponent; permission?: PermissionKey; ivaOnly?: boolean };
type NavGroup = { title: string; items: NavItem[] };

// Agrupado en secciones (antes era una lista plana) — separa Ventas, Comprobantes/Cobranzas,
// Finanzas y Operación/Configuración para que se pueda escanear de un vistazo en vez de leer
// 20 ítems seguidos sin jerarquía.
const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Ventas',
    items: [
      { href: '/dashboard/ventas',    label: 'Ventas',    Icon: IconCart, permission: 'view_reports' },
      { href: '/dashboard/contactos', label: 'Clientes',  Icon: IconUser, permission: 'manage_clients' },
      { href: '/dashboard/organizacion/productos', label: 'Productos y Stock', Icon: IconBox, permission: 'manage_products' },
      { href: '/dashboard/ads',       label: 'Publicidad', Icon: IconMegaphone, permission: 'view_reports' },
    ],
  },
  {
    title: 'Facturación',
    items: [
      { href: '/dashboard/billing',   label: 'Comprobantes', Icon: IconReceipt, permission: 'manage_invoices' },
      { href: '/dashboard/cobranzas', label: 'Cobranzas',    Icon: IconWallet, permission: 'view_reports' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { href: '/dashboard/organizacion/rentabilidad', label: 'Rentabilidad',          Icon: IconChart, permission: 'manage_products' },
      { href: '/dashboard/organizacion/iva',          label: 'IVA',                   Icon: IconPercent, permission: 'view_reports', ivaOnly: true },
      { href: '/dashboard/organizacion/ganancias',    label: 'Posición de Ganancias', Icon: IconBanknote, permission: 'view_reports', ivaOnly: true },
      { href: '/dashboard/organizacion/iibb',         label: 'Posición de IIBB',      Icon: IconBank, permission: 'view_reports', ivaOnly: true },
      { href: '/dashboard/organizacion/calendario-impositivo', label: 'Vencimientos', Icon: IconCalendar },
    ],
  },
  {
    title: 'Operación',
    items: [
      { href: '/dashboard/envios',       label: 'Envíos',        Icon: IconTruck, permission: 'manage_invoices' },
      { href: '/dashboard/integraciones', label: 'Integraciones', Icon: IconLink, permission: 'manage_settings' },
      { href: '/dashboard/organizacion/listas-precios', label: 'Listas de Precios', Icon: IconTag, permission: 'manage_products' },
      { href: '/dashboard/organizacion/centros-costo',  label: 'Centros de Costo',  Icon: IconFolder, permission: 'manage_clients' },
      { href: '/dashboard/tutoriales', label: 'Tutoriales', Icon: IconBook },
      { href: '/dashboard/soporte',    label: 'Soporte',    Icon: IconHelp },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { href: '/dashboard/organizacion/usuarios', label: 'Usuarios y Permisos', Icon: IconUsers, permission: 'manage_settings' },
      { href: '/dashboard/cuenta',                label: 'Mi cuenta',           Icon: IconCard },
      { href: '/dashboard/organizacion',          label: 'Configuración',       Icon: IconGear, permission: 'manage_settings' },
    ],
  },
];

export default function Sidebar({ orgName = 'Mi Organización', userEmail, mobileOpen = false, onMobileClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const isFacturacion = pathname.startsWith('/dashboard/facturacion');
  const [facturacionOpen, setFacturacionOpen] = useState(isFacturacion);
  const [afipConfigured, setAfipConfigured] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<{ role: string; permissions: string[] } | null>(null);
  const [isResponsableInscripto, setIsResponsableInscripto] = useState(true);

  useEffect(() => {
    fetch('/api/organizacion/afip-status')
      .then(r => r.json())
      .then(d => setAfipConfigured(d.configured ?? false))
      .catch(() => setAfipConfigured(false));
    fetch('/api/organizacion/mi-perfil')
      .then(r => r.json())
      .then(d => setProfile({ role: d.role ?? 'ADMIN', permissions: d.permissions ?? [] }))
      .catch(() => setProfile({ role: 'ADMIN', permissions: [] }));
    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(d => setIsResponsableInscripto(d?.fiscalTreatment === 'RESPONSABLE_INSCRIPTO'))
      .catch(() => {});
  }, []);

  // Mientras carga el perfil, no ocultamos nada (evita parpadeo); una vez cargado, filtramos.
  function filterItems(items: NavItem[]) {
    return (profile
      ? items.filter(item => !item.permission || hasPermission(profile, item.permission as PermissionKey))
      : items
    ).filter(item => !item.ivaOnly || isResponsableInscripto);
  }
  const visibleGroups = NAV_GROUPS
    .map(g => ({ ...g, items: filterItems(g.items) }))
    .filter(g => g.items.length > 0);
  const canSeeFacturacion = !profile || hasPermission(profile, FACTURACION_PERMISSION);

  const close = () => onMobileClose?.();

  return (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      <button className={styles.closeBtn} onClick={close} aria-label="Cerrar menú">✕</button>
      {onToggleCollapse && (
        <button className={styles.collapseBtn} onClick={onToggleCollapse} aria-label={collapsed ? 'Expandir menú' : 'Reducir menú'} title={collapsed ? 'Expandir menú' : 'Reducir menú'}>
          {collapsed ? '»' : '«'}
        </button>
      )}

      <div className={styles.logo}>
        <Link href="/dashboard" onClick={close}><LogoWhite size="sm" /></Link>
        {!collapsed && orgName && <span className={styles.orgName}>{orgName}</span>}
        {!collapsed && afipConfigured === true && (
          <span className={`${styles.afipBadge} ${styles.afipOk}`}>● AFIP activo</span>
        )}
        {!collapsed && afipConfigured === false && (
          <Link href="/dashboard/organizacion" onClick={close} className={`${styles.afipBadge} ${styles.afipWarn}`}>
            ⚠ Configurar AFIP
          </Link>
        )}
      </div>

      <nav className={styles.nav}>
        <Link href="/dashboard" onClick={close} title="Inicio"
          className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}>
          <span className={styles.icon}><IconHome size={17} /></span>
          {!collapsed && <span>Inicio</span>}
        </Link>

        {visibleGroups.map(group => (
          <div key={group.title}>
            {!collapsed && <div className={styles.navTitle}>{group.title}</div>}

            {group.title === 'Facturación' && canSeeFacturacion && (
              collapsed ? (
                <Link href="/dashboard/facturacion/simplificada" onClick={close} title="Facturación Rápida"
                  className={`${styles.navItem} ${isFacturacion ? styles.active : ''}`}>
                  <span className={styles.icon}><IconBolt size={17} /></span>
                </Link>
              ) : (
                <div>
                  <button
                    className={`${styles.navItem} ${styles.navBtn} ${isFacturacion || facturacionOpen ? styles.active : ''}`}
                    onClick={() => setFacturacionOpen(!facturacionOpen)}
                  >
                    <span className={styles.icon}><IconBolt size={17} /></span>
                    <span>Facturación Rápida</span>
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
              )
            )}

            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
              return (
                <Link key={item.href} href={item.href} onClick={close} title={item.label}
                  className={`${styles.navItem} ${active ? styles.active : ''}`}>
                  <span className={styles.icon}><item.Icon size={17} /></span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        {!collapsed && <div className={styles.upgradeBanner}>
          <div className={styles.upgradeTitle}>Mejorar Plan</div>
          <div className={styles.upgradeText}>Desbloqueá todas las funciones</div>
          <Link href="/dashboard/suscripcion" onClick={close} className={styles.upgradeBtn}>Ver planes →</Link>
        </div>}

        {!collapsed && <div className={styles.userSection}>
          {userEmail && <span className={styles.userEmail}>{userEmail}</span>}
          <Link href="/dashboard/soporte" onClick={close} className={styles.bottomLink}>Soporte</Link>
          <form action={logout}>
            <button type="submit" className={styles.bottomLink}>Cerrar sesión</button>
          </form>
        </div>}
      </div>
    </aside>
  );
}
