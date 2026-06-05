'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { forgotPassword } from '@/app/auth/actions';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const result = await forgotPassword(new FormData(e.currentTarget));

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo size="md" />
        </div>

        <h1 className={styles.title}>Recuperar contraseña</h1>
        <p className={styles.subtitle}>
          Ingresá tu email y te enviamos un link para crear una nueva contraseña.
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {success && (
          <div className="badge badge-success" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}>
            Email enviado. Revisá tu bandeja de entrada.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="vos@empresa.com" className="input" autoComplete="email" />
          </div>

          <button type="submit" className={`btn btn-navy ${styles.submitBtn}`} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>

        <p className={styles.footer}>
          <Link href="/login" className={styles.link}>Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
