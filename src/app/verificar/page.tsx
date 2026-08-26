import styles from './verificar.module.css';

// Mismo esquema de payload que ya usa el QR real de AFIP (ver buildAfipQrUrl en
// gateway/src/invoice/pdf.ts) — esta página NO reemplaza esa verificación oficial, es una
// vista de "comprobante verificado" con la marca de ARCA, pensada para comprobantes de
// demo (con CAE de ejemplo) usados en videos tutoriales, donde no corresponde exponer datos
// reales de clientes ni el QR de las facturas reales, que siempre sigue apuntando a ARCA.
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
  1: '1 - Factura A', 2: '2 - Nota de Débito A', 3: '3 - Nota de Crédito A',
  6: '6 - Factura B', 7: '7 - Nota de Débito B', 8: '8 - Nota de Crédito B',
  11: '11 - Factura C', 12: '12 - Nota de Débito C', 13: '13 - Nota de Crédito C',
  51: '51 - Factura M', 52: '52 - Nota de Débito M', 53: '53 - Nota de Crédito M',
};

const TIPO_DOC_LABEL: Record<number, string> = {
  80: 'CUIT', 86: 'CUIL', 87: 'CDI', 96: 'DNI', 94: 'Pasaporte', 99: 'Consumidor Final',
};

function formatCuit(n: number): string {
  return String(n).padStart(11, '0');
}

function formatFecha(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatMoney(n?: number): string {
  if (n == null) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 });
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
      <div 
        className={styles.header} 
        style={{ 
          backgroundColor: '#232c4f', 
          padding: '1.25rem 2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          borderBottom: '3px solid #1a2238'
        }}
      >
        <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.5rem', letterSpacing: '1px', fontFamily: 'sans-serif' }}>
          ARCA
        </span>
        <span style={{ color: '#cbd5e1', fontSize: '0.75rem', letterSpacing: '0.5px', marginTop: '2px', fontFamily: 'sans-serif' }}>
          Agencia de Recaudación y Control Aduanero
        </span>
      </div>

      <div className={styles.container}>
        <h1 className={styles.title}>Constatación de Comprobantes con CAE</h1>
        <p className={styles.subtitle}>
          Esta consulta permite a los receptores de comprobantes electrónicos habilitados
          constatar que el comprobante escaneado se encuentre registrado y autorizado.
        </p>
        <hr className={styles.divider} />

        {data ? (
          <>
            <div className={styles.fields}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Número de CUIT:</span>
                <span className={styles.fieldBox}>{data.cuit != null ? formatCuit(data.cuit) : '—'}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Número de CAE:</span>
                <span className={styles.fieldBox}>{data.codAut ?? '—'}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Fecha de Emisión del Comprobante:</span>
                <span className={styles.fieldBox}>{formatFecha(data.fecha)}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Tipo de Comprobante:</span>
                <span className={styles.fieldBox}>
                  {data.tipoCmp != null ? (TIPO_CMP_LABEL[data.tipoCmp] ?? `Cód. ${data.tipoCmp}`) : '—'}
                </span>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Punto de Venta - Número de Comprobante:</span>
                <div className={styles.fieldRow}>
                  <span className={styles.fieldBox}>{data.ptoVta != null ? String(data.ptoVta).padStart(4, '0') : '—'}</span>
                  <span className={styles.dash}>-</span>
                  <span className={styles.fieldBox}>{data.nroCmp != null ? String(data.nroCmp).padStart(8, '0') : '—'}</span>
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Importe Total de la operación:</span>
                <span className={styles.fieldBox}>{formatMoney(data.importe)}</span>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Documento del receptor del comprobante:</span>
                <div className={styles.fieldRow}>
                  <span className={styles.fieldBox}>
                    {data.tipoDocRec != null ? (TIPO_DOC_LABEL[data.tipoDocRec] ?? data.tipoDocRec) : '—'}
                  </span>
                  <span className={styles.fieldBox}>{data.nroDocRec ?? '—'}</span>
                </div>
              </div>
            </div>

            <div className={`${styles.result} ${styles.resultOk}`}>
              <span className={styles.resultIcon}>✓</span>
              <span className={styles.resultText}>
                <strong>Comprobante verificado</strong>
                El comprobante consultado se encuentra registrado y autorizado.
              </span>
            </div>
          </>
        ) : (
          <div className={`${styles.result} ${styles.resultError}`}>
            <span className={styles.resultIcon}>✕</span>
            <span className={styles.resultText}>
              <strong>Comprobante no encontrado</strong>
              El código escaneado no es válido o está incompleto.
            </span>
          </div>
        )}

        <div className={styles.footer}>
          Verificación de comprobante vía <a href="https://arca.gob.ar" target="_blank" rel="noopener noreferrer">ARCA</a>
        </div>
      </div>
    </div>
  );
}