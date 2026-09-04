import { db } from '../server/db.js';

const channel = db
  .prepare(
    "SELECT c.*, w.name as workspace_name, w.user_id FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.type = 'website' AND c.status = 'connected' ORDER BY c.created_at ASC LIMIT 1"
  )
  .get() as any;

console.log('Channel:', channel);

if (channel) {
  const user = db.prepare('SELECT id, name, email, username FROM users WHERE id = ?').get(channel.user_id) as any;
  console.log('Owner User:', user);

  // Also check conversations in this workspace
  const convs = db.prepare('SELECT count(*) as count FROM conversations WHERE workspace_id = ?').get(channel.workspace_id) as any;
  console.log(`Conversations in this workspace: ${convs.count}`);
}
