'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';
import OnboardingChecklist from './OnboardingChecklist';
import IvaPositionCard from './IvaPositionCard';
import MonotributoStatusCard from './MonotributoStatusCard';
import NegocioResumenCard from './NegocioResumenCard';
import VentasPorCanalCard from './VentasPorCanalCard';
import AttentionPanel from './AttentionPanel';
import VentasPeriodoChart from './VentasPeriodoChart';
import RentabilidadResumenCard from './RentabilidadResumenCard';
import VencimientosResumenCard from './VencimientosResumenCard';
import { IconCart, IconReceipt, IconUser, IconBox, IconChart, IconPercent, IconMegaphone, IconBank } from '@/components/LandingIcons';
import { IconBolt, IconTag, IconFolder, IconBanknote, IconCalendar, IconUsers, IconLink, IconGear } from '@/components/AppIcons';

interface LastInvoice {
  invoice_id?: string;
  invoice_number: string | null;
  buyer_name: string;
  total_amount: number;
  created_at: string;
  status: string;
  origin?: string;
}

interface KPIs {
  monthInvoices: number;
  monthAmount: number;
  monthVsLastAmount: number;
  pendingCount: number;
  lastInvoices: LastInvoice[];
}

interface PublicidadResumen {
  totalInvertido: number;
  ingresoTotal: number;
  roas: number | null;
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const MODULES = [
  { href: '/dashboard/facturacion/simplificada',       Icon: IconBolt,     title: 'Facturación Rápida',  desc: 'Emitir una factura al instante' },
  { href: '/dashboard/billing',                        Icon: IconReceipt,  title: 'Comprobantes',         desc: 'Emitidos y recibidos — facturas, cobros e importación de ARCA' },
  { href: '/dashboard/ventas',                          Icon: IconCart,     title: 'Ventas',               desc: 'Qué vendiste y por qué canal — ML, Tiendanube, Shopify y más' },
  { href: '/dashboard/contactos',                       Icon: IconUser,     title: 'Clientes',             desc: 'Directorio y datos fiscales' },
  { href: '/dashboard/organizacion/productos',          Icon: IconBox,      title: 'Productos y Stock',    desc: 'Catálogo, precios e inventario' },
  { href: '/dashboard/organizacion/rentabilidad',        Icon: IconChart,    title: 'Rentabilidad',         desc: 'Ganancia del negocio (ventas menos compras) y margen por producto' },
  { href: '/dashboard/organizacion/listas-precios',      Icon: IconTag,      title: 'Listas de Precios',    desc: 'Precios especiales por lista' },
  { href: '/dashboard/organizacion/centros-costo',       Icon: IconFolder,   title: 'Centros de Costo',     desc: 'Agrupá clientes por proyecto' },
  { href: '/dashboard/organizacion/iva',                Icon: IconPercent,  title: 'IVA',                  desc: 'Posición de IVA (ventas menos compras)', ivaOnly: true },
  { href: '/dashboard/organizacion/ganancias',           Icon: IconBanknote, title: 'Posición de Ganancias', desc: 'Ganancia estimada e Impuesto a las Ganancias por ejercicio', ivaOnly: true },
  { href: '/dashboard/organizacion/iibb',                Icon: IconBank,     title: 'Posición de IIBB',     desc: 'Percepciones de Ingresos Brutos adelantadas por el banco', ivaOnly: true },
  { href: '/dashboard/organizacion/calendario-impositivo', Icon: IconCalendar, title: 'Vencimientos',       desc: 'Calendario impositivo y recordatorios' },
  { href: '/dashboard/organizacion/usuarios',            Icon: IconUsers,    title: 'Usuarios y Permisos',  desc: 'Equipo y accesos por rol' },
  { href: '/dashboard/integraciones',                    Icon: IconLink,     title: 'Integraciones',        desc: 'Mercado Pago, Tiendanube y más' },
  { href: '/dashboard/facturacion/programadas',          Icon: IconCalendar, title: 'Facturas Programadas', desc: 'Servicios recurrentes' },
  { href: '/dashboard/ads',                              Icon: IconMegaphone, title: 'Publicidad',           desc: 'Inversión y ROAS' },
  { href: '/dashboard/organizacion',                     Icon: IconGear,     title: 'Configuración',        desc: 'Empresa, ARCA y puntos de venta' },
];

export default function DashboardData() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicidad, setPublicidad] = useState<PublicidadResumen | null>(null);
  const [isResponsableInscripto, setIsResponsableInscripto] = useState(false);
  const [isMonotributista, setIsMonotributista] = useState(false);
  const [pendienteMes, setPendienteMes] = useState(0);
  const [cantidadPendientes, setCantidadPendientes] = useState(0);

  useEffect(() => {
    fetch('/api/dashboard/kpis')
      .then(r => r.json())
      .then(data => setKpis(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/publicidad/resumen')
      .then(r => r.json())
      .then(data => setPublicidad(data))
      .catch(() => {});

    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(d => {
        setIsResponsableInscripto(d?.fiscalTreatment === 'RESPONSABLE_INSCRIPTO');
        setIsMonotributista(d?.fiscalTreatment === 'MONOTRIBUTISTA');
      })
      .catch(() => {});
  }, []);

  const visibleModules = MODULES.filter(m => !m.ivaOnly || isResponsableInscripto);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      Cargando datos...
    </div>
  );

  return (
    <>
      <OnboardingChecklist />

      <NegocioResumenCard
        monthVsLastAmount={kpis?.monthVsLastAmount}
        onLoad={d => { setPendienteMes(d.pendienteMes); setCantidadPendientes(d.cantidadFacturas - d.cantidadCobradas); }}
      />

      <div className={styles.mainGrid}>
        <VentasPeriodoChart />
        <VentasPorCanalCard />
        <AttentionPanel
          isResponsableInscripto={isResponsableInscripto}
          isMonotributista={isMonotributista}
          pendienteMes={pendienteMes}
          cantidadPendientes={cantidadPendientes}
        />
      </div>

      <div className={styles.financeGrid}>
        <IvaPositionCard />
        <RentabilidadResumenCard />
        <VencimientosResumenCard isResponsableInscripto={isResponsableInscripto} />
      </div>

      {isMonotributista && <MonotributoStatusCard />}

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Últimas facturas</h2>
          <Link href="/dashboard/billing" className={styles.viewAll}>Ver todas →</Link>
        </div>

        {!kpis?.lastInvoices?.length ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Sin comprobantes aún.</p>
            <Link href="/dashboard/facturacion/simplificada" style={{ color: 'var(--blue)', marginTop: '0.5rem', display: 'block' }}>
              Emitir primera factura →
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Factura</th>
                  <th>Fecha</th>
                  <th>Receptor</th>
                  <th>Monto</th>
                  <th>Origen</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {kpis.lastInvoices.map((inv, i) => (
                  <tr key={inv.invoice_id ?? i}>
                    <td><span className="mono text-sm">{inv.invoice_number ?? '—'}</span></td>
                    <td className="text-sm text-muted">{formatDate(inv.created_at)}</td>
                    <td>{inv.buyer_name}</td>
                    <td><strong>{formatMoney(inv.total_amount)}</strong></td>
                    <td><span className="badge badge-gray text-xs">{inv.origin ?? 'manual'}</span></td>
                    <td>
                      {inv.status === 'issued' && <span className="badge badge-success">✓ Emitida</span>}
                      {inv.status === 'pending' && <span className="badge badge-warning">⏳ Pendiente</span>}
                      {inv.status === 'error' && <span className="badge badge-error">✗ Error</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.tablePagination}>
          <span className="text-muted text-sm">Total histórico: {kpis?.pendingCount ?? 0} comprobantes</span>
          <Link href="/dashboard/billing" className="btn btn-ghost btn-sm">Ver todos →</Link>
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Publicidad — este mes</h2>
          <Link href="/dashboard/ads" className={styles.viewAll}>Ver módulo →</Link>
        </div>
        {publicidad && (publicidad.totalInvertido > 0 || publicidad.ingresoTotal > 0) ? (
          <div className={styles.statsGrid} style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Invertido en campañas</div>
                <div className={styles.statValue}>{formatMoney(publicidad.totalInvertido)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Ingreso total (facturado + otras fuentes)</div>
                <div className={styles.statValue}>{formatMoney(publicidad.ingresoTotal)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>ROAS real</div>
                <div className={styles.statValue}>{publicidad.roas != null ? `${publicidad.roas.toFixed(2)}x` : '—'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Todavía no registraste campañas ni inversión publicitaria este mes.</p>
            <Link href="/dashboard/ads" style={{ color: 'var(--blue)', marginTop: '0.5rem', display: 'block' }}>
              Registrar tu primera campaña →
            </Link>
          </div>
        )}
      </div>

      <div className={styles.bottomGrid}>
        <div className={`card ${styles.syncCard}`}>
          <h3 className={styles.sectionTitle}>Facturación rápida</h3>
          <p className="text-muted text-sm" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            Emití una Factura B al instante. El precio final ya incluye IVA — no hace falta discriminarlo.
          </p>
          <Link href="/dashboard/facturacion/simplificada" className="btn btn-primary btn-sm">
            Emitir factura →
          </Link>
        </div>
        <div className={`card ${styles.proTipCard}`}>
          <div className={styles.proTipBadge}>CONSEJO PRO</div>
          <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Conectá Mercado Libre o Mercado Pago para automatizar la facturación de tus pedidos sin intervención manual.
          </p>
          <Link href="/dashboard/integraciones" className={styles.exploreLink}>
            Ver integraciones →
          </Link>
        </div>
      </div>

      <h2 className={styles.sectionTitle} style={{ margin: '0.5rem 0 -0.5rem' }}>Accesos directos</h2>
      <div className={styles.modulesGrid}>
        {visibleModules.map(m => (
          <Link key={m.href} href={m.href} className={`card ${styles.moduleCard}`}>
            <div className={styles.moduleIcon}><m.Icon size={20} /></div>
            <div className={styles.moduleTitle}>{m.title}</div>
            <div className={styles.moduleDesc}>{m.desc}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
