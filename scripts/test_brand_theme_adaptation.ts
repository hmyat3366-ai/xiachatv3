import { db } from '../server/db.js';
import { getPublicWidgetConfig, updateWebsiteChannelConfig } from '../server/channelController.js';

// Color & Contrast Helper Logic to test
function parseColorToRgb(colorStr: string) {
  if (!colorStr) return null;
  colorStr = colorStr.trim();

  if (colorStr.charAt(0) === '#') {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }
  }

  const rgbMatch = colorStr.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: Math.round(parseFloat(rgbMatch[1])),
      g: Math.round(parseFloat(rgbMatch[2])),
      b: Math.round(parseFloat(rgbMatch[3])),
    };
  }

  return null;
}

function getRelativeLuminance(rgb: { r: number; g: number; b: number }) {
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastColor(rgb: { r: number; g: number; b: number }) {
  const lum = getRelativeLuminance(rgb);
  return lum > 0.45 ? '#111827' : '#FFFFFF';
}

function isForbiddenColor(rgb: { r: number; g: number; b: number }) {
  const lum = getRelativeLuminance(rgb);
  if (lum < 0.04) return true; // pure/near black
  if (lum > 0.90) return true; // pure/near white

  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;
  if (delta < 25) return true; // grayscale / low contrast

  if (rgb.r > 195 && rgb.g < 75 && rgb.b < 75) return true; // alert red

  return false;
}

function mockReqRes(body: any = {}, params: any = {}, query: any = {}, user: any = null) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    body,
    params,
    query,
    headers: {},
    user: user || db.prepare('SELECT * FROM users LIMIT 1').get(),
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    setHeader() {},
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🎨 RUNNING XIA CHAT BRAND THEME & COLOR INHERITANCE TEST SUITE');
  console.log('===============================================================\n');

  // TEST 1: Color Parsing & Normalization
  const testColors = [
    { input: '#c2691e', expectedR: 194, expectedG: 105, expectedB: 30 },
    { input: '#6366F1', expectedR: 99, expectedG: 102, expectedB: 241 },
    { input: 'rgb(37, 99, 235)', expectedR: 37, expectedG: 99, expectedB: 235 },
  ];

  testColors.forEach((t) => {
    const rgb = parseColorToRgb(t.input);
    if (!rgb || rgb.r !== t.expectedR || rgb.g !== t.expectedG || rgb.b !== t.expectedB) {
      throw new Error(`Color parsing failed for ${t.input}: got ${JSON.stringify(rgb)}`);
    }
  });
  console.log('[PASS 1] Color Parsing and RGB Normalization verified.');

  // TEST 2: Forbidden Color Rejection Filter
  const forbiddenInputs = ['#000000', '#0a0a0a', '#ffffff', '#fcfcfc', '#808080', '#9ca3af', '#ef4444', '#dc2626'];
  forbiddenInputs.forEach((hex) => {
    const rgb = parseColorToRgb(hex);
    if (!rgb || !isForbiddenColor(rgb)) {
      throw new Error(`Forbidden color ${hex} was NOT rejected by filter!`);
    }
  });

  const validBrandInputs = ['#c2691e', '#6366f1', '#2563eb', '#059669', '#d97706'];
  validBrandInputs.forEach((hex) => {
    const rgb = parseColorToRgb(hex);
    if (!rgb || isForbiddenColor(rgb)) {
      throw new Error(`Valid brand color ${hex} was incorrectly rejected by filter!`);
    }
  });
  console.log('[PASS 2] Forbidden Color Rejection Filter verified (black, white, gray, red blocked).');

  // TEST 3: WCAG Contrast Calculation
  const darkBg = parseColorToRgb('#1e130c')!;
  const darkPurple = parseColorToRgb('#4f46e5')!;
  const lightYellow = parseColorToRgb('#fef08a')!;
  const lightAmber = parseColorToRgb('#fbbf24')!;

  if (getContrastColor(darkBg) !== '#FFFFFF') {
    throw new Error('Expected white text on dark espresso background');
  }
  if (getContrastColor(darkPurple) !== '#FFFFFF') {
    throw new Error('Expected white text on dark purple background');
  }
  if (getContrastColor(lightYellow) !== '#111827') {
    throw new Error('Expected dark text on light yellow background');
  }
  if (getContrastColor(lightAmber) !== '#111827') {
    throw new Error('Expected dark text on light amber background');
  }
  console.log('[PASS 3] Accessible Contrast Text calculation verified (dark vs light backgrounds).');

  // TEST 4: Backend API Configuration & Persistence
  const user = db.prepare('SELECT * FROM users LIMIT 1').get() as any;
  const workspace = db.prepare('SELECT * FROM workspaces LIMIT 1').get() as any;

  // Update website channel with brand color and theme adaptation flags
  const updateMock = mockReqRes({
    widgetName: 'Velvet Roast Concierge',
    welcomeMessage: 'Welcome to Velvet Roast! How can we brew for you today?',
    primaryColor: '#c2691e',
    secondaryColor: '#e67e22',
    autoDetectColor: true,
    matchWebsiteTheme: true,
    theme: 'auto',
    position: 'bottom-right',
  }, {}, { workspaceId: workspace.id }, user);

  await updateWebsiteChannelConfig(updateMock.req, updateMock.res);
  const updateRes = updateMock.getData();

  if (!updateRes || !updateRes.success) {
    throw new Error('Failed to update website channel config');
  }
  console.log('[PASS 4] Website channel configuration updated with brand theme settings.');

  // TEST 5: Public Widget Config Endpoint returns Branding & Adaptation Flags
  const channel = db.prepare("SELECT * FROM channels WHERE workspace_id = ? AND type = 'website'").get(workspace.id) as any;
  const pubMock = mockReqRes({}, { siteKey: channel.id }, { industry: 'coffee_shop' });
  await getPublicWidgetConfig(pubMock.req, pubMock.res);
  const pubRes = pubMock.getData();

  if (!pubRes) throw new Error('getPublicWidgetConfig returned null');
  if (pubRes.primaryColor !== '#c2691e') {
    throw new Error(`Expected primaryColor #c2691e, got ${pubRes.primaryColor}`);
  }
  if (pubRes.secondaryColor !== '#e67e22') {
    throw new Error(`Expected secondaryColor #e67e22, got ${pubRes.secondaryColor}`);
  }
  if (pubRes.autoDetectColor !== true) {
    throw new Error(`Expected autoDetectColor to be true, got ${pubRes.autoDetectColor}`);
  }
  if (pubRes.matchWebsiteTheme !== true) {
    throw new Error(`Expected matchWebsiteTheme to be true, got ${pubRes.matchWebsiteTheme}`);
  }
  if (pubRes.theme !== 'auto') {
    throw new Error(`Expected theme 'auto', got ${pubRes.theme}`);
  }
  console.log('[PASS 5] Public widget config endpoint delivers full brand theme parameters.');

  // TEST 6: Multi-Website Branding Isolation
  // Create a second website channel (e.g. SaaS Tech Channel) in the same workspace
  const secondChannelId = 'test-channel-saas-' + Date.now();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO channels (id, workspace_id, type, name, status, provider, config, created_at, updated_at)
    VALUES (?, ?, 'website', 'SaaS Documentation Portal', 'connected', 'xia', ?, ?, ?)
  `).run(
    secondChannelId,
    workspace.id,
    JSON.stringify({
      widgetName: 'SaaS Bot',
      primaryColor: '#6366F1',
      secondaryColor: '#818CF8',
      theme: 'dark',
      autoDetectColor: false,
      matchWebsiteTheme: false,
    }),
    now,
    now
  );

  const saasMock = mockReqRes({}, { siteKey: secondChannelId }, { industry: 'saas' });
  await getPublicWidgetConfig(saasMock.req, saasMock.res);
  const saasRes = saasMock.getData();

  if (saasRes.primaryColor !== '#6366F1') {
    throw new Error(`Expected SaaS channel primaryColor #6366F1, got ${saasRes.primaryColor}`);
  }
  if (saasRes.theme !== 'dark') {
    throw new Error(`Expected SaaS channel theme 'dark', got ${saasRes.theme}`);
  }
  if (saasRes.autoDetectColor !== false) {
    throw new Error('Expected SaaS channel autoDetectColor to be false');
  }

  // Clean up temporary test channel
  db.prepare('DELETE FROM channels WHERE id = ?').run(secondChannelId);

  console.log('[PASS 6] Multi-Website Branding Isolation verified (Coffee #C2691E vs SaaS #6366F1).');

  console.log('\n===============================================================');
  console.log('✅ ALL BRAND THEME & COLOR ADAPTATION VERIFICATIONS PASSED!');
  console.log('===============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
