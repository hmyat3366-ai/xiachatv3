import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db } from '../server/db.js';
import {
  uploadDocumentKnowledge,
  performRagSearch,
} from '../server/knowledgeController.js';
import { generateAiAgentResponse, processInboundCustomerMessage } from '../server/aiProviderService.js';
import { testAiAgentPlayground } from '../server/aiAgentController.js';

async function runPipelineVerification() {
  console.log('=== STARTING RAG & AI AGENT KNOWLEDGE BASE PIPELINE VERIFICATION ===');

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const wsId = crypto.randomUUID();

  // 1. Setup User and Workspace
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
    VALUES (?, 'Pipeline Tester', ?, 'hash', ?, ?, ?)
  `).run(userId, `pipeline_${Date.now()}@example.com`, now, now, now);

  db.prepare(`
    INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
    VALUES (?, 'AI Pipeline Workspace', ?, ?, ?, ?)
  `).run(wsId, `pipeline-${Date.now()}`, userId, now, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
  `).run(crypto.randomUUID(), wsId, userId, now, now, now);

  // 2. Upload English Knowledge Document
  let uploadResJson: any = null;
  const mockRes = {
    status: () => mockRes,
    json: (d: any) => { uploadResJson = d; return mockRes; },
  };

  await uploadDocumentKnowledge(
    {
      user: { id: userId, name: 'Pipeline Tester', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: {
        fileName: 'Xia_Enterprise_Services.txt',
        fileType: 'TXT',
        fileDataText: 'Xia Chat Enterprise provides omnichannel customer support automation. Pricing is $49 per agent per month with 30 days money-back guarantee. Supported channels include Facebook, Telegram, Viber, and Website Chat.',
      },
    } as any,
    mockRes as any
  );

  assert.ok(uploadResJson.success, 'Document upload failed');
  const enSourceId = uploadResJson.id;
  console.log(`✅ 1. English Knowledge Document Uploaded: ${uploadResJson.fileName} (${uploadResJson.chunkCount} chunks)`);

  // 3. Upload Burmese Knowledge Document
  let burmeseResJson: any = null;
  const mockBurmeseRes = {
    status: () => mockBurmeseRes,
    json: (d: any) => { burmeseResJson = d; return mockBurmeseRes; },
  };

  await uploadDocumentKnowledge(
    {
      user: { id: userId, name: 'Pipeline Tester', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: {
        fileName: 'Burmese_Knowledge_Base.txt',
        fileType: 'TXT',
        fileDataText: 'Xia Chat ဝန်ဆောင်မှုများသည် Facebook, Telegram, Viber နှင့် Website Live Chat တို့ကို တစ်နေရာတည်းမှ စီမံခန့်ခွဲနိုင်သော AI စနစ်ဖြစ်ပါသည်။ ဈေးနှုန်းမှာ တစ်လလျှင် ၄၉ ဒေါ်လာ ဖြစ်ပြီး ရက်ပေါင်း ၃၀ ငွေပြန်အမ်းပေးမည့် အာမခံချက် ပါဝင်ပါသည်။',
      },
    } as any,
    mockBurmeseRes as any
  );

  assert.ok(burmeseResJson.success, 'Burmese document upload failed');
  console.log(`✅ 2. Burmese Knowledge Document Uploaded: ${burmeseResJson.fileName} (${burmeseResJson.chunkCount} chunks)`);

  // 4. Test RAG Search with legacy allowedSources filter
  // Even if legacy mock tags ['faq', 'returns', 'shipping'] are passed, performRagSearch MUST NOT filter out real sources
  const ragLegacyFilterResults = performRagSearch(wsId, 'pricing 30 days money-back guarantee', 3, ['faq', 'returns', 'shipping']);
  assert.ok(ragLegacyFilterResults.length > 0, 'RAG search with legacy mock tags should fall back to workspace sources');
  assert.ok(ragLegacyFilterResults[0].text.includes('$49'));
  console.log(`✅ 3. Legacy Mock AllowedSources Fallback Verified: matched "${ragLegacyFilterResults[0].sourceName}" with score ${ragLegacyFilterResults[0].similarityScore}%.`);

  // 5. Test Unicode & Burmese RAG Search
  const burmeseRagResults = performRagSearch(wsId, 'ဈေးနှုန်းဘယ်လောက်လဲ', 3);
  assert.ok(burmeseRagResults.length > 0, 'Burmese RAG search must match Burmese text chunks');
  assert.ok(burmeseRagResults[0].text.includes('၄၉ ဒေါ်လာ'));
  console.log(`✅ 4. Burmese Unicode RAG Search Verified: matched "${burmeseRagResults[0].sourceName}" with score ${burmeseRagResults[0].similarityScore}%.`);

  // 6. Test Zero False Positives for completely unrelated query
  const unrelatedResults = performRagSearch(wsId, 'quantum teleportation astrophysics nebula', 3);
  assert.strictEqual(unrelatedResults.length, 0, 'Unrelated query must return 0 chunks');
  console.log('✅ 5. Irrelevant Query Filter Verified: 0 false positive chunks returned.');

  // 7. Test AI Agent Response Generation using RAG (English)
  const aiResEnglish = await generateAiAgentResponse({
    workspaceId: wsId,
    agentName: 'Xia Support Concierge',
    systemInstructions: 'You are an enterprise AI assistant.',
    userMessage: 'What is the pricing and money-back guarantee for Xia Chat?',
    knowledgeSources: ['all'],
  });

  assert.ok(aiResEnglish.reply.length > 20);
  assert.ok(aiResEnglish.reply.includes('$49') || aiResEnglish.reply.includes('30 days'), `Reply must reference knowledge base, got: ${aiResEnglish.reply}`);
  assert.ok(aiResEnglish.knowledgeSourcesUsed.length > 0, 'Must record knowledge sources used');
  assert.ok(!aiResEnglish.reply.toLowerCase().includes('espresso'), 'Must not recommend espresso coffee');
  assert.ok(!aiResEnglish.reply.toLowerCase().includes('velvet reserve'), 'Must not hallucinate coffee blend');
  console.log(`✅ 6. AI Agent Response (English) Verified: replied using Knowledge Base: "${aiResEnglish.reply.slice(0, 70)}..."`);

  // 8. Test AI Agent Response Generation using RAG (Burmese)
  const aiResBurmese = await generateAiAgentResponse({
    workspaceId: wsId,
    agentName: 'Xia Support Concierge',
    systemInstructions: 'You are an enterprise AI assistant.',
    userMessage: 'ဈေးနှုန်းနဲ့ ငွေပြန်အမ်းပေးတဲ့ အာမခံချက် အကြောင်း သိပါရစေ',
    knowledgeSources: ['all'],
  });

  assert.ok(aiResBurmese.reply.length > 20);
  assert.ok(aiResBurmese.reply.includes('၄၉ ဒေါ်လာ') || aiResBurmese.reply.includes('ရက်ပေါင်း ၃၀'), `Burmese reply must reference Burmese knowledge base, got: ${aiResBurmese.reply}`);
  assert.ok(aiResBurmese.detectedLanguage === 'Burmese');
  console.log(`✅ 7. AI Agent Response (Burmese) Verified: replied in Burmese using Knowledge Base: "${aiResBurmese.reply.slice(0, 70)}..."`);

  // 9. Test Playground API Endpoint (/api/ai-agents/:id/test)
  const agentId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO ai_assistants (
      id, workspace_id, name, description, avatar, status, tone,
      instructions, custom_instructions, response_style, auto_reply_enabled,
      human_handoff_enabled, handoff_conditions, handoff_message,
      knowledge_source_ids, channel_ids, custom_rules, conversations_handled,
      resolution_rate, created_at, updated_at
    ) VALUES (?, ?, 'Xia Agent Pro', 'Official agent', 'bot', 'active', 'Friendly',
      'Help customer with services', 'Help customer with services', 'Balanced', 1,
      1, '["customer_asks"]', 'Connecting...', '["all"]', '["web"]', '[]', 0, 100, ?, ?)
  `).run(agentId, wsId, now, now);

  let playgroundResJson: any = null;
  let playgroundStatus = 200;
  const mockPlaygroundRes = {
    status: (code: number) => { playgroundStatus = code; return mockPlaygroundRes; },
    json: (d: any) => { playgroundResJson = d; return mockPlaygroundRes; },
  };

  await testAiAgentPlayground(
    {
      user: { id: userId, name: 'Pipeline Tester', email: 'test@example.com' },
      params: { id: agentId },
      query: { workspaceId: wsId },
      body: { message: 'Can you tell me your pricing plans?' },
    } as any,
    mockPlaygroundRes as any
  );

  assert.strictEqual(playgroundStatus, 200);
  assert.ok(playgroundResJson.reply.includes('$49'));
  assert.ok(playgroundResJson.metadata.knowledgeSourceUsed.includes('Xia_Enterprise_Services.txt'));
  console.log(`✅ 8. Playground Test Route Verified: returned reply referencing source "${playgroundResJson.metadata.knowledgeSourceUsed}".`);

  // 10. Test Widget Customer Inbound Processing
  const inboundResult = await processInboundCustomerMessage({
    workspaceId: wsId,
    agentName: 'Xia Agent Pro',
    systemInstructions: 'Help customer with services',
    userMessage: 'What channels do you support?',
    knowledgeSources: ['all'],
  });

  assert.ok(inboundResult.reply.includes('Telegram') || inboundResult.reply.includes('Facebook') || inboundResult.reply.includes('Viber'), `Inbound reply should include channels from KB: ${inboundResult.reply}`);
  assert.ok(inboundResult.sourcesUsed.length > 0);
  console.log(`✅ 9. Customer Widget Message Processing Verified: auto-replied using Knowledge Base channels.`);

  console.log('=== ALL RAG & AI AGENT KNOWLEDGE BASE TESTS PASSED! ===');
}

runPipelineVerification().catch((err) => {
  console.error('❌ PIPELINE VERIFICATION FAILED:', err);
  process.exit(1);
});
