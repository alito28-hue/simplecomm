'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/app/auth/actions';
import styles from './login.module.css';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
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

        <h1 className={styles.title}>Ingresá a tu cuenta</h1>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>
            <div className={styles.passwordWrap}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Mostrar contraseña"
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <Link href="/forgot-password" className={styles.forgotLink}>
            ¿Olvidaste tu contraseña?
          </Link>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className={styles.footer}>
          ¿Todavía no tenés cuenta?{' '}
          <Link href="/register" className={styles.link}>
            Regístrate ahora
          </Link>
        </p>
      </div>
    </div>
  );
}
