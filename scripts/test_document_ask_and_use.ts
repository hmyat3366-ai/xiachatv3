import { db } from '../server/db';
import { generateAiAgentResponse } from '../server/aiProviderService';
import { createTextChunks, performRagSearch } from '../server/knowledgeController';

async function runTest() {
  console.log('=== STARTING DOCUMENT ASK & USE VERIFICATION ===');

  const testWsId = 'ws_doc_test_' + Date.now();
  const testUserId = 'user_test_' + Date.now();
  const now = new Date().toISOString();

  // Create test workspace & user
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
    VALUES (?, 'Portfolio Tester', ?, 'hash', ?, ?, ?)
  `).run(testUserId, `tester_${Date.now()}@xia.ai`, now, now, now);

  db.prepare(`
    INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
    VALUES (?, 'Portfolio Test WS', ?, ?, ?, ?)
  `).run(testWsId, 'portfolio-ws-' + Date.now(), testUserId, now, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
  `).run('wm_' + Date.now(), testWsId, testUserId, now, now, now);

  // Ingest realistic Portfolio PDF text
  const portfolioText = `
PORTFOLIO & RESUME - AUNG MIN KHANT
Senior Full Stack Developer & AI Engineer
Yangon, Myanmar | aungmin@example.com | +959123456789

PROFESSIONAL SUMMARY:
Over 6 years of experience building production enterprise applications, distributed systems, and modern AI chat solutions. Passionate about real-time communications, React, TypeScript, Node.js, and LLM integrations.

TECHNICAL SKILLS:
- Frontend: React, Next.js, Tailwind CSS, TypeScript, Redux Toolkit, Framer Motion
- Backend: Node.js, Express, Fastify, Python, FastAPI, WebSockets
- Databases: PostgreSQL, SQLite, Redis, MongoDB, Supabase
- AI & LLMs: Gemini API, OpenAI API, LangChain, Vector Embeddings, RAG Architectures
- DevOps & Cloud: Docker, Kubernetes, AWS (S3, EC2), Vercel, Render, CI/CD pipelines

FEATURED PROJECTS:
1. XiaChat Omnichannel Customer Service Platform
   - Built a real-time messaging system supporting Facebook Messenger, Telegram, Viber, and web chat.
   - Integrated semantic RAG knowledge retrieval for instant automated customer inquiries with 95% accuracy.
   - Handled over 100,000 monthly active chat sessions with sub-200ms response times.

2. Myanmar E-Commerce SuperApp
   - Engineered the payments and inventory microservices handling 50,000+ daily orders.
   - Built seamless integration with KBZPay, WavePay, CBPay, and AYA Pay.

WORK EXPERIENCE:
- Lead AI Software Engineer at TechHub Global (2022 - Present)
  * Architected internal agentic workflows and customer intelligence systems.
  * Supervised a high-performing engineering team of 8 full-stack engineers.
- Senior Software Engineer at NexTech Solutions (2019 - 2022)
  * Developed high-throughput RESTful APIs and real-time dashboard analytics.

EDUCATION & CERTIFICATIONS:
- B.C.Sc (Computer Science) - University of Computer Studies, Yangon (UCSY)
- AWS Certified Solutions Architect - Associate
`;

  const sourceId = 'src_portfolio_' + Date.now();
  const sourceName = 'Portfolio.pdf';

  db.prepare(`
    INSERT INTO knowledge_sources (
      id, workspace_id, name, type, status, content, original_url, file_metadata, chunk_count, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, 'PDF', 'ready', ?, NULL, ?, 1, 'Aung Min Khant', ?, ?)
  `).run(
    sourceId,
    testWsId,
    sourceName,
    portfolioText,
    JSON.stringify({ filename: 'Portfolio.pdf', size: '245 KB', ext: 'pdf' }),
    now,
    now
  );

  const chunkCount = createTextChunks(sourceId, testWsId, sourceName, 'PDF', portfolioText);
  db.prepare('UPDATE knowledge_sources SET chunk_count = ? WHERE id = ?').run(chunkCount, sourceId);
  console.log(`✅ 1. Portfolio.pdf Ingested with ${chunkCount} vector chunks.`);

  // Test 1: Ask specific source for overview in Burmese
  const overviewResponse = await generateAiAgentResponse({
    workspaceId: testWsId,
    agentName: `${sourceName} Assistant`,
    systemInstructions: `You are answering questions specifically about the document: "${sourceName}". Provide detailed, accurate, and comprehensive information strictly from this document.`,
    userMessage: 'ဒီဖိုင်က ဘာအကြောင်းလဲ အကျဉ်းချုပ်ပြပါ',
    knowledgeSources: [sourceId],
  });
  console.log('✅ 2. Document Ask (Overview in Burmese):');
  console.log('   Reply snippet:', overviewResponse.reply.slice(0, 160) + '...');
  if (!overviewResponse.reply.includes('Aung Min Khant') && !overviewResponse.reply.includes('Senior Full Stack')) {
    throw new Error('Overview response did not identify Aung Min Khant from Portfolio.pdf!');
  }

  // Test 2: Ask specific source about skills
  const skillsResponse = await generateAiAgentResponse({
    workspaceId: testWsId,
    agentName: `${sourceName} Assistant`,
    systemInstructions: `You are answering questions specifically about the document: "${sourceName}".`,
    userMessage: 'သူ့ရဲ့ technical skills တွေက ဘာတွေလဲ',
    knowledgeSources: [sourceId],
  });
  console.log('✅ 3. Document Ask (Skills query):');
  console.log('   Reply snippet:', skillsResponse.reply.slice(0, 160) + '...');
  if (!skillsResponse.reply.toLowerCase().includes('react') && !skillsResponse.reply.toLowerCase().includes('typescript')) {
    throw new Error('Skills response did not contain technical skills from Portfolio.pdf!');
  }

  // Test 3: Ask specific source about projects
  const projectsResponse = await generateAiAgentResponse({
    workspaceId: testWsId,
    agentName: `${sourceName} Assistant`,
    systemInstructions: `You are answering questions specifically about the document: "${sourceName}".`,
    userMessage: 'ပါဝင်တဲ့ projects တွေအကြောင်း ပြောပြပါ',
    knowledgeSources: [sourceId],
  });
  console.log('✅ 4. Document Ask (Projects query):');
  console.log('   Reply snippet:', projectsResponse.reply.slice(0, 160) + '...');
  if (!projectsResponse.reply.includes('XiaChat') && !projectsResponse.reply.includes('E-Commerce')) {
    throw new Error('Projects response did not contain project information from Portfolio.pdf!');
  }

  // Test 4: Link document to AI Assistant (Use with AI Agent)
  const agentId = 'agent_test_' + Date.now();
  db.prepare(`
    INSERT INTO ai_assistants (
      id, workspace_id, name, description, avatar, status, tone,
      instructions, custom_instructions, response_style, auto_reply_enabled,
      human_handoff_enabled, handoff_conditions, handoff_message,
      knowledge_source_ids, channel_ids, custom_rules, conversations_handled,
      resolution_rate, created_at, updated_at
    ) VALUES (?, ?, 'Customer Support Bot', 'AI Assistant', 'bot', 'active', 'Friendly',
      'Help customers', 'Help customers', 'Balanced', 1, 1, '[]', 'Please wait', ?, '[]', '[]', 0, 95, ?, ?)
  `).run(agentId, testWsId, JSON.stringify([sourceId]), now, now);

  // Ask the agent in general conversation
  const agentResponse = await generateAiAgentResponse({
    workspaceId: testWsId,
    agentName: 'Customer Support Bot',
    systemInstructions: 'You are an AI assistant helping users.',
    userMessage: 'Who is Aung Min Khant and what projects did he build?',
    knowledgeSources: [sourceId],
  });
  console.log('✅ 5. Connected AI Agent Response:');
  console.log('   Reply snippet:', agentResponse.reply.slice(0, 160) + '...');
  console.log('   Sources used:', agentResponse.knowledgeSourcesUsed);

  if (agentResponse.knowledgeSourcesUsed.length === 0) {
    throw new Error('AI Agent did not cite the connected Portfolio.pdf!');
  }

  console.log('=== ALL DOCUMENT ASK & USE TESTS PASSED SUCCESSFULLY! ===');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
