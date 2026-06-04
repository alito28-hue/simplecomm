'use client';

import { useState } from 'react';
import Link from 'next/link';
import { register } from '@/app/auth/actions';
import styles from './register.module.css';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirm = formData.get('confirmPassword') as string;
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <span className={styles.logoIcon}>S</span>
          <span className={styles.logoText}>SIMPLECOMM</span>
        </div>

        <h1 className={styles.title}>Crear cuenta</h1>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="firstName">Nombre</label>
              <input id="firstName" name="firstName" type="text" required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label htmlFor="lastName">Apellido</label>
              <input id="lastName" name="lastName" type="text" required className={styles.input} />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className={styles.input} />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required minLength={8} className={styles.input} />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Repetir contraseña</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required className={styles.input} />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className={styles.footer}>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className={styles.link}>Ingresá acá</Link>
        </p>
      </div>
    </div>
  );
}
