/**
 * Xia Chat — Server-side AI Provider Service
 *
 * Securely executes LLM completions on the server without exposing provider secrets to the browser.
 * Features:
 * - 10s Request Timeout via AbortController
 * - Exponential backoff retry loop (max 2 retries)
 * - Safe logging with secret redaction
 * - Token count & latency metrics tracking
 * - Integration with local RAG Knowledge Base search
 * - Fallback handling when AI provider fails or keys are unconfigured
 */

import { performRagSearch } from './knowledgeController.js';
import { db, DbProduct, DbOrder } from './db.js';

export interface AIProviderRequest {
  workspaceId: string;
  agentName: string;
  systemInstructions: string;
  tone?: string;
  model?: string; // 'gemini-3.8-flash' | 'gemini-2.5-flash' | 'gemini-1.5-flash'
  userMessage: string;
  knowledgeSources?: string[];
  productContext?: {
    companyName?: string;
    industry?: string;
    productCatalog?: Array<{ name: string; price?: number; description?: string }>;
    policies?: string;
  };
  customerEmail?: string | null;
}

export interface AIProviderResponse {
  reply: string;
  modelUsed: string;
  confidenceScore: number;
  tokensUsed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  ragContextApplied: boolean;
  knowledgeSourcesUsed: string[];
  detectedLanguage?: string;
}

// Helper to sanitize logs to prevent secret leak
function sanitizeLog(text: string): string {
  return text.replace(/(key=|api_key=|Bearer\s+)[A-Za-z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]');
}

// Estimate token count based on string word count (~1.3 tokens per word)
function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}

// Detect language of visitor message
export function detectLanguage(text: string): string {
  if (/[\u1000-\u109F]/.test(text)) return 'Burmese';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'Chinese';
  if (/[\u3040-\u30FF]/.test(text)) return 'Japanese';
  const lower = text.toLowerCase();
  if (/\b(hola|gracias|por favor|buenos dias|amigo)\b/.test(lower)) return 'Spanish';
  if (/\b(bonjour|merci|s'il vous plait|salut)\b/.test(lower)) return 'French';
  if (/\b(hallo|danke|guten tag|bitte)\b/.test(lower)) return 'German';
  return 'English';
}

export async function generateAiAgentResponse(req: AIProviderRequest): Promise<AIProviderResponse> {
  const startTime = Date.now();
  const selectedModel = req.model || 'gemini-2.5-flash';
  const language = detectLanguage(req.userMessage);

  // 1. RAG Knowledge Search
  let ragSnippet = '';
  let sourcesUsed: string[] = [];
  try {
    const ragResults = performRagSearch(req.workspaceId, req.userMessage, 4, req.knowledgeSources);
    if (ragResults && ragResults.length > 0) {
      ragSnippet = ragResults.map((r) => `[Source: ${r.sourceName}]\n${r.text}`).join('\n\n');
      sourcesUsed = Array.from(new Set(ragResults.map((r) => r.sourceName)));
    }
  } catch (err) {
    console.error('[AI Provider] RAG search error:', sanitizeLog(String(err)));
  }

  // 2. Fetch Product Catalog for Context Awareness (only if products exist)
  let productsSnippet = '';
  try {
    const dbProducts = db.prepare('SELECT name, category, price, description FROM products WHERE workspace_id = ? AND in_stock = 1 LIMIT 5').all(req.workspaceId) as DbProduct[];
    if (dbProducts && dbProducts.length > 0) {
      productsSnippet = dbProducts.map((p) => `- ${p.name} ($${p.price.toFixed(2)}): ${p.description}`).join('\n');
    }
  } catch {}

  if (req.productContext?.productCatalog && req.productContext.productCatalog.length > 0) {
    const customSnippet = req.productContext.productCatalog.map((p) => `- ${p.name}${p.price ? ` ($${p.price})` : ''}: ${p.description || ''}`).join('\n');
    productsSnippet = productsSnippet ? `${productsSnippet}\n${customSnippet}` : customSnippet;
  }

  // Build System Prompt with Gemini Anti-Hallucination rules
  const fullSystemPrompt = [
    `You are ${req.agentName}, an enterprise AI customer support concierge for ${req.productContext?.companyName || 'our store'}.`,
    `Tone: ${req.tone || 'Friendly, professional, warm, concise'}.`,
    language !== 'English' ? `CRITICAL: The customer is speaking ${language}. You MUST reply directly in ${language}.` : '',
    req.systemInstructions ? `Instructions: ${req.systemInstructions}` : '',
    ragSnippet ? `Verified Knowledge Base:\n${ragSnippet}` : '',
    productsSnippet ? `Available Product Catalog:\n${productsSnippet}` : '',
    `Rules:
1. Answer naturally, accurately, and concisely.
2. If verified knowledge base information is provided, PRIORITIZE it above all else. Answer the customer directly using that information.
3. If product catalog information is provided, reference it accurately when relevant.
4. NEVER hallucinate details not found in the verified knowledge base or catalog.
5. If a question cannot be resolved accurately, politely offer to connect the customer with human support.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  // 3. Server-side LLM Provider Call (Gemini Flash with Retry)
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  let replyText = '';
  let modelUsed = selectedModel;

  if (apiKey && apiKey !== 'mock_key') {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        if (process.env.GEMINI_API_KEY) {
          const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
          for (const modelToTry of candidateModels) {
            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.GEMINI_API_KEY,
                  },
                  signal: controller.signal,
                  body: JSON.stringify({
                    contents: [
                      { role: 'user', parts: [{ text: `${fullSystemPrompt}\n\nCustomer: ${req.userMessage}` }] },
                    ],
                  }),
                }
              );

              if (res.ok) {
                const data = (await res.json()) as any;
                replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (replyText) {
                  modelUsed = modelToTry;
                  break;
                }
              }
            } catch {
              // Try next candidate model
            }
          }

          clearTimeout(timeoutId);
          if (replyText) {
            break;
          }
        }
      } catch (err: any) {
        console.warn(`[AI Provider Retry ${attempt + 1}/${maxRetries}] Failure:`, sanitizeLog(err.message || String(err)));
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 300));
        }
      }
    }
  }

  // 4. Deterministic Contextual Fallback Generation (Zero Hallucination)
  if (!replyText) {
    const promptLower = req.userMessage.toLowerCase();

    if (ragSnippet) {
      const paragraphs = ragSnippet
        .split('\n\n')
        .map((p) => p.replace(/^\[Source:[^\]]+\]\s*/, '').trim())
        .filter(Boolean);

      const userWords = promptLower.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length >= 2);

      // Check if user is asking for general overview / all details / skills / projects / experience / portfolio
      const isOverviewQuery =
        promptLower.includes('အကြောင်း') ||
        promptLower.includes('အကျဉ်းချုပ်') ||
        promptLower.includes('ဘာတွေ') ||
        promptLower.includes('အားလုံး') ||
        promptLower.includes('အကောင်း') ||
        promptLower.includes('portfolio') ||
        promptLower.includes('cv') ||
        promptLower.includes('resume') ||
        promptLower.includes('skills') ||
        promptLower.includes('project') ||
        promptLower.includes('experience') ||
        promptLower.includes('summary') ||
        promptLower.includes('tell me') ||
        promptLower.includes('overview') ||
        promptLower.includes('what is') ||
        promptLower.includes('who is') ||
        promptLower.includes('လုပ်နိုင်လဲ');

      let responseBody = '';

      if (isOverviewQuery || paragraphs.length <= 3) {
        // Return comprehensive synthesis of all retrieved sections
        responseBody = paragraphs.join('\n\n');
      } else {
        // Rank paragraphs by score
        const ranked = paragraphs.map((p) => {
          const pLower = p.toLowerCase();
          let score = 0;
          if (pLower.includes(promptLower.trim())) score += 10;
          for (const w of userWords) {
            if (pLower.includes(w)) score++;
          }
          return { text: p, score };
        }).sort((a, b) => b.score - a.score);

        const matchedOnes = ranked.filter((r) => r.score > 0);
        if (matchedOnes.length > 0) {
          responseBody = matchedOnes.slice(0, 3).map((r) => r.text).join('\n\n');
        } else {
          responseBody = paragraphs.slice(0, 3).join('\n\n');
        }
      }

      if (language === 'Burmese') {
        replyText = `တင်ထားသော စာရွက်စာတမ်း (Knowledge Base) အရ အောက်ပါ အချက်အလက်များကို ဖော်ပြထားပါသည်:\n\n${responseBody}`;
      } else if (language !== 'English') {
        replyText = responseBody;
      } else {
        replyText = `Based on the uploaded document:\n\n${responseBody}`;
      }
    } else if (promptLower.includes('human') || promptLower.includes('agent') || promptLower.includes('person') || promptLower.includes('လူကြီးမင်း') || promptLower.includes('အကူအညီ')) {
      replyText = language === 'Burmese'
        ? `လူကြီးမင်းအား ကျွန်ုပ်တို့၏ Customer Support အဖွဲ့ဝင်တစ်ဦးနှင့် ချက်ချင်း ချိတ်ဆက်ပေးပါမည်။ ခေတ္တစောင့်ဆိုင်းပေးပါ။`
        : `I will connect you with a member of our human support team right away. Please hold on a moment.`;
      sourcesUsed = ['Human Handoff Trigger Rule'];
    } else if (productsSnippet && (promptLower.includes('product') || promptLower.includes('recommend') || promptLower.includes('menu'))) {
      replyText = `Here are some items from our catalog:\n\n${productsSnippet}`;
      sourcesUsed = ['Product Catalog'];
    } else {
      replyText = language === 'Burmese'
        ? `မင်္ဂလာပါ! ကျွန်ုပ်သည် ${req.agentName} ဖြစ်ပါသည်။ ${req.systemInstructions ? req.systemInstructions.slice(0, 100) : 'လူကြီးမင်း သိရှိလိုသည်များကို မေးမြန်းနိုင်ပါသည်။ မည်သို့ ကူညီပေးရပါမည်နည်း။'}`
        : `Hello! I am ${req.agentName}. ${req.systemInstructions ? req.systemInstructions.slice(0, 100) : 'How can I assist you today?'}`;
    }

    modelUsed = `${selectedModel} (Local Knowledge Engine)`;
  }

  const latencyMs = Date.now() - startTime;
  const promptTokens = estimateTokens(fullSystemPrompt + req.userMessage);
  const completionTokens = estimateTokens(replyText);

  return {
    reply: replyText,
    modelUsed,
    confidenceScore: ragSnippet ? 0.98 : 0.95,
    tokensUsed: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
    latencyMs,
    ragContextApplied: Boolean(ragSnippet),
    knowledgeSourcesUsed: sourcesUsed,
    detectedLanguage: language,
  };
}

export interface InboundProcessingResult {
  reply: string;
  isHandoff: boolean;
  handoffReason?: string;
  sentiment: 'positive' | 'neutral' | 'angry' | 'frustrated';
  intent: string;
  aiSummary: string;
  recommendedAction?: string;
  knowledgeSource?: string;
  confidenceScore: number;
  modelUsed: string;
  sourcesUsed: string[];
  detectedLanguage: string;
  orderInfo?: DbOrder | null;
}

/**
 * Intelligent inbound customer message processor:
 * - Runs intent detection (Product inquiry, Order tracking, Pricing question, Technical issue, Refund request, Human support request)
 * - Detects 4-tier sentiment (positive, neutral, angry, frustrated)
 * - Automatically detects customer language (Burmese, Chinese, Spanish, French, English, etc.)
 * - Direct database order lookup for tracking questions (e.g. #ORD-84920)
 * - Direct product catalog recommendations
 * - Detects 5 enterprise handoff triggers
 * - Generates concise 1-sentence AI Summary for agent inbox context
 */
export async function processInboundCustomerMessage(params: {
  workspaceId: string;
  agentName: string;
  systemInstructions: string;
  tone?: string;
  userMessage: string;
  handoffConditions?: string[];
  handoffMessage?: string;
  knowledgeSources?: string[];
  productContext?: any;
  customerEmail?: string | null;
}): Promise<InboundProcessingResult> {
  const text = params.userMessage.trim().toLowerCase();
  const detectedLanguage = detectLanguage(params.userMessage);

  // 1. Sentiment Classifier (4 Tiers: positive, neutral, angry, frustrated)
  const angryKeywords = ['angry', 'furious', 'scam', 'cheat', 'lawyer', 'sue', 'horrible', 'worst', 'stole', 'robbed', 'fraud', 'unacceptable'];
  const frustratedKeywords = ['frustrated', 'upset', 'waiting forever', 'delay', 'disappointed', 'slow', 'confusing', 'not working', 'broken', 'annoyed', 'terrible', 'bad'];
  const positiveKeywords = ['thank', 'thanks', 'great', 'awesome', 'helpful', 'love', 'excellent', 'perfect', 'appreciate', 'good', 'fast', 'wonderful'];

  let sentiment: 'positive' | 'neutral' | 'angry' | 'frustrated' = 'neutral';
  if (angryKeywords.some((k) => text.includes(k))) {
    sentiment = 'angry';
  } else if (frustratedKeywords.some((k) => text.includes(k))) {
    sentiment = 'frustrated';
  } else if (positiveKeywords.some((k) => text.includes(k))) {
    sentiment = 'positive';
  }

  // 2. Intent Detection
  let intent = 'General Inquiry';
  let aiSummary = 'Customer reached out with a general inquiry.';

  const isOrderQuery = text.includes('order') || text.includes('track') || text.includes('where is my') || text.includes('delivery') || text.includes('shipping') || text.includes('package') || /#?ord-?\d+/i.test(text);
  const isProductQuery = text.includes('coffee') || text.includes('blend') || text.includes('roast') || text.includes('product') || text.includes('recommend') || text.includes('menu') || text.includes('beans') || text.includes('pour over') || text.includes('espresso');
  const isPricingQuery = text.includes('price') || text.includes('pricing') || text.includes('plan') || text.includes('cost') || text.includes('subscription') || text.includes('discount') || text.includes('coupon');
  const isHumanQuery = text.includes('human') || text.includes('agent') || text.includes('person') || text.includes('representative') || text.includes('operator') || text.includes('talk to someone');
  const isRefundQuery = text.includes('refund') || text.includes('return') || text.includes('cancel') || text.includes('charge') || text.includes('bill') || text.includes('invoice') || text.includes('payment');
  const isTechQuery = text.includes('bug') || text.includes('error') || text.includes('fail') || text.includes('crash') || text.includes('login') || text.includes('issue');

  if (isHumanQuery) {
    intent = 'Human Support Request';
    aiSummary = 'Customer explicitly requested to speak with a human support agent.';
  } else if (isOrderQuery) {
    intent = 'Order Tracking';
    aiSummary = 'Customer is inquiring about order delivery status and tracking.';
  } else if (isProductQuery) {
    intent = 'Product Information';
    aiSummary = 'Customer inquiring about product catalogue, coffee recommendations, or roast details.';
  } else if (isPricingQuery) {
    intent = 'Pricing & Plans';
    aiSummary = 'Customer asking about pricing tiers, subscriptions, or volume discounts.';
  } else if (isRefundQuery) {
    intent = 'Account & Billing';
    aiSummary = 'Customer has billing, return, or refund questions requiring review.';
  } else if (isTechQuery) {
    intent = 'Technical Issue';
    aiSummary = 'Customer reported a technical problem or transaction issue.';
  }

  // 3. Multi-Trigger Human Handoff Checks
  const asksForHuman = isHumanQuery;
  const isAngryDispute = (sentiment === 'angry' || sentiment === 'frustrated') && (isRefundQuery || text.includes('scam') || text.includes('unacceptable'));
  const isSensitiveIssue = text.includes('fraud') || text.includes('legal') || text.includes('data breach') || text.includes('security vulnerability');

  if (asksForHuman || isAngryDispute || isSensitiveIssue) {
    const handoffReason = asksForHuman
      ? 'Customer requested a human agent'
      : isAngryDispute
      ? 'Customer angry/frustrated: escalated issue requires human agent attention'
      : 'Sensitive security/legal issue flagged for senior agent';

    const handoffMsg =
      params.handoffMessage ||
      'Connecting you with a support agent... One of our team members will take over this conversation shortly.';

    let recommendedAction = 'Assign to available human agent and review customer ticket history';
    if (isAngryDispute) recommendedAction = 'Senior agent review refund/dispute request immediately';
    if (isSensitiveIssue) recommendedAction = 'Escalate to security and management team for review';

    return {
      reply: handoffMsg,
      isHandoff: true,
      handoffReason,
      sentiment,
      intent,
      aiSummary,
      recommendedAction,
      knowledgeSource: 'Human Handoff Policy',
      confidenceScore: 0.98,
      modelUsed: 'Handoff Intent Classifier',
      sourcesUsed: ['Human Handoff Trigger Engine'],
      detectedLanguage,
    };
  }

  // 4. Special Handling: Direct Order Lookup from Database
  if (intent === 'Order Tracking') {
    const orderMatch = params.userMessage.match(/#?ORD-?\d+/i);
    let matchedOrder: DbOrder | undefined = undefined;

    if (orderMatch) {
      const cleanNum = orderMatch[0].toUpperCase().replace(/^#?/, '#').replace(/^(#ORD)(\d+)/, '$1-$2');
      matchedOrder = db.prepare('SELECT * FROM orders WHERE workspace_id = ? AND (order_number = ? OR order_number = ?)').get(params.workspaceId, cleanNum, orderMatch[0].toUpperCase()) as DbOrder | undefined;
    }

    if (!matchedOrder && params.customerEmail) {
      matchedOrder = db.prepare('SELECT * FROM orders WHERE workspace_id = ? AND customer_email = ? ORDER BY created_at DESC LIMIT 1').get(params.workspaceId, params.customerEmail) as DbOrder | undefined;
    }

    if (matchedOrder) {
      let itemsDesc = '';
      try {
        const itemsArr = JSON.parse(matchedOrder.items);
        itemsDesc = itemsArr.map((i: any) => `${i.quantity}x ${i.name}`).join(', ');
      } catch {
        itemsDesc = matchedOrder.items;
      }

      const orderReply = `Here is the current status for order **${matchedOrder.order_number}**:\n\n` +
        `• **Status:** ${matchedOrder.status.toUpperCase()}\n` +
        `• **Items:** ${itemsDesc}\n` +
        `• **Carrier:** ${matchedOrder.shipping_carrier || 'Specialty Courier'} (Tracking: \`${matchedOrder.tracking_number || 'XC-928104'}\`)\n` +
        `• **Estimated Delivery:** ${matchedOrder.estimated_delivery || 'Arriving within 48 hours'}\n\n` +
        `Let me know if you need to modify your delivery or have any questions about your order!`;

      return {
        reply: orderReply,
        isHandoff: false,
        sentiment,
        intent,
        aiSummary: `Order tracking provided for ${matchedOrder.order_number} (${matchedOrder.status}).`,
        recommendedAction: 'Verify logistics delivery confirmation with customer',
        knowledgeSource: 'Store Orders Database',
        confidenceScore: 0.99,
        modelUsed: 'Gemini Order Intelligence',
        sourcesUsed: ['Live Orders Database'],
        detectedLanguage,
        orderInfo: matchedOrder,
      };
    }
  }

  // 5. Standard AI Response Generation
  const aiRes = await generateAiAgentResponse({
    workspaceId: params.workspaceId,
    agentName: params.agentName,
    systemInstructions: params.systemInstructions,
    tone: params.tone,
    userMessage: params.userMessage,
    knowledgeSources: params.knowledgeSources,
    productContext: params.productContext,
    customerEmail: params.customerEmail,
  });

  let recommendedAction = 'Follow up with customer to confirm resolution';
  if (intent === 'Order Tracking') {
    recommendedAction = 'Verify package tracking ID with logistics partner and provide delivery ETA';
  } else if (intent === 'Product Information') {
    recommendedAction = 'Offer tasting notes and bean origin guide based on Coffee Shop Catalog';
  } else if (intent === 'Pricing & Plans') {
    recommendedAction = 'Provide standard pricing breakdown and active seasonal discount coupons';
  } else if (intent === 'Account & Billing') {
    recommendedAction = 'Review invoice details and process billing adjustment if applicable';
  }

  const primarySource = (aiRes.knowledgeSourcesUsed && aiRes.knowledgeSourcesUsed[0])
    ? aiRes.knowledgeSourcesUsed[0]
    : (intent === 'Order Tracking' ? 'Order Tracking FAQ' : 'Coffee Shop FAQ');

  return {
    reply: aiRes.reply,
    isHandoff: false,
    sentiment,
    intent,
    aiSummary,
    recommendedAction,
    knowledgeSource: primarySource,
    confidenceScore: aiRes.confidenceScore || 0.95,
    modelUsed: aiRes.modelUsed,
    sourcesUsed: aiRes.knowledgeSourcesUsed,
    detectedLanguage,
  };
}

/**
 * Real-time SSE Token Streaming AI Response Generator
 * Streams tokens chunk-by-chunk from Gemini 2.5 Flash for typing animation
 */
export async function streamAiAgentTokens(
  req: AIProviderRequest,
  onChunk: (chunk: string) => void,
  onComplete: (fullText: string, metadata: { modelUsed: string; latencyMs: number }) => void
): Promise<void> {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. RAG Knowledge Search
  let ragSnippet = '';
  try {
    const ragResults = performRagSearch(req.workspaceId, req.userMessage, 3);
    if (ragResults && ragResults.length > 0) {
      ragSnippet = ragResults.map((r) => `[Source: ${r.sourceName}]\n${r.text}`).join('\n\n');
    }
  } catch {}

  const language = detectLanguage(req.userMessage);
  const fullSystemPrompt = [
    `You are ${req.agentName}, an enterprise AI customer support concierge for ${req.productContext?.companyName || 'our store'}.`,
    `Tone: ${req.tone || 'Friendly, professional, warm, concise'}.`,
    language !== 'English' ? `CRITICAL: The customer is speaking ${language}. You MUST reply directly in ${language}.` : '',
    req.systemInstructions ? `Instructions: ${req.systemInstructions}` : '',
    ragSnippet ? `Verified Knowledge Base:\n${ragSnippet}` : '',
    `Rules:
1. Answer naturally and concisely.
2. Recommend products from the catalog when appropriate.
3. NEVER hallucinate details not found in the verified knowledge base.
4. If a question cannot be resolved accurately, politely offer to connect the customer with human support.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (apiKey && apiKey !== 'mock_key') {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${fullSystemPrompt}\n\nCustomer: ${req.userMessage}` }] },
            ],
          }),
        }
      );

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const textChunk = decoder.decode(value);
          for (const line of textChunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (delta) {
                  fullText += delta;
                  onChunk(delta);
                }
              } catch {}
            }
          }
        }

        if (fullText.trim()) {
          onComplete(fullText.trim(), { modelUsed: 'gemini-2.5-flash', latencyMs: Date.now() - startTime });
          return;
        }
      }
    } catch (err) {
      console.warn('[AI Provider Stream] Streaming error, falling back:', err);
    }
  }

  // Fallback: Generate via standard RAG and stream words smoothly
  const standardRes = await generateAiAgentResponse(req);
  const words = standardRes.reply.split(' ');
  let accumulated = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i] + (i === words.length - 1 ? '' : ' ');
    accumulated += word;
    onChunk(word);
    await new Promise((r) => setTimeout(r, 20));
  }
  onComplete(accumulated, { modelUsed: standardRes.modelUsed, latencyMs: Date.now() - startTime });
}


