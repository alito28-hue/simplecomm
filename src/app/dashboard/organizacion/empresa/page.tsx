import styles from './empresa.module.css';

const FISCAL_TREATMENTS = ['IVA RESPONSABLE INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR FINAL', 'NO CATEGORIZADO'];
const TRANSFER_OPTIONS = ['ADC - Agente de Depósito Colectivo', 'CBU Emisor', 'Alias'];
const PROVINCES = ['Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Salta', 'Entre Ríos', 'Misiones', 'Chaco', 'Corrientes', 'Santiago del Estero', 'San Juan', 'Jujuy', 'Río Negro', 'Neuquén', 'Formosa', 'La Pampa', 'Catamarca', 'La Rioja', 'San Luis', 'Santa Cruz', 'Chubut', 'Tierra del Fuego'];

export default function EmpresaPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Empresa</h1>

      <form className={styles.form}>
        {/* Datos generales */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos generales</h2>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label>Razón social</label>
              <input type="text" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>CUIT</label>
              <input type="text" className={styles.input} readOnly placeholder="30-00000000-0" />
            </div>
            <div className={styles.field}>
              <label>Tratam. impositivo</label>
              <select className={styles.select}>
                {FISCAL_TREATMENTS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label>Dirección fiscal</label>
              <input type="text" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Provincia</label>
              <select className={styles.select}>
                {PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.grid4}>
            <div className={styles.field}>
              <label>Localidad</label>
              <input type="text" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Código postal</label>
              <input type="text" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Inicio de actividades</label>
              <input type="date" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Contacto</label>
              <input type="text" className={styles.input} />
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label>Teléfono</label>
              <input type="tel" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Mail alertas</label>
              <input type="email" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>IIBB</label>
              <input type="text" className={styles.input} />
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label>CBU</label>
              <input type="text" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Mail contador</label>
              <input type="email" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Responder A</label>
              <input type="email" className={styles.input} />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkLabel}>
              <input type="checkbox" />
              <span className={styles.checkLink}>Validación de comprobantes</span>
            </label>
            <label className={styles.checkLabel}>
              <input type="checkbox" />
              <span>Habilitar mensajería</span>
            </label>
          </div>
        </section>

        {/* FCE */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos para Facturas de Crédito (FCE)</h2>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>CBU del Emisor</label>
              <input type="text" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Opción de Transferencia</label>
              <select className={styles.select}>
                {TRANSFER_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Envío de comprobantes */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Envío de comprobantes</h2>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>Enviar comprobante por email</label>
              <select className={styles.select}>
                <option>Según configuración del cliente</option>
                <option>Siempre</option>
                <option>Nunca</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Cuenta desde la que se envían los comprobantes</label>
              <input type="email" placeholder="@facturante.com" className={styles.input} />
            </div>
          </div>
          <a href="#" className={styles.configLink}>⚙ Configurar leyendas en comprobantes</a>
        </section>

        {/* Percepciones */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Percepciones y configuraciones fiscales</h2>
          <div className={styles.field} style={{ maxWidth: 300 }}>
            <label>Seleccione si emite comprobantes</label>
            <select className={styles.select}>
              <option>No especificado</option>
              <option>Sí</option>
              <option>No</option>
            </select>
          </div>
          <div className={styles.checkboxRow}>
            <label className={styles.checkLabel}><input type="checkbox" /> Percibe IVA</label>
            <label className={styles.checkLabel}><input type="checkbox" /> Percibe ganancias RG3819/15</label>
            <label className={styles.checkLabel}><input type="checkbox" /> Percibe SUSS</label>
          </div>
          <label className={styles.checkLabel}><input type="checkbox" /> Es agente de percepción de IIBB</label>
        </section>

        {/* Delegación */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Delegación de ingreso a otra empresa (Contador)</h2>
          <a href="#" className={styles.configLink}>⚙ Configurar</a>
        </section>

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveBtn}>Actualizar datos</button>
          <button type="reset" className={styles.cancelBtn}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
