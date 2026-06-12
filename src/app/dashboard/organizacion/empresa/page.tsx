'use client';

import { useEffect, useState } from 'react';
import BackButton from '@/components/BackButton';
import styles from './empresa.module.css';

const FISCAL = ['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL', 'NO_CATEGORIZADO'];
const PROVINCES = ['Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Salta', 'Entre Ríos', 'Misiones', 'Chaco', 'Corrientes', 'Santiago del Estero', 'San Juan', 'Jujuy', 'Río Negro', 'Neuquén', 'Formosa', 'La Pampa', 'Catamarca', 'La Rioja', 'San Luis', 'Santa Cruz', 'Chubut', 'Tierra del Fuego'];

export default function EmpresaPage() {
  const [form, setForm] = useState({
    name: '', cuit: '', personType: '', fiscalTreatment: 'RESPONSABLE_INSCRIPTO',
    address: '', province: '', city: '', zipCode: '',
    phone: '', emailAlerts: '', emailAccountant: '', iibb: '', cbu: '',
    validateVouchers: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(data => { if (data && data.name) setForm(f => ({ ...f, ...data })); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/organizacion/empresa', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <BackButton href="/dashboard/organizacion" label="← Configuración" />
      <h1 className={styles.pageTitle}>{form.personType === 'FISICA' ? 'Persona Física' : 'Empresa'}</h1>

      {error && <div className={styles.error}>{error}</div>}
      {saved && <div className={styles.success}>✓ Datos guardados correctamente</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos generales</h2>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label>{form.personType === 'FISICA' ? 'Nombre y Apellido' : 'Razón social'}</label>
              <input className="input" value={form.name} onChange={e => update('name', e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>CUIT</label>
              <input className="input" value={form.cuit} onChange={e => update('cuit', e.target.value)} placeholder="30-00000000-0" />
            </div>
            <div className={styles.field}>
              <label>Condición fiscal</label>
              <select className="select" value={form.fiscalTreatment} onChange={e => update('fiscalTreatment', e.target.value)}>
                {FISCAL.map(f => <option key={f} value={f}>{f.replace(/_/g,' ')}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label>Domicilio fiscal</label>
              <input className="input" value={form.address} onChange={e => update('address', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Provincia</label>
              <select className="select" value={form.province} onChange={e => update('province', e.target.value)}>
                <option value="">Seleccionar</option>
                {PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.grid4}>
            <div className={styles.field}>
              <label>Localidad</label>
              <input className="input" value={form.city} onChange={e => update('city', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Código postal</label>
              <input className="input" value={form.zipCode} onChange={e => update('zipCode', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Teléfono</label>
              <input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>IIBB</label>
              <input className="input" value={form.iibb} onChange={e => update('iibb', e.target.value)} />
            </div>
          </div>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label>Email de alertas</label>
              <input className="input" type="email" value={form.emailAlerts} onChange={e => update('emailAlerts', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Email contador</label>
              <input className="input" type="email" value={form.emailAccountant} onChange={e => update('emailAccountant', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>CBU</label>
              <input className="input" value={form.cbu} onChange={e => update('cbu', e.target.value)} />
            </div>
          </div>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.validateVouchers} onChange={e => update('validateVouchers', e.target.checked)} />
              <span>Validación de comprobantes</span>
            </label>
          </div>
        </section>

        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="reset" className="btn btn-ghost" onClick={() => setForm(f => ({ ...f }))}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
