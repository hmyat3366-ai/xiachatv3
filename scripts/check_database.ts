import { db } from '../server/db.js';
import { testSupabaseConnection, pgPool, supabaseAnon, supabaseService } from '../server/supabase.js';

async function runAudit() {
  console.log('========================================');
  console.log('🔍 DATABASE & BACKEND AUDIT REPORT');
  console.log('========================================\n');

  // 1. Audit SQLite Local Database
  console.log('--- 1. Local SQLite Database (better-sqlite3) ---');
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
    console.log(`✅ Total SQLite Tables: ${tables.length}`);
    
    for (const t of tables) {
      const countRes = db.prepare(`SELECT count(*) as count FROM ${t.name}`).get() as { count: number };
      const colInfo = db.prepare(`PRAGMA table_info(${t.name})`).all();
      console.log(`  • ${t.name.padEnd(30)} | Rows: ${countRes.count.toString().padStart(4)} | Columns: ${colInfo.length}`);
    }
  } catch (err: any) {
    console.error('❌ SQLite Audit Error:', err.message);
  }

  console.log('\n--- 2. Supabase Cloud PostgreSQL ---');
  try {
    const supaRes = await testSupabaseConnection();
    console.log('Supabase Connection Status:', supaRes);

    if (supaRes.pgOk) {
      const client = await pgPool.connect();
      const pgTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      console.log(`✅ Supabase Postgres Connected. Public Tables count: ${pgTables.rows.length}`);
      
      const rlsCheck = await client.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `);
      console.log('\nSupabase Tables & RLS Status:');
      for (const r of rlsCheck.rows) {
        console.log(`  • ${r.tablename.padEnd(30)} | RLS Enabled: ${r.rowsecurity}`);
      }
      client.release();
    }
  } catch (err: any) {
    console.error('❌ Supabase Cloud Check Error:', err.message);
  }

  console.log('\n========================================');
  console.log('Audit Completed.');
  console.log('========================================');
  process.exit(0);
}

runAudit();
