'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/app/auth/actions';
import Logo from '@/components/Logo';
import styles from './login.module.css';

export default function LoginPage() {
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

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your SimpleComm account</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required
              placeholder="you@company.com" className="input" autoComplete="email" />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="password">Password</label>
              <Link href="/forgot-password" className={styles.forgot}>Forgot password?</Link>
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/register" className={styles.link}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
