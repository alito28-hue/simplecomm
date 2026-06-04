import Link from 'next/link';
import styles from './faq.module.css';

const FAQ = [
  {
    categoria: 'Facturación',
    items: [
      { q: '¿Qué es una Factura B?', a: 'La Factura B se emite a consumidores finales. El IVA está incluido en el precio y no se discrimina en el comprobante. SimpleComm emite exclusivamente Factura B para e-commerce.' },
      { q: '¿Cuánto tiempo tarda en emitirse una factura?', a: 'La emisión es casi instantánea (generalmente menos de 2 segundos). SimpleComm se conecta a ARCA, obtiene el CAE y genera el PDF en tiempo real.' },
      { q: '¿Puedo emitir facturas para personas con CUIT/CUIL?', a: 'Sí. En Facturación Manual podés indicar el tipo y número de documento del receptor. Para consumidores finales sin datos, se emite genéricamente.' },
      { q: '¿Qué es el CAE?', a: 'El CAE (Código de Autorización Electrónico) es el código que ARCA/AFIP asigna a cada factura para validarla. Sin CAE, la factura no tiene validez fiscal.' },
      { q: '¿Puedo anular una factura emitida?', a: 'Las facturas electrónicas no se anulan con AFIP — se emite una Nota de Crédito. Esta funcionalidad está en nuestra hoja de ruta.' },
    ],
  },
  {
    categoria: 'Integraciones',
    items: [
      { q: '¿Cómo conecto Mercado Libre?', a: 'Andá a Integraciones → Mercado Libre → Conectar. Te redirigimos a ML para autorizar, y al volver la integración queda activa automáticamente.' },
      { q: '¿Se factura automáticamente cuando vendo en Mercado Libre?', a: 'Sí. Una vez conectado, cada venta pagada genera una Factura B automáticamente sin intervención manual.' },
      { q: '¿Qué plataformas tienen integración automática?', a: 'Mercado Libre, Mercado Pago, Tiendanube y Shopify. Las demás plataformas pueden solicitar integración desde el panel.' },
    ],
  },
  {
    categoria: 'Cuenta y configuración',
    items: [
      { q: '¿Cómo configuro mis datos fiscales?', a: 'Andá a Configuración → Empresa. Completá tu CUIT, razón social, condición fiscal y domicilio. Estos datos aparecerán en todas tus facturas.' },
      { q: '¿Cómo agrego un punto de venta?', a: 'Primero creá el punto de venta en ARCA (mi.afip.gov.ar). Luego en Configuración → Puntos de Venta podés registrarlo en SimpleComm.' },
      { q: '¿Puedo tener varios usuarios en mi cuenta?', a: 'Sí. En Configuración → Usuarios podés invitar a miembros de tu equipo.' },
    ],
  },
  {
    categoria: 'Soporte',
    items: [
      { q: '¿Cómo contacto al soporte?', a: 'Podés crear un ticket desde el panel de Soporte o enviarnos un email. Respondemos en menos de 24 horas hábiles.' },
      { q: '¿Tienen período de prueba?', a: 'Sí, 15 días gratis sin tarjeta de crédito. Podés emitir facturas reales durante el período de prueba.' },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Preguntas Frecuentes</h1>
        <p className={styles.heroDesc}>Encontrá respuestas a las consultas más comunes sobre SimpleComm.</p>
        <Link href="/dashboard/soporte" className="btn btn-primary">
          ¿No encontrás tu respuesta? Crear ticket →
        </Link>
      </div>

      <div className={styles.content}>
        {FAQ.map(cat => (
          <section key={cat.categoria} className={styles.category}>
            <h2 className={styles.catTitle}>{cat.categoria}</h2>
            <div className={styles.items}>
              {cat.items.map((item, i) => (
                <details key={i} className={`card ${styles.item}`}>
                  <summary className={styles.question}>{item.q}</summary>
                  <p className={styles.answer}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
