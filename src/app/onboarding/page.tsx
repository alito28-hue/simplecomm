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
  const [error, setError]   = useState('');

  const [data, setData] = useState({
    name: '', cuit: '', address: '', province: 'Buenos Aires',
    city: '', fiscalTreatment: 'RESPONSABLE_INSCRIPTO',
  });

  const [afip, setAfip] = useState({
    ptoVta: '',
    authMethod: 'delegation' as 'delegation' | 'certificate',
    certPem: '', keyPem: '', chainPem: '',
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function handleNext() {
    setError('');

    if (step === 1) {
      if (!data.name) { setError('El nombre de la empresa es requerido.'); return; }
      setSaving(true);
      try {
        const res = await fetch('/api/organizacion/empresa', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error al guardar empresa'); }
      } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); setSaving(false); return; }
      setSaving(false);
    }

    if (step === 2) {
      if (!afip.ptoVta || isNaN(Number(afip.ptoVta))) {
        setError('Ingresá el número de punto de venta.'); return;
      }
      if (afip.authMethod === 'certificate' && (!afip.certPem || !afip.keyPem || !afip.chainPem)) {
        setError('Debés subir el certificado, la clave privada y la cadena CA.'); return;
      }
      setSaving(true);
      try {
        const res = await fetch('/api/organizations/afip-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cuit:       data.cuit.replace(/\D/g, ''),
            ptoVta:     Number(afip.ptoVta),
            authMethod: afip.authMethod,
            certPem:    afip.certPem || undefined,
            keyPem:     afip.keyPem  || undefined,
            chainPem:   afip.chainPem || undefined,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error al configurar ARCA'); }
      } catch (e) { setError(e instanceof Error ? e.message : 'Error al configurar ARCA'); setSaving(false); return; }
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
              <h2 className={styles.stepTitle}>¡Bienvenido a SimpleComm!</h2>
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
                <div className={styles.checkItem}><span>🎁</span><span>10 comprobantes gratis para empezar</span></div>
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
              <div className={styles.field}><label>CUIT *</label>
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
            <div className={styles.form}>
              <h2 className={styles.stepTitle}>Conectar ARCA</h2>
              <p className={styles.stepDesc}>
                Para emitir facturas bajo tu CUIT, necesitás autorizar a SimpleComm en ARCA.
                <a href="/dashboard/tutoriales/certificado-afip" target="_blank" className={styles.helpLink}> Ver guía paso a paso ↗</a>
              </p>
              {error && <div className={styles.formError}>{error}</div>}

              <div className={styles.field}><label>Número de Punto de Venta *</label>
                <input className="input" type="number" min="1" value={afip.ptoVta}
                  onChange={e => setAfip(a => ({ ...a, ptoVta: e.target.value }))}
                  placeholder="Ej: 5 (crealo en ARCA como tipo Web Services)" />
              </div>

              <div className={styles.field}>
                <label>Método de autorización</label>
                <div className={styles.methodCards}>
                  <div
                    className={`${styles.methodCard} ${afip.authMethod === 'delegation' ? styles.methodSelected : ''}`}
                    onClick={() => setAfip(a => ({ ...a, authMethod: 'delegation' }))}>
                    <div className={styles.methodIcon}>🤝</div>
                    <div className={styles.methodTitle}>Delegación (recomendado)</div>
                    <div className={styles.methodDesc}>Autorizás el CUIT de SimpleComm en ARCA. Sin archivos que subir.</div>
                  </div>
                  <div
                    className={`${styles.methodCard} ${afip.authMethod === 'certificate' ? styles.methodSelected : ''}`}
                    onClick={() => setAfip(a => ({ ...a, authMethod: 'certificate' }))}>
                    <div className={styles.methodIcon}>🔐</div>
                    <div className={styles.methodTitle}>Certificado propio</div>
                    <div className={styles.methodDesc}>Subís tu propio certificado AFIP. Mayor control.</div>
                  </div>
                </div>
              </div>

              {afip.authMethod === 'delegation' && (
                <div className={styles.delegationSteps}>
                  <p className={styles.delegationTitle}>Pasos para delegar:</p>
                  <ol className={styles.stepsList}>
                    <li>Ingresá a <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" className={styles.helpLink}>mi.afip.gov.ar</a> con tu CUIT y clave fiscal</li>
                    <li>Ir a <strong>Administrador de Relaciones de Clave Fiscal</strong></li>
                    <li>Seleccionar <strong>Nueva Relación</strong></li>
                    <li>CUIT del representante: <strong>30715371622</strong> (Mocla SA / SimpleComm)</li>
                    <li>Servicio: <strong>wsfe</strong> (Facturación Electrónica)</li>
                    <li>Confirmar y volver acá</li>
                  </ol>
                  <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" className={`btn btn-outline btn-sm ${styles.arcaBtn}`}>
                    Ir al portal de ARCA ↗
                  </a>
                </div>
              )}

              {afip.authMethod === 'certificate' && (
                <div className={styles.certUpload}>
                  <p className={styles.certNote}>
                    Necesitás generar un certificado en ARCA para el servicio wsfe.
                    <a href="/dashboard/tutoriales/certificado-afip" target="_blank" className={styles.helpLink}> Ver cómo hacerlo ↗</a>
                  </p>
                  <div className={styles.field}>
                    <label>Certificado (.pem)</label>
                    <input type="file" accept=".pem,.crt,.cer" className="input"
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setAfip(a => ({ ...a, certPem: '' }));
                        const txt = await readFile(f);
                        setAfip(a => ({ ...a, certPem: txt }));
                      }} />
                  </div>
                  <div className={styles.field}>
                    <label>Clave privada (.pem)</label>
                    <input type="file" accept=".pem,.key" className="input"
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const txt = await readFile(f);
                        setAfip(a => ({ ...a, keyPem: txt }));
                      }} />
                  </div>
                  <div className={styles.field}>
                    <label>Cadena CA (.pem) — descargala de ARCA</label>
                    <input type="file" accept=".pem,.crt,.cer" className="input"
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const txt = await readFile(f);
                        setAfip(a => ({ ...a, chainPem: txt }));
                      }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className={styles.readySection}>
              <div className={styles.readyIcon}>🎉</div>
              <h2 className={styles.stepTitle}>¡Todo listo!</h2>
              <p className={styles.stepDesc}>
                SimpleComm está configurado y listo para usar.
              </p>
              <div style={{
                background: 'var(--surface-low)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                margin: '1rem 0 1.5rem',
                textAlign: 'left',
              }}>
                <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>🎁 10 comprobantes gratis para empezar</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  No necesitás tarjeta ahora. Emitís tus primeros 10 comprobantes sin costo.
                  Cuando los uses, podés elegir el plan que mejor se adapte a tu volumen.
                </p>
              </div>
              <div className={styles.readyActions}>
                <button onClick={() => router.push('/dashboard')} className="btn btn-primary btn-lg">Ir al dashboard</button>
              </div>
            </div>
          )}
        </div>

        {step < 3 && (
          <div className={styles.nav}>
            {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost">← Atrás</button>}
            <button onClick={handleNext} className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Continuar →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
