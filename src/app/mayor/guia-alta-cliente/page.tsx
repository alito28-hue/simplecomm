import styles from '../mayor.module.css';

export default function GuiaAltaClientePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Guía: alta de cliente por delegación ARCA</h1>
        <p className={styles.subtitle}>
          Los 3 pasos que hay que hacer, en orden, cada vez que un cliente nuevo elige facturar
          por delegación (usando el certificado de Mocla S.A.) en vez de subir su propio
          certificado. Pensada para que cualquiera que haga el alta pueda seguirla sin contexto
          previo.
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>1. El cliente completa el onboarding</h2>
        <p className="text-sm" style={{ marginBottom: '0.5rem' }}>
          Cuando el cliente termina el paso de &quot;Configurar ARCA&quot; en <code>/onboarding</code> eligiendo
          delegación, el sistema registra el tenant en el Gateway y manda automáticamente un
          mail al admin avisando que hay una delegación pendiente, con los pasos 2.a y 2.b ya
          explicados adentro.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Si no llegó el mail: revisar la variable <code>ADMIN_EMAIL</code> en Vercel y que Resend
          esté funcionando.
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>2. En el portal de ARCA</h2>
        <p className="text-sm" style={{ marginBottom: '1rem' }}>
          Entrar a <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>mi.afip.gov.ar</a> con el CUIT de <strong>Mocla S.A. (30715371622)</strong>.
        </p>

        <div style={{ padding: '1rem', background: 'var(--surface-low)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>2.a — Aceptar la delegación</h3>
          <p className="text-sm">
            Administrador de Relaciones de Clave Fiscal → <strong>&quot;Consultar&quot;</strong> (la cuarta
            opción, la de &quot;Autorizaciones pendientes de Aceptación&quot;) → buscar la relación del
            cliente nuevo → <strong>Aceptar</strong>.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Esto deja la relación en &quot;Aceptada: SI&quot; — pero <strong>no alcanza solo con esto</strong>.
            El cliente todavía no puede facturar en este punto, aunque la pantalla lo muestre
            como aceptado.
          </p>
        </div>

        <div style={{ padding: '1rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            2.b — Vincular el Computador Fiscal (el paso que faltaba y rompía todo)
          </h3>
          <p className="text-sm" style={{ marginBottom: '0.5rem' }}>
            Sin este paso, WSFE rechaza cualquier factura con error 600 &quot;No aparecio CUIT en
            lista de relaciones&quot;, <strong>incluso con la relación ya aceptada</strong>. Costó varias
            semanas encontrarlo — no saltearlo.
          </p>
          <p className="text-sm" style={{ marginBottom: '0.5rem' }}>
            En el mismo Administrador de Relaciones, esta vez usar <strong>&quot;Nueva Relación&quot;</strong> (el
            segundo botón, no &quot;Consultar&quot;):
          </p>
          <ol className="text-sm" style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <li><strong>Representado:</strong> elegir al cliente nuevo (ya debería aparecer en el desplegable, porque la designación ya fue aceptada en 2.a).</li>
            <li><strong>Servicio:</strong> Facturación Electrónica.</li>
            <li>En la pantalla &quot;Selección del Representante a autorizar&quot;: elegir el <strong>Computador Fiscal</strong> del desplegable (no cargar ningún CUIT ahí, ese campo es para el caso contrario).</li>
            <li><strong>Confirmar.</strong> El sistema emite la constancia F.3283/E.</li>
          </ol>
          <p className="text-sm" style={{ marginTop: '0.5rem' }}>
            Recién en este momento el servicio queda realmente disponible para que Mocla facture
            en nombre del cliente.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>3. Verificar y avisar al cliente</h2>
        <p className="text-sm" style={{ marginBottom: '0.5rem' }}>
          En la ficha del cliente (<a href="/mayor/clientes" style={{ color: 'var(--blue)' }}>Clientes</a> → entrar al cliente) → botón <strong>&quot;Verificar relación ahora&quot;</strong>.
        </p>
        <p className="text-sm">
          Esto consulta a ARCA de verdad y, si sale bien, marca la relación como verificada y —
          <strong> la primera vez que sale bien</strong> — le manda un mail automático al cliente
          avisándole que ya puede facturar. Reintentar &quot;Verificar&quot; más adelante no vuelve a
          mandar el mail.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Si el botón da error: repasar el paso 2.b — lo más probable es que el Computador Fiscal
          no se haya vinculado bien, o falte tiempo de propagación (probar de nuevo en unas
          horas).
        </p>
      </div>
    </div>
  );
}
