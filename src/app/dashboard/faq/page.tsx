import Link from 'next/link';
import styles from './faq.module.css';

const FAQ = [
  {
    categoria: 'Facturación',
    items: [
      { q: '¿Qué es una Factura B?', a: 'La Factura B se emite a consumidores finales. El IVA está incluido en el precio y no se discrimina en el comprobante. SimpleComm emite Factura B para e-commerce.' },
      { q: '¿Cuánto tarda en emitirse una factura?', a: 'La emisión es casi instantánea (generalmente menos de 2 segundos). SimpleComm se conecta a ARCA, obtiene el CAE y genera el PDF en tiempo real.' },
      { q: '¿Puedo emitir facturas para personas con CUIT/CUIL?', a: 'Sí. En Facturación Manual podés indicar el tipo y número de documento del receptor.' },
      { q: '¿Qué es el CAE?', a: 'El CAE (Código de Autorización Electrónico) es el código que ARCA/AFIP asigna a cada factura para validarla. Sin CAE, la factura no tiene validez fiscal.' },
      { q: '¿Puedo anular una factura?', a: 'Las facturas electrónicas no se anulan — se emite una Nota de Crédito. Esta funcionalidad está en nuestra hoja de ruta.' },
    ],
  },
  {
    categoria: 'Integraciones',
    items: [
      { q: '¿Cómo conecto Mercado Libre?', a: 'Andá a Integraciones → Mercado Libre → Conectar. Te redirigimos para autorizar y la integración queda activa automáticamente.' },
      { q: '¿Se factura automáticamente al vender en ML?', a: 'Sí. Cada venta pagada genera una Factura B automáticamente sin intervención manual.' },
      { q: '¿Qué plataformas tienen integración?', a: 'Mercado Libre, Mercado Pago, Tiendanube y Shopify. Las demás pueden solicitarse.' },
    ],
  },
  {
    categoria: 'Cuenta y configuración',
    items: [
      { q: '¿Cómo configuro mis datos fiscales?', a: 'Andá a Configuración → Empresa y completá tu CUIT, razón social y condición fiscal.' },
      { q: '¿Cómo agrego un punto de venta?', a: 'Primero crealo en ARCA. Luego en Configuración → Puntos de Venta podés registrarlo en SimpleComm.' },
      { q: '¿Puedo tener varios usuarios?', a: 'Sí. En Configuración → Usuarios podés invitar a miembros de tu equipo.' },
    ],
  },
  {
    categoria: 'Soporte',
    items: [
      { q: '¿Cómo contacto al soporte?', a: 'Creá un ticket desde el panel de Soporte. Respondemos en menos de 24 horas hábiles.' },
      { q: '¿Tienen período de prueba?', a: 'Sí, 15 días gratis sin tarjeta de crédito con facturas reales.' },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Preguntas Frecuentes</h1>
        <p className={styles.subtitle}>Encontrá respuestas a las consultas más comunes.</p>
        <Link href="/dashboard/soporte" className="btn btn-outline btn-sm">¿No encontrás tu respuesta? → Crear ticket</Link>
      </div>

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
  );
}
