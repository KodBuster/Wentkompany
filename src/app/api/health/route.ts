import { NextResponse } from 'next/server';

/** Проверка живости для мониторинга и балансировщика Amvera. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
