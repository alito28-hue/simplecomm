import Link from 'next/link';
import styles from './tutorial.module.css';

export default function CertificadoAfipPage() {
  return (
    <div className={styles.page}>
      <Link href="/dashboard/tutoriales" className={styles.back}>← Volver a Tutoriales</Link>

      <div className={styles.header}>
        <span className={styles.tag}>CONFIGURACIÓN</span>
        <h1 className={styles.title}>Cómo conectar tu empresa con ARCA</h1>
        <p className={styles.subtitle}>
          Guía paso a paso para autorizar a SimpleComm a emitir facturas bajo tu CUIT.
          Podés hacerlo por delegación (recomendado, sin archivos) o subiendo tu propio certificado.
        </p>
      </div>

      {/* Video tutorial */}
      <div className={styles.videoBox} style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '0.5rem' }}>
        <iframe
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          src="https://www.youtube.com/embed/lpSz6DkAb38"
          title="Cómo conectar tu empresa con ARCA"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      {/* Método 1: Delegación */}
      <section className={`card ${styles.section}`}>
        <div className={styles.methodBadge}>Método 1 — Recomendado</div>
        <h2 className={styles.sectionTitle}>Delegación en ARCA</h2>
        <p className={styles.sectionDesc}>
          Le das permiso al CUIT de SimpleComm para facturar en tu nombre. No necesitás generar ni subir ningún archivo.
        </p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Accedé al portal de ARCA con clave fiscal nivel 3</div>
              <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" className={`btn btn-outline btn-sm ${styles.stepBtn}`}>
                Ir a ARCA ↗
              </a>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Ir a Administrador de Relaciones de Clave Fiscal</div>
              <div className={styles.stepDesc}>En el menú principal buscá <strong>"Administrador de Relaciones de Clave Fiscal"</strong> o <strong>"Gestión de Delegaciones"</strong>.</div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Crear nueva relación</div>
              <div className={styles.stepDesc}>
                Hacé clic en <strong>"Nueva Relación"</strong> e ingresá:
                <ul className={styles.detailList}>
                  <li>CUIT del representante: <code className={styles.code}>30-71537162-2</code> (Mocla SA / SimpleComm)</li>
                  <li>Servicio: <code className={styles.code}>Facturación Electrónica</code> (wsfe) — categoría WebServices</li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNum}>4</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Crear un Punto de Venta tipo Web Services</div>
              <div className={styles.stepDesc}>
                En ARCA ir a <strong>Mis Aplicaciones Web → Administración de Puntos de Venta</strong>:
                <ul className={styles.detailList}>
                  <li>Tipo: <strong>Web Services</strong></li>
                  <li>Nombre: <strong>SimpleComm</strong> (o el que prefieras)</li>
                  <li>Anotá el número de punto de venta asignado</li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNum}>5</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Volver al onboarding de SimpleComm</div>
              <div className={styles.stepDesc}>
                Seleccioná <strong>"Delegación"</strong>, ingresá el número de punto de venta y hacé clic en <strong>Finalizar configuración</strong>.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Método 2: Certificado propio */}
      <section className={`card ${styles.section}`}>
        <div className={`${styles.methodBadge} ${styles.badgeAlt}`}>Método 2 — Certificado propio</div>
        <h2 className={styles.sectionTitle}>Subir tu propio certificado AFIP</h2>
        <p className={styles.sectionDesc}>
          Generás un certificado en ARCA vinculado a tu CUIT y lo subís a SimpleComm. Mayor independencia.
        </p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Generar el par de claves (certificado + clave privada)</div>
              <div className={styles.stepDesc}>
                Ejecutá en tu computadora:
                <pre className={styles.codeBlock}>{`openssl req -x509 -newkey rsa:4096 -keyout clave_privada.pem \\
  -out certificado.pem -days 1825 -nodes \\
  -subj "/CN=SimpleComm WSFE"`}</pre>
                Esto genera <code className={styles.code}>certificado.pem</code> y <code className={styles.code}>clave_privada.pem</code>.
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Registrar el certificado en ARCA</div>
              <div className={styles.stepDesc}>
                En ARCA ir a <strong>Mis Aplicaciones Web → Administración de Certificados Digitales</strong>:
                <ul className={styles.detailList}>
                  <li>Subir el archivo <code className={styles.code}>certificado.pem</code></li>
                  <li>Asignar el servicio: <strong>wsfe</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Descargar la cadena CA de ARCA</div>
              <div className={styles.stepDesc}>
                En la misma sección, descargá el archivo de cadena de certificación (CA) de AFIP.
                También disponible en: <code className={styles.code}>https://www.afip.gob.ar/ws/WSAA/ca.crt</code>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNum}>4</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Crear Punto de Venta tipo Web Services</div>
              <div className={styles.stepDesc}>Igual que en el Método 1, paso 4.</div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNum}>5</div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Subir los archivos en SimpleComm</div>
              <div className={styles.stepDesc}>
                En el onboarding, seleccioná <strong>"Certificado propio"</strong> y subí:
                <ul className={styles.detailList}>
                  <li><code className={styles.code}>certificado.pem</code></li>
                  <li><code className={styles.code}>clave_privada.pem</code></li>
                  <li>Cadena CA descargada de ARCA</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={`card ${styles.helpCard}`}>
        <div>
          <h3 className={styles.helpTitle}>¿Necesitás ayuda?</h3>
          <p className={styles.helpDesc}>Nuestro equipo te asiste con la configuración AFIP sin costo adicional.</p>
        </div>
        <Link href="/dashboard/soporte" className="btn btn-primary">Abrir ticket de soporte</Link>
      </div>
    </div>
  );
}
