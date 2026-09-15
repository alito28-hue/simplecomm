'use client';

import { useEffect, useState } from 'react';
import styles from './integraciones.module.css';
import Link from 'next/link';

const INTEGRACIONES = [
  {
    id: 'mercadolibre',
    nombre: 'Mercado Libre',
    desc: 'Automatizá el fulfillment y sincronizá inventario en el marketplace más grande de Latinoamérica.',
    estado: 'disponible', categoria: 'marketplace', logo: '🛒',
    href: '/dashboard/integraciones/mercadolibre',
    statusUrl: '/api/integraciones/mercadolibre/status',
  },
  {
    id: 'mercadopago',
    nombre: 'Mercado Pago',
    desc: 'Facturá tus ventas de Mercado Libre y los cobros que generés con Facturación Rápida.',
    estado: 'disponible', categoria: 'marketplace', logo: '💳',
    href: '/dashboard/integraciones/mercadopago',
    statusUrl: '/api/integraciones/mercadopago/status',
  },
  {
    id: 'tiendanube',
    nombre: 'Tiendanube',
    desc: 'Sincronizá productos de tu nube y centralizá la gestión de ventas en tiempo real.',
    estado: 'disponible', categoria: 'ecommerce', logo: '☁',
    href: '/dashboard/integraciones/tiendanube',
    statusUrl: '/api/integraciones/tiendanube/status',
  },
  {
    id: 'shopify',
    nombre: 'Shopify',
    desc: 'Conectá tus tiendas Shopify internacionales para reportes globales unificados.',
    estado: 'disponible', categoria: 'ecommerce', logo: '🟩',
    href: '/dashboard/integraciones/shopify',
    statusUrl: '/api/integraciones/shopify/status',
  },
  {
    id: 'enviopack',
    nombre: 'Envíopack',
    desc: 'Cotizá y generá guías de envío con múltiples correos desde una sola integración.',
    estado: 'disponible', categoria: 'logistica', logo: '📦',
    href: '/dashboard/integraciones/enviopack',
    statusUrl: '/api/integraciones/enviopack/status',
  },
  {
    id: 'woocommerce',
    nombre: 'WooCommerce',
    desc: 'Integración nativa con tu tienda WordPress para un dashboard operativo avanzado.',
    estado: 'proximamente', categoria: 'ecommerce', logo: '🛍',
  },
  {
    id: 'vtex',
    nombre: 'VTEX',
    desc: 'Plataforma de comercio empresarial con capacidades multi-canal.',
    estado: 'proximamente', categoria: 'ecommerce', logo: '🔺',
  },
  {
    id: 'magento',
    nombre: 'Magento',
    desc: 'Sincronización enterprise para plataformas Magento Open Source.',
    estado: 'proximamente', categoria: 'ecommerce', logo: '🧲',
  },
  {
    id: 'empretienda',
    nombre: 'Empretienda',
    desc: 'Importá y automatizá la facturación de tus pedidos de Empretienda.',
    estado: 'proximamente', categoria: 'ecommerce', logo: '🏪',
  },
];

const MODE_LABEL: Record<string, string> = {
  AUTOMATIC: 'Automática', CONFIRMATION: 'Con confirmación', PAUSED: 'Pausada',
};

export default function IntegracionesPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [modes, setModes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const targets = INTEGRACIONES.filter(i => i.estado === 'disponible' && i.statusUrl);

    Promise.all(
      targets.map(i =>
        fetch(i.statusUrl!).then(r => r.json())
          .then(d => [i.id, !!d.connected, d.mode as string | undefined] as const)
          .catch(() => [i.id, false, undefined] as const)
      ),
    ).then(results => {
      if (cancelled) return;
      setConnected(Object.fromEntries(results.map(([id, ok]) => [id, ok])));
      setModes(Object.fromEntries(results.filter(([, , mode]) => mode).map(([id, , mode]) => [id, mode as string])));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const conectadas = Object.values(connected).filter(Boolean).length;
  const disponibles = INTEGRACIONES.filter(i => i.estado === 'disponible').length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.breadcrumb}>DASHBOARD › INTEGRACIONES</p>
          <h1 className={styles.pageTitle}>Plataformas Externas</h1>
          <p className={styles.pageSubtitle}>
            Conectá tus tiendas online y marketplaces para sincronizar inventario,
            pedidos y datos de clientes en toda tu operación.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {INTEGRACIONES.map((int) => {
          const isConnected = int.estado === 'disponible' && connected[int.id];
          return (
            <div key={int.id} className={`card ${styles.intCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.intLogo}>{int.logo}</div>
                {int.estado === 'disponible' ? (
                  isConnected ? (
                    <span className="badge badge-success">● Conectado</span>
                  ) : (
                    <span className="badge badge-gray">○ {loading ? 'Verificando...' : 'No conectado'}</span>
                  )
                ) : (
                  <span className="badge badge-gray">○ Próximamente</span>
                )}
              </div>
              <h3 className={styles.intName}>{int.nombre}</h3>
              <p className={styles.intDesc}>{int.desc}</p>
              {isConnected && modes[int.id] && (
                <p className="text-sm text-muted" style={{ marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
                  Facturación: <strong>{MODE_LABEL[modes[int.id]] ?? modes[int.id]}</strong>
                </p>
              )}
              <div className={styles.cardActions}>
                {int.estado === 'disponible' && int.href ? (
                  <Link href={int.href} className={`btn btn-sm ${isConnected ? 'btn-outline' : 'btn-primary'}`}>
                    {isConnected ? 'Configurar' : 'Conectar'}
                  </Link>
                ) : (
                  <button className="btn btn-ghost btn-sm" disabled>Próximamente</button>
                )}
              </div>
            </div>
          );
        })}

        {/* Request Integration */}
        <div className={`card ${styles.requestCard}`}>
          <div className={styles.requestPlus}>+</div>
          <h3 className={styles.requestTitle}>¿No encontrás tu plataforma?</h3>
          <p className={styles.requestText}>Contanos qué plataforma usás y la agregamos.</p>
          <Link href="/dashboard/integraciones/solicitar" className="btn btn-outline btn-sm">
            Solicitar integración
          </Link>
        </div>
      </div>

      <div className={`card ${styles.apiBar}`}>
        <div className={styles.apiStat}>
          <span className={styles.apiNum}>{conectadas}/{disponibles}</span>
          <span className={styles.apiLabel}>Integraciones conectadas en tu cuenta.</span>
        </div>
      </div>
    </div>
  );
}
