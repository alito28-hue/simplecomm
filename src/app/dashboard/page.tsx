import styles from './page.module.css';
import ArcaBadge from '@/components/ArcaBadge';
import DateRangePicker from '@/components/DateRangePicker';

export default function DashboardPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Reportes</h1>
      </div>

      {/* Métricas superiores */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Comprobantes emitidos</span>
            <DateRangePicker />
          </div>
          <div className={styles.metricRow}>
            <div>
              <div className={styles.metricSubLabel}>Comprobantes fiscales</div>
              <div className={styles.metricValue}>0</div>
              <div className={styles.metricPct}>0,00%</div>
            </div>
            <div>
              <div className={styles.metricSubLabel}>Comprobantes no fiscales</div>
              <div className={styles.metricValue}>0</div>
              <div className={styles.metricPct}>0,00%</div>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Actividad</span>
            <DateRangePicker />
          </div>
          <div className={styles.metricRow}>
            <div>
              <div className={styles.metricSubLabel}>Ticket promedio</div>
              <div className={styles.metricValueLg}>$ 0,00</div>
            </div>
            <div>
              <div className={styles.metricSubLabel}>Cant. operaciones</div>
              <div className={styles.metricValueLg}>0</div>
            </div>
            <div>
              <div className={styles.metricSubLabel}>Total facturado</div>
              <div className={styles.metricValueLg}>$ 0,00</div>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Recaudación</span>
            <DateRangePicker />
          </div>
          <div className={styles.metricRow}>
            <div>
              <div className={styles.metricSubLabel}>Total recaudado</div>
              <div className={styles.metricValueLg}>$ 0,00</div>
            </div>
            <div>
              <div className={styles.metricSubLabel}>Total cobrado</div>
              <div className={styles.metricValueLg}>$ 0,00</div>
              <div className={styles.metricPct}>0,00%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico generado y cobrado */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>Generado y cobrado</h2>
          <div className={styles.chartPeriods}>
            <button className={`${styles.periodBtn} ${styles.active}`}>último mes</button>
            <button className={styles.periodBtn}>6 meses</button>
            <button className={styles.periodBtn}>último año</button>
          </div>
        </div>
        <div className={styles.chartEmpty}>
          <p>Sin datos para el período seleccionado</p>
        </div>
        <div className={styles.chartLegend}>
          <span className={styles.legendItem}><span className={styles.dotGray}></span> Generado</span>
          <span className={styles.legendItem}><span className={styles.dotGreen}></span> Cobrado</span>
        </div>
      </div>

      {/* Bottom grid */}
      <div className={styles.bottomGrid}>
        <div className={styles.bottomCard}>
          <div className={styles.bottomHeader}>
            <h2 className={styles.bottomTitle}>Top 10 más vendidos</h2>
            <DateRangePicker />
          </div>
          <p className={styles.emptyText}>No se han encontrado resultados en el rango seleccionado</p>
        </div>

        <div className={styles.bottomCard}>
          <div className={styles.bottomHeader}>
            <h2 className={styles.bottomTitle}>Comprobantes enviados</h2>
            <DateRangePicker />
          </div>
          <p className={styles.emptyText}>No se han encontrado resultados en el rango seleccionado</p>
        </div>
      </div>
    </div>
  );
}
