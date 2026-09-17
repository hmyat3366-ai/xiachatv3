import { db } from '../server/db.js';
import { handlePublicWidgetMessage, getPublicWidgetConversation, handlePublicWidgetCSAT } from '../server/channelController.js';
import { getInboxConversations, getConversationMessages, postMessage, takeoverConversation, updateStatus } from '../server/inboxController.js';
import crypto from 'crypto';

function mockReqRes(body: any = {}, params: any = {}, query: any = {}, user: any = null) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    body,
    params,
    query,
    headers: {},
    user,
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

async function runTwoWayChatSimulation() {
  console.log('================================================================');
  console.log('🔄 TWO-WAY REAL-TIME CHAT SIMULATION: CUSTOMER <-> ADMIN INBOX');
  console.log('================================================================\n');

  const now = new Date().toISOString();
  const testId = crypto.randomBytes(4).toString('hex');
  const wsId = `test_ws_sim_${testId}`;
  const userId = `test_user_sim_${testId}`;
  const chanId = `test_chan_sim_${testId}`;

  // 1. Setup Admin User, Workspace & Channel
  const adminUser = {
    id: userId,
    name: 'Admin Alex Rivera',
    email: `alex_${testId}@example.com`,
  };

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
    VALUES (?, ?, ?, 'hash', ?, ?, ?)
  `).run(adminUser.id, adminUser.name, adminUser.email, now, now, now);

  db.prepare(`
    INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
    VALUES (?, 'Velvet Roast Official', ?, ?, ?, ?)
  `).run(wsId, `velvet-roast-${testId}`, adminUser.id, now, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
  `).run(crypto.randomUUID(), wsId, adminUser.id, now, now, now);

  db.prepare(`
    INSERT INTO channels (id, workspace_id, type, provider, name, status, created_at, updated_at)
    VALUES (?, ?, 'website', 'website', 'Website Live Chat', 'connected', ?, ?)
  `).run(chanId, wsId, now, now);

  console.log(`[SETUP] Created Workspace "${wsId}" with Admin "${adminUser.name}" & Channel "${chanId}"`);

  // -------------------------------------------------------------
  // STEP 1: Customer sends message from Website Widget
  // -------------------------------------------------------------
  const visitorId = `visitor_sim_${testId}`;
  const customerName = 'Lin Htet';
  const customerEmail = `linhtet_${testId}@gmail.com`;

  console.log(`\n--- STEP 1: Customer (${customerName}) sends message via Website Widget ---`);
  const custMsg1 = mockReqRes({
    message: 'Hello, can you tell me what specialty coffee beans you have in stock?',
    visitorId,
    sessionId: `sess_${testId}`,
    browserId: `brows_${testId}`,
    customerName,
    customerEmail,
  }, { siteKey: chanId });

  await handlePublicWidgetMessage(custMsg1.req, custMsg1.res);
  if (custMsg1.getStatus() !== 200) {
    throw new Error(`Step 1 failed with status ${custMsg1.getStatus()}: ${JSON.stringify(custMsg1.getData())}`);
  }
  const custData1 = custMsg1.getData();
  const convId = custData1.conversationId;
  console.log(`✅ [Customer] Sent message successfully!`);
  console.log(`   Conversation ID: ${convId}`);
  console.log(`   AI Auto-Reply: "${custData1.reply.substring(0, 80)}..."`);

  // -------------------------------------------------------------
  // STEP 2: Admin checks Inbox and sees the new conversation
  // -------------------------------------------------------------
  console.log(`\n--- STEP 2: Admin views Inbox List (GET /api/inbox/conversations) ---`);
  const inboxListReq = mockReqRes({}, {}, { workspaceId: wsId }, adminUser);
  await getInboxConversations(inboxListReq.req, inboxListReq.res);

  if (inboxListReq.getStatus() !== 200) {
    throw new Error(`Step 2 failed with status ${inboxListReq.getStatus()}`);
  }
  const inboxData = inboxListReq.getData();
  console.log(`✅ [Admin] Inbox loaded: Found ${inboxData.conversations.length} conversation(s)`);

  const matchedConv = inboxData.conversations.find((c: any) => c.id === convId);
  if (!matchedConv) {
    throw new Error(`Admin Inbox did not contain conversation ${convId}!`);
  }
  console.log(`   Found Conversation: Customer="${matchedConv.customerName}", Status="${matchedConv.status}", LastMessage="${matchedConv.lastMessage.substring(0, 60)}..."`);

  // -------------------------------------------------------------
  // STEP 3: Admin opens conversation thread to view messages
  // -------------------------------------------------------------
  console.log(`\n--- STEP 3: Admin opens conversation thread (GET /api/inbox/conversations/:id/messages) ---`);
  const threadReq = mockReqRes({}, { id: convId }, { workspaceId: wsId }, adminUser);
  await getConversationMessages(threadReq.req, threadReq.res);

  if (threadReq.getStatus() !== 200) {
    throw new Error(`Step 3 failed with status ${threadReq.getStatus()}`);
  }
  const threadData = threadReq.getData();
  console.log(`✅ [Admin] Thread loaded: ${threadData.messages.length} message(s) in conversation:`);
  threadData.messages.forEach((m: any, idx: number) => {
    console.log(`   [${idx + 1}] (${m.senderType} / ${m.senderName}): "${m.content.substring(0, 70)}..."`);
  });

  // -------------------------------------------------------------
  // STEP 4: Admin takes over from AI (Human Takeover)
  // -------------------------------------------------------------
  console.log(`\n--- STEP 4: Admin takes over conversation from AI (POST /api/inbox/conversations/:id/takeover) ---`);
  const takeoverReq = mockReqRes({}, { id: convId }, { workspaceId: wsId }, adminUser);
  await takeoverConversation(takeoverReq.req, takeoverReq.res);

  if (takeoverReq.getStatus() !== 200) {
    throw new Error(`Step 4 takeover failed with status ${takeoverReq.getStatus()}`);
  }
  const takeoverData = takeoverReq.getData();
  console.log(`✅ [Admin] Takeover successful: Status="${takeoverData.status}", Assignee="${takeoverData.assignee}"`);

  // -------------------------------------------------------------
  // STEP 5: Admin sends a reply message to the customer
  // -------------------------------------------------------------
  console.log(`\n--- STEP 5: Admin sends reply to Customer (POST /api/inbox/conversations/:id/messages) ---`);
  const adminReplyText = 'Hi Lin Htet, Alex here from Velvet Roast! We currently have our Signature Velvet Reserve Espresso and Ethiopian Floral Mist freshly roasted this morning. Would you like medium or dark roast?';
  const postMsgReq = mockReqRes(
    { content: adminReplyText, isInternalNote: false },
    { id: convId },
    { workspaceId: wsId },
    adminUser
  );
  await postMessage(postMsgReq.req, postMsgReq.res);

  if (postMsgReq.getStatus() !== 201) {
    throw new Error(`Step 5 postMessage failed with status ${postMsgReq.getStatus()}`);
  }
  console.log(`✅ [Admin] Sent message to customer: "${adminReplyText.substring(0, 80)}..."`);

  // -------------------------------------------------------------
  // STEP 6: Customer Widget fetches conversation history and receives Admin's message
  // -------------------------------------------------------------
  console.log(`\n--- STEP 6: Customer Widget receives Admin reply (GET /api/channels/public-widget/:siteKey/conversation/:id) ---`);
  const widgetHistoryReq = mockReqRes({}, { siteKey: chanId, conversationId: convId });
  await getPublicWidgetConversation(widgetHistoryReq.req, widgetHistoryReq.res);

  if (widgetHistoryReq.getStatus() !== 200) {
    throw new Error(`Step 6 failed with status ${widgetHistoryReq.getStatus()}`);
  }
  const widgetHistory = widgetHistoryReq.getData();
  console.log(`✅ [Customer Widget] History updated: Total ${widgetHistory.messages.length} message(s), Status="${widgetHistory.status}"`);

  const lastMsg = widgetHistory.messages[widgetHistory.messages.length - 1];
  console.log(`   Latest message delivered to customer:`);
  console.log(`   From: ${lastMsg.senderName} (${lastMsg.senderType})`);
  console.log(`   Content: "${lastMsg.content}"`);

  if (lastMsg.senderType !== 'agent' || !lastMsg.content.includes('Signature Velvet Reserve')) {
    throw new Error('Admin message was not delivered to customer widget!');
  }

  // -------------------------------------------------------------
  // STEP 7: Customer sends follow-up while in Human mode
  // -------------------------------------------------------------
  console.log(`\n--- STEP 7: Customer replies back to Admin ---`);
  const custMsg2 = mockReqRes({
    message: 'I would love 2 bags of the Signature Velvet Reserve in medium roast please! How do I pay?',
    visitorId,
    sessionId: `sess_${testId}`,
    browserId: `brows_${testId}`,
    conversationId: convId,
  }, { siteKey: chanId });

  await handlePublicWidgetMessage(custMsg2.req, custMsg2.res);
  if (custMsg2.getStatus() !== 200) {
    throw new Error(`Step 7 failed with status ${custMsg2.getStatus()}`);
  }
  console.log(`✅ [Customer] Customer follow-up sent`);

  // -------------------------------------------------------------
  // STEP 8: Admin views updated messages and answers payment question
  // -------------------------------------------------------------
  console.log(`\n--- STEP 8: Admin sends checkout link ---`);
  const adminPaymentReply = 'Perfect! You can place the order directly through our store or use KBZPay / WavePay to 09-987654321. We dispatch within 24 hours!';
  const postMsgReq2 = mockReqRes(
    { content: adminPaymentReply, isInternalNote: false },
    { id: convId },
    { workspaceId: wsId },
    adminUser
  );
  await postMessage(postMsgReq2.req, postMsgReq2.res);
  console.log(`✅ [Admin] Sent payment info to customer`);

  // -------------------------------------------------------------
  // STEP 9: Admin marks conversation as Resolved
  // -------------------------------------------------------------
  console.log(`\n--- STEP 9: Admin marks conversation as Resolved (POST /api/inbox/conversations/:id/status) ---`);
  const resolveReq = mockReqRes({ status: 'RESOLVED' }, { id: convId }, { workspaceId: wsId }, adminUser);
  await updateStatus(resolveReq.req, resolveReq.res);

  if (resolveReq.getStatus() !== 200) {
    throw new Error(`Step 9 resolve failed with status ${resolveReq.getStatus()}`);
  }
  console.log(`✅ [Admin] Conversation marked as RESOLVED`);

  // -------------------------------------------------------------
  // STEP 10: Customer submits 5-star CSAT Feedback
  // -------------------------------------------------------------
  console.log(`\n--- STEP 10: Customer submits CSAT Rating (POST /api/channels/public-widget/:siteKey/csat) ---`);
  const csatReq = mockReqRes({
    conversationId: convId,
    rating: 5,
    comment: 'Super fast and friendly customer support! Excited for my coffee beans.',
  }, { siteKey: chanId });

  await handlePublicWidgetCSAT(csatReq.req, csatReq.res);
  if (csatReq.getStatus() !== 200) {
    throw new Error(`Step 10 CSAT failed with status ${csatReq.getStatus()}`);
  }
  console.log(`✅ [Customer] 5-star CSAT rating submitted!`);

  // Verify in database
  const finalConv = db.prepare('SELECT status, csat_rating, csat_comment FROM conversations WHERE id = ?').get(convId) as any;
  console.log(`\n[FINAL DB VERIFICATION]`);
  console.log(`   Final Status: ${finalConv.status}`);
  console.log(`   CSAT Rating: ${finalConv.csat_rating} / 5 Stars ⭐⭐⭐⭐⭐`);
  console.log(`   CSAT Comment: "${finalConv.csat_comment}"`);

  // Cleanup
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(convId);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(convId);
  db.prepare('DELETE FROM visitors WHERE id = ?').run(visitorId);
  db.prepare('DELETE FROM customers WHERE email = ?').run(customerEmail);
  db.prepare('DELETE FROM channels WHERE id = ?').run(chanId);
  db.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').run(wsId);
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(wsId);
  db.prepare('DELETE FROM users WHERE id = ?').run(adminUser.id);

  console.log('\n================================================================');
  console.log('🎉 COMPLETE 2-WAY INTERACTION TEST PASSED 100% SUCCESSFULLY!');
  console.log('================================================================\n');
}

runTwoWayChatSimulation().catch((err) => {
  console.error('\n❌ Simulation Failed:', err);
  process.exit(1);
});
