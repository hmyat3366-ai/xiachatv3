import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../server/db.js';
import { syncWorkspaceToSupabase } from '../server/supabase.js';

async function createOrResetAdmin() {
  const email = 'admin@xiachat.com';
  const password = 'Admin@123456';
  const name = 'Xia Admin';
  const username = 'admin';
  const now = new Date().toISOString();

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  let userId = '';

  if (existing) {
    userId = existing.id;
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, email_verified = 1, onboarding_completed = 1, updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, userId);
    console.log(`✅ Updated existing admin account: ${email}`);
  } else {
    userId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (
        id, name, email, username, password_hash, auth_provider, google_id,
        email_verified, onboarding_completed, onboarding_step, created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, 'local', NULL, 1, 1, 4, ?, ?, ?)
    `).run(userId, name, email, username, passwordHash, now, now, now);
    console.log(`✅ Created new admin account: ${email}`);
  }

  // Ensure workspace exists
  let ws = db.prepare('SELECT * FROM workspaces WHERE user_id = ?').get(userId) as any;

  if (!ws) {
    const wsId = crypto.randomUUID();
    const wsSlug = `xia-admin-${crypto.randomBytes(2).toString('hex')}`;
    db.prepare(`
      INSERT INTO workspaces (id, user_id, name, slug, business_type, customer_channels, created_at, updated_at)
      VALUES (?, ?, 'Xia Headquarters', ?, 'SaaS / E-Commerce', 'Website', ?, ?)
    `).run(wsId, userId, wsSlug, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsId, userId, now, now, now);

    db.prepare(`
      INSERT INTO ai_assistants (id, workspace_id, name, instructions, created_at, updated_at)
      VALUES (?, ?, 'Xia Assistant', 'You are a helpful customer support AI assistant for Xia Chat.', ?, ?)
    `).run(crypto.randomUUID(), wsId, now, now);

    ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(wsId);
  }

  // Ensure website channel exists
  const channel = db.prepare("SELECT * FROM channels WHERE workspace_id = ? AND type = 'website'").get(ws.id);
  if (!channel) {
    db.prepare(`
      INSERT INTO channels (id, workspace_id, type, name, status, provider, created_at, updated_at)
      VALUES (?, ?, 'website', 'Website Live Chat', 'connected', 'website', ?, ?)
    `).run(crypto.randomUUID(), ws.id, now, now);
  }

  // Sync to Supabase
  await syncWorkspaceToSupabase(ws);

  console.log('\n======================================================');
  console.log('🎉 XIA CHAT DEMO ADMIN ACCOUNT READY');
  console.log('======================================================');
  console.log(`📧 Email:    ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`🏢 Workspace: ${ws.name} (${ws.id})`);
  console.log('======================================================\n');
}

createOrResetAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error creating admin account:', err);
    process.exit(1);
  });
