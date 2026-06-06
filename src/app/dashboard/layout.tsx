import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardShell from '@/components/DashboardShell';
import PaywallGuard from '@/components/PaywallGuard';
import styles from './layout.module.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('name, subscriptionStatus, invoiceCountMonth')
    .eq('id', user.id)
    .single();

  const initials           = user.email?.slice(0, 2).toUpperCase() ?? 'U';
  const orgName            = org?.name ?? user.user_metadata?.org_name ?? 'Mi organización';
  const subscriptionStatus = org?.subscriptionStatus ?? null;
  const invoiceCount       = org?.invoiceCountMonth ?? 0;

  return (
    <DashboardShell orgName={orgName} userEmail={user.email} userInitials={initials} userName={user.email}>
      <main className={styles.main}>
        <PaywallGuard subscriptionStatus={subscriptionStatus} invoiceCount={invoiceCount}>
          {children}
        </PaywallGuard>
      </main>
    </DashboardShell>
  );
}
