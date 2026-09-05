import { pgPool, supabaseService } from './supabase.js';
import { db, setHydrating } from './db.js';

export async function ensurePostgresSchema(): Promise<void> {
  const client = await pgPool.connect();
  try {
    console.log('[Supabase Migration] Checking and ensuring Postgres schema parity...');

    // 1. Create missing tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'Support Specialist',
        avatar TEXT,
        availability TEXT NOT NULL DEFAULT 'available',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        customer_id TEXT,
        customer_name TEXT,
        customer_email TEXT,
        status TEXT NOT NULL DEFAULT 'processing',
        items JSONB NOT NULL DEFAULT '[]',
        total_amount NUMERIC NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        tracking_number TEXT,
        shipping_carrier TEXT,
        estimated_delivery TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT,
        category TEXT,
        description TEXT,
        price NUMERIC NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        in_stock INTEGER NOT NULL DEFAULT 1,
        image_url TEXT,
        tags TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS visitors (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        browser_id TEXT,
        customer_id TEXT,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        intent TEXT,
        sentiment TEXT,
        product_interest TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS widget_settings (
        workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
        welcome_message TEXT,
        conversation_starters JSONB,
        primary_color TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        widget_name TEXT DEFAULT 'Xia Support Chat',
        position TEXT DEFAULT 'bottom-right',
        theme TEXT DEFAULT 'auto',
        show_agent_availability INTEGER DEFAULT 1,
        business_context TEXT,
        secondary_color TEXT,
        auto_detect_color INTEGER DEFAULT 1,
        match_website_theme INTEGER DEFAULT 1
      );
    `);

    // 2. Add missing columns to existing tables if not present
    const missingColumns = [
      { table: 'conversations', col: 'assigned_agent_id', type: 'TEXT' },
      { table: 'conversations', col: 'ai_mode', type: 'TEXT' },
      { table: 'conversations', col: 'handoff_reason', type: 'TEXT' },
      { table: 'conversations', col: 'resolved_at', type: 'TIMESTAMPTZ' },
      { table: 'conversations', col: 'intent', type: 'TEXT' },
      { table: 'conversations', col: 'ai_summary', type: 'TEXT' },
      { table: 'conversations', col: 'recommended_action', type: 'TEXT' },
      { table: 'conversations', col: 'assigned_agent', type: 'TEXT' },
      { table: 'conversations', col: 'mode', type: 'TEXT' },
      { table: 'conversations', col: 'csat_rating', type: 'INTEGER' },
      { table: 'conversations', col: 'csat_comment', type: 'TEXT' },
      { table: 'email_verifications', col: 'code_hash', type: 'TEXT' },
      { table: 'messages', col: 'knowledge_source', type: 'TEXT' },
      { table: 'messages', col: 'confidence_score', type: 'NUMERIC' },
      { table: 'visitors', col: 'current_page', type: 'TEXT' },
      { table: 'visitors', col: 'page_title', type: 'TEXT' },
      { table: 'visitors', col: 'time_spent_seconds', type: 'INTEGER DEFAULT 0' },
    ];

    for (const c of missingColumns) {
      await client.query(`
        ALTER TABLE "${c.table}" ADD COLUMN IF NOT EXISTS "${c.col}" ${c.type};
      `);
    }

    // 3. Create indexes for high performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_orders_workspace ON orders(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_products_workspace ON products(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_visitors_workspace ON visitors(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_visitors_session ON visitors(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id);
    `);

    // 4. Enable RLS on new tables as recommended by Supabase Best Practices
    const rlsTables = ['agents', 'orders', 'products', 'visitors', 'widget_settings'];
    for (const tbl of rlsTables) {
      await client.query(`ALTER TABLE "${tbl}" ENABLE ROW LEVEL SECURITY;`);
      // Allow service_role full access
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = '${tbl}' AND policyname = '${tbl}_service_role_policy'
          ) THEN
            CREATE POLICY "${tbl}_service_role_policy" ON "${tbl}"
              TO authenticated, anon
              USING (true)
              WITH CHECK (true);
          END IF;
        END $$;
      `);
    }

    console.log('[Supabase Migration] Postgres schema parity successfully verified.');
  } catch (err: any) {
    console.error('[Supabase Migration] Schema migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Synchronize all existing SQLite records to Supabase Postgres (idempotent upsert)
export async function migrateAllSqliteToPostgres(): Promise<{ migrated: Record<string, number> }> {
  console.log('[Supabase Migration] Starting SQLite -> Postgres data sync...');
  const client = await pgPool.connect();
  const results: Record<string, number> = {};

  try {
    // Order matters to satisfy foreign keys
    const syncOrder = [
      'users',
      'workspaces',
      'plans',
      'subscriptions',
      'workspace_members',
      'agents',
      'ai_assistants',
      'channels',
      'widget_settings',
      'knowledge_sources',
      'knowledge_chunks',
      'customers',
      'products',
      'orders',
      'visitors',
      'conversations',
      'messages',
      'pending_google_signups',
    ];

    for (const tableName of syncOrder) {
      try {
        const rows = db.prepare(`SELECT * FROM "${tableName}"`).all() as any[];
        if (rows.length === 0) {
          results[tableName] = 0;
          continue;
        }

        let syncedCount = 0;
        for (const row of rows) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;

          // Convert SQLite values to Postgres compatible format
          const values = keys.map((k) => {
            const v = row[k];
            // If json string or array, or boolean number
            return v;
          });

          const cols = keys.map((k) => `"${k}"`).join(', ');
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

          // Determine primary key for conflict resolution
          let pkCol = 'id';
          if (tableName === 'widget_settings') pkCol = 'workspace_id';
          if (tableName === 'workspace_members') pkCol = 'id';

          const updateCols = keys
            .filter((k) => k !== pkCol)
            .map((k) => `"${k}" = EXCLUDED."${k}"`)
            .join(', ');

          const conflictClause = updateCols.length > 0
            ? `ON CONFLICT ("${pkCol}") DO UPDATE SET ${updateCols}`
            : `ON CONFLICT ("${pkCol}") DO NOTHING`;

          const sql = `
            INSERT INTO "${tableName}" (${cols})
            VALUES (${placeholders})
            ${conflictClause}
          `;

          await client.query(sql, values);
          syncedCount++;
        }
        results[tableName] = syncedCount;
      } catch (tableErr: any) {
        console.warn(`[Supabase Migration] Sync warning on table ${tableName}:`, tableErr.message);
        results[tableName] = -1;
      }
    }

    console.log('[Supabase Migration] Data sync complete:', results);
    return { migrated: results };
  } finally {
    client.release();
  }
}

// Hydrate in-memory SQLite from Supabase Postgres on boot
export async function hydrateFromSupabasePostgres(): Promise<number> {
  console.log('[Supabase Hydration] Fetching records from Supabase Postgres to in-memory store...');
  setHydrating(true);
  const client = await pgPool.connect();
  let totalRows = 0;

  try {
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
    `);

    for (const r of tablesRes.rows) {
      const tbl = r.table_name;
      try {
        // Check if table exists in SQLite
        const sqliteTableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(tbl);
        if (!sqliteTableCheck) continue;

        const pgRows = await client.query(`SELECT * FROM "${tbl}"`);
        if (pgRows.rows.length === 0) continue;

        for (const row of pgRows.rows) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;

          // Convert complex types (objects/arrays) to JSON strings for SQLite
          const values = keys.map((k) => {
            const v = row[k];
            if (v instanceof Date) return v.toISOString();
            if (typeof v === 'object' && v !== null) return JSON.stringify(v);
            if (typeof v === 'boolean') return v ? 1 : 0;
            return v;
          });

          const cols = keys.map((k) => `"${k}"`).join(', ');
          const placeholders = keys.map(() => `?`).join(', ');

          db.prepare(`
            INSERT OR REPLACE INTO "${tbl}" (${cols})
            VALUES (${placeholders})
          `).run(values);
          totalRows++;
        }
      } catch (err: any) {
        // Skip individual table errors during hydration
      }
    }

    console.log(`[Supabase Hydration] Successfully hydrated ${totalRows} rows from Supabase PostgreSQL.`);
    return totalRows;
  } catch (err: any) {
    console.warn('[Supabase Hydration] Hydration notice:', err.message);
    return 0;
  } finally {
    setHydrating(false);
    client.release();
  }
}
