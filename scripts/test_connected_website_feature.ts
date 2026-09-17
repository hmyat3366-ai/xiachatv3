import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../server/db.js';
import { getChannels, updateWebsiteChannelConfig, getPublicWidgetConfig } from '../server/channelController.js';
import { provisionNewAccount } from '../server/authController.js';
import { authenticateToken } from '../server/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xia_chat_dev_jwt_secret_key_8f9a2b7c4d1e';

async function runTest() {
  console.log('--- Starting Connected Website Integration Test ---');
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors());

  // Wire test routes
  app.get('/api/channels', authenticateToken, getChannels as any);
  app.put('/api/channels/website-config', authenticateToken, updateWebsiteChannelConfig as any);
  app.get('/api/channels/public-widget/:siteKey', getPublicWidgetConfig as any);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Server listening at ${baseUrl}`);

  try {
    // 1. Provision test user directly
    const userId = crypto.randomUUID();
    const userEmail = `site_test_${Date.now()}@example.com`;
    const user = provisionNewAccount({
      userId,
      name: 'Website Test Admin',
      email: userEmail,
      username: `siteadmin_${Date.now()}`,
      passwordHash: 'hash',
      authProvider: 'local',
      googleId: null,
      emailVerified: true,
    });
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    const authHeader = { Authorization: `Bearer ${token}` };

    const ws = db.prepare('SELECT id FROM workspaces WHERE user_id = ?').get(userId) as { id: string };
    const wsId = ws.id;
    console.log('✓ Provisioned test user & workspace:', wsId);

    // 2. Fetch channels: ensure initial channel is NOT hardcoded to 'xiachat.com'
    const chanRes = await fetch(`${baseUrl}/api/channels?workspaceId=${wsId}`, {
      headers: authHeader,
    });
    const chanData = await chanRes.json();
    const websiteChan = chanData.channels.find((c: any) => c.type === 'website');
    console.log('Initial website channel externalAccountId:', websiteChan?.externalAccountId);
    if (websiteChan.externalAccountId === 'xiachat.com') {
      throw new Error('Website channel should NOT be hardcoded to xiachat.com!');
    }
    console.log('✓ Initial channel does not show fake xiachat.com');

    // 3. Update website channel with a custom website URL (e.g. https://velvetroast.com)
    const updateRes = await fetch(`${baseUrl}/api/channels/website-config?workspaceId=${wsId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        widgetName: 'Velvet Roast Live Support',
        websiteUrl: 'https://velvetroast.com',
        welcomeMessage: 'Welcome to Velvet Roast! How can we serve you today?',
      }),
    });
    if (!updateRes.ok) {
      throw new Error(`Failed to update config: ${updateRes.status}`);
    }
    console.log('✓ Successfully configured websiteUrl to https://velvetroast.com');

    // 4. Verify channels list now returns velvetroast.com
    const chanRes2 = await fetch(`${baseUrl}/api/channels?workspaceId=${wsId}`, {
      headers: authHeader,
    });
    const chanData2 = await chanRes2.json();
    const updatedWebChan = chanData2.channels.find((c: any) => c.type === 'website');
    console.log('Updated externalAccountId:', updatedWebChan?.externalAccountId);
    console.log('Updated config.websiteUrl:', updatedWebChan?.config?.websiteUrl);
    if (updatedWebChan?.externalAccountId !== 'velvetroast.com' && updatedWebChan?.config?.websiteUrl !== 'https://velvetroast.com') {
      throw new Error(`Expected velvetroast.com, got ${updatedWebChan?.externalAccountId}`);
    }
    console.log('✓ Verified connected website URL correctly saved and displayed!');

    // 5. Test auto-detection via public widget loading from external site
    const user2Id = crypto.randomUUID();
    const user2 = provisionNewAccount({
      userId: user2Id,
      name: 'Auto Detect User',
      email: `auto_${Date.now()}@example.com`,
      username: `autouser_${Date.now()}`,
      passwordHash: 'hash',
      authProvider: 'local',
      googleId: null,
      emailVerified: true,
    });
    const token2 = jwt.sign({ userId: user2.id, email: user2.email }, JWT_SECRET, { expiresIn: '1d' });
    const authHeader2 = { Authorization: `Bearer ${token2}` };

    const ws2 = db.prepare('SELECT id FROM workspaces WHERE user_id = ?').get(user2Id) as { id: string };
    const ws2Id = ws2.id;

    const ws2ChanRes = await fetch(`${baseUrl}/api/channels?workspaceId=${ws2Id}`, {
      headers: authHeader2,
    });
    const ws2ChanData = await ws2ChanRes.json();
    const targetChan = ws2ChanData.channels.find((c: any) => c.type === 'website');

    // Make public widget request with host param
    const pubRes = await fetch(`${baseUrl}/api/channels/public-widget/${targetChan.id}?host=https://my-awesome-shop.com`);
    if (!pubRes.ok) throw new Error(`Public widget fetch failed: ${pubRes.status}`);

    // Verify channel now automatically updated to my-awesome-shop.com
    const verifyAutoRes = await fetch(`${baseUrl}/api/channels?workspaceId=${ws2Id}`, {
      headers: authHeader2,
    });
    const verifyAutoData = await verifyAutoRes.json();
    const autoChan = verifyAutoData.channels.find((c: any) => c.type === 'website');
    console.log('Auto-detected externalAccountId:', autoChan?.externalAccountId);
    if (autoChan?.externalAccountId !== 'my-awesome-shop.com') {
      throw new Error(`Expected auto-detected host my-awesome-shop.com, got ${autoChan?.externalAccountId}`);
    }
    console.log('✓ Successfully verified auto-detection of host domain from widget request!');

    console.log('\n🎉 ALL CONNECTED WEBSITE INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
