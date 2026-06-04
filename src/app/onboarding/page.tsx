'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import styles from './onboarding.module.css';

const STEPS = ['Account Setup', 'Company Details', 'ARCA Connection', 'Ready!'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    orgName: '',
    cuit: '',
    address: '',
    province: 'Buenos Aires',
    fiscalTreatment: 'RESPONSABLE_INSCRIPTO',
  });

  function updateData(field: string, value: string) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      router.push('/dashboard');
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo size="md" />
        </div>

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.stepLabels}>
            {STEPS.map((s, i) => (
              <span key={s} className={`${styles.stepLabel} ${i <= step ? styles.stepActive : ''}`}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className={styles.stepContent}>
          {step === 0 && (
            <div>
              <h2 className={styles.stepTitle}>Welcome to SimpleComm! 🎉</h2>
              <p className={styles.stepDesc}>
                You&apos;re all set. Your account has been created. Let&apos;s configure your company details.
              </p>
              <div className={styles.checkList}>
                <div className={styles.checkItem}>
                  <span className={styles.checkIcon}>✅</span>
                  <span>Account created</span>
                </div>
                <div className={styles.checkItem}>
                  <span className={styles.checkIcon}>⬜</span>
                  <span>Company details</span>
                </div>
                <div className={styles.checkItem}>
                  <span className={styles.checkIcon}>⬜</span>
                  <span>ARCA connection</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.form}>
              <h2 className={styles.stepTitle}>Company Details</h2>
              <p className={styles.stepDesc}>Tell us about your business.</p>

              <div className={styles.field}>
                <label>Company / Razón social</label>
                <input type="text" value={data.orgName} onChange={e => updateData('orgName', e.target.value)}
                  placeholder="Acme S.A." className="input" required />
              </div>
              <div className={styles.field}>
                <label>CUIT</label>
                <input type="text" value={data.cuit} onChange={e => updateData('cuit', e.target.value)}
                  placeholder="30-00000000-0" className="input" />
              </div>
              <div className={styles.field}>
                <label>Fiscal address</label>
                <input type="text" value={data.address} onChange={e => updateData('address', e.target.value)}
                  placeholder="Av. Corrientes 1234, CABA" className="input" />
              </div>
              <div className={styles.field}>
                <label>Fiscal treatment</label>
                <select value={data.fiscalTreatment} onChange={e => updateData('fiscalTreatment', e.target.value)} className="select">
                  <option value="RESPONSABLE_INSCRIPTO">IVA Responsable Inscripto</option>
                  <option value="MONOTRIBUTISTA">Monotributista</option>
                  <option value="EXENTO">Exento</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className={styles.stepTitle}>Connect ARCA</h2>
              <p className={styles.stepDesc}>
                To issue real electronic invoices, you need to authorize SimpleComm&apos;s CUIT in
                ARCA&apos;s web portal.
              </p>

              <div className={styles.stepCards}>
                <div className={styles.arcaStep}>
                  <span className={styles.arcaNum}>1</span>
                  <div>
                    <div className={styles.arcaTitle}>Authorize SimpleComm in ARCA</div>
                    <div className={styles.arcaDesc}>
                      Go to <strong>mi.afip.gov.ar</strong> → Delegaciones → Authorize CUIT{' '}
                      <strong>30-XXXXXXXX-X</strong> for service <strong>wsfe</strong>.
                    </div>
                  </div>
                </div>
                <div className={styles.arcaStep}>
                  <span className={styles.arcaNum}>2</span>
                  <div>
                    <div className={styles.arcaTitle}>Register your Point of Sale</div>
                    <div className={styles.arcaDesc}>
                      In ARCA, create a new sales point (Punto de Venta) with type <strong>Web Services</strong>.
                    </div>
                  </div>
                </div>
              </div>

              <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank"
                className={`btn btn-outline ${styles.arcaBtn}`}>
                Open ARCA portal ↗
              </a>

              <p className={styles.arcaNote}>
                Already done? Click Continue — you can complete this later from Settings.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className={styles.readySection}>
              <div className={styles.readyIcon}>🚀</div>
              <h2 className={styles.stepTitle}>You&apos;re all set!</h2>
              <p className={styles.stepDesc}>
                SimpleComm is ready. Start issuing invoices, connect your platforms, and track your operations.
              </p>
              <div className={styles.readyActions}>
                <button onClick={() => router.push('/dashboard/facturacion/simplificada')}
                  className="btn btn-primary">
                  Issue first invoice
                </button>
                <button onClick={() => router.push('/dashboard/integraciones')}
                  className="btn btn-outline">
                  Connect platforms
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {step < 3 && (
          <div className={styles.nav}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn btn-ghost">
                ← Back
              </button>
            )}
            <button onClick={handleNext} className="btn btn-primary" disabled={loading}>
              {step === STEPS.length - 2 ? 'Finish setup' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
