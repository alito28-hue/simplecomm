'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface IvaPosition { applicable: boolean; position?: number; }
interface AnticipoInfo { aplica: boolean; ejercicioBase?: string; cantidadCuotas?: number; montoPorCuota?: number }
interface GananciasPosition {
  applicable: boolean;
  configured?: boolean;
  impuestoEstimado?: number | null;
  ejercicio?: { label: string };
  anticipo?: AnticipoInfo;
}

interface Deadline { id: string; label: string; sublabel: string; amount: number; href: string; muted?: boolean }

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

/**
 * Vencimientos estimados a partir de lo que el sistema ya calcula (saldo de IVA y anticipo de
 * Ganancias) — no incluye fechas exactas de vencimiento (ARCA las define mes a mes según
 * terminación de CUIT, no las tenemos calculadas acá) ni IIBB (todavía no calculamos el neto a
 * pagar, solo lo adelantado — ver Posición de IIBB).
 *
 * El anticipo de Ganancias es el 11,11% del impuesto determinado del ejercicio YA CERRADO
 * anterior (9 cuotas, régimen general ARCA) — NUNCA una estimación del ejercicio en curso.
 * Si todavía no hay un ejercicio anterior cerrado con datos (empresa nueva), no corresponde
 * ningún anticipo real, así que se muestra la ganancia estimada del ejercicio en curso como
 * referencia aparte, aclarando explícitamente que no es un anticipo.
 */
export default function VencimientosResumenCard({ isResponsableInscripto }: { isResponsableInscripto: boolean }) {
  const [iva, setIva] = useState<IvaPosition | null>(null);
  const [ganancias, setGanancias] = useState<GananciasPosition | null>(null);

  useEffect(() => {
    if (!isResponsableInscripto) return;
    fetch('/api/dashboard/iva-position').then(r => r.json()).then(setIva).catch(() => {});
    fetch('/api/dashboard/ganancias-position').then(r => r.json()).then(setGanancias).catch(() => {});
  }, [isResponsableInscripto]);

  const items: Deadline[] = [];
  if (iva?.applicable && (iva.position ?? 0) > 0) {
    items.push({ id: 'iva', label: 'Pago IVA', sublabel: 'Según tu grupo de vencimiento', amount: iva.position ?? 0, href: '/dashboard/organizacion/iva' });
  }
  if (ganancias?.applicable && ganancias.configured) {
    if (ganancias.anticipo?.aplica) {
      items.push({
        id: 'ganancias-anticipo',
        label: `Anticipo Ganancias (1 de ${ganancias.anticipo.cantidadCuotas})`,
        sublabel: `11,11% del impuesto del ${ganancias.anticipo.ejercicioBase}`,
        amount: ganancias.anticipo.montoPorCuota ?? 0,
        href: '/dashboard/organizacion/ganancias',
      });
    } else if ((ganancias.impuestoEstimado ?? 0) > 0) {
      items.push({
        id: 'ganancias-estimado',
        label: 'Ganancia estimada — no es un anticipo',
        sublabel: `${ganancias.ejercicio?.label ?? 'ejercicio en curso'} · sin ejercicio anterior cerrado para calcular anticipos`,
        amount: ganancias.impuestoEstimado ?? 0,
        href: '/dashboard/organizacion/ganancias',
        muted: true,
      });
    }
  }

  if (!isResponsableInscripto || items.length === 0) return null;

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div className={styles.tableHeader} style={{ padding: 0, border: 'none', marginBottom: '0.5rem' }}>
        <h2 className={styles.sectionTitle}>Próximos vencimientos</h2>
        <Link href="/dashboard/organizacion/calendario-impositivo" className={styles.viewAll}>Ver todos →</Link>
      </div>
      <div>
        {items.map(item => (
          <Link key={item.id} href={item.href} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.sublabel}</div>
            </div>
            <strong style={{ color: item.muted ? 'var(--text-secondary)' : 'var(--error)', fontSize: '0.9rem' }}>{money(item.amount)}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}
