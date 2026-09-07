'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface MonotributoStatus {
  applicable: boolean;
  categoria?: string;
  porcentaje?: number;
  level?: 'green' | 'yellow' | 'red' | 'exclusion';
}

interface IvaPosition {
  applicable: boolean;
  salesUpdatedAt?: string | null;
  lastPurchasesImportAt?: string | null;
}

interface AttentionItem {
  id: string;
  level: 'red' | 'orange' | 'green';
  icon: string;
  title: string;
  subtitle: string;
  href: string;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  isResponsableInscripto: boolean;
  isMonotributista: boolean;
  pendienteMes: number;
  cantidadPendientes: number;
}

/**
 * "Necesita tu atención" — el dashboard deja de ser solo números y le dice al usuario qué
 * pasa y qué hacer. No incluye "ventas sin facturar" todavía: hoy no hay una fuente única que
 * cuente pedidos sin facturar de TODOS los canales (Mercado Libre/Tiendanube/Shopify/Mercado
 * Pago) — solo existe una versión parcial (solo Mercado Pago) en Cobranzas. Agregarlo bien acá
 * es una tarea aparte.
 */
export default function AttentionPanel({ isResponsableInscripto, isMonotributista, pendienteMes, cantidadPendientes }: Props) {
  const [monotributo, setMonotributo] = useState<MonotributoStatus | null>(null);
  const [iva, setIva] = useState<IvaPosition | null>(null);

  useEffect(() => {
    if (isMonotributista) {
      fetch('/api/dashboard/monotributo-status').then(r => r.json()).then(setMonotributo).catch(() => {});
    }
    if (isResponsableInscripto) {
      fetch('/api/dashboard/iva-position').then(r => r.json()).then(setIva).catch(() => {});
    }
  }, [isMonotributista, isResponsableInscripto]);

  const items: AttentionItem[] = [];

  if (pendienteMes > 0) {
    items.push({
      id: 'pendiente-cobro',
      level: 'orange',
      icon: '💰',
      title: `${money(pendienteMes)} pendientes de cobro`,
      subtitle: `${cantidadPendientes} comprobante${cantidadPendientes === 1 ? '' : 's'} de este mes`,
      href: '/dashboard/billing',
    });
  }

  if (monotributo?.applicable && monotributo.level && monotributo.level !== 'green') {
    const level = monotributo.level === 'yellow' ? 'orange' : 'red';
    const label = monotributo.level === 'exclusion'
      ? `Superaste el tope máximo del Monotributo`
      : monotributo.level === 'red'
        ? `Superaste el tope de tu Categoría ${monotributo.categoria}`
        : `Categoría ${monotributo.categoria} al ${monotributo.porcentaje}%`;
    items.push({
      id: 'monotributo',
      level,
      icon: '📉',
      title: label,
      subtitle: monotributo.level === 'yellow' ? 'Te estás acercando al límite anual' : 'Revisá tu categoría con tu contador',
      href: '/dashboard/organizacion/empresa',
    });
  }

  if (isResponsableInscripto && iva?.applicable && (iva.salesUpdatedAt || iva.lastPurchasesImportAt)) {
    const lastDate = [iva.salesUpdatedAt, iva.lastPurchasesImportAt].filter(Boolean).sort().pop();
    items.push({
      id: 'iva-ok',
      level: 'green',
      icon: '✓',
      title: 'IVA actualizado',
      subtitle: lastDate ? `Última actualización: ${formatFechaHora(lastDate)}` : 'Todo al día',
      href: '/dashboard/organizacion/iva',
    });
  }

  if (items.length === 0) return null;

  return (
    <div className={`card ${styles.attentionCard}`}>
      <div className={styles.tableHeader} style={{ borderBottom: 'none', paddingBottom: '0.5rem' }}>
        <h2 className={styles.sectionTitle}>Necesita tu atención</h2>
      </div>
      <div>
        {items.map(item => (
          <Link key={item.id} href={item.href} className={`${styles.attentionRow} ${styles[`attention_${item.level}`]}`}>
            <div className={styles.attentionIcon}>{item.icon}</div>
            <div className={styles.attentionText}>
              <div className={styles.attentionTitle}>{item.title}</div>
              <div className={styles.attentionSubtitle}>{item.subtitle}</div>
            </div>
            <span className={styles.attentionArrow}>›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
