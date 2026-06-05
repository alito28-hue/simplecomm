import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false, shops: [] });

  const { data } = await supabase.from('integrations')
    .select('status, config')
    .eq('organizationId', user.id)
    .eq('platform', 'SHOPIFY')
    .eq('status', 'CONNECTED');

  const shops = (data ?? []).map(i => i.config?.shop).filter(Boolean);
  return NextResponse.json({ connected: shops.length > 0, shops });
}
