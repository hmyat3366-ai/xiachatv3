import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../server/db.js';
import { syncWorkspaceToSupabase } from '../server/supabase.js';

async function linkCoffeeShopToAdmin() {
  const wsId = 'a47b51fc-ed9a-4c27-b8a4-cda970f1bac0';
  const password = 'Admin@123456';
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  // 1. Find or update admin@xiachat.com
  let admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@xiachat.com') as any;
  if (!admin) {
    const adminId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, name, email, username, password_hash, auth_provider, email_verified, onboarding_completed, onboarding_step, created_at, updated_at, last_login_at)
      VALUES (?, 'Xia Admin', 'admin@xiachat.com', 'admin', ?, 'local', 1, 1, 4, ?, ?, ?)
    `).run(adminId, passwordHash, now, now, now);
    admin = db.prepare('SELECT * FROM users WHERE id = ?').get(adminId);
  } else {
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, email_verified = 1, onboarding_completed = 1, updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, admin.id);
  }

  // 2. Also set password for google_new_7fcdd3b5@example.com so both accounts work
  db.prepare(`
    UPDATE users 
    SET password_hash = ?, email_verified = 1, onboarding_completed = 1, updated_at = ?
    WHERE email = 'google_new_7fcdd3b5@example.com'
  `).run(passwordHash, now);

  // 3. Rename workspace to "Brew & Bean Coffee Shop" and set admin as owner
  db.prepare(`
    UPDATE workspaces
    SET name = 'Brew & Bean Coffee Shop', user_id = ?, updated_at = ?
    WHERE id = ?
  `).run(admin.id, now, wsId);

  // 4. Ensure workspace_members has admin as owner
  const existingMember = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, admin.id);
  if (!existingMember) {
    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsId, admin.id, now, now, now);
  } else {
    db.prepare(`
      UPDATE workspace_members SET role = 'owner', status = 'active', updated_at = ? WHERE workspace_id = ? AND user_id = ?
    `).run(now, wsId, admin.id);
  }

  // Also remove redundant empty workspaces owned by admin so this workspace is primary
  db.prepare('DELETE FROM workspaces WHERE user_id = ? AND id != ?').run(admin.id, wsId);

  const updatedWs = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(wsId) as any;
  const channel = db.prepare("SELECT * FROM channels WHERE workspace_id = ? AND type = 'website'").get(wsId) as any;
  const convCount = db.prepare('SELECT count(*) as count FROM conversations WHERE workspace_id = ?').get(wsId) as any;

  await syncWorkspaceToSupabase(updatedWs);

  console.log('\n======================================================');
  console.log('☕ COFFEE SHOP WORKSPACE CONNECTED TO LOGIN ACCOUNT');
  console.log('======================================================');
  console.log(`🏢 Workspace:    ${updatedWs.name} (ID: ${updatedWs.id})`);
  console.log(`📡 Website Chan: ${channel.name} (SiteKey: ${channel.id})`);
  console.log(`💬 Inbound Convs: ${convCount.count} conversations ready in Inbox`);
  console.log('------------------------------------------------------');
  console.log('👉 LOGIN OPTION 1 (Recommended):');
  console.log(`   Email:    admin@xiachat.com`);
  console.log(`   Password: ${password}`);
  console.log('------------------------------------------------------');
  console.log('👉 LOGIN OPTION 2 (Original Workspace Owner):');
  console.log(`   Email:    google_new_7fcdd3b5@example.com`);
  console.log(`   Password: ${password}`);
  console.log('======================================================\n');
}

linkCoffeeShopToAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
