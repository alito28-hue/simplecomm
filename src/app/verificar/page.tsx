import styles from './verificar.module.css';

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
    <div className={styles.page} style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      {/* Header oficial ARCA idéntico a la captura */}
      <header>
        <div style={{ backgroundColor: '#18253f', padding: '14px 32px' }}>
          <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.85rem', letterSpacing: '1.5px', fontFamily: 'sans-serif' }}>
            ARCA
          </span>
        </div>
        <div style={{ backgroundColor: '#42a5f5', display: 'flex', flexWrap: 'wrap', padding: '0 24px', borderBottom: '1px solid #2196f3' }}>
          <span style={{ color: '#ffffff', padding: '10px 16px', fontSize: '0.8rem', fontWeight: '500', fontFamily: 'sans-serif', cursor: 'pointer' }}>INICIO</span>
          <span style={{ color: '#ffffff', padding: '10px 16px', fontSize: '0.8rem', fontWeight: '500', fontFamily: 'sans-serif', cursor: 'pointer' }}>COMPROBANTES CON CAI</span>
          <span style={{ color: '#ffffff', padding: '10px 16px', fontSize: '0.8rem', fontWeight: '500', fontFamily: 'sans-serif', cursor: 'pointer' }}>COMPROBANTES SIN CAI</span>
          <span style={{ color: '#ffffff', padding: '10px 16px', fontSize: '0.8rem', fontWeight: '700', fontFamily: 'sans-serif', backgroundColor: '#1e88e5', cursor: 'pointer' }}>COMPROBANTES CON CAE</span>
          <span style={{ color: '#ffffff', padding: '10px 16px', fontSize: '0.8rem', fontWeight: '500', fontFamily: 'sans-serif', cursor: 'pointer' }}>COMPROBANTES CON CAEA</span>
        </div>
      </header>

      <div className={styles.container} style={{ padding: '32px' }}>
        <h1 className={styles.title} style={{ color: '#1a1a1a', fontSize: '1.7rem', fontWeight: 'bold', marginBottom: '12px' }}>
          Constatación de Comprobantes con CAE
        </h1>
        <p className={styles.subtitle} style={{ color: '#4a5568', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
          Esta consulta permite a los receptores de comprobantes electrónicos habilitados constatar que cada uno de ellos se encuentre autorizado. Para ello deberá completar los datos del comprobante que se indican a continuación:
        </p>
        <hr className={styles.divider} style={{ border: 'none', borderTop: '1px dotted #cbd5e1', marginBottom: '24px' }} />

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

            <div className={`${styles.result} ${styles.resultOk}`} style={{ marginTop: '24px' }}>
              <span className={styles.resultIcon}>✓</span>
              <span className={styles.resultText}>
                <strong>Comprobante verificado</strong>
                El comprobante consultado se encuentra registrado y autorizado.
              </span>
            </div>
          </>
        ) : (
          <div className={`${styles.result} ${styles.resultError}`} style={{ marginTop: '24px' }}>
            <span className={styles.resultIcon}>✕</span>
            <span className={styles.resultText}>
              <strong>Comprobante no encontrado</strong>
              El código escaneado no es válido o está incompleto.
            </span>
          </div>
        )}

        <div className={styles.footer} style={{ marginTop: '40px', color: '#718096', fontSize: '0.85rem' }}>
          Verificación de comprobante vía <a href="https://arca.gob.ar" target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none' }}>ARCA</a>
          <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#a0aec0' }}>por SimpleComm</div>
        </div>
      </div>
    </div>
  );
}