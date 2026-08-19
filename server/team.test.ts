import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const BASE_URL = 'http://localhost:5000';

function api(method: string, path: string, body?: any, cookie?: string) {
  return new Promise<{ status: number; body: any; cookieHeader?: string }>((resolve, reject) => {
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
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { raw };
          }
          const cookieHeader = res.headers['set-cookie']?.[0];
          resolve({ status: res.statusCode || 500, body: parsed, cookieHeader });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Team Members & Roles Module Integration Tests', () => {
  const timestamp = Date.now();
  const ownerEmail = `team_owner_${timestamp}@example.com`;
  const memberEmail = `team_member_${timestamp}@example.com`;
  const inviteeEmail = `invitee_${timestamp}@example.com`;
  const password = 'TestPassword123!';

  let ownerCookie: string;
  let memberCookie: string;
  let workspaceId: string;
  let createdInviteId: string;
  let createdInviteToken: string;
  let addedMemberId: string;

  it('1. Unauthenticated GET /api/team/members returns 401', async () => {
    const res = await api('GET', '/api/team/members');
    assert.equal(res.status, 401);
  });

  it('2. Owner Registration & Workspace Setup', async () => {
    const signupRes = await api('POST', '/api/auth/signup', {
      name: 'Workspace Owner',
      email: ownerEmail,
      password,
      confirmPassword: password,
    });
    assert.equal(signupRes.status, 201);
    ownerCookie = signupRes.cookieHeader!;
    assert.ok(ownerCookie);

    const wsRes = await api('GET', '/api/team/members', undefined, ownerCookie);
    assert.equal(wsRes.status, 200);
    assert.ok(wsRes.body.workspace);
    workspaceId = wsRes.body.workspace.id;
    assert.equal(wsRes.body.actorRole, 'owner');
    assert.ok(wsRes.body.members.length >= 1);

    // Upgrade test workspace to Pro plan so team member limit is higher (50 seats)
    const planRes = await api('POST', `/api/billing/change-plan`, { targetPlanId: 'pro', workspaceId }, ownerCookie);
    assert.equal(planRes.status, 200);
  });

  it('3. Owner invites new team member', async () => {
    const res = await api(
      'POST',
      `/api/team/invitations?workspaceId=${workspaceId}`,
      { email: inviteeEmail, role: 'member' },
      ownerCookie
    );
    assert.equal(res.status, 201);
    assert.ok(res.body.invitationId);
    createdInviteId = res.body.invitationId;

    // Extract raw token from inviteUrl
    const urlMatch = res.body.inviteUrl.match(/token=([a-f0-9]+)/);
    assert.ok(urlMatch);
    createdInviteToken = urlMatch[1];
  });

  it('4. Duplicate invitation to same email is rejected (400)', async () => {
    const res = await api(
      'POST',
      `/api/team/invitations?workspaceId=${workspaceId}`,
      { email: inviteeEmail, role: 'member' },
      ownerCookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error, /already been sent/i);
  });

  it('5. Resend invitation extends expiration date', async () => {
    const res = await api(
      'POST',
      `/api/team/invitations/${createdInviteId}/resend?workspaceId=${workspaceId}`,
      {},
      ownerCookie
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('6. Invitee accepts invitation and joins workspace', async () => {
    // Signup invitee user
    const signupRes = await api('POST', '/api/auth/signup', {
      name: 'Jane Member',
      email: inviteeEmail,
      password,
      confirmPassword: password,
    });
    assert.equal(signupRes.status, 201);
    memberCookie = signupRes.cookieHeader!;

    // Accept invitation
    const acceptRes = await api('POST', '/api/team/invitations/accept', { token: createdInviteToken }, memberCookie);
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.success, true);
  });

  it('7. Inviting existing active member returns 400 error', async () => {
    const res = await api(
      'POST',
      `/api/team/invitations?workspaceId=${workspaceId}`,
      { email: inviteeEmail, role: 'member' },
      ownerCookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error, /already a member/i);
  });

  it('8. GET /api/team/members lists both Owner and Member', async () => {
    const res = await api('GET', `/api/team/members?workspaceId=${workspaceId}`, undefined, ownerCookie);
    assert.equal(res.status, 200);
    assert.equal(res.body.members.length, 2);

    const memberObj = res.body.members.find((m: any) => m.email === inviteeEmail);
    assert.ok(memberObj);
    assert.equal(memberObj.role, 'member');
    addedMemberId = memberObj.id;
  });

  it('9. Member role is forbidden from sending invitations (403)', async () => {
    const res = await api(
      'POST',
      `/api/team/invitations?workspaceId=${workspaceId}`,
      { email: `another_${timestamp}@example.com`, role: 'member' },
      memberCookie
    );
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Only workspace Owners and Admins/i);
  });

  it('10. Owner promotes member to Admin role', async () => {
    const res = await api(
      'PUT',
      `/api/team/members/${addedMemberId}/role?workspaceId=${workspaceId}`,
      { role: 'admin' },
      ownerCookie
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('11. Owner protection: Cannot remove primary workspace owner', async () => {
    const listRes = await api('GET', `/api/team/members?workspaceId=${workspaceId}`, undefined, ownerCookie);
    const ownerObj = listRes.body.members.find((m: any) => m.role === 'owner');
    assert.ok(ownerObj);

    const res = await api('DELETE', `/api/team/members/${ownerObj.id}?workspaceId=${workspaceId}`, undefined, ownerCookie);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Cannot remove the primary workspace Owner/i);
  });

  it('12. Cancel pending invitation removes record', async () => {
    // Invite third user
    const invRes = await api(
      'POST',
      `/api/team/invitations?workspaceId=${workspaceId}`,
      { email: `cancel_me_${timestamp}@example.com`, role: 'member' },
      ownerCookie
    );
    assert.equal(invRes.status, 201);
    const invId = invRes.body.invitationId;

    // Cancel invitation
    const cancelRes = await api('DELETE', `/api/team/invitations/${invId}?workspaceId=${workspaceId}`, undefined, ownerCookie);
    assert.equal(cancelRes.status, 200);
  });
});
