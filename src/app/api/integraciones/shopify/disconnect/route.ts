import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SHOPIFY_API_VERSION = '2024-01';

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Buscar la integración específica de esta tienda
  const query = supabase.from('integrations')
    .select('id, accessToken, config')
    .eq('organizationId', user.id)
    .eq('platform', 'SHOPIFY')
    .eq('status', 'CONNECTED');

  const { data: integrations } = shop
    ? await query.filter('config->>shop', 'eq', shop)
    : await query;

  for (const integration of integrations ?? []) {
    const shopDomain = integration.config?.shop;
    if (shopDomain && integration.accessToken) {
      // Eliminar webhooks de Shopify
      const whRes = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json?topic=orders/paid`,
        { headers: { 'X-Shopify-Access-Token': integration.accessToken } }
      ).catch(() => null);

      if (whRes?.ok) {
        const { webhooks } = await whRes.json().catch(() => ({ webhooks: [] }));
        for (const wh of webhooks ?? []) {
          await fetch(
            `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks/${wh.id}.json`,
            { method: 'DELETE', headers: { 'X-Shopify-Access-Token': integration.accessToken } }
          ).catch(() => {});
        }
      }
    }

    await supabase.from('integrations')
      .update({ status: 'DISCONNECTED', accessToken: null })
      .eq('id', integration.id);
  }

  return NextResponse.json({ success: true });
}
