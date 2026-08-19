import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  googleAuth,
  googleCallback,
  resendVerification,
  saveOnboardingStep1,
  saveOnboardingStep2,
  completeOnboarding,
  getOnboardingData,
} from './authController.js';
import {
  getDashboardOverview,
  createWorkspace,
} from './dashboardController.js';
import {
  getInboxConversations,
  getConversationMessages,
  postMessage,
  takeoverConversation,
  returnToAI,
  updateAssignment,
  updateStatus,
  updateCustomerDetails,
  generateAIDraft,
  sseEventsStream,
} from './inboxController.js';
import {
  getAiAgents,
  getAiAgentById,
  createAiAgent,
  updateAiAgent,
  deleteAiAgent,
  toggleAiAgentStatus,
  testAiAgentPlayground,
} from './aiAgentController.js';
import {
  getKnowledgeSources,
  getKnowledgeSourceById,
  createTextKnowledge,
  createFaqKnowledge,
  importUrlKnowledge,
  uploadDocumentKnowledge,
  deleteKnowledgeSource,
  reprocessKnowledgeSource,
  searchKnowledgeRAG,
} from './knowledgeController.js';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerNote,
  deleteCustomerNote,
  toggleBlockCustomer,
  mergeCustomers,
} from './customerController.js';
import {
  getChannels,
  getChannelById,
  updateWebsiteChannelConfig,
  getPublicWidgetConfig,
  testChannelConnection,
  disconnectChannel,
  handleIncomingWebhook,
} from './channelController.js';
import { getAnalyticsOverview, exportAnalyticsCSV } from './analyticsController.js';
import {
  getTeamMembers,
  inviteTeamMember,
  resendInvitation,
  cancelInvitation,
  updateMemberRole,
  toggleMemberStatus,
  removeTeamMember,
  acceptInvitation,
  getTeamAuditLogs,
} from './teamController.js';
import {
  getTeamChatWorkspaceMembers,
  getTeamConversations,
  createTeamConversation,
  getTeamMessages,
  postTeamMessage,
  getTeamChatUnreadCount,
} from './teamChatController.js';
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from './workspaceSettingsController.js';
import {
  getUserSettingsOverview,
  updateUserProfile,
  updateNotificationPreferences,
  changeUserPassword,
  updateWorkspaceAIDefaults,
  exportUserDataJSON,
  deleteUserAccount,
} from './settingsController.js';
import {
  getBillingOverview,
  createCheckoutSession,
  changePlan,
  createCustomerPortalSession,
  cancelSubscription,
  resumeSubscription,
  handleStripeWebhook,
} from './billingController.js';
import {
  checkAiAgentLimit,
  checkTeamMemberLimit,
  checkKnowledgeLimit,
  checkChannelLimit,
} from './planLimitMiddleware.js';
import { authenticateToken } from './authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS configuration
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// Stripe raw webhook handler MUST be mounted before express.json() for signature verification
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());
app.use(cookieParser());

// Rate limiters
// In TEST_MODE, use very high limits so integration tests don't hit 429
const isTestMode = process.env.TEST_MODE === 'true';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestMode ? 1000 : 20, // max 20 requests per IP per 15 minutes in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestMode ? 1000 : 5, // max 5 reset requests per 15 minutes in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
});

// Authentication Routes
app.post('/api/auth/signup', authLimiter, signup);
app.post('/api/auth/login', authLimiter, login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', authenticateToken, getMe);

app.post('/api/auth/forgot-password', resetLimiter, forgotPassword);
app.post('/api/auth/reset-password', resetLimiter, resetPassword);
app.get('/api/auth/verify-email', verifyEmail);
app.post('/api/auth/resend-verification', authenticateToken, resendVerification);

// Onboarding Routes
app.post('/api/onboarding/step-1', authenticateToken, saveOnboardingStep1);
app.post('/api/onboarding/step-2', authenticateToken, saveOnboardingStep2);
app.post('/api/onboarding/complete', authenticateToken, completeOnboarding);
app.get('/api/onboarding/data', authenticateToken, getOnboardingData);

// Dashboard Routes
app.get('/api/dashboard/overview', authenticateToken, getDashboardOverview);
app.post('/api/dashboard/workspaces', authenticateToken, createWorkspace);

// Inbox Routes
app.get('/api/inbox/conversations', authenticateToken, getInboxConversations);
app.get('/api/inbox/conversations/:id/messages', authenticateToken, getConversationMessages);
app.post('/api/inbox/conversations/:id/messages', authenticateToken, postMessage);
app.post('/api/inbox/conversations/:id/takeover', authenticateToken, takeoverConversation);
app.post('/api/inbox/conversations/:id/return-to-ai', authenticateToken, returnToAI);
app.post('/api/inbox/conversations/:id/assign', authenticateToken, updateAssignment);
app.post('/api/inbox/conversations/:id/status', authenticateToken, updateStatus);
app.post('/api/inbox/conversations/:id/customer-details', authenticateToken, updateCustomerDetails);
app.post('/api/inbox/conversations/:id/generate-ai-draft', authenticateToken, generateAIDraft);
app.get('/api/inbox/events', authenticateToken, sseEventsStream);

// AI Agent Routes (Limit Gated)
app.get('/api/ai-agents', authenticateToken, getAiAgents);
app.get('/api/ai-agents/:id', authenticateToken, getAiAgentById);
app.post('/api/ai-agents', authenticateToken, checkAiAgentLimit, createAiAgent);
app.put('/api/ai-agents/:id', authenticateToken, updateAiAgent);
app.delete('/api/ai-agents/:id', authenticateToken, deleteAiAgent);
app.post('/api/ai-agents/:id/status', authenticateToken, toggleAiAgentStatus);
app.post('/api/ai-agents/:id/test', authenticateToken, testAiAgentPlayground);

// Knowledge Base Routes (Limit Gated)
app.get('/api/knowledge-base', authenticateToken, getKnowledgeSources);
app.get('/api/knowledge-base/:id', authenticateToken, getKnowledgeSourceById);
app.post('/api/knowledge-base/text', authenticateToken, checkKnowledgeLimit, createTextKnowledge);
app.post('/api/knowledge-base/faq', authenticateToken, checkKnowledgeLimit, createFaqKnowledge);
app.post('/api/knowledge-base/import-url', authenticateToken, checkKnowledgeLimit, importUrlKnowledge);
app.post('/api/knowledge-base/upload-document', authenticateToken, checkKnowledgeLimit, uploadDocumentKnowledge);
app.delete('/api/knowledge-base/:id', authenticateToken, deleteKnowledgeSource);
app.post('/api/knowledge-base/:id/reprocess', authenticateToken, reprocessKnowledgeSource);
app.post('/api/knowledge-base/search', authenticateToken, searchKnowledgeRAG);

// Customers Routes
app.get('/api/customers', authenticateToken, getCustomers);
app.get('/api/customers/:id', authenticateToken, getCustomerById);
app.post('/api/customers', authenticateToken, createCustomer);
app.put('/api/customers/:id', authenticateToken, updateCustomer);
app.delete('/api/customers/:id', authenticateToken, deleteCustomer);
app.post('/api/customers/:id/notes', authenticateToken, addCustomerNote);
app.delete('/api/customers/:id/notes/:noteId', authenticateToken, deleteCustomerNote);
app.post('/api/customers/:id/block', authenticateToken, toggleBlockCustomer);
app.post('/api/customers/merge', authenticateToken, mergeCustomers);

// Channels & Integrations Routes
app.get('/api/channels', authenticateToken, getChannels);
app.get('/api/channels/:id', authenticateToken, getChannelById);
app.put('/api/channels/website-config', authenticateToken, updateWebsiteChannelConfig);
app.post('/api/channels/:id/test', authenticateToken, testChannelConnection);
app.post('/api/channels/:id/disconnect', authenticateToken, disconnectChannel);

// Public Browser-Safe Widget Config API (CORS enabled)
app.get('/api/channels/public-widget/:siteKey', getPublicWidgetConfig);

// Webhook Endpoints
app.post('/api/webhooks/:provider', handleIncomingWebhook);

// Analytics & Reporting Routes
app.get('/api/analytics', authenticateToken, getAnalyticsOverview);
app.get('/api/analytics/export.csv', authenticateToken, exportAnalyticsCSV);

// Team & Workspace Member Management Routes (Limit Gated)
app.get('/api/team/members', authenticateToken, getTeamMembers);
app.post('/api/team/invitations', authenticateToken, checkTeamMemberLimit, inviteTeamMember);
app.post('/api/team/invitations/:id/resend', authenticateToken, resendInvitation);
app.delete('/api/team/invitations/:id', authenticateToken, cancelInvitation);
app.put('/api/team/members/:id/role', authenticateToken, updateMemberRole);
app.put('/api/team/members/:id/status', authenticateToken, toggleMemberStatus);
app.delete('/api/team/members/:id', authenticateToken, removeTeamMember);
app.post('/api/team/invitations/accept', authenticateToken, acceptInvitation);
app.get('/api/team/audit-logs', authenticateToken, getTeamAuditLogs);

// Team Chat Routes
app.get('/api/team-chat/workspace-members', authenticateToken, getTeamChatWorkspaceMembers);
app.get('/api/team-chat/conversations', authenticateToken, getTeamConversations);
app.post('/api/team-chat/conversations', authenticateToken, createTeamConversation);
app.get('/api/team-chat/conversations/:id/messages', authenticateToken, getTeamMessages);
app.post('/api/team-chat/conversations/:id/messages', authenticateToken, postTeamMessage);
app.get('/api/team-chat/unread-count', authenticateToken, getTeamChatUnreadCount);

// Billing & Subscription Management Routes
app.get('/api/billing/overview', authenticateToken, getBillingOverview);
app.post('/api/billing/checkout-session', authenticateToken, createCheckoutSession);
app.post('/api/billing/change-plan', authenticateToken, changePlan);
app.post('/api/billing/customer-portal', authenticateToken, createCustomerPortalSession);
app.post('/api/billing/cancel', authenticateToken, cancelSubscription);
app.post('/api/billing/resume', authenticateToken, resumeSubscription);

// Workspace Administration Settings Routes
app.get('/api/settings/workspace', authenticateToken, getWorkspaceSettings);
app.put('/api/settings/workspace', authenticateToken, updateWorkspaceSettings);

// User & Central Settings Routes
app.get('/api/settings/me', authenticateToken, getUserSettingsOverview);
app.put('/api/settings/profile', authenticateToken, updateUserProfile);
app.put('/api/settings/notifications', authenticateToken, updateNotificationPreferences);
app.post('/api/settings/change-password', authenticateToken, changeUserPassword);
app.put('/api/settings/ai-defaults', authenticateToken, updateWorkspaceAIDefaults);
app.get('/api/settings/export-user-data.json', authenticateToken, exportUserDataJSON);
app.delete('/api/settings/account', authenticateToken, deleteUserAccount);

// Google OAuth Routes
app.get('/api/auth/google', googleAuth);
app.get('/api/auth/google/callback', googleCallback);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Xia Chat Auth API', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Xia Chat Server] Running on http://localhost:${PORT}`);
});
