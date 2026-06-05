import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const USER_AGENT = 'SimpleComm (alito28@gmail.com)';

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase.from('integrations')
    .select('accessToken, config')
    .eq('organizationId', user.id)
    .eq('platform', 'TIENDANUBE')
    .single();

  // Intentar eliminar el webhook registrado en TN
  if (integration?.accessToken && integration?.config?.storeId) {
    const storeId = integration.config.storeId;
    const whRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks`, {
      headers: {
        'Authentication': `bearer ${integration.accessToken}`,
        'User-Agent': USER_AGENT,
      },
    }).catch(() => null);

    if (whRes?.ok) {
      const webhooks = await whRes.json().catch(() => []);
      for (const wh of webhooks) {
        if (wh.url?.includes('/api/webhooks/tiendanube')) {
          await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks/${wh.id}`, {
            method: 'DELETE',
            headers: {
              'Authentication': `bearer ${integration.accessToken}`,
              'User-Agent': USER_AGENT,
            },
          }).catch(() => {});
        }
      }
    }
  }

  await supabase.from('integrations')
    .update({ status: 'DISCONNECTED', accessToken: null })
    .eq('organizationId', user.id)
    .eq('platform', 'TIENDANUBE');

  return NextResponse.json({ success: true });
}
