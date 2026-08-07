import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Route de keepalive — maintient la connexion Neon active
// Appelée par Vercel Cron ou un service de monitoring externe
export async function GET() {
  try {
    const start = Date.now();
    await query('SELECT 1 AS ping');
    const ms = Date.now() - start;
    return NextResponse.json({ ok: true, latency_ms: ms, ts: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
