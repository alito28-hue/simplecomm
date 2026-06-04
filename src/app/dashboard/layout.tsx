import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/Navbar';
import TrialBanner from '@/components/TrialBanner';
import styles from './dashboard.module.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className={styles.wrapper}>
      <Navbar user={user} />
      <TrialBanner daysLeft={15} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
