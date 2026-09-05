import { ensureStorageBucket, uploadChatAttachment, supabaseService, CHAT_ATTACHMENTS_BUCKET } from '../server/supabase.js';

async function main() {
  console.log('=== Step 2: Supabase Storage Bucket & Upload Test ===');
  
  // 1. Test ensure bucket
  const bucketOk = await ensureStorageBucket();
  console.log('Storage bucket ensure result:', bucketOk);

  // 2. Test upload sample screenshot/attachment buffer (1x1 PNG pixel or text)
  const samplePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  
  console.log('Uploading sample chat attachment...');
  const res = await uploadChatAttachment(samplePng, 'test-screenshot.png', 'image/png', 'ws-test-123');
  console.log('Upload Result:', res);

  if (!res.url || !res.url.startsWith('http')) {
    throw new Error('Upload failed to return valid public CDN URL');
  }

  // 3. Test HTTP fetch to verify public accessibility
  const resp = await fetch(res.url);
  console.log('Public CDN HTTP Status:', resp.status);
  console.log('Content-Type:', resp.headers.get('content-type'));

  if (resp.status === 200) {
    console.log('✅ Supabase Storage Chat Attachment Upload Verified 100%!');
  } else {
    throw new Error(`Expected HTTP 200 from CDN, got ${resp.status}`);
  }
}

main().catch((err) => {
  console.error('Storage test failed:', err);
  process.exit(1);
});
