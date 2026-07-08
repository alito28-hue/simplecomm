'use client';

import styles from './ImportCsvModal.module.css';

export type ImportCsvStatus = 'importing' | 'success' | 'error';

interface ImportCsvModalProps {
  status: ImportCsvStatus;
  message?: string | null;
  onClose: () => void;
}

/**
 * Modal único para todo el flujo de importar un CSV de ARCA: arranca en "importing" (barra
 * indeterminada, no hay progreso real posible porque el parseo/guardado pasa entero en el
 * servidor) y cuando la respuesta llega, el mismo modal pasa a mostrar el resultado (éxito o
 * error) — antes el resultado se mostraba con un alert() del navegador, desconectado del
 * modal de progreso.
 */
export default function ImportCsvModal({ status, message, onClose }: ImportCsvModalProps) {
  return (
    <div className={styles.overlay} onClick={status !== 'importing' ? onClose : undefined}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        {status === 'importing' && (
          <>
            <p className={styles.title}>Importando comprobantes...</p>
            <div className={styles.track}>
              <div className={styles.bar} />
            </div>
            <p className={styles.message}>Puede tardar unos segundos según el tamaño del archivo. No cierres esta ventana.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <p className={styles.icon}>✓</p>
            <p className={styles.title}>Importación completa</p>
            <p className={styles.message}>{message}</p>
            <button className="btn btn-primary btn-sm" onClick={onClose}>Cerrar</button>
          </>
        )}
        {status === 'error' && (
          <>
            <p className={styles.icon}>✗</p>
            <p className={`${styles.title} ${styles.titleError}`}>No se pudo importar</p>
            <p className={styles.message}>{message}</p>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cerrar</button>
          </>
        )}
      </div>
    </div>
  );
}
