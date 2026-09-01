import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '[JWT_2]';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// Supabase JS clients (for Data API)
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Direct Postgres pool (for server-side queries, same as Supabase DB)
export const pgPool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false,
});

// Helpers
export async function testSupabaseConnection() {
  try {
    const client = await pgPool.connect();
    const r1 = await client.query('SELECT 1 as ok');
    const r2 = await client.query("SELECT count(*) as tables FROM information_schema.tables WHERE table_schema='public'");
    client.release();
    // Try Supabase Data API
    const { data, error } = await supabaseAnon.from('users').select('id').limit(1);
    return {
      pgOk: r1.rows[0]?.ok === 1,
      tables: Number(r2.rows[0]?.tables || 0),
      dataApiOk: !error || (error as any)?.code === 'PGRST116', // no rows is ok, table not exposed is error
      dataApiError: error?.message || null,
      url: SUPABASE_URL,
      dbUrlHost: DATABASE_URL.split('@').pop()?.split('/')[0] || 'local',
    };
  } catch (e: any) {
    return { pgOk: false, error: e.message, url: SUPABASE_URL };
  }
}

export const projectId = 'xiachatV3';
