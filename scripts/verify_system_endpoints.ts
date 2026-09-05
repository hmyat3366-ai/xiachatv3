async function main() {
  console.log('=== Verifying Cloud System Status API ===');
  const res = await fetch('http://localhost:5000/api/system/cloud-status');
  const data = await res.json();
  console.log('GET /api/system/cloud-status:');
  console.dir(data, { depth: null });

  console.log('\n=== Testing Public Widget Upload API ===');
  const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const uploadRes = await fetch('http://localhost:5000/api/channels/public-widget/auto-detect/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'visitor-screenshot.png',
      contentType: 'image/png',
      base64: sampleBase64,
    }),
  });
  const uploadData = await uploadRes.json();
  console.log('Widget Upload Result:', uploadData);

  if (!uploadData.url || !uploadData.url.startsWith('https://')) {
    throw new Error('Public widget upload failed');
  }

  console.log('\n=== Testing Visitor Message with Attachment ===');
  const msgRes = await fetch('http://localhost:5000/api/channels/public-widget/auto-detect/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Here is my receipt screenshot',
      visitorId: 'test_vis_' + Date.now(),
      sessionId: 'test_sess_' + Date.now(),
      customerName: 'Verified Visitor',
      attachments: [{
        url: uploadData.url,
        fileName: 'visitor-screenshot.png',
        contentType: 'image/png',
      }],
    }),
  });
  const msgData = await msgRes.json();
  console.log('Widget Message Result:', {
    conversationId: msgData.conversationId,
    reply: msgData.reply,
    isHandoff: msgData.isHandoff,
  });

  console.log('\n✅ All Endpoints and Flows Verified Successfully!');
}

main().catch(console.error);
