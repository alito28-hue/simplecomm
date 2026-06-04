import Link from 'next/link';
import styles from './suscripcion.module.css';

const PLANES = [
  {
    nombre: 'Pack 50',
    precio: '$4.990',
    periodo: '/ mes',
    comprobantes: '50',
    descripcion: 'Ideal para comercios en crecimiento',
    color: 'gray',
    features: [
      '50 comprobantes por mes',
      'Factura B automática',
      'Integraciones con Mercado Libre',
      'Soporte por email',
      'Dashboard básico',
    ],
    cta: 'Contratar Pack 50',
    destacado: false,
  },
  {
    nombre: 'Pack 150',
    precio: '$9.990',
    periodo: '/ mes',
    comprobantes: '150',
    descripcion: 'Para e-commerce en expansión',
    color: 'blue',
    features: [
      '150 comprobantes por mes',
      'Factura B automática',
      'Todas las integraciones incluidas',
      'Soporte prioritario',
      'Dashboard avanzado con métricas',
      'Importación de lotes (CSV)',
    ],
    cta: 'Contratar Pack 150',
    destacado: true,
  },
  {
    nombre: 'Pack Ilimitado',
    precio: 'A consultar',
    periodo: '',
    comprobantes: '∞',
    descripcion: 'Para operaciones de alto volumen',
    color: 'navy',
    features: [
      'Comprobantes ilimitados',
      'Facturación masiva (batch API)',
      'Todas las integraciones',
      'Soporte dedicado 24/7',
      'API personalizada',
      'SLA garantizado',
      'Onboarding con el equipo técnico',
    ],
    cta: 'Contactar ventas',
    destacado: false,
  },
];

export default function SuscripcionPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Planes y Precios</h1>
        <p className={styles.subtitle}>
          Elegí el plan que mejor se adapta a tu volumen de operaciones.
          Todos los planes incluyen el período de prueba gratuito de 15 días.
        </p>
      </div>

      <div className={styles.grid}>
        {PLANES.map((plan) => (
          <div key={plan.nombre} className={`card ${styles.planCard} ${plan.destacado ? styles.destacado : ''}`}>
            {plan.destacado && <div className={styles.badge}>⭐ Más popular</div>}

            <div className={styles.planIcon}>{plan.comprobantes}</div>
            <h2 className={styles.planName}>{plan.nombre}</h2>
            <p className={styles.planDesc}>{plan.descripcion}</p>

            <div className={styles.priceWrap}>
              <span className={styles.price}>{plan.precio}</span>
              {plan.periodo && <span className={styles.periodo}>{plan.periodo}</span>}
            </div>

            <ul className={styles.features}>
              {plan.features.map((f, i) => (
                <li key={i}><span className={styles.check}>✓</span>{f}</li>
              ))}
            </ul>

            <Link
              href="/dashboard/soporte"
              className={`btn ${plan.destacado ? 'btn-primary' : 'btn-outline'} ${styles.ctaBtn}`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className={`card ${styles.enterprise}`}>
        <div>
          <h3 className={styles.enterpriseTitle}>¿Necesitás algo personalizado?</h3>
          <p className={styles.enterpriseDesc}>
            Para integraciones custom, API batch de alto volumen o contratos
            anuales con descuento, contactá a nuestro equipo de ventas.
          </p>
        </div>
        <Link href="/dashboard/soporte" className="btn btn-navy">Contactar ventas →</Link>
      </div>
    </div>
  );
}
