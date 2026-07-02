'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './organizacion.module.css';

const SECCIONES = [
  { href: '/dashboard/organizacion/empresa',         icon: '🏢', title: 'Empresa',          desc: 'Datos fiscales, CUIT, domicilio, configuración IVA' },
  { href: '/dashboard/organizacion/puntos-de-venta', icon: '🏪', title: 'Puntos de Venta',  desc: 'Gestioná tus puntos de venta registrados en ARCA' },
  { href: '/dashboard/organizacion/clientes',        icon: '👥', title: 'Clientes',          desc: 'Directorio de clientes con datos fiscales' },
  { href: '/dashboard/organizacion/productos',       icon: '📦', title: 'Productos',         desc: 'Catálogo de productos y servicios' },
  { href: '/dashboard/organizacion/listas-precios',  icon: '💲', title: 'Listas de Precios', desc: 'Precios especiales por lista (mayorista, minorista, etc.)' },
  { href: '/dashboard/organizacion/centros-costo',   icon: '🏷', title: 'Centros de Costo',  desc: 'Etiquetá contactos para reportes por proyecto o área' },
  { href: '/dashboard/organizacion/compras',         icon: '🧾', title: 'Compras',           desc: 'Facturas de proveedores para tu posición de IVA' },
  { href: '/dashboard/organizacion/calendario-impositivo', icon: '📅', title: 'Calendario de Vencimientos', desc: 'Recordatorios impositivos y calendario oficial de ARCA' },
  { href: '/dashboard/organizacion/usuarios',        icon: '👤', title: 'Usuarios',          desc: 'Miembros del equipo y permisos' },
];

export default function OrganizacionPage() {
  const [personType, setPersonType] = useState('');

  useEffect(() => {
    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(data => setPersonType(data?.personType ?? ''))
      .catch(() => {});
  }, []);

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
            <h3 className={styles.settingTitle}>
              {s.href === '/dashboard/organizacion/empresa' && personType === 'FISICA' ? 'Persona Física' : s.title}
            </h3>
            <p className={styles.settingDesc}>{s.desc}</p>
            <span className={styles.settingArrow}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
