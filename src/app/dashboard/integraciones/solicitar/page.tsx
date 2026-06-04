'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './solicitar.module.css';

export default function SolicitarIntegracionPage() {
  const [form, setForm] = useState({ plataforma: '', sitio: '', descripcion: '', email: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // En producción, esto enviaría a un endpoint o servicio de email
    await new Promise(r => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Link href="/dashboard/integraciones" className={styles.backLink}>← Volver a Integraciones</Link>
        <h1 className={styles.pageTitle}>Solicitar una integración</h1>
        <p className={styles.pageSubtitle}>
          ¿Usás una plataforma que no está en nuestra lista? Contanos y la evaluamos para agregarla.
        </p>
      </div>

      {sent ? (
        <div className={`card ${styles.successCard}`}>
          <div className={styles.successIcon}>✅</div>
          <h2 className={styles.successTitle}>¡Solicitud enviada!</h2>
          <p className={styles.successDesc}>
            Recibimos tu solicitud. Nuestro equipo la evaluará y te contactará por email en los próximos días.
          </p>
          <Link href="/dashboard/integraciones" className="btn btn-primary">Volver a Integraciones</Link>
        </div>
      ) : (
        <div className={`card ${styles.formCard}`}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>Nombre de la plataforma *</label>
              <input className="input" required value={form.plataforma}
                onChange={e => setForm(f => ({ ...f, plataforma: e.target.value }))}
                placeholder="Ej: Nuvemshop, Wix, Vtex..." />
            </div>
            <div className={styles.field}>
              <label>URL de tu tienda (opcional)</label>
              <input className="input" type="url" value={form.sitio}
                onChange={e => setForm(f => ({ ...f, sitio: e.target.value }))}
                placeholder="https://tu-tienda.com" />
            </div>
            <div className={styles.field}>
              <label>¿Por qué necesitás esta integración? *</label>
              <textarea className="input" required rows={4} value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Contanos cómo usás esta plataforma y qué necesitás sincronizar..." />
            </div>
            <div className={styles.field}>
              <label>Tu email de contacto *</label>
              <input className="input" type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="vos@empresa.com" />
            </div>
            <div className={styles.actions}>
              <Link href="/dashboard/integraciones" className="btn btn-ghost">Cancelar</Link>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
