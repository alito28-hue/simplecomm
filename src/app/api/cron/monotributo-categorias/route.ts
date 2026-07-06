import { NextRequest, NextResponse } from 'next/server';
import { syncMonotributoCategorias } from '@/lib/monotributo-categorias-sync';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await syncMonotributoCategorias());
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error verificando escala de Monotributo',
    }, { status: 500 });
  }
}

export const GET = POST;
