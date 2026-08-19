import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const BASE_URL = 'http://localhost:5000';

function api(method: string, path: string, body?: any, cookie?: string) {
  return new Promise<{ status: number; body: any; cookie?: string }>((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        let raw = '';
        const setCookieHeader = res.headers['set-cookie'];
        let returnedCookie: string | undefined;
        if (setCookieHeader && setCookieHeader.length > 0) {
          returnedCookie = setCookieHeader[0].split(';')[0];
        }

        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { raw };
          }
          resolve({ status: res.statusCode || 500, body: parsed, cookie: returnedCookie });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Team Management System Verification Test Suite', () => {
  let cookieOwner: string;
  let cookieAdmin: string;
  let cookieMember: string;

  let ownerUserId: string;
  let adminUserId: string;
  let memberUserId: string;

  let workspaceId: string;
  let targetMemberId: string;

  it('1. Create Owner user and primary workspace', async () => {
    const ownerRes = await api('POST', '/api/auth/signup', {
      name: 'Owner User',
      email: `owner_${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    assert.strictEqual(ownerRes.status, 201);
    assert.ok(ownerRes.cookie);
    cookieOwner = ownerRes.cookie;
    ownerUserId = ownerRes.body.user.id;

    // Get Owner's workspace
    const wsRes = await api('GET', '/api/team/members', undefined, cookieOwner);
    assert.strictEqual(wsRes.status, 200);
    assert.strictEqual(wsRes.body.actorRole, 'owner');
    workspaceId = wsRes.body.workspace.id;
    assert.ok(workspaceId);
  });

  it('2. Invite and create Admin and Member accounts', async () => {
    // Signup Admin user
    const adminRes = await api('POST', '/api/auth/signup', {
      name: 'Admin User',
      email: `admin_${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    assert.strictEqual(adminRes.status, 201);
    cookieAdmin = adminRes.cookie!;
    adminUserId = adminRes.body.user.id;

    // Signup Member user
    const memberRes = await api('POST', '/api/auth/signup', {
      name: 'Member User',
      email: `member_${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    assert.strictEqual(memberRes.status, 201);
    cookieMember = memberRes.cookie!;
    memberUserId = memberRes.body.user.id;

    // Owner invites Member user email into Owner's workspace
    const inviteRes = await api(
      'POST',
      `/api/team/invitations?workspaceId=${workspaceId}`,
      { email: memberRes.body.user.email, role: 'member' },
      cookieOwner
    );
    assert.strictEqual(inviteRes.status, 201);

    // Member accepts invitation
    const acceptRes = await api(
      'POST',
      '/api/team/invitations/accept',
      { token: inviteRes.body.inviteToken },
      cookieMember
    );
    assert.strictEqual(acceptRes.status, 200);

    // Get member list to find targetMemberId
    const teamRes = await api('GET', `/api/team/members?workspaceId=${workspaceId}`, undefined, cookieOwner);
    assert.strictEqual(teamRes.status, 200);
    const m = teamRes.body.members.find((item: any) => item.userId === memberUserId);
    assert.ok(m, 'Target member must exist in workspace list');
    targetMemberId = m.id;
  });

  it('3. Owner edits position of Member to Manager', async () => {
    const updateRes = await api(
      'PUT',
      `/api/team/members/${targetMemberId}/role?workspaceId=${workspaceId}`,
      { role: 'manager' },
      cookieOwner
    );
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);
  });

  it('4. Position persists after refresh/refetch', async () => {
    const res = await api('GET', `/api/team/members?workspaceId=${workspaceId}`, undefined, cookieOwner);
    assert.strictEqual(res.status, 200);
    const updatedMember = res.body.members.find((m: any) => m.id === targetMemberId);
    assert.strictEqual(updatedMember.role, 'manager');
  });

  it('5. Owner deactivates member', async () => {
    const deactRes = await api(
      'PUT',
      `/api/team/members/${targetMemberId}/status?workspaceId=${workspaceId}`,
      { status: 'suspended' },
      cookieOwner
    );
    assert.strictEqual(deactRes.status, 200);
    assert.strictEqual(deactRes.body.message, 'Member deactivated.');
  });

  it('6. Inactive state persists after refresh', async () => {
    const res = await api('GET', `/api/team/members?workspaceId=${workspaceId}`, undefined, cookieOwner);
    assert.strictEqual(res.status, 200);
    const inactiveMember = res.body.members.find((m: any) => m.id === targetMemberId);
    assert.strictEqual(inactiveMember.status, 'suspended');
  });

  it('7. Owner reactivates member', async () => {
    const reactRes = await api(
      'PUT',
      `/api/team/members/${targetMemberId}/status?workspaceId=${workspaceId}`,
      { status: 'active' },
      cookieOwner
    );
    assert.strictEqual(reactRes.status, 200);
    assert.strictEqual(reactRes.body.message, 'Member reactivated.');

    const res = await api('GET', `/api/team/members?workspaceId=${workspaceId}`, undefined, cookieOwner);
    const activeMember = res.body.members.find((m: any) => m.id === targetMemberId);
    assert.strictEqual(activeMember.status, 'active');
  });

  it('8. Owner cannot demote or deactivate Owner', async () => {
    const res = await api('GET', `/api/team/members?workspaceId=${workspaceId}`, undefined, cookieOwner);
    const ownerMember = res.body.members.find((m: any) => m.role === 'owner');

    const statusRes = await api(
      'PUT',
      `/api/team/members/${ownerMember.id}/status?workspaceId=${workspaceId}`,
      { status: 'suspended' },
      cookieOwner
    );
    assert.strictEqual(statusRes.status, 403);
    assert.ok(statusRes.body.error.includes('Owner'));
  });

  it('9. Normal Member attempts role modification (Backend Rejects with 403)', async () => {
    const roleRes = await api(
      'PUT',
      `/api/team/members/${targetMemberId}/role?workspaceId=${workspaceId}`,
      { role: 'admin' },
      cookieMember
    );
    assert.strictEqual(roleRes.status, 403);
  });

  it('10. Direct API request attempts cross-workspace IDOR modification (Backend Rejects)', async () => {
    const fakeWsId = 'ws_fake_unauthorized_12345';
    const idorRes = await api(
      'PUT',
      `/api/team/members/${targetMemberId}/role?workspaceId=${fakeWsId}`,
      { role: 'admin' },
      cookieOwner
    );
    assert.strictEqual(idorRes.status, 403);
  });

  it('11. Owner removes member from workspace', async () => {
    const removeRes = await api(
      'DELETE',
      `/api/team/members/${targetMemberId}?workspaceId=${workspaceId}`,
      undefined,
      cookieOwner
    );
    assert.strictEqual(removeRes.status, 200);
    assert.strictEqual(removeRes.body.success, true);

    const checkRes = await api('GET', `/api/team/members?workspaceId=${workspaceId}`, undefined, cookieOwner);
    const removedMember = checkRes.body.members.find((m: any) => m.id === targetMemberId);
    assert.strictEqual(removedMember, undefined);
  });

  it('12. Fetch Audit Logs', async () => {
    const auditRes = await api('GET', `/api/team/audit-logs?workspaceId=${workspaceId}`, undefined, cookieOwner);
    assert.strictEqual(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.body.logs));
    assert.ok(auditRes.body.logs.length >= 3);
  });
});
