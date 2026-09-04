import { handlePublicWidgetMessage, getPublicWidgetConversation } from '../server/channelController.js';
import { postMessage } from '../server/inboxController.js';
import { db } from '../server/db.js';

async function testHumanChatFlow() {
  console.log('========================================================');
  console.log('🧑‍💼 TESTING HUMAN MODE TWO-WAY COMMUNICATION');
  console.log('========================================================\n');

  const siteKey = 'aa3791a8-8783-4be2-8761-41accf0c28d1';
  const visitorId = 'visitor_human_test_' + Date.now();

  // 1. Customer sends message asking for human
  console.log('1. Customer asks for human agent in widget...');
  let visitorData: any = null;
  const mockReq1: any = {
    params: { siteKey },
    body: {
      message: 'I want to talk with human please.',
      visitorId,
      customerName: 'Ko Thant',
      customerEmail: 'kothant.test@example.com',
    },
  };
  const mockRes1: any = {
    status: (code: number) => ({
      json: (data: any) => {
        visitorData = data;
        console.log(`   ✅ Status ${code}: ConversationId=${data.conversationId}, isHandoff=${data.isHandoff}`);
      },
    }),
  };
  await handlePublicWidgetMessage(mockReq1, mockRes1);

  const conversationId = visitorData.conversationId;

  // 2. Admin sends message from Dashboard Inbox
  console.log('\n2. Admin replies from Xia Chat Inbox...');
  const adminUser = db.prepare("SELECT * FROM users WHERE email = 'admin@xiachat.com'").get() as any;
  const adminMessageContent = 'Hello Ko Thant! I am Xia Admin from human support. I am here to help you!';

  let adminResData: any = null;
  const mockReqAdmin: any = {
    user: adminUser,
    params: { id: conversationId },
    query: { workspaceId: 'a47b51fc-ed9a-4c27-b8a4-cda970f1bac0' },
    body: {
      content: adminMessageContent,
      senderType: 'agent',
      isInternalNote: false,
    },
  };
  const mockResAdmin: any = {
    status: (code: number) => ({
      json: (data: any) => {
        adminResData = data;
        console.log(`   ✅ Status ${code}: Admin sent message "${data.message?.content}" (senderName=${data.message?.senderName})`);
      },
    }),
  };
  await postMessage(mockReqAdmin, mockResAdmin);

  // 3. Customer Widget checks conversation history (simulating real-time widget polling/fetch)
  console.log('\n3. Customer Widget receives message thread...');
  let customerThreadData: any = null;
  const mockReqWidget: any = {
    params: { siteKey, conversationId },
  };
  const mockResWidget: any = {
    status: (code: number) => ({
      json: (data: any) => {
        customerThreadData = data;
        console.log(`   ✅ Status ${code}: Thread has ${data.messages?.length} messages. Status: ${data.status}`);
      },
    }),
  };
  await getPublicWidgetConversation(mockReqWidget, mockResWidget);

  console.log('\n--- Thread Messages on Customer Screen ---');
  customerThreadData.messages.forEach((m: any, idx: number) => {
    console.log(`   [${idx + 1}] [${m.senderType.toUpperCase()}] (${m.senderName || 'System'}): ${m.content}`);
  });

  const lastMsg = customerThreadData.messages[customerThreadData.messages.length - 1];
  const receivedAdminMessage = lastMsg && lastMsg.senderType === 'agent' && lastMsg.content === adminMessageContent;

  console.log('\n========================================================');
  console.log(`🎯 Did customer receive Admin message?: ${receivedAdminMessage}`);
  console.log(`🎯 Conversation Status in Human Mode?:  ${customerThreadData.status === 'human'}`);
  console.log('========================================================');

  if (receivedAdminMessage && customerThreadData.status === 'human') {
    console.log('🎉 HUMAN MODE TWO-WAY CHAT IS 100% OPERATIONAL!');
    process.exit(0);
  } else {
    console.error('❌ Human chat test failed.');
    process.exit(1);
  }
}

testHumanChatFlow().catch((err) => {
  console.error(err);
  process.exit(1);
});
