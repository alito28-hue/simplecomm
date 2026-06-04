import styles from './simplificada.module.css';

export default function FacturacionSimplificadaPage() {
  return (
    <div>
      <div className={styles.infoBanner}>
        <span>ℹ</span>
        <div>
          <strong>Estamos procesando la habilitación en ARCA</strong>
          <p>Mientras probá nuestro facturador, creando comprobantes sin validez fiscal.</p>
        </div>
      </div>

      <h1 className={styles.pageTitle}>Nuevo Comprobante</h1>

      <div className={styles.formCard}>
        <div className={styles.amountField}>
          <span className={styles.currencyIcon}>$</span>
          <input type="number" placeholder="Ingresá el monto final" className={styles.amountInput} />
        </div>

        <textarea
          placeholder="¿Qué vendiste? (Opcional)"
          className={styles.descriptionField}
          rows={3}
        />

        <input
          type="text"
          placeholder="DNI o CUIT del cliente (Opcional)"
          className={styles.cuitField}
        />

        <div className={styles.emailRow}>
          <span className={styles.emailLabel}>Enviar al E-mail</span>
          <label className={styles.toggle}>
            <input type="checkbox" className={styles.toggleInput} />
            <span className={styles.toggleSlider}></span>
          </label>
        </div>

        <button className={styles.submitBtn}>Facturar</button>
      </div>

      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>
          Últimos Comprobantes
          <span className={styles.chevron}>▲</span>
        </h2>
        <p className={styles.emptyText}>No hay comprobantes recientes.</p>
      </div>
    </div>
  );
}
