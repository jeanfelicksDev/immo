import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const logs: string[] = [];
  try {
    // 1. Liste des tables dans immogest
    const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'immogest'");
    logs.push(`Tables in immogest: ${tables.rows.map((r: any) => r.table_name).join(', ')}`);

    // 2. Vérification des contraintes de clés étrangères sur la table maisons et souscriptions
    const constraints = await query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'immogest';
    `);
    
    logs.push("Foreign keys:");
    for (const c of constraints.rows) {
      logs.push(`${c.table_name}.${c.column_name} -> ${c.foreign_table_name}.${c.foreign_column_name} (${c.constraint_name})`);
    }

    return NextResponse.json({ ok: true, logs });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message, stack: err.stack, logs }, { status: 500 });
  }
}
