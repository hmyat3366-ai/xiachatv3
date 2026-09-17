import { db } from '../server/db.js';
import { handlePublicWidgetMessage, getPublicWidgetConversation } from '../server/channelController.js';
import { inboxEventEmitter, postMessage } from '../server/inboxController.js';
import crypto from 'crypto';

function mockReqRes(body: any = {}, params: any = {}, query: any = {}, user: any = null) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    body,
    params,
    query,
    headers: {},
    user: user || db.prepare('SELECT * FROM users LIMIT 1').get(),
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    setHeader() {},
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

async function runTest() {
  console.log('Testing cross-workspace visitorId collision fix...');

  // Create two distinct workspaces
  const now = new Date().toISOString();
  const ws1Id = `test_ws1_${crypto.randomBytes(4).toString('hex')}`;
  const ws2Id = `test_ws2_${crypto.randomBytes(4).toString('hex')}`;

  const user = db.prepare('SELECT id, name FROM users LIMIT 1').get() as { id: string; name: string };
  db.prepare('INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(ws1Id, user.id, 'Workspace One', ws1Id, now, now);
  db.prepare('INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(ws2Id, user.id, 'Workspace Two', ws2Id, now, now);
  db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at) VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)").run(crypto.randomUUID(), ws1Id, user.id, now, now, now);
  db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at) VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)").run(crypto.randomUUID(), ws2Id, user.id, now, now, now);

  const chan1Id = `chan_${ws1Id}`;
  const chan2Id = `chan_${ws2Id}`;

  db.prepare("INSERT INTO channels (id, workspace_id, type, provider, name, status, created_at, updated_at) VALUES (?, ?, 'website', 'website', 'Website 1', 'connected', ?, ?)").run(chan1Id, ws1Id, now, now);
  db.prepare("INSERT INTO channels (id, workspace_id, type, provider, name, status, created_at, updated_at) VALUES (?, ?, 'website', 'website', 'Website 2', 'connected', ?, ?)").run(chan2Id, ws2Id, now, now);

  const sharedVisitorId = `visitor_shared_${Date.now()}`;

  // 1. Message sent to Workspace 1 by this visitor
  const msg1 = mockReqRes({
    message: 'Hello from visitor on website 1!',
    visitorId: sharedVisitorId,
    sessionId: 'session_1',
    browserId: 'browser_1',
  }, { siteKey: chan1Id });

  await handlePublicWidgetMessage(msg1.req, msg1.res);
  if (msg1.getStatus() !== 200) {
    throw new Error(`Workspace 1 message failed with status ${msg1.getStatus()}: ${JSON.stringify(msg1.getData())}`);
  }
  console.log('[PASS 1] First message in Workspace 1 processed successfully');

  // Verify customer in Workspace 1
  const cust1 = db.prepare('SELECT * FROM customers WHERE workspace_id = ?').all(ws1Id) as any[];
  if (cust1.length === 0) throw new Error('Customer in WS 1 not created');
  console.log(`[PASS 2] Customer created in Workspace 1: id=${cust1[0].id}`);

  // 2. SAME visitor (sharedVisitorId in localStorage) sends message to Workspace 2!
  // In the old code, this threw "UNIQUE constraint failed: customers.id" and returned 500!
  const msg2 = mockReqRes({
    message: 'Can I see your coffee menu and signature blends?',
    visitorId: sharedVisitorId,
    sessionId: 'session_2',
    browserId: 'browser_1',
  }, { siteKey: chan2Id });

  await handlePublicWidgetMessage(msg2.req, msg2.res);
  if (msg2.getStatus() !== 200) {
    throw new Error(`Workspace 2 message failed with status ${msg2.getStatus()}: ${JSON.stringify(msg2.getData())}`);
  }
  const resData2 = msg2.getData();
  console.log(`[PASS 3] Cross-workspace message processed with status 200! reply="${resData2.reply?.substring(0, 60)}..."`);

  // Verify customer in Workspace 2 exists and has distinct ID
  const cust2 = db.prepare('SELECT * FROM customers WHERE workspace_id = ?').all(ws2Id) as any[];
  if (cust2.length === 0) throw new Error('Customer in WS 2 not created');
  console.log(`[PASS 4] Customer created in Workspace 2: id=${cust2[0].id}`);
  if (cust1[0].id === cust2[0].id) throw new Error('Customer IDs in separate workspaces should be isolated!');

  // 3. Test real-time SSE listener on conversation
  let receivedSseMessage: any = null;
  const convId = resData2.conversationId;
  const listener = (event: any) => {
    receivedSseMessage = event;
  };
  inboxEventEmitter.on(`conversation:${convId}`, listener);

  // Agent posts message in conversation
  const agentUser = db.prepare('SELECT * FROM users LIMIT 1').get() as any;
  const postMsgMock = mockReqRes(
    { content: 'Hello customer! This is a live agent reply.', isInternalNote: false },
    { id: convId },
    { workspaceId: ws2Id },
    agentUser
  );
  await postMessage(postMsgMock.req, postMsgMock.res);

  inboxEventEmitter.off(`conversation:${convId}`, listener);

  if (!receivedSseMessage) {
    throw new Error('SSE listener did not receive the agent message!');
  }
  console.log(`[PASS 5] Real-time SSE event received: type="${receivedSseMessage.type}", data/payload present=${Boolean(receivedSseMessage.data && receivedSseMessage.payload)}`);

  // 4. Verify conversation history retrieval for public widget
  const historyMock = mockReqRes({}, { siteKey: chan2Id, conversationId: convId });
  await getPublicWidgetConversation(historyMock.req, historyMock.res);
  if (historyMock.getStatus() !== 200) {
    throw new Error(`Failed to fetch conversation history: ${historyMock.getStatus()}`);
  }
  const historyData = historyMock.getData();
  console.log(`[PASS 6] Public widget conversation history fetched: ${historyData.messages.length} messages`);

  // Clean up test data
  db.prepare('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE workspace_id IN (?, ?))').run(ws1Id, ws2Id);
  db.prepare('DELETE FROM conversations WHERE workspace_id IN (?, ?)').run(ws1Id, ws2Id);
  db.prepare('DELETE FROM visitors WHERE workspace_id IN (?, ?)').run(ws1Id, ws2Id);
  db.prepare('DELETE FROM customers WHERE workspace_id IN (?, ?)').run(ws1Id, ws2Id);
  db.prepare('DELETE FROM channels WHERE workspace_id IN (?, ?)').run(ws1Id, ws2Id);
  db.prepare('DELETE FROM workspaces WHERE id IN (?, ?)').run(ws1Id, ws2Id);

  console.log('\n🎉 ALL TESTS PASSED! Fix verified 100%!');
}

runTest().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
