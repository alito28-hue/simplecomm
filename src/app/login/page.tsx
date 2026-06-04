'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/app/auth/actions';
import Logo from '@/components/Logo';
import { useI18n } from '@/lib/i18n/context';
import styles from './login.module.css';

export default function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo size="md" />
        </div>

        <div className={styles.langRow}>
          <button onClick={() => setLocale('es')} className={`${styles.langBtn} ${locale === 'es' ? styles.langActive : ''}`}>ES</button>
          <button onClick={() => setLocale('en')} className={`${styles.langBtn} ${locale === 'en' ? styles.langActive : ''}`}>EN</button>
        </div>

        <h1 className={styles.title}>{t.auth.welcomeBack}</h1>
        <p className={styles.subtitle}>{t.auth.signInSubtitle}</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">{t.auth.email}</label>
            <input id="email" name="email" type="email" required
              placeholder="vos@empresa.com" className="input" autoComplete="email" />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="password">{t.auth.password}</label>
              <Link href="/forgot-password" className={styles.forgot}>{t.auth.forgotPassword}</Link>
            </div>
            <div className={styles.pwWrap}>
              <input id="password" name="password" type={showPw ? 'text' : 'password'}
                required placeholder="••••••••" className="input" autoComplete="current-password" />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className={`btn btn-navy ${styles.submitBtn}`} disabled={loading}>
            {loading ? t.auth.signingIn : t.auth.signIn}
          </button>
        </form>

        <p className={styles.footer}>
          {t.auth.noAccount}{' '}
          <Link href="/register" className={styles.link}>{t.auth.createFree}</Link>
        </p>
      </div>
    </div>
  );
}
