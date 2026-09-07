import Link from 'next/link';
import Logo, { LogoWhite } from '@/components/Logo';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFreeTierLimit } from '@/lib/usage';
import {
  IconCart, IconReceipt, IconCard, IconChart, IconBank,
  IconBox, IconMegaphone, IconBulb, IconUser, IconBriefcase, IconBuilding, IconPercent,
} from '@/components/LandingIcons';
import PricingSection, { type PlanCard } from './PricingSection';
import styles from './page.module.css';

const flowSteps = [
  { Icon: IconCart, label: 'Ventas', color: 'var(--blue)', bg: 'var(--blue-light)' },
  { Icon: IconReceipt, label: 'Facturación', color: 'var(--success)', bg: 'var(--success-bg)' },
  { Icon: IconCard, label: 'Cobranza', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  { Icon: IconChart, label: 'Rentabilidad', color: '#8B5CF6', bg: '#f1ebff' },
  { Icon: IconBank, label: 'Impuestos', color: 'var(--navy)', bg: '#e6eaf0' },
];

const channels = ['Mercado Libre', 'Tiendanube', 'Shopify', 'WhatsApp', 'Instagram'];

const features = [
  { Icon: IconReceipt, title: 'Facturación automática', body: 'Generá y enviá facturas A, B y C en segundos.' },
  { Icon: IconCard, title: 'Cobranzas y conciliación', body: 'Controlá tus cobros y conciliá automáticamente.' },
  { Icon: IconPercent, title: 'IVA, Ganancias e IIBB', body: 'Mantenete al día con tus impuestos y evitá multas.' },
  { Icon: IconBox, title: 'Stock y productos', body: 'Gestioná tu inventario y tus listas de precios.' },
  { Icon: IconChart, title: 'Rentabilidad', body: 'Conocé cuánto ganás por producto, canal o período.' },
  { Icon: IconMegaphone, title: 'Publicidad y envíos', body: 'Integrá tus campañas y seguí el estado de tus envíos.' },
];

const audiences = [
  { Icon: IconUser, title: 'Monotributo', body: 'Ideal para emprendedores y pequeños negocios.' },
  { Icon: IconBriefcase, title: 'PyME', body: 'Más control y herramientas para escalar.' },
  { Icon: IconBuilding, title: 'Empresa', body: 'Gestión avanzada para grandes volúmenes.' },
];

const BASELINE_FEATURES = ['Facturas A, B y C', 'Posición de IVA y Ganancias', 'Integraciones con tus canales de venta'];

interface DbPlan { id: string; name: string; monthlyLimit: number; priceARS: number; description: string | null }

// Plan gratis siempre a mano por si la consulta a Supabase falla — la home nunca debería
// quedarse sin sección de precios por un problema de red.
const FALLBACK_PAID_PLANS: DbPlan[] = [
  { id: 'plan_starter',    name: 'Starter',    monthlyLimit: 50,   priceARS: 4990,  description: null },
  { id: 'plan_pro',        name: 'Pro',        monthlyLimit: 150,  priceARS: 9990,  description: null },
  { id: 'plan_enterprise', name: 'Enterprise', monthlyLimit: 1500, priceARS: 24990, description: null },
];

/**
 * Arma las tarjetas de precios de la home a partir de los planes reales que el admin
 * gestiona en /mayor/planes (tabla "plans" en Supabase) — así el copy y los precios de
 * marketing nunca se desincronizan de lo que el sistema realmente cobra y limita.
 */
async function getLandingPlans(): Promise<PlanCard[]> {
  let paid: DbPlan[] = FALLBACK_PAID_PLANS;
  let freeTierLimit = 10;

  try {
    const db = createAdminClient();
    const [{ data: dbPlans }, limit] = await Promise.all([
      db.from('plans').select('id, name, monthlyLimit, priceARS, description').eq('isActive', true).order('priceARS', { ascending: true }),
      getFreeTierLimit(),
    ]);
    if (dbPlans && dbPlans.length > 0) paid = dbPlans as DbPlan[];
    freeTierLimit = limit;
  } catch {
    // Sin conexión a Supabase: seguimos con el fallback hardcodeado de arriba.
  }

  const highlightIndex = paid.length >= 3 ? Math.floor(paid.length / 2) : -1;

  const gratis: PlanCard = {
    name: 'Gratis',
    eyebrow: 'Para arrancar',
    monthlyPrice: 0,
    description: 'Todo SimpleComm, sin poner tarjeta.',
    features: [`${freeTierLimit} comprobantes por mes, gratis`, ...BASELINE_FEATURES, 'Se renueva solo cada mes — no vence'],
    cta: 'Empezar gratis',
    highlighted: false,
    badge: undefined,
  };

  const paidCards: PlanCard[] = paid.map((plan, i) => ({
    name: plan.name,
    eyebrow: `Hasta ${plan.monthlyLimit.toLocaleString('es-AR')}`,
    monthlyPrice: plan.priceARS,
    description: plan.description || 'Subí de plan cuando lo necesites.',
    features: [`${plan.monthlyLimit.toLocaleString('es-AR')} comprobantes por mes`, ...BASELINE_FEATURES],
    cta: `Contratar ${plan.name}`,
    highlighted: i === highlightIndex,
    badge: i === highlightIndex ? 'Más elegido' : undefined,
  }));

  return [gratis, ...paidCards];
}

export default async function Home() {
  const plans = await getLandingPlans();

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Principal">
        <Logo size="md" />
        <div className={styles.navLinks}>
          <a href="#top">Inicio</a>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#planes">Planes</a>
          <a href="#canales">Integraciones</a>
          <Link href="/faq">Recursos ▾</Link>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className="btn btn-ghost">Iniciar sesión</Link>
          <Link href="/register" className="btn btn-primary">Empezar gratis</Link>
        </div>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroContent}>
          <div className={styles.heroBadgeRow}>
            <p className={styles.heroBadgeFree}>🎁 Gratis hasta 10 comprobantes/mes</p>
            <p className={styles.heroBadge}>Facturación electrónica ARCA</p>
          </div>
          <h1 className={styles.heroTitle}>
            Facturá, cobrá y entendé tu negocio sin perseguir planillas.
          </h1>
          <p className={styles.heroDesc}>
            Automatizá tus facturas de ARCA, conectá tus canales de venta y descubrí en un solo lugar la rentabilidad, los impuestos y el estado de tus cobranzas.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className="btn btn-primary btn-lg">Empezar gratis →</Link>
            <a href="#funcionalidades" className="btn btn-ghost btn-lg">▷ Ver cómo funciona</a>
          </div>
          <div className={styles.heroChecks}>
            <span>✓ 10 comprobantes gratis por mes</span>
            <span>✓ Sin tarjeta de crédito</span>
            <span>✓ Conectado con ARCA</span>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.laptop}>
            <div className={styles.laptopBar}>
              <span className={styles.laptopDot} />
              <span className={styles.laptopDot} />
              <span className={styles.laptopDot} />
            </div>
            <div className={styles.laptopScreen}>
              <div className={styles.mockSidebar}>
                <div className={`${styles.mockSidebarItem} ${styles.mockSidebarItemActive}`} />
                {Array.from({ length: 7 }).map((_, i) => <div key={i} className={styles.mockSidebarItem} />)}
              </div>
              <div className={styles.mockMain}>
                <div className={styles.mockGreeting}>Hola, Martín 👋</div>
                <div className={styles.mockKpiRow}>
                  <div className={styles.mockKpi}>
                    <small>Facturado</small>
                    <strong style={{ color: 'var(--blue)' }}>$18.150.000</strong>
                    <em style={{ color: 'var(--success)' }}>↗ 12,4%</em>
                  </div>
                  <div className={styles.mockKpi}>
                    <small>Cobrado</small>
                    <strong style={{ color: 'var(--success)' }}>$15.420.000</strong>
                    <em style={{ color: 'var(--success)' }}>↗ 8,2%</em>
                  </div>
                  <div className={styles.mockKpi}>
                    <small>Pendiente</small>
                    <strong style={{ color: 'var(--warning)' }}>$2.730.000</strong>
                    <em style={{ color: 'var(--error)' }}>↘ 4,1%</em>
                  </div>
                  <div className={styles.mockKpi}>
                    <small>% Cobrado</small>
                    <strong style={{ color: '#8B5CF6' }}>85%</strong>
                    <em style={{ color: 'var(--success)' }}>↗ 6%</em>
                  </div>
                </div>
                <div className={styles.mockRow}>
                  <div className={styles.mockChartCard}>
                    <svg viewBox="0 0 220 70" preserveAspectRatio="none" width="100%" height="100%">
                      <path d="M0 58 C20 63 25 42 40 47 S60 30 80 38 S110 50 125 28 S155 52 175 24 S205 36 220 12" fill="none" stroke="var(--blue)" strokeWidth="2.5" />
                      <path d="M0 58 C20 63 25 42 40 47 S60 30 80 38 S110 50 125 28 S155 52 175 24 S205 36 220 12 L220 70 L0 70 Z" fill="var(--blue-light)" />
                    </svg>
                  </div>
                  <div className={styles.mockAttention}>
                    <div className={styles.mockAttentionRow}><span className={styles.mockDot} style={{ background: 'var(--error)' }} />17 ventas sin facturar</div>
                    <div className={styles.mockAttentionRow}><span className={styles.mockDot} style={{ background: 'var(--warning)' }} />Pendientes de cobro</div>
                    <div className={styles.mockAttentionRow}><span className={styles.mockDot} style={{ background: 'var(--success)' }} />IVA actualizado</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.laptopBase} />

          <div className={styles.phoneMock}>
            <div className={styles.phoneMockNotch} />
            <div className={styles.phoneMockScreen}>
              <svg viewBox="0 0 54 78" preserveAspectRatio="none" width="100%" height="100%">
                <path d="M2 64 C10 70 12 50 18 54 S30 38 38 44 S48 58 52 20" fill="none" stroke="var(--blue)" strokeWidth="2.5" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="canales">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Tus canales, conectados</p>
          <h2>Todo lo que vendés, en un solo lugar</h2>
          <p>
            Conectá tus plataformas de venta y SimpleComm se encarga de convertir tus ventas en facturas, cobranzas y reportes fiscales.
          </p>
        </div>

        <div className={styles.iconFlow}>
          {flowSteps.map((step, i) => (
            <div className={styles.iconFlowItem} key={step.label}>
              <div className={styles.iconFlowStep}>
                <div className={styles.iconFlowCircle} style={{ background: step.bg, color: step.color }}>
                  <step.Icon size={22} />
                </div>
                <span>{step.label}</span>
              </div>
              {i < flowSteps.length - 1 && <span className={styles.iconFlowArrow}>→</span>}
            </div>
          ))}
        </div>

        <div className={styles.channelsRow}>
          {channels.map((channel) => (
            <span key={channel}>{channel}</span>
          ))}
          <span className={styles.channelsMore}>y más...</span>
        </div>
      </section>

      <section className={styles.section} id="funcionalidades">
        <div className={styles.featureSection}>
          <div>
            <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
              <p className={styles.kicker}>Más que facturación</p>
              <h2>Una herramienta completa para hacer crecer tu negocio</h2>
              <p>Todo lo que necesitás para gestionar tu e-commerce, sin complicaciones y en un solo lugar.</p>
            </div>

            <div className={styles.featureGrid}>
              {features.map((f) => (
                <div className={styles.featureItem} key={f.title}>
                  <div className={styles.featureIcon}><f.Icon size={18} /></div>
                  <div>
                    <h4>{f.title}</h4>
                    <p>{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.featureSideCard}>
            <div className={styles.featureSideIcon}><IconBulb size={20} /></div>
            <h3>Menos administración. Más negocio.</h3>
            <p>SimpleComm te da la información que necesitás para tomar mejores decisiones y enfocarte en lo más importante: hacer crecer tu negocio.</p>
            <div className={styles.featureSideBrand}>
              <LogoWhite size="sm" />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.adaptadoGrid}>
          <div className={styles.darkMockCard}>
            <div className={styles.darkMockHeader}>Resumen del mes</div>
            <div className={styles.darkMockKpiRow}>
              <div className={styles.darkMockKpi}><small>Facturado</small><strong>$18.150.000</strong></div>
              <div className={styles.darkMockKpi}><small>Cobrado</small><strong>$15.420.000</strong></div>
              <div className={styles.darkMockKpi}><small>Pendiente</small><strong>$2.730.000</strong></div>
              <div className={styles.darkMockKpi}><small>% cobrado</small><strong>85%</strong></div>
            </div>
            <div className={styles.darkMockSplit}>
              <div className={styles.darkMockPanel}>
                <small>Ventas por canal</small>
                <div className={styles.darkBars}>
                  <div className={styles.darkBar} style={{ height: '90%', background: 'var(--blue)' }} />
                  <div className={styles.darkBar} style={{ height: '55%', background: '#8B5CF6' }} />
                  <div className={styles.darkBar} style={{ height: '28%', background: 'var(--success)' }} />
                  <div className={styles.darkBar} style={{ height: '10%', background: 'var(--warning)' }} />
                </div>
              </div>
              <div className={styles.darkMockPanel}>
                <small>Posición de IVA</small>
                <div className={styles.darkMockIvaValue}>$2.330.000</div>
                <em style={{ color: '#7cc3ff' }}>↓ 15% vs. mes anterior</em>
              </div>
            </div>
          </div>

          <div>
            <div className={styles.sectionHeader} style={{ marginBottom: '1.5rem' }}>
              <p className={styles.kicker}>Para todos los modelos de negocio</p>
              <h2>Adaptado a vos, no a la inversa</h2>
              <p>Ya sea que estés empezando o tengas un negocio consolidado, SimpleComm se adapta a tu realidad.</p>
            </div>

            <div className={styles.audienceGrid}>
              {audiences.map((a) => (
                <div className={styles.audienceCard} key={a.title}>
                  <div className={styles.audienceIcon}><a.Icon size={17} /></div>
                  <h4>{a.title}</h4>
                  <p>{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="planes">
        <div className={styles.sectionHeader} style={{ margin: '0 auto 2.5rem', textAlign: 'center' }}>
          <p className={styles.kicker}>Planes flexibles</p>
          <h2>Elegí el plan que se adapta a tu negocio</h2>
          <p>
            Comenzá gratis y elegí el plan que mejor se ajuste a tus necesidades. Podés cambiarlo cuando quieras.
          </p>
        </div>

        <PricingSection plans={plans} />
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <LogoWhite size="md" />
            <p>Tu negocio, en orden.</p>
          </div>
          <div>
            <h4>Producto</h4>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#planes">Planes</a>
            <a href="#canales">Integraciones</a>
            <Link href="/faq">Centro de ayuda</Link>
          </div>
          <div>
            <h4>Compañía</h4>
            <Link href="/terminos">Términos y condiciones</Link>
            <Link href="/faq">Contacto</Link>
            <Link href="/login">Iniciar sesión</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} SimpleComm. Todos los derechos reservados.</span>
          <span>Conectado con ARCA vía WSFE</span>
        </div>
      </footer>
    </main>
  );
}
