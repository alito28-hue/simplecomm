'use client';

import { useState } from 'react';
import Logo from '@/components/Logo';
import { updatePassword } from '@/app/auth/actions';
import styles from '../login/login.module.css';

export default function ResetPasswordPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.currentTarget);
    if (formData.get('password') !== formData.get('confirmPassword')) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const result = await updatePassword(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo size="md" />
        </div>

        <h1 className={styles.title}>Crear nueva contraseña</h1>
        <p className={styles.subtitle}>
          Elegí una contraseña nueva para volver a entrar a SimpleComm.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="password">Nueva contraseña</label>
            <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} className="input" autoComplete="new-password" />
          </div>

          <button type="submit" className={`btn btn-navy ${styles.submitBtn}`} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
