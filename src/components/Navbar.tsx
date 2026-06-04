'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';
import type { User } from '@supabase/supabase-js';
import styles from './Navbar.module.css';

interface NavbarProps {
  user: User;
  orgName?: string;
  vouchersLeft?: number;
  subscriptionExpiry?: string;
}

const NAV_ITEMS = [
  {
    label: 'Reportes',
    href: '/dashboard',
    children: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Informes', href: '/dashboard/reportes/informes' },
    ],
  },
  { label: 'Comprobantes', href: '/dashboard/comprobantes' },
  {
    label: 'Facturación',
    href: '/dashboard/facturacion',
    children: [
      { label: 'Comprobante manual', href: '/dashboard/facturacion/manual' },
      { label: 'Facturación simplificada', href: '/dashboard/facturacion/simplificada' },
      { label: 'Importación de lotes', href: '/dashboard/facturacion/lotes' },
    ],
  },
  { label: 'Cobranzas', href: '/dashboard/cobranzas' },
  { label: 'Integraciones', href: '/dashboard/integraciones' },
  {
    label: 'Mi organización',
    href: '/dashboard/organizacion',
    children: [
      { label: 'Empresa', href: '/dashboard/organizacion/empresa' },
      { label: 'Usuarios', href: '/dashboard/organizacion/usuarios' },
      { label: 'Puntos de venta', href: '/dashboard/organizacion/puntos-de-venta' },
      { label: 'Clientes', href: '/dashboard/organizacion/clientes' },
      { label: 'Productos y servicios', href: '/dashboard/organizacion/productos' },
    ],
  },
];

export default function Navbar({ user, orgName = 'Mi empresa', vouchersLeft = 1000, subscriptionExpiry = '18/06/2026' }: NavbarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className={styles.navbar} ref={menuRef}>
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.logo}>
          <span className={styles.logoIcon}>S</span>
        </Link>

        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const hasChildren = item.children && item.children.length > 0;

            return (
              <li key={item.href} className={styles.navItem}>
                {hasChildren ? (
                  <>
                    <button
                      className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                      onClick={() => setOpenMenu(openMenu === item.href ? null : item.href)}
                    >
                      {item.label}
                      <span className={styles.chevron}>▾</span>
                    </button>
                    {openMenu === item.href && (
                      <div className={styles.dropdown}>
                        {item.children!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={styles.dropdownItem}
                            onClick={() => setOpenMenu(null)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className={styles.userSection}>
          <button
            className={styles.userBtn}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            {orgName}
            <span className={styles.chevron}>▾</span>
          </button>
          {userMenuOpen && (
            <div className={styles.userDropdown}>
              <div className={styles.userInfo}>
                <strong>{orgName}</strong>
                <span className={styles.userEmail}>👤 {user.email}</span>
              </div>
              <div className={styles.userStats}>
                <p>Tiene <strong className={styles.green}>{vouchersLeft.toLocaleString()}</strong> comprobantes disponibles</p>
                <p>Vencen el <strong className={styles.green}>{subscriptionExpiry}</strong></p>
              </div>
              <div className={styles.userActions}>
                <Link href="/dashboard/cuenta" className={styles.userAction} onClick={() => setUserMenuOpen(false)}>
                  Mi cuenta
                </Link>
                <Link href="/dashboard/cuenta/contrasena" className={styles.userAction} onClick={() => setUserMenuOpen(false)}>
                  🔒 Cambiar contraseña
                </Link>
                <form action={logout}>
                  <button type="submit" className={`${styles.userAction} ${styles.logout}`}>
                    ↪ Cerrar sesión
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
