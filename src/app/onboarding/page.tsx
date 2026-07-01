'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { suggestFiscalTreatment } from '@/lib/fiscal';
import styles from './onboarding.module.css';

type PadronStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

interface PadronData {
  cuil: string;
  nombre: string;
  tipoPersona: string;
  estadoClave: string;
  domicilio?: { direccion?: string; provincia?: string; codPostal?: string };
  monotributo?: boolean;
  ivaCondition?: 'INSCRIPTO' | 'EXENTO' | null;
  periodoActividadPrincipal?: string;
}

// ARCA informa el período de actividad principal como "AAAAMM" (sin día).
// Lo usamos como aproximación de la fecha de inicio de actividades.
function periodoToIsoDate(periodo: string | undefined): string | null {
  if (!periodo || !/^\d{6}$/.test(periodo)) return null;
  return `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}-01`;
}

const STEPS = ['Tu cuenta', 'Empresa', 'Conectar ARCA', 'Listo'];
const PROVINCES = ['Buenos Aires','Ciudad Autónoma de Buenos Aires','Córdoba','Santa Fe','Mendoza','Tucumán','Salta','Entre Ríos','Misiones','Chaco','Corrientes','Santiago del Estero','San Juan','Jujuy','Río Negro','Neuquén','Formosa','La Pampa','Catamarca','La Rioja','San Luis','Santa Cruz','Chubut','Tierra del Fuego'];

// El Padrón de ARCA devuelve la provincia en mayúsculas y sin acentos
// (ej. "CIUDAD AUTONOMA BUENOS AIRES"), por eso la normalizamos para
// poder mapearla a una opción del <select> de provincias.
function normalizeProvincia(s: string) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\bDE\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchProvincia(raw: string): string | null {
  const target = normalizeProvincia(raw);
  return PROVINCES.find(p => normalizeProvincia(p) === target) ?? null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [data, setData] = useState({
    name: '', cuit: '', address: '', province: 'Buenos Aires',
    city: '', fiscalTreatment: 'RESPONSABLE_INSCRIPTO', personType: '', startDate: '',
  });
  const [startDateSuggested, setStartDateSuggested] = useState(false);

  // Si el usuario ya tocó manualmente "Condición fiscal", no la pisamos
  // con la sugerencia del Padrón de ARCA.
  const fiscalTouchedRef = useRef(false);
  const [fiscalSuggested, setFiscalSuggested] = useState(false);

  const [afip, setAfip] = useState({
    ptoVta: '',
    authMethod: 'delegation' as 'delegation' | 'certificate',
    certPem: '', keyPem: '', chainPem: '',
  });

  const [padronStatus, setPadronStatus] = useState<PadronStatus>('idle');
  const [padronData, setPadronData] = useState<PadronData | null>(null);
  const [padronError, setPadronError] = useState<string | null>(null);
  const [padronCountdown, setPadronCountdown] = useState(15);

  // El link de confirmación de email llega a /onboarding con la sesión en el
  // hash de la URL (#access_token=...&refresh_token=...). Si no la activamos
  // acá, el servidor nunca ve la sesión y todas las llamadas a /api/* terminan
  // redirigidas a /login.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return;

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return;

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(() => {
      window.history.replaceState(null, '', window.location.pathname);
    });
  }, []);

  // Cuenta regresiva para la consulta al Padrón: la consulta a ARCA puede
  // tardar varios segundos, así que mostramos un contador para que el
  // usuario sepa que sigue en curso y no se impaciente.
  useEffect(() => {
    if (padronStatus !== 'loading') { setPadronCountdown(15); return; }
    const interval = setInterval(() => {
      setPadronCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [padronStatus]);

  // Al cargar un CUIT/CUIL válido, consultamos el Padrón de ARCA y completamos
  // nombre, domicilio y provincia automáticamente (sin pisar lo que el usuario ya escribió).
  useEffect(() => {
    const clean = data.cuit.replace(/\D/g, '');
    if (clean.length !== 11) { setPadronStatus('idle'); setPadronData(null); setPadronError(null); return; }

    setPadronStatus('loading');
    setPadronError(null);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/padron/${clean}`);
        if (!res.ok) {
          let detail = '';
          try { const body = await res.json(); detail = body?.error ?? ''; } catch {}
          setPadronStatus(res.status === 404 ? 'not_found' : 'error');
          setPadronError(`HTTP ${res.status}${detail ? ` – ${detail}` : ''}`);
          setPadronData(null);
          return;
        }
        const info: PadronData = await res.json();
        setPadronData(info);
        setPadronStatus('found');
        const suggestion = suggestFiscalTreatment({ monotributo: info.monotributo, ivaCondition: info.ivaCondition });
        if (suggestion && !fiscalTouchedRef.current) setFiscalSuggested(true);
        const startDateSuggestion = periodoToIsoDate(info.periodoActividadPrincipal);
        if (startDateSuggestion) setStartDateSuggested(true);
        setData(d => ({
          ...d,
          name: d.name.trim() ? d.name : info.nombre,
          address: d.address.trim() ? d.address : (info.domicilio?.direccion ?? d.address),
          province: (!d.address.trim() && info.domicilio?.provincia)
            ? (matchProvincia(info.domicilio.provincia) ?? d.province)
            : d.province,
          personType: info.tipoPersona || d.personType,
          fiscalTreatment: (suggestion && !fiscalTouchedRef.current) ? suggestion : d.fiscalTreatment,
          startDate: d.startDate.trim() ? d.startDate : (startDateSuggestion ?? d.startDate),
        }));
      } catch (err) {
        setPadronStatus('error');
        setPadronData(null);
        setPadronError(err instanceof Error ? err.message : 'fetch failed');
      }
    }, 600);

    return () => clearTimeout(handle);
  }, [data.cuit]);

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
                Confirmamos tu email. Ahora completá los datos de tu empresa para empezar a facturar.
              </p>
              <div className={styles.checkList}>
                <div className={styles.checkItem}><span>✅</span><span>Cuenta creada</span></div>
                <div className={styles.checkItem}><span>✅</span><span>Email confirmado</span></div>
                <div className={styles.checkItem}><span>⬜</span><span>Datos de empresa</span></div>
                <div className={styles.checkItem}><span>⬜</span><span>Conexión con ARCA</span></div>
                <div className={styles.checkItem}><span>🎁</span><span>10 comprobantes gratis para empezar</span></div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.form}>
              <h2 className={styles.stepTitle}>Datos de tu empresa</h2>
              <p className={styles.stepDesc}>Ingresá tu CUIT o CUIL: consultamos el Padrón de ARCA y completamos el resto por vos.</p>
              {error && <div className={styles.formError}>{error}</div>}

              <div className={styles.field}><label>CUIT / CUIL *</label>
                <input className="input" value={data.cuit} onChange={e => setData(d => ({ ...d, cuit: e.target.value }))} placeholder="30-00000000-0 ó 20-00000000-0" />
                {padronStatus === 'loading'   && <p className={styles.padronLoading}>Consultando Padrón ARCA... ({padronCountdown}s)</p>}
                {padronStatus === 'not_found' && <p className={styles.padronWarn}>No encontramos ese CUIT/CUIL en el Padrón. Completá los datos manualmente.</p>}
                {padronStatus === 'error'     && (
                  <p className={styles.padronHint}>
                    No pudimos consultar el Padrón ahora. Completá los datos manualmente.
                    {padronError && <><br /><span style={{ opacity: 0.6 }}>({padronError})</span></>}
                  </p>
                )}
                {padronStatus === 'found' && padronData && (
                  <div className={`${styles.personaCard} ${padronData.estadoClave !== 'ACTIVO' ? styles.personaCardWarn : ''}`}>
                    <div className={styles.personaName}>{padronData.estadoClave === 'ACTIVO' ? '✓' : '⚠'} {padronData.nombre}</div>
                    <div className={styles.personaMeta}>
                      <span>{padronData.tipoPersona === 'FISICA' ? 'Persona Física' : 'Persona Jurídica'}</span>
                      <span className={padronData.estadoClave === 'ACTIVO' ? styles.metaActivo : styles.metaInactivo}>{padronData.estadoClave}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <label>{padronData ? (padronData.tipoPersona === 'FISICA' ? 'Nombre y Apellido *' : 'Razón social *') : 'Nombre / Razón social *'}</label>
                <input className="input" value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                  placeholder={padronData?.tipoPersona === 'FISICA' ? 'Juan Pérez' : 'Acme S.A.'} />
              </div>

              <div className={styles.field}><label>Condición fiscal</label>
                <select className="select" value={data.fiscalTreatment} onChange={e => {
                  fiscalTouchedRef.current = true;
                  setFiscalSuggested(false);
                  const value = e.target.value;
                  setData(d => ({ ...d, fiscalTreatment: value }));
                }}>
                  <option value="RESPONSABLE_INSCRIPTO">IVA Responsable Inscripto</option>
                  <option value="MONOTRIBUTISTA">Monotributista</option>
                  <option value="EXENTO">Exento</option>
                </select>
                {fiscalSuggested && (
                  <p className={styles.padronHint}>Pre-completado según tu inscripción en ARCA. Podés cambiarlo si no es correcto.</p>
                )}
              </div>
              <div className={styles.field}><label>Domicilio fiscal</label>
                <input className="input" value={data.address} onChange={e => setData(d => ({ ...d, address: e.target.value }))} />
              </div>
              <div className={styles.field}><label>Fecha de inicio de actividades</label>
                <input className="input" type="date" value={data.startDate} onChange={e => {
                  setStartDateSuggested(false);
                  const value = e.target.value;
                  setData(d => ({ ...d, startDate: value }));
                }} />
                {startDateSuggested && (
                  <p className={styles.padronHint}>Aproximada según ARCA (solo informa mes y año). Podés ajustarla si no es correcta.</p>
                )}
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

              <div className={styles.delegationSteps}>
                <p className={styles.delegationTitle}>Antes de continuar, dá de alta el punto de venta en ARCA:</p>
                <ol className={styles.stepsList}>
                  <li>Ingresá a <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" className={styles.helpLink}>mi.afip.gov.ar</a> con tu CUIT y clave fiscal</li>
                  <li>Ir a <strong>Administración de Puntos de Venta y Domicilios</strong></li>
                  <li>Dar de alta un punto de venta nuevo de tipo <strong>Web Services (WS)</strong></li>
                  <li>Anotá el número que te asignó ARCA y cargalo abajo</li>
                </ol>
              </div>

              <div className={styles.field}><label>Número de Punto de Venta *</label>
                <input className="input" type="number" min="1" value={afip.ptoVta}
                  onChange={e => setAfip(a => ({ ...a, ptoVta: e.target.value }))}
                  placeholder="Ej: 5 (el que diste de alta en ARCA)" />
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
                    <li>Webservice: <strong>wsfe</strong> (Facturación Electrónica)</li>
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
