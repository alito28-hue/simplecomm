'use client';

import { useState } from 'react';
import Link from 'next/link';
import { register } from '@/app/auth/actions';
import Logo from '@/components/Logo';
import styles from './register.module.css';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    if (formData.get('password') !== formData.get('confirmPassword')) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await register(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo size="md" />
        </div>

        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start your 15-day free trial. No credit card required.</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" type="text" required className="input" />
            </div>
            <div className={styles.field}>
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" type="text" required className="input" />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="orgName">Company / Organization</label>
            <input id="orgName" name="orgName" type="text" required
              placeholder="Acme S.A." className="input" />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Work email</label>
            <input id="email" name="email" type="email" required
              placeholder="you@company.com" className="input" autoComplete="email" />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password"
              required minLength={8} placeholder="Min. 8 characters" className="input" />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password"
              required className="input" />
          </div>

          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? 'Creating account...' : 'Create free account'}
          </button>
        </form>

        <p className={styles.terms}>
          By signing up, you agree to our{' '}
          <Link href="/terms" className={styles.link}>Terms of Service</Link> and{' '}
          <Link href="/privacy" className={styles.link}>Privacy Policy</Link>.
        </p>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
