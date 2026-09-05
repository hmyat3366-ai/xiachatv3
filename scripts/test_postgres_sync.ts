import { ensurePostgresSchema, migrateAllSqliteToPostgres } from '../server/supabaseMigrations.js';
import { pgPool } from '../server/supabase.js';

async function main() {
  console.log('=== Step 3: Supabase Postgres Parity & Data Migration Test ===');
  await ensurePostgresSchema();
  const res = await migrateAllSqliteToPostgres();
  console.log('Migration Result:', res);

  // Verify all 32 tables in Postgres now
  const client = await pgPool.connect();
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log('\nTotal Postgres Tables:', tables.rows.length);
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

  // Check row counts on new tables
  const checkTables = ['agents', 'orders', 'products', 'visitors', 'widget_settings', 'conversations', 'messages', 'users', 'workspaces'];
  console.log('\n--- Row Counts in Supabase Postgres ---');
  for (const t of checkTables) {
    const count = await client.query(`SELECT COUNT(*) as c FROM "${t}"`);
    console.log(`${t.padEnd(20)}: ${count.rows[0].c} rows`);
  }

  client.release();
  await pgPool.end();
}

main().catch((err) => {
  console.error('Migration Test Failed:', err);
  process.exit(1);
});
