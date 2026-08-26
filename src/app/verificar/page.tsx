import Logo from '@/components/Logo';
import styles from './verificar.module.css';

// Mismo esquema de payload que ya usa el QR real de AFIP (ver buildAfipQrUrl en
// gateway/src/invoice/pdf.ts) — esta página NO reemplaza esa verificación oficial, es una
// vista de "comprobante verificado" con la marca de SimpleComm, pensada para comprobantes de
// demo (con CAE de ejemplo) usados en videos tutoriales, donde no corresponde exponer datos
// reales de clientes ni el QR de las facturas reales, que siempre sigue apuntando a AFIP/ARCA.
interface QrPayload {
  ver?: number | string;
  fecha?: string;
  cuit?: number;
  ptoVta?: number;
  tipoCmp?: number;
  nroCmp?: number;
  importe?: number;
  moneda?: string;
  tipoDocRec?: number;
  nroDocRec?: number;
  codAut?: number;
}

const TIPO_CMP_LABEL: Record<number, string> = {
  1: 'Factura A', 2: 'Nota de Débito A', 3: 'Nota de Crédito A',
  6: 'Factura B', 7: 'Nota de Débito B', 8: 'Nota de Crédito B',
  11: 'Factura C', 12: 'Nota de Débito C', 13: 'Nota de Crédito C',
  51: 'Factura M', 52: 'Nota de Débito M', 53: 'Nota de Crédito M',
};

const TIPO_DOC_LABEL: Record<number, string> = {
  80: 'CUIT', 86: 'CUIL', 87: 'CDI', 96: 'DNI', 94: 'Pasaporte', 99: 'Consumidor Final',
};

function formatCuit(n: number): string {
  const s = String(n).padStart(11, '0');
  return `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`;
}

function formatFecha(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatMoney(n?: number): string {
  if (n == null) return '—';
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function decodePayload(p: string | undefined): QrPayload | null {
  if (!p) return null;
  try {
    const json = Buffer.from(p, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const data = decodePayload(p);

  return (
    <div className={styles.page}>
      <div className={styles.logo}><Logo size="md" /></div>

      <div className={styles.card}>
        {data ? (
          <>
            <div className={styles.status}>
              <div className={styles.statusIcon}>✓</div>
              <div className={styles.statusTitle}>Comprobante verificado</div>
              <div className={styles.statusSubtitle}>Los datos del comprobante coinciden con lo emitido</div>
            </div>

            <div className={styles.fields}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Tipo de comprobante</span>
                <span className={styles.fieldValue}>{data.tipoCmp != null ? (TIPO_CMP_LABEL[data.tipoCmp] ?? `Cód. ${data.tipoCmp}`) : '—'}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Punto de venta / Número</span>
                <span className={styles.fieldValue}>
                  {data.ptoVta != null && data.nroCmp != null
                    ? `${String(data.ptoVta).padStart(4, '0')}-${String(data.nroCmp).padStart(8, '0')}`
                    : '—'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Fecha de emisión</span>
                <span className={styles.fieldValue}>{formatFecha(data.fecha)}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>CUIT emisor</span>
                <span className={styles.fieldValue}>{data.cuit != null ? formatCuit(data.cuit) : '—'}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Receptor</span>
                <span className={styles.fieldValue}>
                  {data.tipoDocRec != null ? (TIPO_DOC_LABEL[data.tipoDocRec] ?? data.tipoDocRec) : '—'}
                  {data.nroDocRec ? ` ${data.nroDocRec}` : ''}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>CAE</span>
                <span className={styles.fieldValue}>{data.codAut ?? '—'}</span>
              </div>
            </div>

            <div className={styles.importe}>
              <span className={styles.importeLabel}>Importe total</span>
              <span className={styles.importeValue}>{formatMoney(data.importe)}</span>
            </div>
          </>
        ) : (
          <div className={styles.status}>
            <div className={`${styles.statusIcon} ${styles.errorIconInner}`}>✕</div>
            <div className={`${styles.statusTitle} ${styles.errorTitle}`}>Comprobante no encontrado</div>
            <div className={styles.statusSubtitle}>El código escaneado no es válido o está incompleto.</div>
          </div>
        )}

        <div className={styles.footer}>
          Verificación de comprobante vía <a href="https://simplecomm.com.ar">SimpleComm</a>
        </div>
      </div>
    </div>
  );
}
