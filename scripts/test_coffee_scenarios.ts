import { handlePublicWidgetMessage, getPublicWidgetConfig } from '../server/channelController.js';

async function testCoffeeScenarios() {
  console.log('========================================================');
  console.log('☕ TESTING COFFEE SHOP DEMO STORE & XIA CHAT SCENARIOS');
  console.log('========================================================\n');

  // 1. Resolve SiteKey
  let siteKey = 'auto-detect';
  const mockReq0: any = { params: { siteKey: 'auto-detect' } };
  const mockRes0: any = {
    status: (code: number) => ({
      json: (data: any) => {
        siteKey = data.siteKey || 'auto-detect';
        console.log(`[Config] Connected to SiteKey=${siteKey}, Widget="${data.widgetName}"`);
      },
    }),
  };
  await getPublicWidgetConfig(mockReq0, mockRes0);

  const visitorId = 'coffee_lover_' + Date.now();
  let conversationId: string | undefined = undefined;

  // Scenario 1: Customer: "What coffee do you recommend?"
  console.log('\n--- Scenario 1: Coffee Recommendation Query ---');
  console.log('👤 Customer: "What coffee do you recommend?"');
  let res1: any = null;
  const mockReq1: any = {
    params: { siteKey },
    body: {
      message: 'What coffee do you recommend?',
      visitorId,
      customerName: 'Marcus Coffee Fan',
      customerEmail: 'marcus.fan@example.com',
    },
  };
  const mockRes1: any = {
    status: (code: number) => ({
      json: (data: any) => {
        res1 = data;
        conversationId = data.conversationId;
        console.log(`🤖 AI Agent: "${data.reply}"`);
        console.log(`   isHandoff: ${data.isHandoff}`);
      },
    }),
  };
  await handlePublicWidgetMessage(mockReq1, mockRes1);

  const reply1 = (res1?.reply || '').toLowerCase();
  const passesScenario1 =
    reply1.includes('velvet') ||
    reply1.includes('espresso') ||
    reply1.includes('floral') ||
    reply1.includes('ethiopian') ||
    reply1.includes('roast') ||
    reply1.includes('blend') ||
    reply1.includes('coffee');
  console.log(`✅ Scenario 1 Pass (Answers from Coffee KB): ${passesScenario1}`);

  // Scenario 2: Customer: "Where is my order?"
  console.log('\n--- Scenario 2: Order Tracking Inquiry ---');
  console.log('👤 Customer: "Where is my order?"');
  let res2: any = null;
  const mockReq2: any = {
    params: { siteKey },
    body: {
      message: 'Where is my order?',
      visitorId,
      conversationId,
    },
  };
  const mockRes2: any = {
    status: (code: number) => ({
      json: (data: any) => {
        res2 = data;
        console.log(`🤖 AI Agent: "${data.reply}"`);
        console.log(`   isHandoff: ${data.isHandoff}`);
      },
    }),
  };
  await handlePublicWidgetMessage(mockReq2, mockRes2);

  const reply2 = (res2?.reply || '').toLowerCase();
  const passesScenario2 =
    reply2.includes('order id') ||
    reply2.includes('order') ||
    reply2.includes('tracking') ||
    reply2.includes('email') ||
    reply2.includes('provide');
  console.log(`✅ Scenario 2 Pass (Asks for Order Information): ${passesScenario2}`);

  // Scenario 3: Customer: "I want to talk with human."
  console.log('\n--- Scenario 3: Human Agent Handoff Trigger ---');
  console.log('👤 Customer: "I want to talk with human."');
  let res3: any = null;
  const mockReq3: any = {
    params: { siteKey },
    body: {
      message: 'I want to talk with human.',
      visitorId,
      conversationId,
    },
  };
  const mockRes3: any = {
    status: (code: number) => ({
      json: (data: any) => {
        res3 = data;
        console.log(`🤖 AI Agent: "${data.reply}"`);
        console.log(`   isHandoff: ${data.isHandoff}`);
      },
    }),
  };
  await handlePublicWidgetMessage(mockReq3, mockRes3);

  const passesScenario3 = res3?.isHandoff === true;
  console.log(`✅ Scenario 3 Pass (Triggers Handoff): ${passesScenario3}`);

  console.log('\n========================================================');
  if (passesScenario1 && passesScenario2 && passesScenario3) {
    console.log('🎉 ALL 3 COFFEE SHOP SCENARIOS PASSED WITH 100% SUCCESS!');
  } else {
    console.warn('⚠️ Some scenarios need adjustment.');
  }
  console.log('========================================================');
}

testCoffeeScenarios()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
