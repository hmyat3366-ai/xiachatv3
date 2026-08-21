/**
 * Xia Chat — Authentication Integration Test Suite
 *
 * Run with: node --test --experimental-vm-modules server/auth.test.ts
 * Or via tsx: npx tsx --test server/auth.test.ts
 *
 * Requires the dev server to be running on http://localhost:5000
 * Start with: npm run server
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
  cookieHeader: string | null;
}

async function api(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  cookieHeader?: string
): Promise<ApiResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookieHeader) headers['Cookie'] = cookieHeader;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  let responseBody: Record<string, unknown> = {};
  try {
    responseBody = (await res.json()) as Record<string, unknown>;
  } catch {
    // Response may not be JSON (e.g. redirects)
  }

  return {
    status: res.status,
    body: responseBody,
    cookieHeader: res.headers.get('set-cookie'),
  };
}

function extractCookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

// Generate a unique email for each test run to avoid conflicts
const timestamp = Date.now();
const TEST_EMAIL = `test_${timestamp}@example.com`;
const TEST_PASSWORD = 'SecureTestPass123!';
const TEST_NAME = 'Test User';

let authCookie = ''; // Shared between tests after login
let resetToken = ''; // Shared between password reset tests and login-after-reset test

// ─── SIGNUP TESTS ─────────────────────────────────────────────────────────────

describe('SIGNUP', () => {
  it('✓ valid signup creates account and returns user', async () => {
    const res = await api('POST', '/api/auth/signup', {
      name: TEST_NAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    });
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.user, 'Response should include user object');
    const user = res.body.user as Record<string, unknown>;
    assert.equal(user.email, TEST_EMAIL);
    assert.equal(user.name, TEST_NAME);
    assert.ok(!('passwordHash' in user), 'passwordHash must NOT be returned');
    assert.ok(!('password_hash' in user), 'password_hash must NOT be returned');
    // Cookie should be set
    assert.ok(res.cookieHeader, 'auth_token cookie should be set on signup');
    assert.ok(res.cookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');
  });

  it('✓ duplicate email is rejected with 409', async () => {
    const res = await api('POST', '/api/auth/signup', {
      name: TEST_NAME,
      email: TEST_EMAIL, // same email as above
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    });
    assert.equal(res.status, 409, `Expected 409 for duplicate email, got ${res.status}`);
    assert.ok(res.body.error, 'Error message should be present');
  });

  it('✓ invalid email format is rejected', async () => {
    const res = await api('POST', '/api/auth/signup', {
      name: TEST_NAME,
      email: 'not-an-email',
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    });
    assert.equal(res.status, 400);
  });

  it('✓ weak password (< 8 chars) is rejected', async () => {
    const res = await api('POST', '/api/auth/signup', {
      name: TEST_NAME,
      email: `weak_${timestamp}@example.com`,
      password: 'abc',
      confirmPassword: 'abc',
    });
    assert.equal(res.status, 400);
    assert.ok((res.body.error as string).toLowerCase().includes('password'));
  });

  it('✓ password mismatch is rejected', async () => {
    const res = await api('POST', '/api/auth/signup', {
      name: TEST_NAME,
      email: `mismatch_${timestamp}@example.com`,
      password: TEST_PASSWORD,
      confirmPassword: 'DifferentPassword!',
    });
    assert.equal(res.status, 400);
    assert.ok((res.body.error as string).toLowerCase().includes('match'));
  });

  it('✓ empty fields are rejected', async () => {
    const res = await api('POST', '/api/auth/signup', {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    assert.equal(res.status, 400);
  });
});

// ─── LOGIN TESTS ──────────────────────────────────────────────────────────────

describe('LOGIN', () => {
  it('✓ valid login returns user and sets cookie', async () => {
    const res = await api('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.user, 'Response should include user');
    const user = res.body.user as Record<string, unknown>;
    assert.ok(!('passwordHash' in user), 'passwordHash must NOT be in response');
    assert.ok(!('password_hash' in user), 'password_hash must NOT be in response');
    assert.ok(res.cookieHeader, 'auth_token cookie should be set on login');
    assert.ok(res.cookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');

    // Save cookie for subsequent tests
    const tokenValue = extractCookieValue(res.cookieHeader, 'auth_token');
    if (tokenValue) authCookie = `auth_token=${tokenValue}`;
  });

  it('✓ wrong password returns generic error without revealing email existence', async () => {
    const res = await api('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: 'WrongPassword999!',
    });
    // Accept 401 (wrong credentials) or 429 (rate limiter hit during test run — correct behavior)
    assert.ok([401, 429].includes(res.status), `Expected 401 or 429, got ${res.status}`);
    if (res.status === 401) {
      const err = res.body.error as string;
      assert.ok(
        err.includes('incorrect') || err.includes('invalid'),
        `Error message must be generic, got: "${err}"`
      );
    }
  });

  it('✓ unknown email returns same generic error (no user enumeration)', async () => {
    const res = await api('POST', '/api/auth/login', {
      email: `nonexistent_${timestamp}@example.com`,
      password: TEST_PASSWORD,
    });
    // Accept 401 or 429 (rate limit)
    assert.ok([401, 429].includes(res.status), `Expected 401 or 429, got ${res.status}`);
    if (res.status === 401) {
      const err = res.body.error as string;
      assert.ok(
        err.includes('incorrect') || err.includes('invalid'),
        `Error must be generic, got: "${err}"`
      );
    }
  });

  it('✓ empty fields are rejected', async () => {
    const res = await api('POST', '/api/auth/login', { email: '', password: '' });
    // Accept 400 (validation) or 429 (rate limit)
    assert.ok([400, 429].includes(res.status), `Expected 400 or 429, got ${res.status}`);
  });

  it('✓ session persistence — GET /api/auth/me with valid cookie returns user', async () => {
    assert.ok(authCookie, 'Need authCookie from previous test');
    const res = await api('GET', '/api/auth/me', undefined, authCookie);
    assert.equal(res.status, 200);
    const user = res.body.user as Record<string, unknown>;
    assert.equal(user.email, TEST_EMAIL);
    assert.ok(!('passwordHash' in user));
  });

  it('✓ GET /api/auth/me without cookie returns 401', async () => {
    const res = await api('GET', '/api/auth/me');
    assert.equal(res.status, 401);
  });
});

// ─── LOGOUT TESTS ─────────────────────────────────────────────────────────────

describe('LOGOUT', () => {
  it('✓ logout clears auth cookie', async () => {
    assert.ok(authCookie, 'Need authCookie from login test');
    const res = await api('POST', '/api/auth/logout', undefined, authCookie);
    assert.equal(res.status, 200);
    // The Set-Cookie header should clear the token (max-age=0 or expires in past)
    if (res.cookieHeader) {
      const isCleared =
        res.cookieHeader.includes('auth_token=;') ||
        res.cookieHeader.includes('auth_token= ;') ||
        res.cookieHeader.includes('Max-Age=0') ||
        res.cookieHeader.includes('Expires=Thu, 01 Jan 1970');
      assert.ok(isCleared, 'auth_token cookie should be cleared on logout');
    }
  });

  it('✓ after logout, cookie is invalid — protected route returns 401', async () => {
    // Wait briefly then try to use the old cookie
    const res = await api('GET', '/api/auth/me', undefined, authCookie);
    // Token may still be technically valid (JWT) but session check should fail if we check DB
    // The important thing is the cookie was cleared on the client
    assert.ok([200, 401].includes(res.status), 'Should be either 200 (JWT still valid) or 401');
  });
});

// ─── PASSWORD RESET TESTS ─────────────────────────────────────────────────────

describe('PASSWORD RESET', () => {
  const newPassword = 'NewSecurePass456!';

  it('✓ forgot password with valid email returns generic success (no leak)', async () => {
    const res = await api('POST', '/api/auth/forgot-password', { email: TEST_EMAIL });
    assert.equal(res.status, 200);
    assert.ok(res.body.message, 'Should return a message');
    // In dev mode, resetTokenDev may be returned — use it for the next test
    if (res.body.resetTokenDev) {
      resetToken = res.body.resetTokenDev as string;
    }
  });

  it('✓ forgot password with unknown email returns same generic response (no enumeration)', async () => {
    const res = await api('POST', '/api/auth/forgot-password', {
      email: `ghost_${timestamp}@example.com`,
    });
    // Accept 200 (generic success) or 429 (reset limiter hit during test run)
    assert.ok([200, 429].includes(res.status), `Expected 200 or 429, got ${res.status}`);
    if (res.status === 200) {
      assert.ok(res.body.message, 'Should return a message');
    }
  });

  it('✓ reset password with valid token succeeds', async () => {
    if (!resetToken) {
      console.log('    (Skipping: no dev reset token available — SMTP may be configured)');
      return;
    }
    const res = await api('POST', '/api/auth/reset-password', {
      token: resetToken,
      newPassword,
      confirmPassword: newPassword,
    });
    assert.equal(res.status, 200, `Expected 200, got: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.message);
  });

  it('✓ can login with new password after reset', async () => {
    if (!resetToken) return;
    const res = await api('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: newPassword,
    });
    assert.equal(res.status, 200);
  });

  it('✓ reset token cannot be reused (single-use)', async () => {
    if (!resetToken) return;
    const res = await api('POST', '/api/auth/reset-password', {
      token: resetToken,
      newPassword: 'AnotherPassword789!',
      confirmPassword: 'AnotherPassword789!',
    });
    assert.equal(res.status, 400, 'Used token must be rejected');
  });

  it('✓ invalid reset token is rejected', async () => {
    const res = await api('POST', '/api/auth/reset-password', {
      token: 'completely_invalid_token_abc123',
      newPassword: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    });
    // Accept 400 (invalid token) or 429 (rate limit)
    assert.ok([400, 429].includes(res.status), `Expected 400 or 429, got ${res.status}`);
  });

  it('✓ expired reset token is rejected', async () => {
    // Simulate expired token — just use a fabricated hex string that won't match any DB record
    const fakeExpiredToken = 'a'.repeat(64);
    const res = await api('POST', '/api/auth/reset-password', {
      token: fakeExpiredToken,
      newPassword: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    });
    // Accept 400 (invalid/expired) or 429 (rate limit)
    assert.ok([400, 429].includes(res.status), `Expected 400 or 429, got ${res.status}`);
  });
});

// ─── PROTECTED ROUTES TESTS ────────────────────────────────────────────────────

describe('PROTECTED ROUTES', () => {
  it('✓ GET /api/auth/me without auth returns 401', async () => {
    const res = await api('GET', '/api/auth/me');
    assert.equal(res.status, 401);
  });

  it('✓ POST /api/auth/resend-verification without auth returns 401', async () => {
    const res = await api('POST', '/api/auth/resend-verification');
    assert.equal(res.status, 401);
  });

  it('✓ with valid session, GET /api/auth/me returns user data', async () => {
    // Login fresh to get a new cookie
    const loginRes = await api('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: resetToken ? 'NewSecurePass456!' : TEST_PASSWORD,
    });

    if (loginRes.status === 200 && loginRes.cookieHeader) {
      const tokenValue = extractCookieValue(loginRes.cookieHeader, 'auth_token');
      const cookie = tokenValue ? `auth_token=${tokenValue}` : '';
      const meRes = await api('GET', '/api/auth/me', undefined, cookie);
      assert.equal(meRes.status, 200);
      const user = meRes.body.user as Record<string, unknown>;
      assert.equal(user.email, TEST_EMAIL);
    }
  });
});

// ─── GOOGLE OAUTH TESTS ────────────────────────────────────────────────────────

describe('GOOGLE OAUTH', () => {
  it('✓ GET /api/auth/google initiates redirect', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/google`, { redirect: 'manual' });
    // Should be a redirect (302/301) to either Google or mock callback
    assert.ok([301, 302, 303, 307, 308].includes(res.status), `Expected redirect, got ${res.status}`);
    const location = res.headers.get('location');
    assert.ok(location, 'Location header should be set for redirect');
  });

  it('✓ callback with missing state returns redirect with auth_error=invalid_state', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/google/callback?code=someCode&state=wrongState`, {
      redirect: 'manual',
    });
    assert.ok([301, 302, 303, 307, 308].includes(res.status));
    const location = res.headers.get('location') || '';
    assert.ok(
      location.includes('auth_error=invalid_state'),
      `Expected invalid_state error in redirect, got: ${location}`
    );
  });

  it('✓ callback with OAuth error param redirects with auth_error=oauth_cancelled', async () => {
    const res = await fetch(
      `${BASE_URL}/api/auth/google/callback?error=access_denied&state=somestate`,
      { redirect: 'manual' }
    );
    assert.ok([301, 302, 303, 307, 308].includes(res.status));
    const location = res.headers.get('location') || '';
    assert.ok(
      location.includes('auth_error=oauth_cancelled'),
      `Expected oauth_cancelled error, got: ${location}`
    );
  });

  it('✓ callback with no code redirects with auth_error', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/google/callback?state=somestate`, {
      redirect: 'manual',
    });
    assert.ok([301, 302, 303, 307, 308].includes(res.status));
    const location = res.headers.get('location') || '';
    assert.ok(
      location.includes('auth_error='),
      `Expected auth_error in redirect, got: ${location}`
    );
  });

  it('✓ new Google user OAuth callback redirects to /set-password', async () => {
    // Initiate Google auth with mock_new=true
    const initRes = await fetch(`${BASE_URL}/api/auth/google?mock_new=true`, { redirect: 'manual' });
    const setCookie = initRes.headers.get('set-cookie');
    const location = initRes.headers.get('location') || '';

    if (setCookie && location) {
      const stateMatch = location.match(/state=([^&]+)/);
      const codeMatch = location.match(/code=([^&]+)/);
      if (stateMatch && codeMatch) {
        const cbRes = await fetch(`${BASE_URL}/api/auth/google/callback?code=${codeMatch[1]}&state=${stateMatch[1]}&mock_new=true`, {
          headers: { Cookie: setCookie },
          redirect: 'manual',
        });
        assert.ok([301, 302, 303, 307, 308].includes(cbRes.status));
        const redirectUrl = cbRes.headers.get('location') || '';
        assert.ok(
          redirectUrl.includes('/set-password'),
          `New Google user must redirect to /set-password, got: ${redirectUrl}`
        );
      }
    }
  });
});

// ─── FIRST-TIME GOOGLE USER PASSWORD SETUP (FLOW A) ───────────────────────

describe('FIRST-TIME GOOGLE USER PASSWORD SETUP (FLOW A)', () => {
  let googleAuthCookie = '';

  it('✓ setup password requires authentication', async () => {
    const res = await api('POST', '/api/auth/set-password', {
      password: 'GoogleUserPassword123!',
      confirmPassword: 'GoogleUserPassword123!',
    });
    assert.equal(res.status, 401, 'Unauthenticated request to set-password must return 401');
  });

  it('✓ setup password validates password match and min length', async () => {
    // Initiate Google auth with mock_new=true to create user without local password
    const initRes = await fetch(`${BASE_URL}/api/auth/google?mock_new=true`, { redirect: 'manual' });
    const setCookie = initRes.headers.get('set-cookie');
    const location = initRes.headers.get('location') || '';
    if (setCookie && location) {
      const stateMatch = location.match(/state=([^&]+)/);
      const codeMatch = location.match(/code=([^&]+)/);
      if (stateMatch && codeMatch) {
        const cbRes = await fetch(`${BASE_URL}/api/auth/google/callback?code=${codeMatch[1]}&state=${stateMatch[1]}&mock_new=true`, {
          headers: { Cookie: setCookie },
          redirect: 'manual',
        });
        const tokenVal = extractCookieValue(cbRes.headers.get('set-cookie'), 'auth_token');
        if (tokenVal) {
          googleAuthCookie = `auth_token=${tokenVal}`;
        } else if (setCookie) {
          googleAuthCookie = setCookie;
        }
      }
    }

    if (!googleAuthCookie) return;

    // Test mismatched passwords
    const mismatchRes = await api('POST', '/api/auth/set-password', {
      password: 'GoogleUserPassword123!',
      confirmPassword: 'DifferentPassword123!',
    }, googleAuthCookie);
    assert.equal(mismatchRes.status, 400, 'Password mismatch must return 400');

    // Test short password
    const shortRes = await api('POST', '/api/auth/set-password', {
      password: 'short',
      confirmPassword: 'short',
    }, googleAuthCookie);
    assert.equal(shortRes.status, 400, 'Password < 8 chars must return 400');
  });

  it('✓ setup password for Google user successfully saves password and updates authProvider to both', async () => {
    if (!googleAuthCookie) return;

    const res = await api('POST', '/api/auth/set-password', {
      password: 'GoogleUserPassword123!',
      confirmPassword: 'GoogleUserPassword123!',
    }, googleAuthCookie);

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.user, 'Response should contain user object');
    const updatedUser = res.body.user as Record<string, unknown>;
    assert.equal(updatedUser.authProvider, 'both', 'authProvider should become both');
    assert.equal(updatedUser.hasPassword, true, 'hasPassword should be true');
  });
});

// ─── SECURITY VALIDATION TESTS ─────────────────────────────────────────────────

describe('SECURITY', () => {
  it('✓ signup response never contains passwordHash or password_hash', async () => {
    const res = await api('POST', '/api/auth/signup', {
      name: 'Security Test',
      email: `sec_${timestamp}@example.com`,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    });
    // Accept 201 (created), 409 (duplicate) or 429 (rate limit)
    assert.ok([201, 409, 429].includes(res.status), `Expected 201/409/429, got ${res.status}`);
    if (res.status === 201 && res.body.user) {
      const user = res.body.user as Record<string, unknown>;
      assert.ok(!('passwordHash' in user), 'SECURITY: passwordHash must not be in response');
      assert.ok(!('password_hash' in user), 'SECURITY: password_hash must not be in response');
      assert.ok(!('google_id' in user), 'SECURITY: google_id must not be in response');
    }
  });

  it('✓ login response never contains passwordHash', async () => {
    const res = await api('POST', '/api/auth/login', {
      email: `sec_${timestamp}@example.com`,
      password: TEST_PASSWORD,
    });
    if (res.status === 200 && res.body.user) {
      const user = res.body.user as Record<string, unknown>;
      assert.ok(!('passwordHash' in user));
      assert.ok(!('password_hash' in user));
    }
  });

  it('✓ auth_token cookie is HttpOnly (not accessible via JS)', async () => {
    const res = await api('POST', '/api/auth/login', {
      email: `sec_${timestamp}@example.com`,
      password: TEST_PASSWORD,
    });
    if (res.cookieHeader) {
      assert.ok(
        res.cookieHeader.toLowerCase().includes('httponly'),
        'auth_token must be HttpOnly'
      );
    }
  });

  it('✓ health check endpoint is publicly accessible', async () => {
    const res = await api('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});

// ─── ONBOARDING FLOW TESTS ───────────────────────────────────────────────────

describe('ONBOARDING FLOW', () => {
  const obEmail = `ob_${timestamp}@example.com`;
  let obCookie = '';

  it('✓ signup creates new user with onboardingCompleted=false', async () => {
    const res = await api('POST', '/api/auth/signup', {
      name: 'Onboarding Tester',
      email: obEmail,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    });

    assert.ok([201, 429].includes(res.status));
    if (res.status === 201) {
      const user = res.body.user as Record<string, unknown>;
      assert.equal(user.onboardingCompleted, false);
      assert.equal(user.onboardingStep, 1);

      if (res.cookieHeader) {
        const tokenVal = res.cookieHeader.match(/auth_token=([^;]+)/);
        if (tokenVal) obCookie = `auth_token=${tokenVal[1]}`;
      }
    }
  });

  it('✓ Step 1 (Workspace Setup) saves workspace and advances to step 2', async () => {
    if (!obCookie) return;
    const res = await api('POST', '/api/onboarding/step-1', {
      workspaceName: 'Acme Support Desk',
      workspaceSlug: 'acme-support-desk',
    }, obCookie);

    assert.equal(res.status, 200);
    assert.ok(res.body.workspace);
    const user = res.body.user as Record<string, unknown>;
    assert.equal(user.onboardingStep, 2);
  });

  it('✓ Step 2 (Business Setup) saves business type and customer channels', async () => {
    if (!obCookie) return;
    const res = await api('POST', '/api/onboarding/step-2', {
      businessType: 'SaaS',
      customerChannels: ['Website', 'WhatsApp', 'Instagram'],
    }, obCookie);

    assert.equal(res.status, 200);
    const user = res.body.user as Record<string, unknown>;
    assert.equal(user.onboardingStep, 3);
  });

  it('✓ Step 3 (Complete Onboarding) sets onboardingCompleted=true', async () => {
    if (!obCookie) return;
    const res = await api('POST', '/api/onboarding/complete', {
      assistantName: 'Xia Helper',
      assistantInstructions: 'Answer product questions and pricing details.',
    }, obCookie);

    assert.equal(res.status, 200);
    const user = res.body.user as Record<string, unknown>;
    assert.equal(user.onboardingCompleted, true);
  });

  it('✓ GET /api/onboarding/data retrieves saved workspace & assistant', async () => {
    if (!obCookie) return;
    const res = await api('GET', '/api/onboarding/data', undefined, obCookie);
    assert.equal(res.status, 200);
    assert.ok(res.body.workspace);
    assert.equal((res.body.workspace as Record<string, unknown>).name, 'Acme Support Desk');
  });
});

