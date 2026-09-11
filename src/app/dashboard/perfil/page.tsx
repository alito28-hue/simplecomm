'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '../organizacion/clientes/clientes.module.css';

export default function PerfilPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', address: '', city: '', province: '', zipCode: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentEmail(user.email ?? '');
        const m = user.user_metadata ?? {};
        setForm({
          firstName: m.first_name ?? '',
          lastName: m.last_name ?? '',
          address: m.personal_address ?? '',
          city: m.personal_city ?? '',
          province: m.personal_province ?? '',
          zipCode: m.personal_zip_code ?? '',
        });
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function guardarPerfil() {
    setSavingProfile(true); setProfileMsg(null);
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: form.firstName,
        last_name: form.lastName,
        personal_address: form.address,
        personal_city: form.city,
        personal_province: form.province,
        personal_zip_code: form.zipCode,
      },
    });
    setProfileMsg(error ? { ok: false, text: error.message } : { ok: true, text: '✓ Datos guardados.' });
    setSavingProfile(false);
  }

  async function cambiarEmail() {
    if (!newEmail.trim()) return;
    setSavingEmail(true); setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setEmailMsg({ ok: false, text: error.message });
    } else {
      setEmailMsg({ ok: true, text: `✓ Te mandamos un link de confirmación a ${newEmail.trim()} y a ${currentEmail}. El cambio no se aplica hasta que lo confirmes.` });
      setNewEmail('');
    }
    setSavingEmail(false);
  }

  async function cambiarPassword() {
    if (newPassword.length < 8) { setPasswordMsg({ ok: false, text: 'La contraseña debe tener al menos 8 caracteres.' }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: 'Las contraseñas no coinciden.' }); return; }
    setSavingPassword(true); setPasswordMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg({ ok: false, text: error.message });
    } else {
      setPasswordMsg({ ok: true, text: '✓ Contraseña actualizada.' });
      setNewPassword(''); setConfirmPassword('');
    }
    setSavingPassword(false);
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-muted)' }}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mi Perfil</h1>
          <p className={styles.pageSubtitle}>Tus datos personales, email y contraseña. Para los datos fiscales de la empresa, andá a Configuración.</p>
        </div>
      </div>

      {/* Datos personales */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Datos personales</h2>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Nombre</label>
            <input className="input" value={form.firstName} onChange={e => update('firstName', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Apellido</label>
            <input className="input" value={form.lastName} onChange={e => update('lastName', e.target.value)} />
          </div>
        </div>
        {profileMsg && (
          <p className="text-sm" style={{ color: profileMsg.ok ? 'var(--success)' : 'var(--error)', margin: '0.5rem 0' }}>{profileMsg.text}</p>
        )}
        <button className="btn btn-primary btn-sm" onClick={guardarPerfil} disabled={savingProfile} style={{ marginTop: '0.5rem' }}>
          {savingProfile ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Dirección postal */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Dirección postal</h2>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>Tu dirección personal — no es el domicilio fiscal de la empresa (eso se configura en Organización → Empresa).</p>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Calle y número</label>
            <input className="input" value={form.address} onChange={e => update('address', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Ciudad</label>
            <input className="input" value={form.city} onChange={e => update('city', e.target.value)} />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Provincia</label>
            <input className="input" value={form.province} onChange={e => update('province', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Código Postal</label>
            <input className="input" value={form.zipCode} onChange={e => update('zipCode', e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={guardarPerfil} disabled={savingProfile} style={{ marginTop: '0.5rem' }}>
          {savingProfile ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Email */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Email</h2>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>Actual: <strong>{currentEmail}</strong></p>
        <div className={styles.field} style={{ maxWidth: 340 }}>
          <label>Nuevo email</label>
          <input className="input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="nuevo@email.com" />
        </div>
        {emailMsg && (
          <p className="text-sm" style={{ color: emailMsg.ok ? 'var(--success)' : 'var(--error)', margin: '0.5rem 0', maxWidth: 480 }}>{emailMsg.text}</p>
        )}
        <button className="btn btn-outline btn-sm" onClick={cambiarEmail} disabled={savingEmail || !newEmail.trim()} style={{ marginTop: '0.5rem' }}>
          {savingEmail ? 'Enviando...' : 'Cambiar email'}
        </button>
      </div>

      {/* Contraseña */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Contraseña</h2>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Contraseña nueva</label>
            <input className="input" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Confirmar contraseña</label>
            <input className="input" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        {passwordMsg && (
          <p className="text-sm" style={{ color: passwordMsg.ok ? 'var(--success)' : 'var(--error)', margin: '0.5rem 0' }}>{passwordMsg.text}</p>
        )}
        <button className="btn btn-outline btn-sm" onClick={cambiarPassword} disabled={savingPassword || !newPassword} style={{ marginTop: '0.5rem' }}>
          {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </div>
    </div>
  );
}
