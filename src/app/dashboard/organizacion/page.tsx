import Link from 'next/link';
import styles from './organizacion.module.css';

const SETTINGS_SECTIONS = [
  { href: '/dashboard/organizacion/empresa',         icon: '🏢', title: 'Company',       desc: 'Fiscal data, CUIT, address, IVA settings' },
  { href: '/dashboard/organizacion/puntos-de-venta', icon: '🏪', title: 'Points of Sale', desc: 'Manage your ARCA-registered sales points' },
  { href: '/dashboard/organizacion/clientes',        icon: '👥', title: 'Clients',        desc: 'Customer directory with fiscal data' },
  { href: '/dashboard/organizacion/productos',       icon: '📦', title: 'Products',       desc: 'Products and services catalog' },
  { href: '/dashboard/organizacion/usuarios',        icon: '👤', title: 'Users',          desc: 'Team members and permissions' },
];

export default function OrganizacionPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Manage your organization, team, and configurations.</p>
      </div>

      <div className={styles.grid}>
        {SETTINGS_SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className={`card ${styles.settingCard}`}>
            <div className={styles.settingIcon}>{s.icon}</div>
            <h3 className={styles.settingTitle}>{s.title}</h3>
            <p className={styles.settingDesc}>{s.desc}</p>
            <span className={styles.settingArrow}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
