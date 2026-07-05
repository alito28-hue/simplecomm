'use client';

import { useState } from 'react';
import Link from 'next/link';
import { register } from '@/app/auth/actions';
import Logo from '@/components/Logo';
import { useI18n } from '@/lib/i18n/context';
import styles from './register.module.css';

export default function RegisterPage() {
  const { t, locale, setLocale } = useI18n();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    if (formData.get('password') !== formData.get('confirmPassword')) {
      setError(t.auth.passwordsMatch);
      return;
    }
    setLoading(true);
    const result = await register(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}><Logo size="md" /></div>

        <div className={styles.langRow}>
          <button onClick={() => setLocale('es')} className={`${styles.langBtn} ${locale === 'es' ? styles.langActive : ''}`}>ES</button>
          <button onClick={() => setLocale('en')} className={`${styles.langBtn} ${locale === 'en' ? styles.langActive : ''}`}>EN</button>
        </div>

        <h1 className={styles.title}>{t.auth.createAccount}</h1>
        <p className={styles.subtitle}>{t.auth.trialSubtitle}</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>{t.auth.firstName}</label>
              <input name="firstName" type="text" required className="input" />
            </div>
            <div className={styles.field}>
              <label>{t.auth.lastName}</label>
              <input name="lastName" type="text" required className="input" />
            </div>
          </div>
          <div className={styles.field}>
            <label>{t.auth.company}</label>
            <input name="orgName" type="text" required placeholder="Acme S.A." className="input" />
          </div>
          <div className={styles.field}>
            <label>{t.auth.workEmail}</label>
            <input name="email" type="email" required placeholder="vos@empresa.com" className="input" autoComplete="email" />
          </div>
          <div className={styles.field}>
            <label>{t.auth.password}</label>
            <input name="password" type="password" required minLength={8} placeholder={t.auth.minChars} className="input" />
          </div>
          <div className={styles.field}>
            <label>{t.auth.confirmPassword}</label>
            <input name="confirmPassword" type="password" required className="input" />
          </div>
          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? t.auth.creating : t.auth.createBtn}
          </button>
        </form>

        <p className={styles.footer}>
          Al continuar, aceptás nuestros <Link href="/terminos" className={styles.link}>Términos y condiciones</Link>.
        </p>

        <p className={styles.footer}>
          {t.auth.alreadyHave}{' '}
          <Link href="/login" className={styles.link}>{t.auth.signInLink}</Link>
        </p>
      </div>
    </div>
  );
}
