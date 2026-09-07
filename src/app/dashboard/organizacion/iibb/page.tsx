'use client';

import { useEffect, useState } from 'react';
import styles from '../../dashboard.module.css';
import pageStyles from '../clientes/clientes.module.css';
import { IconBank } from '@/components/LandingIcons';
import { IconInfo } from '@/components/AppIcons';

interface Jurisdiccion {
  jurisdiccion: string;
  percepcionesAcumuladas: number;
}

interface IibbData {
  applicable: boolean;
  year?: number;
  jurisdicciones?: Jurisdiccion[];
  totalAcumulado?: number;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

export default function IibbPage() {
  const [data, setData] = useState<IibbData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/iibb-position')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={pageStyles.page}>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    );
  }

  if (!data || !data.applicable) {
    return (
      <div className={pageStyles.page}>
        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Posición de IIBB</h1>
            <p className={pageStyles.pageSubtitle}>Esta sección solo aplica para organizaciones Responsables Inscriptas.</p>
          </div>
        </div>
      </div>
    );
  }

  const jurisdicciones = data.jurisdicciones ?? [];

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.pageTitle}>IIBB</h1>
          <p className={pageStyles.pageSubtitle}>Percepciones de Ingresos Brutos que el banco te adelanta al cobrar — {data.year}.</p>
        </div>
      </div>

      <p className="text-sm text-muted">
        Cada vez que marcás una factura como cobrada y cargás la percepción de IIBB que aplicó el banco (SIRCREB),
        se acumula acá por jurisdicción. Es un impuesto provincial — cada jurisdicción tiene su propia cuenta
        corriente, no se compensan entre sí.
      </p>

      <div className={styles.statCardsRow}>
        <div className={`card ${styles.statCardV2}`}>
          <div className={styles.statCardV2Head}>
            <div className={styles.statCardV2Icon} style={{ background: 'var(--blue-light)', color: 'var(--blue-hover)' }}>
              <IconBank size={19} />
            </div>
          </div>
          <div className={styles.statCardV2Label}>Total adelantado — {data.year}</div>
          <div className={styles.statCardV2Value}>{money(data.totalAcumulado ?? 0)}</div>
        </div>
      </div>

      <div className={styles.infoBannerV2}>
        <IconInfo size={18} />
        <span>
          Esto es lo que ya tenés adelantado, no el saldo neto — el sistema todavía no carga las declaraciones
          juradas mensuales de IIBB (el impuesto que realmente determinás), así que no calcula si te queda a
          favor o a pagar. Confirmá el neto con tu contador o el aplicativo de tu jurisdicción.
        </span>
      </div>

      <div className="card">
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Por jurisdicción</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Jurisdicción</th>
                <th>Percepciones acumuladas</th>
              </tr>
            </thead>
            <tbody>
              {jurisdicciones.length === 0 ? (
                <tr><td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Sin percepciones de IIBB cargadas todavía. Se cargan al marcar una factura como cobrada.
                </td></tr>
              ) : jurisdicciones.map(j => (
                <tr key={j.jurisdiccion}>
                  <td>{j.jurisdiccion}</td>
                  <td><strong>{money(j.percepcionesAcumuladas)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
