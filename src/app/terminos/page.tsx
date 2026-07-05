import Link from 'next/link';
import styles from './terminos.module.css';

export const metadata = { title: 'Términos y Condiciones — SimpleComm' };

export default function TerminosPage() {
  return (
    <div className={styles.page}>
      <Link href="/register" className={styles.back}>← Volver</Link>

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Términos y Condiciones</h1>
        <p className={styles.heroDesc}>Última actualización: julio de 2026</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Definiciones</h2>
          <p><strong>SimpleComm</strong>, <strong>&quot;la Plataforma&quot;</strong> o <strong>&quot;el Servicio&quot;</strong> refiere al software de facturación electrónica y gestión comercial operado bajo este nombre. <strong>&quot;Usuario&quot;</strong> o <strong>&quot;Cliente&quot;</strong> refiere a la persona física o jurídica que crea una cuenta en la Plataforma. <strong>&quot;ARCA&quot;</strong> refiere a la Agencia de Recaudación y Control Aduanero (anteriormente AFIP), autoridad fiscal de la República Argentina. <strong>&quot;Comprobante&quot;</strong> refiere a cualquier factura, nota de crédito o nota de débito electrónica emitida a través de la Plataforma.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Descripción del servicio</h2>
          <p>SimpleComm es una herramienta de software que facilita la emisión de comprobantes electrónicos ante ARCA, la gestión de clientes, productos, cobranzas, y el seguimiento de indicadores impositivos y comerciales (posición de IVA, categoría de Monotributo, integraciones con plataformas de venta y logística, entre otros). SimpleComm no es un estudio contable, no reemplaza el asesoramiento de un contador o gestor matriculado, y no asume responsabilidad por decisiones impositivas o de negocio tomadas en base a la información que la Plataforma provee con fines informativos.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Condiciones de la cuenta</h2>
          <p>El Usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de toda actividad realizada bajo su cuenta. El Usuario debe proporcionar información veraz, completa y actualizada al registrarse, y mantenerla actualizada mientras utilice el Servicio. SimpleComm puede suspender o cancelar una cuenta ante indicios de uso fraudulento, suplantación de identidad, o incumplimiento de estos Términos.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Obligaciones de uso</h2>
          <p>El Usuario se compromete a utilizar la Plataforma exclusivamente para fines lícitos, y en particular a:</p>
          <ul>
            <li>No emitir comprobantes que no correspondan a operaciones comerciales reales.</li>
            <li>No utilizar el Servicio para facilitar evasión impositiva, lavado de activos u otra actividad ilícita.</li>
            <li>No intentar vulnerar la seguridad de la Plataforma ni acceder a datos de otros Usuarios sin autorización.</li>
            <li>Cumplir con la normativa fiscal argentina aplicable a su condición (Responsable Inscripto, Monotributista, Exento, u otra).</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Período de servicio y planes</h2>
          <p>SimpleComm ofrece un período de prueba gratuito y planes pagos con distintos límites de uso (cantidad de comprobantes mensuales, funciones habilitadas). Los planes se renuevan automáticamente por el mismo período contratado, salvo cancelación previa por parte del Usuario. Los términos específicos de cada plan (precio, límites, funcionalidades incluidas) se detallan en la sección de Suscripción de la Plataforma y pueden actualizarse; los cambios de precio no aplican retroactivamente a períodos ya facturados.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Pago</h2>
          <p>Los planes pagos se facturan por adelantado según la periodicidad contratada. La falta de pago puede resultar en la suspensión del acceso a funciones pagas hasta regularizar la situación, sin perjuicio de que los comprobantes ya emitidos y sus datos permanezcan disponibles para su descarga.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Cancelación y terminación</h2>
          <p>El Usuario puede cancelar su cuenta en cualquier momento desde la Plataforma. SimpleComm puede terminar o suspender el acceso de un Usuario ante incumplimiento grave de estos Términos, previo aviso cuando las circunstancias lo permitan. Al cancelar, el Usuario conserva el derecho a solicitar una exportación de sus datos (comprobantes emitidos, clientes, productos) dentro de un plazo razonable.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Compromiso de servicio y soporte</h2>
          <p>SimpleComm procura mantener la Plataforma disponible de forma continua, pero no garantiza disponibilidad ininterrumpida, dado que el Servicio depende de terceros fuera de su control (en particular, los servicios web de ARCA/AFIP, que pueden presentar interrupciones o degradación de forma independiente a SimpleComm). El soporte se brinda por los canales indicados dentro de la Plataforma.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Confidencialidad</h2>
          <p>Ambas partes se comprometen a no divulgar información confidencial de la otra parte obtenida en el marco de la relación comercial, salvo requerimiento legal o autorización expresa. Esta obligación sobrevive a la terminación de la cuenta.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Datos del cliente y autorización de facturación electrónica ante ARCA</h2>
          <p>Para emitir comprobantes electrónicos válidos, ARCA requiere que cada CUIT esté autenticado ante sus servicios web (WSAA/WSFE) mediante un certificado digital. SimpleComm ofrece dos modalidades:</p>
          <ul>
            <li><strong>Certificado propio:</strong> el Usuario genera y sube su propio certificado digital de ARCA, quedando su facturación operada de forma completamente independiente.</li>
            <li><strong>Delegación:</strong> el Usuario autoriza, mediante el &quot;Administrador de Relaciones&quot; de ARCA, al CUIT operador de SimpleComm como apoderado para el servicio de Factura Electrónica. Bajo esta modalidad, SimpleComm actúa en nombre del Usuario únicamente para solicitar la autorización de comprobantes (CAE) ante ARCA, identificando en cada solicitud el CUIT del Usuario — SimpleComm no representa al Usuario ante ARCA para ningún otro trámite ni servicio.</li>
          </ul>
          <p>El Usuario es en todo momento el único responsable, ante ARCA y ante terceros, por la exactitud de los datos fiscales cargados en la Plataforma (condición fiscal, punto de venta, alícuotas, datos del receptor) y por el contenido de los comprobantes emitidos bajo su cuenta, hayan sido cargados manualmente o generados automáticamente a través de una integración conectada (Mercado Libre, Mercado Pago, Tiendanube, Shopify, u otra).</p>
          <p>Si en el futuro SimpleComm ofrece un proceso de configuración automática que requiera el uso temporal de la Clave Fiscal del Usuario para completar la delegación ante ARCA, dicha clave se utilizará exclusivamente en el momento de la configuración, no se almacenará ni se visualizará por personal de SimpleComm, y se descartará de forma inmediata al finalizar el proceso.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>11. Propiedad intelectual</h2>
          <p>El software, diseño, marca y demás elementos de la Plataforma son propiedad de SimpleComm o de sus licenciantes. El Usuario conserva la propiedad de sus propios datos comerciales (clientes, productos, comprobantes) cargados en la Plataforma.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>12. Limitaciones y descargo de responsabilidad</h2>
          <p>SimpleComm no brinda asesoramiento impositivo, contable ni legal. Las estimaciones y alertas que la Plataforma muestra (posición de IVA, avance de categoría de Monotributo, cotizaciones de envío, u otras) son informativas y proyectivas, calculadas en base a los datos cargados por el Usuario, y no reemplazan el cálculo oficial de ARCA ni el asesoramiento de un profesional matriculado. SimpleComm no es responsable por errores derivados de datos incorrectos cargados por el Usuario, interrupciones de los servicios web de ARCA o de plataformas de terceros integradas, ni por decisiones tomadas exclusivamente en base a la información de la Plataforma.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>13. Cláusulas generales</h2>
          <p>Estos Términos se rigen por las leyes de la República Argentina. Para cualquier controversia derivada de estos Términos, las partes se someten a los tribunales ordinarios competentes en la Ciudad Autónoma de Buenos Aires, sin perjuicio de los derechos que la Ley de Defensa del Consumidor (N.º 24.240) reconozca al Usuario cuando corresponda. SimpleComm puede modificar estos Términos, notificando los cambios relevantes a través de la Plataforma o por email; el uso continuado del Servicio luego de una modificación implica su aceptación.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>14. Redondeos y precisión en facturación</h2>
          <p>Los cálculos de neto, IVA y total se realizan con redondeo a dos decimales según las reglas de cada tipo de comprobante. Ante una diferencia de redondeo, prevalece el monto total del comprobante tal como fue autorizado por ARCA (CAE), que es el dato con validez fiscal.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>15. Facturación automática y responsabilidad de configuración</h2>
          <p>Cuando el Usuario conecta una integración (Mercado Libre, Mercado Pago, Tiendanube, Shopify, u otra) y habilita la emisión automática de comprobantes, es su responsabilidad configurar correctamente los parámetros involucrados (condición fiscal, tipo de comprobante por defecto, alícuotas). SimpleComm no revisa manualmente cada comprobante emitido automáticamente antes de su envío a ARCA; el Usuario puede desactivar la emisión automática de una integración en cualquier momento desde la Plataforma.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>16. Anexo: responsabilidad sobre agentes de percepción y retención</h2>
          <p>SimpleComm no actúa como agente de percepción ni de retención de ningún tributo, salvo indicación expresa en contrario. Las percepciones o retenciones que correspondan aplicar según la normativa vigente (Ingresos Brutos, IVA, u otras) son responsabilidad exclusiva del Usuario en su carácter de contribuyente, quien debe verificar su correcta aplicación con su contador o gestor.</p>
        </div>
      </div>
    </div>
  );
}
