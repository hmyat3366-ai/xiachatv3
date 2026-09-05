import 'dotenv/config';

async function runWebFeatureTests() {
  console.log('=== TESTING XIA CHAT WEB-FIRST PRODUCT SUITE ===\n');

  const BASE_URL = 'http://localhost:5000';
  const siteKey = 'auto-detect';

  // 1. Get auth token for agent API requests
  console.log('1. Authenticating as dashboard test user...');
  const authRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@xiachat.com',
      password: 'Admin@123456',
    }),
  });

  if (!authRes.ok) {
    throw new Error(`Auth failed with status ${authRes.status}`);
  }
  const authData = await authRes.json();
  const token = authData.token;
  console.log('✓ Successfully authenticated. User:', authData.user.name);

  // 2. Test Live Visitor Presence Heartbeat
  console.log('\n2. Testing Live Visitor Presence Heartbeat...');
  const testVisitorId = `web-visitor-${Date.now()}`;
  const heartbeatRes = await fetch(`${BASE_URL}/api/channels/public-widget/${siteKey}/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId: testVisitorId,
      currentPage: '/products/artisan-beans',
      pageTitle: 'Artisan Coffee Beans | Fresh Roast',
      timeSpentSeconds: 145,
    }),
  });

  if (!heartbeatRes.ok) {
    throw new Error(`Heartbeat failed with HTTP ${heartbeatRes.status}`);
  }
  const heartbeatData = await heartbeatRes.json();
  console.log('✓ Heartbeat successfully processed:', heartbeatData);

  // 3. Test GET /api/visitors/live from Dashboard
  console.log('\n3. Testing GET /api/visitors/live in Dashboard...');
  const liveVisitorsRes = await fetch(`${BASE_URL}/api/visitors/live`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!liveVisitorsRes.ok) {
    throw new Error(`Live visitors fetch failed with HTTP ${liveVisitorsRes.status}`);
  }
  const liveVisitorsData = await liveVisitorsRes.json();
  console.log(`✓ Retrieved ${liveVisitorsData.count} live browsing visitors.`);
  const foundVisitor = (liveVisitorsData.visitors || []).find((v: any) => v.id === testVisitorId);
  if (!foundVisitor) {
    throw new Error(`Expected visitor ${testVisitorId} was not found in live visitors list`);
  }
  console.log('✓ Verified live visitor presence details:');
  console.log('  - Visitor ID:', foundVisitor.id);
  console.log('  - Page Title:', foundVisitor.page_title);
  console.log('  - Current Page:', foundVisitor.current_page);
  console.log('  - Time on Site:', foundVisitor.time_spent_seconds, 'seconds');

  // 4. Test Proactive Agent Chat Initiation
  console.log('\n4. Testing Proactive Agent Chat Initiation (POST /api/visitors/:id/initiate-chat)...');
  const initiateRes = await fetch(`${BASE_URL}/api/visitors/${testVisitorId}/initiate-chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      initialMessage: 'Hey! I noticed you are checking out our Artisan Coffee Beans. Would you like a tasting recommendation?',
    }),
  });

  if (!initiateRes.ok) {
    throw new Error(`Proactive chat initiation failed with HTTP ${initiateRes.status}`);
  }
  const initiateData = await initiateRes.json();
  console.log('✓ Proactive chat successfully initiated:');
  console.log('  - Conversation ID:', initiateData.conversationId);
  console.log('  - Initial Message:', initiateData.message.content);

  // 5. Test Customer CSAT Rating Submission
  console.log('\n5. Testing CSAT 5-Star Rating & Comment Submission...');
  const csatRes = await fetch(`${BASE_URL}/api/channels/public-widget/${siteKey}/csat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: initiateData.conversationId,
      rating: 5,
      comment: 'Super fast live agent and great product suggestions! ⭐⭐⭐⭐⭐',
    }),
  });

  if (!csatRes.ok) {
    throw new Error(`CSAT submission failed with HTTP ${csatRes.status}`);
  }
  const csatData = await csatRes.json();
  console.log('✓ CSAT successfully recorded:', csatData);

  // 6. Verify Conversation in Dashboard Inbox
  console.log('\n6. Verifying Conversation in Dashboard Inbox Thread...');
  const threadRes = await fetch(`${BASE_URL}/api/inbox/conversations/${initiateData.conversationId}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!threadRes.ok) {
    throw new Error(`Thread fetch failed with HTTP ${threadRes.status}`);
  }
  const threadData = await threadRes.json();
  console.log('✓ Verified Inbox Thread attributes:');
  console.log('  - Status:', threadData.conversation.status);
  console.log('  - CSAT Rating:', threadData.conversation.csatRating);
  console.log('  - CSAT Comment:', threadData.conversation.csatComment);

  if (threadData.conversation.csatRating !== 5) {
    throw new Error(`Expected CSAT rating 5, got ${threadData.conversation.csatRating}`);
  }

  console.log('\n🎉 ALL WEB-FIRST FEATURE TESTS PASSED WITH 100% SUCCESS!');
}

runWebFeatureTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
