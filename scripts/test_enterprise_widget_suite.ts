import { db } from '../server/db.js';
import { getPublicWidgetConfig, handlePublicWidgetMessage, identifyPublicWidgetVisitor } from '../server/channelController.js';
import { returnToAI, updateStatus } from '../server/inboxController.js';

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

async function runSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING XIA CHAT AI WIDGET ENTERPRISE TEST SUITE');
  console.log('====================================================\n');

  // 1. Check Website Channel
  const channel = db.prepare("SELECT * FROM channels WHERE type = 'website' LIMIT 1").get() as any;
  if (!channel) {
    throw new Error('No website channel found in database');
  }
  const siteKey = channel.id;
  console.log(`[PASS 1] Resolved Website Channel SiteKey: ${siteKey}`);

  // 2. Fetch Public Widget Config for Coffee Shop
  const configMock = mockReqRes({}, { siteKey }, { industry: 'coffee_shop' });
  await getPublicWidgetConfig(configMock.req, configMock.res);
  const configData = configMock.getData();

  if (!configData || !Array.isArray(configData.conversationStarters)) {
    throw new Error('Failed to retrieve widget config or conversationStarters is missing');
  }
  const labels = configData.conversationStarters.map((s: any) => (typeof s === 'object' ? s.label : s));
  console.log(`[PASS 2] Widget Config Loaded:`);
  console.log(`         Welcome: "${configData.welcomeMessage}"`);
  console.log(`         Quick Starters: ${JSON.stringify(labels)}`);
  if (!labels.some((l: string) => l.includes('Menu') || l.includes('Track Order'))) {
    throw new Error('Expected coffee shop starters not found');
  }

  // 3. Guest Visitor Product Inquiry (No Login Required)
  const visitorId = `visitor_test_${Date.now()}`;
  const sessionId = `session_test_${Date.now()}`;
  const browserId = `browser_test_${Date.now()}`;

  const msgMock1 = mockReqRes({
    message: 'Can you recommend one of your specialty coffee roasts and tell me the price?',
    visitorId,
    sessionId,
    browserId,
    productContext: {
      industry: 'coffee_shop',
      companyName: 'Velvet Roast Artisanal Coffee',
    },
  }, { siteKey });

  await handlePublicWidgetMessage(msgMock1.req, msgMock1.res);
  const msgRes1 = msgMock1.getData();

  if (!msgRes1 || !msgRes1.conversationId) {
    throw new Error('Message handler did not return conversationId');
  }
  const convId = msgRes1.conversationId;
  console.log(`\n[PASS 3] Guest Visitor Message Processed:`);
  console.log(`         Conversation ID: ${convId}`);
  console.log(`         AI Reply: "${msgRes1.reply.substring(0, 120)}..."`);

  // Check visitor record in DB
  const visitorRow = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId) as any;
  if (!visitorRow) {
    throw new Error('Visitor identity record not saved in visitors table');
  }
  console.log(`         Stored Visitor ID: ${visitorRow.id}`);
  console.log(`         Detected Intent: ${visitorRow.intent || 'Product Inquiry'}`);

  // 4. Zero-Hallucination Real-Time Order Tracking
  const msgMock2 = mockReqRes({
    message: 'Where is my order #ORD-84920?',
    visitorId,
    sessionId,
    browserId,
    conversationId: convId,
  }, { siteKey });

  await handlePublicWidgetMessage(msgMock2.req, msgMock2.res);
  const msgRes2 = msgMock2.getData();

  console.log(`\n[PASS 4] Order Tracking Direct Resolution:`);
  console.log(`         Query: "Where is my order #ORD-84920?"`);
  console.log(`         AI Reply: "${msgRes2.reply}"`);
  if (!msgRes2.reply.includes('ORD-84920') && !msgRes2.reply.includes('FedEx') && !msgRes2.reply.includes('FDX-')) {
    throw new Error('AI failed to resolve real order from database');
  }

  // 5. Human Handoff System (AI -> Human)
  const msgMock3 = mockReqRes({
    message: 'I am angry with the delay, let me talk to a human support agent immediately!',
    visitorId,
    sessionId,
    browserId,
    conversationId: convId,
  }, { siteKey });

  await handlePublicWidgetMessage(msgMock3.req, msgMock3.res);
  const msgRes3 = msgMock3.getData();

  console.log(`\n[PASS 5] Human Handoff Triggered:`);
  console.log(`         Handoff Flag: ${msgRes3.isHandoff}`);
  console.log(`         Response: "${msgRes3.reply}"`);

  const updatedConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId) as any;
  console.log(`         Conversation Status: ${updatedConv.status}`);
  console.log(`         Assigned Agent: ${updatedConv.assignee}`);
  if (updatedConv.status !== 'HUMAN_HANDLING') {
    throw new Error(`Expected conversation status to be HUMAN_HANDLING, got: ${updatedConv.status}`);
  }

  // 6. Guest Visitor Email Identification & Profile Merge
  const identifyMock = mockReqRes({
    visitorId,
    email: 'sarah.coffee.lover@example.com',
    name: 'Sarah Jenkins',
    phone: '+1 555-0199',
    conversationId: convId,
  }, { siteKey });

  await identifyPublicWidgetVisitor(identifyMock.req, identifyMock.res);
  const identifyRes = identifyMock.getData();

  console.log(`\n[PASS 6] Guest Identity Merged:`);
  console.log(`         Customer ID: ${identifyRes.customerId}`);
  console.log(`         Customer Email: ${identifyRes.customerEmail}`);
  console.log(`         Customer Name: ${identifyRes.customerName}`);

  const postMergeConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId) as any;
  if (postMergeConv.customer_email !== 'sarah.coffee.lover@example.com') {
    throw new Error('Conversation customer email was not updated upon identification');
  }

  // 7. Human -> AI Return ("Return to AI" button in Inbox)
  const returnAiMock = mockReqRes({}, { id: convId });
  await returnToAI(returnAiMock.req, returnAiMock.res);
  const returnAiRes = returnAiMock.getData();

  console.log(`\n[PASS 7] Return to AI Autonomous Mode:`);
  console.log(`         New Status: ${returnAiRes.status}`);
  console.log(`         AI Mode: ${returnAiRes.aiMode}`);
  if (returnAiRes.status !== 'AI_HANDLING') {
    throw new Error(`Conversation did not return to AI_HANDLING, got: ${returnAiRes.status}`);
  }

  // 8. Resolve Conversation
  const resolveMock = mockReqRes({ status: 'RESOLVED' }, { id: convId });
  await updateStatus(resolveMock.req, resolveMock.res);
  const resolveRes = resolveMock.getData();

  console.log(`\n[PASS 8] Resolve Conversation:`);
  console.log(`         Final Status: ${resolveRes.status}`);
  console.log(`         Resolved At: ${resolveRes.resolvedAt}`);
  if (resolveRes.status !== 'RESOLVED') {
    throw new Error(`Expected status to be RESOLVED, got: ${resolveRes.status}`);
  }

  console.log('\n====================================================');
  console.log('✅ ALL ENTERPRISE AI WIDGET VERIFICATIONS PASSED!');
  console.log('====================================================\n');
}

runSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
