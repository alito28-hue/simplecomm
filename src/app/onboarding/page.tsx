'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import styles from './onboarding.module.css';

const STEPS = ['Tu cuenta', 'Empresa', 'Conectar ARCA', 'Listo'];
const PROVINCES = ['Buenos Aires','Ciudad Autónoma de Buenos Aires','Córdoba','Santa Fe','Mendoza','Tucumán','Salta','Entre Ríos','Misiones','Chaco','Corrientes','Santiago del Estero','San Juan','Jujuy','Río Negro','Neuquén','Formosa','La Pampa','Catamarca','La Rioja','San Luis','Santa Cruz','Chubut','Tierra del Fuego'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    name: '', cuit: '', address: '', province: 'Buenos Aires',
    city: '', fiscalTreatment: 'RESPONSABLE_INSCRIPTO',
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  async function handleNext() {
    setError('');

    // Step 1 (Empresa) → guardar organización en DB
    if (step === 1) {
      if (!data.name) { setError('El nombre de la empresa es requerido.'); return; }
      setSaving(true);
      try {
        const res = await fetch('/api/organizacion/empresa', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? 'Error al guardar empresa');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al guardar');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setStep(s => s + 1);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}><Logo size="md" /></div>

        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.stepLabels}>
            {STEPS.map((s, i) => (
              <span key={s} className={`${styles.stepLabel} ${i <= step ? styles.stepActive : ''}`}>{s}</span>
            ))}
          </div>
        </div>

        <div className={styles.stepContent}>
          {step === 0 && (
            <div>
              <h2 className={styles.stepTitle}>¡Bienvenido a SimpleComm! 🎉</h2>
              <p className={styles.stepDesc}>
                Tu cuenta fue creada. Antes de continuar, <strong>revisá tu email</strong> y
                confirmá tu dirección. Luego volvé para configurar tu empresa.
              </p>
              <div className={styles.emailAlert}>
                <span className={styles.emailAlertIcon}>📧</span>
                <div>
                  <div className={styles.emailAlertTitle}>Confirmá tu email</div>
                  <div className={styles.emailAlertDesc}>
                    Hacé clic en el enlace que te enviamos y después iniciá sesión para continuar.
                  </div>
                </div>
              </div>
              <div className={styles.checkList}>
                <div className={styles.checkItem}><span>✅</span><span>Cuenta creada</span></div>
                <div className={styles.checkItem}><span>⬜</span><span>Email confirmado</span></div>
                <div className={styles.checkItem}><span>⬜</span><span>Datos de empresa</span></div>
                <div className={styles.checkItem}><span>⬜</span><span>Conexión con ARCA</span></div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.form}>
              <h2 className={styles.stepTitle}>Datos de tu empresa</h2>
              <p className={styles.stepDesc}>Completá los datos fiscales de tu organización.</p>
              {error && <div className={styles.formError}>{error}</div>}
              <div className={styles.field}><label>Razón social *</label>
                <input className="input" value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} placeholder="Acme S.A." />
              </div>
              <div className={styles.field}><label>CUIT</label>
                <input className="input" value={data.cuit} onChange={e => setData(d => ({ ...d, cuit: e.target.value }))} placeholder="30-00000000-0" />
              </div>
              <div className={styles.field}><label>Condición fiscal</label>
                <select className="select" value={data.fiscalTreatment} onChange={e => setData(d => ({ ...d, fiscalTreatment: e.target.value }))}>
                  <option value="RESPONSABLE_INSCRIPTO">IVA Responsable Inscripto</option>
                  <option value="MONOTRIBUTISTA">Monotributista</option>
                  <option value="EXENTO">Exento</option>
                </select>
              </div>
              <div className={styles.field}><label>Domicilio fiscal</label>
                <input className="input" value={data.address} onChange={e => setData(d => ({ ...d, address: e.target.value }))} />
              </div>
              <div className={styles.row}>
                <div className={styles.field}><label>Provincia</label>
                  <select className="select" value={data.province} onChange={e => setData(d => ({ ...d, province: e.target.value }))}>
                    {PROVINCES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.field}><label>Localidad</label>
                  <input className="input" value={data.city} onChange={e => setData(d => ({ ...d, city: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className={styles.stepTitle}>Conectar ARCA</h2>
              <p className={styles.stepDesc}>Para emitir facturas electrónicas reales, necesitás autorizar a SimpleComm en ARCA.</p>
              <div className={styles.stepCards}>
                <div className={styles.arcaStep}>
                  <span className={styles.arcaNum}>1</span>
                  <div>
                    <div className={styles.arcaTitle}>Autorizá a SimpleComm en ARCA</div>
                    <div className={styles.arcaDesc}>Ingresá a <strong>mi.afip.gov.ar</strong> → Delegaciones → Autorizá el CUIT de SimpleComm para el servicio <strong>wsfe</strong>.</div>
                  </div>
                </div>
                <div className={styles.arcaStep}>
                  <span className={styles.arcaNum}>2</span>
                  <div>
                    <div className={styles.arcaTitle}>Creá un Punto de Venta</div>
                    <div className={styles.arcaDesc}>En ARCA, creá un nuevo punto de venta con tipo <strong>Web Services</strong>.</div>
                  </div>
                </div>
              </div>
              <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" className={`btn btn-outline ${styles.arcaBtn}`}>Ir al portal de ARCA ↗</a>
              <p className={styles.arcaNote}>¿Ya lo hiciste? Hacé clic en Continuar. Podés completar esto después desde Configuración.</p>
            </div>
          )}

          {step === 3 && (
            <div className={styles.readySection}>
              <div className={styles.readyIcon}>🚀</div>
              <h2 className={styles.stepTitle}>¡Todo listo!</h2>
              <p className={styles.stepDesc}>
                SimpleComm está configurado. Iniciá sesión con tu email confirmado para comenzar a facturar.
              </p>
              <div className={styles.readyActions}>
                <button onClick={() => router.push('/login')} className="btn btn-primary btn-lg">Iniciar sesión</button>
              </div>
              <p className={styles.arcaNote} style={{ marginTop: '1rem' }}>¿No recibiste el email? Revisá tu carpeta de spam.</p>
            </div>
          )}
        </div>

        {step < 3 && (
          <div className={styles.nav}>
            {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost">← Atrás</button>}
            <button onClick={handleNext} className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : step === STEPS.length - 2 ? 'Finalizar' : 'Continuar →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
