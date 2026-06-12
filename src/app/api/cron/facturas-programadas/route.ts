import { NextRequest, NextResponse } from 'next/server';
import { runScheduledInvoices } from '@/lib/scheduled-invoices/runner';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runScheduledInvoices());
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error procesando programaciones',
    }, { status: 500 });
  }
}

export const GET = POST;
