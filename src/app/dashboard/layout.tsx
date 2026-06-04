import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import styles from './layout.module.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'U';
  const orgName = user.user_metadata?.org_name ?? 'My Organization';

  return (
    <div className={styles.shell}>
      <Sidebar orgName={orgName} userEmail={user.email} />
      <div className={styles.content}>
        <TopBar userInitials={initials} userName={user.email} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
