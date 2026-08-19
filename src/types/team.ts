export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'support' | 'member';

export type MemberStatus = 'active' | 'pending' | 'suspended' | 'inactive';

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  email: string;
  avatar: string;
  role: WorkspaceRole;
  status: MemberStatus;
  joinedAt: string;
  lastActiveAt: string;
  isCurrentUser?: boolean;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
}

export interface TeamAuditLog {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId: string;
  targetName: string;
  details: string;
  createdAt: string;
}

export interface WorkspaceSettings {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string | null;
  timezone: string;
  language: string;
  createdAt?: string;
  updatedAt?: string;
}
