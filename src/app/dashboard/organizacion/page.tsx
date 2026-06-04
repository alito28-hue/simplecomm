import Link from 'next/link';
import styles from './organizacion.module.css';

const SECCIONES = [
  { href: '/dashboard/organizacion/empresa',         icon: '🏢', title: 'Empresa',          desc: 'Datos fiscales, CUIT, domicilio, configuración IVA' },
  { href: '/dashboard/organizacion/puntos-de-venta', icon: '🏪', title: 'Puntos de Venta',  desc: 'Gestioná tus puntos de venta registrados en ARCA' },
  { href: '/dashboard/organizacion/clientes',        icon: '👥', title: 'Clientes',          desc: 'Directorio de clientes con datos fiscales' },
  { href: '/dashboard/organizacion/productos',       icon: '📦', title: 'Productos',         desc: 'Catálogo de productos y servicios' },
  { href: '/dashboard/organizacion/usuarios',        icon: '👤', title: 'Usuarios',          desc: 'Miembros del equipo y permisos' },
];

export default function OrganizacionPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Configuración</h1>
        <p className={styles.pageSubtitle}>Gestioná tu organización, equipo y configuraciones.</p>
      </div>
      <div className={styles.grid}>
        {SECCIONES.map((s) => (
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
