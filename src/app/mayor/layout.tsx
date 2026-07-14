import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { LogoWhite } from '@/components/Logo';
import styles from './admin.module.css';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) redirect('/login');

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Link href="/mayor"><LogoWhite size="sm" /></Link>
          <span className={styles.adminBadge}>ADMIN</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/mayor" className={styles.navItem}>⊞ Dashboard</Link>
          <Link href="/mayor/clientes" className={styles.navItem}>👥 Clientes</Link>
          <Link href="/mayor/tickets" className={styles.navItem}>🎫 Tickets</Link>
          <Link href="/mayor/planes" className={styles.navItem}>📊 Planes</Link>
          <Link href="/mayor/monotributo" className={styles.navItem}>📉 Monotributo</Link>
          <Link href="/mayor/guia-alta-cliente" className={styles.navItem}>📋 Guía de alta ARCA</Link>
        </nav>
        <div className={styles.bottom}>
          <Link href="/dashboard" className={styles.bottomLink}>← Ir a mi dashboard</Link>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
