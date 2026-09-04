/**
 * End-to-End Enterprise Inbox Lifecycle Verification Script
 * 
 * Verifies:
 * 1. AI Conversation Starters & Widget Config
 * 2. Intent Detection ("Where is my order?" -> "Order Tracking")
 * 3. AI to Human Handoff ("I want human support" -> HUMAN_HANDLING + reason)
 * 4. Human Agent Takeover
 * 5. Human Agent Message delivery to Customer Widget
 * 6. Resume AI (HUMAN_HANDLING -> AI_HANDLING)
 * 7. AI continues conversation naturally
 * 8. Conversation Resolution (RESOLVED + resolved_at)
 * 9. Auto-reopen on new customer message
 */

async function runTest() {
  const BASE_URL = 'http://localhost:5000';
  console.log('🚀 Starting Enterprise Inbox Lifecycle Verification...\n');

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      process.exit(1);
    } else {
      console.log(`✅ ${message}`);
    }
  }

  // --- Step 1: Check Widget Configuration & Starters ---
  console.log('--- Step 1: Checking Public Widget Config & Starters ---');
  const widgetConfigRes = await fetch(`${BASE_URL}/api/channels/public-widget/auto-detect`);
  assert(widgetConfigRes.ok, 'Widget config endpoint returned HTTP 200');
  const widgetConfig = await widgetConfigRes.json();
  assert(typeof widgetConfig.welcomeMessage === 'string' && widgetConfig.welcomeMessage.length > 0, `Welcome message present: "${widgetConfig.welcomeMessage}"`);
  const startersText = widgetConfig.conversationStarters.map((s: any) => typeof s === 'object' ? (s.label || s.prompt) : s).join(', ');
  assert(Array.isArray(widgetConfig.conversationStarters) && widgetConfig.conversationStarters.length > 0, `Conversation starters present (${widgetConfig.conversationStarters.length} chips: ${startersText})`);

  // --- Step 2: Authenticate Admin Agent ---
  console.log('\n--- Step 2: Authenticating Support Agent ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@xiachat.com', password: 'Admin@123456' }),
  });
  assert(loginRes.ok, 'Admin login succeeded');
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(Boolean(token), 'JWT token received');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // --- Step 3: Customer Sends "Where is my order?" ---
  console.log('\n--- Step 3: Customer sends initial query: "Where is my order?" ---');
  const visitorId = 'cust_test_' + Math.random().toString(36).substring(2, 9);
  const msg1Res = await fetch(`${BASE_URL}/api/channels/public-widget/auto-detect/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Where is my order?',
      visitorId,
    }),
  });
  assert(msg1Res.ok, 'Customer message 1 posted successfully');
  const msg1Data = await msg1Res.json();
  const conversationId = msg1Data.conversationId;
  assert(Boolean(conversationId), `Conversation created with ID: ${conversationId}`);
  assert(Boolean(msg1Data.reply), `AI generated reply: "${msg1Data.reply.substring(0, 70)}..."`);
  assert(!msg1Data.isHandoff, 'Message 1 did NOT trigger handoff');

  // --- Step 4: Verify Inbox State (Status: AI_HANDLING, Intent: Order Tracking) ---
  console.log('\n--- Step 4: Inspecting Inbox AI Intelligence & Status ---');
  const inboxRes = await fetch(`${BASE_URL}/api/inbox/conversations`, { headers: authHeaders });
  assert(inboxRes.ok, 'Inbox conversations retrieved');
  const inboxData = await inboxRes.json();
  const conversations = inboxData.conversations || [];
  const conv = conversations.find((c: any) => c.id === conversationId);
  assert(Boolean(conv), 'Conversation found in inbox');
  console.log(`   -> Status: ${conv.status}`);
  console.log(`   -> AI Mode: ${conv.aiMode}`);
  console.log(`   -> Intent: ${conv.intent}`);
  console.log(`   -> Sentiment: ${conv.sentiment}`);
  console.log(`   -> AI Summary: ${conv.aiSummary}`);
  assert(conv.status === 'AI_HANDLING' || conv.status === 'ai', `Status is AI handling (${conv.status})`);
  assert(conv.intent === 'Order Tracking', `Intent detected as "Order Tracking" (actual: ${conv.intent})`);
  assert(Boolean(conv.aiSummary), 'AI Summary generated');

  // --- Step 5: Customer Requests Human Handoff ---
  console.log('\n--- Step 5: Customer asks for human: "I want human support" ---');
  const msg2Res = await fetch(`${BASE_URL}/api/channels/public-widget/auto-detect/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'I want human support',
      visitorId,
      conversationId,
    }),
  });
  assert(msg2Res.ok, 'Customer message 2 posted successfully');
  const msg2Data = await msg2Res.json();
  assert(msg2Data.isHandoff === true, 'Handoff triggered flag returned true');

  // Check inbox conversation updated status
  const convAfterHandoffRes = await fetch(`${BASE_URL}/api/inbox/conversations/${conversationId}`, { headers: authHeaders });
  assert(convAfterHandoffRes.ok, 'Fetched conversation details after handoff');
  const convAfterHandoff = await convAfterHandoffRes.json();
  const convDetails = convAfterHandoff.conversation;
  console.log(`   -> Status after handoff: ${convDetails.status}`);
  console.log(`   -> Handoff Reason: ${convDetails.handoffReason || convDetails.handoff_reason}`);
  assert(convDetails.status === 'HUMAN_HANDLING' || convDetails.status === 'open', `Status updated to HUMAN_HANDLING (${convDetails.status})`);

  // --- Step 6: Human Agent Takes Over ---
  console.log('\n--- Step 6: Human Agent takes over conversation ---');
  const takeoverRes = await fetch(`${BASE_URL}/api/inbox/conversations/${conversationId}/takeover`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert(takeoverRes.ok, 'Agent takeover API succeeded');
  const takeoverData = await takeoverRes.json();
  assert(takeoverData.success, 'Takeover reported success');

  // --- Step 7: Human Agent Replies to Customer ---
  console.log('\n--- Step 7: Human Agent replies to customer ---');
  const agentReplyText = 'Hello! This is Alex from customer support. I see your order #1048 is currently brewing and will be delivered in 15 minutes!';
  const replyRes = await fetch(`${BASE_URL}/api/inbox/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      content: agentReplyText,
      isInternalNote: false,
    }),
  });
  assert(replyRes.ok, 'Agent message sent');

  // Customer widget fetches conversation to verify agent message received
  const widgetPollRes = await fetch(`${BASE_URL}/api/channels/public-widget/auto-detect/conversation/${conversationId}`);
  assert(widgetPollRes.ok, 'Customer widget retrieved conversation history');
  const widgetPoll = await widgetPollRes.json();
  const agentMsg = (widgetPoll.messages || []).find((m: any) => m.senderType === 'agent');
  assert(Boolean(agentMsg), 'Agent message found in customer widget stream');
  assert(agentMsg.content === agentReplyText, `Agent message content verified: "${agentMsg.content.substring(0, 50)}..."`);

  // --- Step 8: Human Agent Resumes AI Mode ---
  console.log('\n--- Step 8: Human Agent clicks "Resume AI" ---');
  const resumeRes = await fetch(`${BASE_URL}/api/inbox/conversations/${conversationId}/resume-ai`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert(resumeRes.ok, 'Resume AI API call succeeded');
  const resumeData = await resumeRes.json();
  assert(resumeData.success, 'Resume AI reported success');
  assert(resumeData.status === 'AI_HANDLING' || resumeData.status === 'ai', `Status returned to AI handling (${resumeData.status})`);

  // --- Step 9: Customer Follow-up & AI Continues ---
  console.log('\n--- Step 9: Customer sends follow-up query to AI ---');
  const msg3Res = await fetch(`${BASE_URL}/api/channels/public-widget/auto-detect/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Great, thank you! Do you have any fresh croissants available today?',
      visitorId,
      conversationId,
    }),
  });
  assert(msg3Res.ok, 'Customer message 3 posted');
  const msg3Data = await msg3Res.json();
  assert(!msg3Data.isHandoff, 'AI handles follow-up smoothly without handoff');
  assert(Boolean(msg3Data.reply), `AI continued conversation naturally: "${msg3Data.reply.substring(0, 70)}..."`);

  // --- Step 10: Human Agent Resolves Conversation ---
  console.log('\n--- Step 10: Human Agent clicks "Resolve" ---');
  const resolveRes = await fetch(`${BASE_URL}/api/inbox/conversations/${conversationId}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'RESOLVED' }),
  });
  assert(resolveRes.ok, 'Resolve status update succeeded');
  const resolveData = await resolveRes.json();
  assert(resolveData.success, 'Resolve reported success');
  assert(resolveData.status === 'RESOLVED', 'Conversation status marked RESOLVED');

  // Verify in inbox details
  const resolvedConvRes = await fetch(`${BASE_URL}/api/inbox/conversations/${conversationId}`, { headers: authHeaders });
  const resolvedConv = await resolvedConvRes.json();
  assert(resolvedConv.conversation.status === 'RESOLVED', 'Verified conversation status is RESOLVED');
  assert(Boolean(resolvedConv.conversation.resolved_at || resolvedConv.conversation.resolvedAt), `Resolved timestamp recorded: ${resolvedConv.conversation.resolved_at || resolvedConv.conversation.resolvedAt}`);

  // --- Step 11: Auto-Reopen on Customer Message ---
  console.log('\n--- Step 11: Customer re-opens resolved conversation ---');
  const msg4Res = await fetch(`${BASE_URL}/api/channels/public-widget/auto-detect/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Wait, could you also add an almond biscotti to my order?',
      visitorId,
      conversationId,
    }),
  });
  assert(msg4Res.ok, 'Customer message 4 posted');
  const recheckConvRes = await fetch(`${BASE_URL}/api/inbox/conversations/${conversationId}`, { headers: authHeaders });
  const recheckConv = await recheckConvRes.json();
  assert(recheckConv.conversation.status !== 'RESOLVED', `Conversation auto-reopened from RESOLVED to: ${recheckConv.conversation.status}`);

  console.log('\n🎉 ALL 11 ENTERPRISE INBOX LIFECYCLE TESTS PASSED PERFECTLY!\n');
}

runTest().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
