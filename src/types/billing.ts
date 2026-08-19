export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'canceling'
  | 'incomplete'
  | 'payment_failed';

export type BillingInterval = 'monthly' | 'yearly';

export interface PlanLimits {
  max_agents: number; // -1 = Unlimited
  max_members: number;
  max_conversations: number;
  max_knowledge_sources: number;
  max_channels: number;
  ai_usage_limit: number;
  storage_mb: number;
}

export interface PlanDefinition {
  id: string; // 'free' | 'starter' | 'pro' | 'enterprise'
  name: string;
  stripeProductId?: string | null;
  stripePriceIdMonthly?: string | null;
  stripePriceIdAnnual?: string | null;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  description: string;
  limits: PlanLimits;
  features: string[];
  popular?: boolean;
  badge?: string;
}

export interface PaymentMethod {
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
}

export interface InvoiceItem {
  id: string;
  stripeInvoiceId?: string | null;
  invoiceNumber: string;
  amountPaid: number;
  currency: string;
  status: 'paid' | 'open' | 'failed' | 'void';
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
}

export interface UsageMetrics {
  agents: number;
  teamMembers: number;
  conversations: number;
  knowledgeSources: number;
  channels: number;
}

export interface BillingOverview {
  workspace: {
    id: string;
    name: string;
    slug: string;
    userRole: 'owner' | 'admin' | 'member';
    canManageBilling: boolean;
  };
  subscription: {
    id: string;
    planId: string;
    planName: string;
    priceMonthly: number;
    priceAnnual: number;
    currency: string;
    status: SubscriptionStatus;
    billingInterval: BillingInterval;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: string | null;
    trialDaysRemaining: number;
    paymentMethod: PaymentMethod | null;
  };
  limits: PlanLimits;
  usage: UsageMetrics;
  plans: PlanDefinition[];
  invoices: InvoiceItem[];
}

export interface DowngradeConflict {
  resource: string;
  current: number;
  allowed: number;
  message: string;
}
