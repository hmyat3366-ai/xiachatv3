import crypto from 'crypto';
import { db } from '../server/db.js';
import { syncWorkspaceToSupabase } from '../server/supabase.js';

async function seedCoffeeKnowledge() {
  console.log('Seeding Brew & Bean Coffee Shop Knowledge into database...');

  const workspaces = db.prepare('SELECT * FROM workspaces').all() as any[];
  if (workspaces.length === 0) {
    console.log('No workspaces found.');
    return;
  }

  const now = new Date().toISOString();

  for (const ws of workspaces) {
    console.log(`Checking workspace: ${ws.name} (${ws.id})`);

    const existing = db
      .prepare("SELECT * FROM knowledge_sources WHERE workspace_id = ? AND name LIKE '%Coffee%'")
      .get(ws.id) as any;

    let sourceId = existing ? existing.id : crypto.randomUUID();

    const coffeeContent = JSON.stringify([
      {
        question: 'What coffee do you recommend?',
        answer: 'We highly recommend our Signature Velvet Reserve Espresso (medium-dark roast with notes of dark chocolate, wild blackberry, and toasted hazelnut) or our Ethiopian Floral Mist pour-over blend (light roast with jasmine and citrus floral notes).',
      },
      {
        question: 'Where is my order?',
        answer: 'Orders are freshly roasted within 48 hours of purchase. To look up your live tracking status, please provide your 6-digit Order ID (e.g. #ORD-84920) or your checkout email address.',
      },
      {
        question: 'What is your return policy?',
        answer: 'We guarantee 100% freshness. If you are not satisfied with your beans within 30 days of delivery, contact our support team for an immediate replacement or full refund.',
      },
    ]);

    const coffeeChunk = `Coffee Recommendations: We highly recommend our Signature Velvet Reserve Espresso (notes of rich dark chocolate, wild blackberry, and toasted hazelnut) for espresso lovers, or our Ethiopian Floral Mist for bright, fruity pour-overs.\n\nOrder Tracking & Shipping: All coffee is roasted to order and dispatched within 48 hours. To check where your order is, please provide your 6-digit Order ID (e.g. #ORD-84920) or your email address so we can retrieve your tracking link.\n\nHuman Support Handoff: If you want to talk with a human, say "I want to talk with human" and our AI will immediately connect you with our support team.`;

    if (!existing) {
      db.prepare(`
        INSERT INTO knowledge_sources (
          id, workspace_id, name, type, status, content, original_url,
          file_metadata, chunk_count, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'FAQ', 'ready', ?, NULL, NULL, 1, 'Coffee Shop Seed', ?, ?)
      `).run(sourceId, ws.id, 'Brew & Bean Coffee Shop Knowledge & FAQs', coffeeContent, now, now);
      console.log(`  + Created knowledge source: ${sourceId}`);
    }

    // Upsert chunk
    const existingChunk = db.prepare('SELECT * FROM knowledge_chunks WHERE source_id = ?').get(sourceId) as any;
    if (!existingChunk) {
      const chunkId = crypto.randomUUID();
      const tokens = coffeeChunk.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 40);
      db.prepare(`
        INSERT INTO knowledge_chunks (id, workspace_id, source_id, text, chunk_index, embedding, metadata, created_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `).run(
        chunkId,
        ws.id,
        sourceId,
        coffeeChunk,
        JSON.stringify(tokens),
        JSON.stringify({ sourceName: 'Brew & Bean Coffee Shop Knowledge & FAQs', length: coffeeChunk.length }),
        now
      );
      console.log(`  + Created knowledge chunk for coffee knowledge`);
    }

    // Sync workspace to Supabase
    await syncWorkspaceToSupabase(ws);
  }

  console.log('✅ Coffee shop knowledge successfully seeded!');
}

seedCoffeeKnowledge()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding coffee knowledge:', err);
    process.exit(1);
  });
