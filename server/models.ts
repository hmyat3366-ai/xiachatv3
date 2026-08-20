import mongoose, { Schema, Document } from 'mongoose';

// ─── 1. User Model ────────────────────────────────────────────────────────────
export interface IUser extends Document {
  name: string;
  email: string;
  password_hash?: string;
  auth_provider: 'local' | 'google' | 'both';
  google_id?: string;
  email_verified: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
  job_title?: string;
  phone?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String },
    auth_provider: { type: String, default: 'local' },
    google_id: { type: String, sparse: true, index: true },
    email_verified: { type: Boolean, default: false },
    onboarding_completed: { type: Boolean, default: false },
    onboarding_step: { type: Number, default: 1 },
    job_title: { type: String },
    phone: { type: String },
    last_login_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// ─── 2. Workspace Model ───────────────────────────────────────────────────────
export interface IWorkspace extends Document {
  user_id: string;
  name: string;
  slug: string;
  business_type?: string;
  customer_channels?: string[];
  description?: string;
  logo_url?: string;
  timezone?: string;
  language?: string;
  created_at: Date;
  updated_at: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    business_type: { type: String },
    customer_channels: [{ type: String }],
    description: { type: String },
    logo_url: { type: String },
    timezone: { type: String, default: 'Asia/Yangon' },
    language: { type: String, default: 'English' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// ─── 3. Workspace Member Model ────────────────────────────────────────────────
export interface IWorkspaceMember extends Document {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'support' | 'member';
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  joined_at: Date;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspace_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'manager', 'support', 'member'], default: 'member' },
    status: { type: String, enum: ['active', 'pending', 'suspended', 'inactive'], default: 'active' },
    joined_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ─── 4. Invitation Model ──────────────────────────────────────────────────────
export interface IWorkspaceInvitation extends Document {
  workspace_id: string;
  email: string;
  role: string;
  token_hash: string;
  invited_by_id: string;
  invited_by_name: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  expires_at: Date;
  accepted_at?: Date;
  cancelled_at?: Date;
}

const WorkspaceInvitationSchema = new Schema<IWorkspaceInvitation>(
  {
    workspace_id: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    role: { type: String, default: 'member' },
    token_hash: { type: String, required: true, index: true },
    invited_by_id: { type: String, required: true },
    invited_by_name: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'cancelled', 'expired'], default: 'pending' },
    expires_at: { type: Date, required: true },
    accepted_at: { type: Date },
    cancelled_at: { type: Date },
  },
  { timestamps: true }
);

// ─── 5. Conversation Model ────────────────────────────────────────────────────
export interface IConversation extends Document {
  workspace_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  channel: string;
  status: 'ai' | 'human' | 'open' | 'assigned' | 'waiting' | 'resolved' | 'closed';
  assignee?: string;
  last_message: string;
  needs_attention: boolean;
  attention_reason?: string;
  confidence_score: number;
  sentiment: string;
  unread_count: number;
  tags: string[];
  notes?: string;
  ai_status: string;
  draft_message?: string;
  first_seen?: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    workspace_id: { type: String, required: true, index: true },
    customer_name: { type: String, required: true },
    customer_email: { type: String },
    customer_phone: { type: String },
    channel: { type: String, default: 'Website' },
    status: { type: String, default: 'ai', index: true },
    assignee: { type: String },
    last_message: { type: String, required: true },
    needs_attention: { type: Boolean, default: false },
    attention_reason: { type: String },
    confidence_score: { type: Number, default: 0.95 },
    sentiment: { type: String, default: 'neutral' },
    unread_count: { type: Number, default: 0 },
    tags: [{ type: String }],
    notes: { type: String },
    ai_status: { type: String, default: 'active' },
    draft_message: { type: String },
    first_seen: { type: Date },
  },
  { timestamps: true }
);

// ─── 6. Message Model ─────────────────────────────────────────────────────────
export interface IMessage extends Document {
  conversation_id: string;
  sender_type: 'customer' | 'ai' | 'agent' | 'system';
  sender_name?: string;
  content: string;
  is_internal_note: boolean;
  attachments?: string[];
}

const MessageSchema = new Schema<IMessage>(
  {
    conversation_id: { type: String, required: true, index: true },
    sender_type: { type: String, enum: ['customer', 'ai', 'agent', 'system'], required: true },
    sender_name: { type: String },
    content: { type: String, required: true },
    is_internal_note: { type: Boolean, default: false },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

// ─── 7. Customer Model ────────────────────────────────────────────────────────
export interface ICustomer extends Document {
  workspace_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  avatar?: string;
  status: 'new' | 'active' | 'returning' | 'blocked';
  tags: string[];
  last_active_at: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    workspace_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    phone: { type: String, index: true },
    company: { type: String },
    location: { type: String },
    avatar: { type: String },
    status: { type: String, default: 'active' },
    tags: [{ type: String }],
    last_active_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// ─── 8. AIAgent Model ─────────────────────────────────────────────────────────
export interface IAIAgent extends Document {
  workspace_id: string;
  name: string;
  description?: string;
  avatar?: string;
  status: 'active' | 'paused' | 'draft';
  tone: string;
  instructions?: string;
  custom_instructions?: string;
  response_style?: string;
  auto_reply_enabled: boolean;
  human_handoff_enabled: boolean;
  handoff_conditions: string[];
  handoff_message?: string;
  knowledge_source_ids: string[];
  channel_ids: string[];
  custom_rules: string[];
  conversations_handled: number;
  resolution_rate: number;
}

const AIAgentSchema = new Schema<IAIAgent>(
  {
    workspace_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    avatar: { type: String, default: 'bot' },
    status: { type: String, default: 'active' },
    tone: { type: String, default: 'Friendly' },
    instructions: { type: String },
    custom_instructions: { type: String },
    response_style: { type: String, default: 'Balanced' },
    auto_reply_enabled: { type: Boolean, default: true },
    human_handoff_enabled: { type: Boolean, default: true },
    handoff_conditions: [{ type: String }],
    handoff_message: { type: String, default: "I'll connect you with a member of our team who can help." },
    knowledge_source_ids: [{ type: String }],
    channel_ids: [{ type: String }],
    custom_rules: [{ type: String }],
    conversations_handled: { type: Number, default: 0 },
    resolution_rate: { type: Number, default: 78 },
  },
  { timestamps: true }
);

// ─── 9. Knowledge Source & Chunk Models ──────────────────────────────────────
export interface IKnowledgeSource extends Document {
  workspace_id: string;
  name: string;
  type: 'Text' | 'FAQ' | 'URL' | 'PDF' | 'Document';
  status: 'processing' | 'ready' | 'failed' | 'outdated';
  content?: string;
  original_url?: string;
  file_metadata?: Record<string, any>;
  chunk_count: number;
  created_by?: string;
}

const KnowledgeSourceSchema = new Schema<IKnowledgeSource>(
  {
    workspace_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, default: 'ready' },
    content: { type: String },
    original_url: { type: String },
    file_metadata: { type: Schema.Types.Mixed },
    chunk_count: { type: Number, default: 0 },
    created_by: { type: String },
  },
  { timestamps: true }
);

// ─── 10. Channel Model ────────────────────────────────────────────────────────
export interface IChannel extends Document {
  workspace_id: string;
  type: string;
  name: string;
  status: string;
  provider: string;
  external_account_id?: string;
  config?: Record<string, any>;
  default_agent_id?: string;
  last_activity_at?: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    workspace_id: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: { type: String, default: 'not_connected' },
    provider: { type: String, required: true },
    external_account_id: { type: String },
    config: { type: Schema.Types.Mixed },
    default_agent_id: { type: String },
    last_activity_at: { type: Date },
  },
  { timestamps: true }
);

// ─── 11. Subscription & Usage Models ─────────────────────────────────────────
export interface ISubscription extends Document {
  workspace_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan_id: string;
  status: string;
  billing_interval: string;
  current_period_start: Date;
  current_period_end: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    workspace_id: { type: String, required: true, unique: true, index: true },
    stripe_customer_id: { type: String },
    stripe_subscription_id: { type: String },
    plan_id: { type: String, default: 'free' },
    status: { type: String, default: 'active' },
    billing_interval: { type: String, default: 'monthly' },
    current_period_start: { type: Date, default: Date.now },
    current_period_end: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Export Mongoose Models
export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const WorkspaceModel = mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
export const WorkspaceMemberModel = mongoose.models.WorkspaceMember || mongoose.model<IWorkspaceMember>('WorkspaceMember', WorkspaceMemberSchema);
export const WorkspaceInvitationModel = mongoose.models.WorkspaceInvitation || mongoose.model<IWorkspaceInvitation>('WorkspaceInvitation', WorkspaceInvitationSchema);
export const ConversationModel = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
export const MessageModel = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export const CustomerModel = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
export const AIAgentModel = mongoose.models.AIAgent || mongoose.model<IAIAgent>('AIAgent', AIAgentSchema);
export const KnowledgeSourceModel = mongoose.models.KnowledgeSource || mongoose.model<IKnowledgeSource>('KnowledgeSource', KnowledgeSourceSchema);
export const ChannelModel = mongoose.models.Channel || mongoose.model<IChannel>('Channel', ChannelSchema);
export const SubscriptionModel = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

// MongoDB Connect Helper Function
export async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xiachat';
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log(`[Xia Chat MongoDB] Connected successfully to ${mongoUri}`);
    }
  } catch (err) {
    console.warn(`[Xia Chat MongoDB Warning] Local MongoDB connection offline (using SQLite fallback database):`, err);
  }
}
