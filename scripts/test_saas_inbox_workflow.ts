import { db, ensureSeedAgents } from '../server/db';
import crypto from 'crypto';

const uuidv4 = () => crypto.randomUUID();

async function runTests() {
  console.log('--- Starting Xia Chat SaaS Production Inbox Workflow Tests ---');
  const testWorkspaceId = 'a47b51fc-ed9a-4c27-b8a4-cda970f1bac0'; // Brew & Bean Coffee Shop

  // 1. Test Seed Agents
  console.log('\n[TEST 1] Testing agents table and seed availability...');
  ensureSeedAgents(testWorkspaceId);
  const agents = db.prepare(`SELECT * FROM agents WHERE workspace_id = ?`).all(testWorkspaceId) as any[];
  console.log(`Found ${agents.length} agents in workspace:`);
  agents.forEach(a => console.log(`  - ${a.name} (${a.role}) | Status: ${a.availability}`));
  if (agents.length < 3) throw new Error('Agents not properly seeded');
  const availableAgent = agents.find(a => a.availability === 'available');
  if (!availableAgent) throw new Error('No available agent found in agents table');
  console.log(`✓ Available agent for auto-routing: ${availableAgent.name}`);

  // 2. Test Conversation Creation with AI mode and Knowledge Source
  console.log('\n[TEST 2] Testing Conversation & Message with Knowledge Source and Confidence...');
  const testConvId = 'test-conv-' + uuidv4().slice(0, 8);
  const testCustId = 'test-cust-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO customers (id, workspace_id, name, email, phone, location, status, tags, created_at, updated_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
  `).run(
    testCustId,
    testWorkspaceId,
    'Emma Watson',
    'emma.watson@example.com',
    '+1 (555) 901-2345',
    'Seattle, WA',
    JSON.stringify(['VIP', 'Specialty Coffee']),
    now,
    now,
    now
  );

  db.prepare(`
    INSERT INTO conversations (id, workspace_id, customer_name, customer_email, customer_phone, channel, status, mode, assignee, last_message, intent, ai_summary, confidence_score, sentiment, recommended_action, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testConvId,
    testWorkspaceId,
    'Emma Watson',
    'emma.watson@example.com',
    '+1 (555) 901-2345',
    'Website',
    'AI_HANDLING',
    'ai_autonomous',
    'Xia AI',
    'What single-origin coffee beans do you currently have in stock?',
    'Product Information',
    'Customer inquiring about single-origin coffee inventory.',
    0.98,
    'positive',
    'Recommend Ethiopian Yirgacheffe and Colombian Supremo single origins.',
    now,
    now
  );

  // Add AI reply message with knowledge_source and confidence_score
  const aiMsgId = 'msg-' + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, is_internal_note, knowledge_source, confidence_score, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run(
    aiMsgId,
    testConvId,
    'ai',
    'Xia AI',
    'We currently offer two single-origin beans: Ethiopian Yirgacheffe (floral, citrus notes) and Colombian Supremo (rich chocolate, nutty finish)!',
    'Coffee Shop FAQ & Menu',
    0.98,
    now
  );

  const savedMsg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(aiMsgId) as any;
  if (!savedMsg || savedMsg.knowledge_source !== 'Coffee Shop FAQ & Menu' || savedMsg.confidence_score !== 0.98) {
    throw new Error('Message knowledge_source or confidence_score not saved properly');
  }
  console.log(`✓ AI Message saved with Knowledge Source: "${savedMsg.knowledge_source}" (Confidence: ${Math.round(savedMsg.confidence_score * 100)}%)`);

  // 3. Test Human Takeover
  console.log('\n[TEST 3] Testing Takeover Workflow...');
  const takeoverAgentName = 'Alex Johnson';
  db.prepare(`
    UPDATE conversations
    SET status = 'HUMAN_HANDLING',
        mode = 'human_handling',
        assignee = ?,
        assigned_agent = ?,
        ai_mode = 'human_controlled',
        updated_at = ?
    WHERE id = ?
  `).run(takeoverAgentName, takeoverAgentName, new Date().toISOString(), testConvId);

  const takeoverConv = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(testConvId) as any;
  if (takeoverConv.status !== 'HUMAN_HANDLING' || takeoverConv.assignee !== takeoverAgentName) {
    throw new Error('Takeover failed to update status and assignee');
  }
  console.log(`✓ Conversation status switched to: ${takeoverConv.status}, Assignee: ${takeoverConv.assignee}`);

  // 4. Test Return to AI
  console.log('\n[TEST 4] Testing Return to AI Workflow...');
  db.prepare(`
    UPDATE conversations
    SET status = 'AI_HANDLING',
        mode = 'ai_autonomous',
        assignee = 'Xia AI',
        assigned_agent = 'Xia AI',
        ai_mode = 'ai_auto',
        updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), testConvId);

  const sysMsgId = 'msg-sys-' + uuidv4().slice(0, 8);
  const returnSysMsg = 'Conversation returned to Xia AI. AI automated support reactivated.';
  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, is_internal_note, created_at)
    VALUES (?, ?, 'system', 'System', ?, 0, ?)
  `).run(sysMsgId, testConvId, returnSysMsg, new Date().toISOString());

  const returnConv = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(testConvId) as any;
  const sysMsg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(sysMsgId) as any;
  if (returnConv.status !== 'AI_HANDLING' || !sysMsg || !sysMsg.content.includes('returned to Xia AI')) {
    throw new Error('Return to AI failed or system message missing');
  }
  console.log(`✓ Conversation returned to: ${returnConv.status}, System Message: "${sysMsg.content}"`);

  // 5. Test Resolve Workflow
  console.log('\n[TEST 5] Testing Resolve & Reopen Workflow...');
  const resolveTime = new Date().toISOString();
  db.prepare(`
    UPDATE conversations
    SET status = 'RESOLVED',
        resolved_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(resolveTime, resolveTime, testConvId);

  const resolvedConv = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(testConvId) as any;
  if (resolvedConv.status !== 'RESOLVED' || !resolvedConv.resolved_at) {
    throw new Error('Resolve failed to update status and resolved_at');
  }
  console.log(`✓ Conversation resolved: status = ${resolvedConv.status}, resolved_at = ${resolvedConv.resolved_at}`);

  // Reopen
  db.prepare(`
    UPDATE conversations
    SET status = 'OPEN',
        resolved_at = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), testConvId);

  const reopenedConv = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(testConvId) as any;
  if (reopenedConv.status !== 'OPEN' || reopenedConv.resolved_at !== null) {
    throw new Error('Reopen failed');
  }
  console.log(`✓ Conversation reopened: status = ${reopenedConv.status}`);

  // Cleanup test records
  db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(testConvId);
  db.prepare(`DELETE FROM conversations WHERE id = ?`).run(testConvId);
  db.prepare(`DELETE FROM customers WHERE id = ?`).run(testCustId);
  console.log('\n✓ Cleaned up test data.');
  console.log('\n=== ALL 5 SAAS INBOX WORKFLOW TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
