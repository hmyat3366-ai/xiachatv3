export type DateRangePeriod = 'today' | '7d' | '30d';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  businessType?: string;
  customerChannels?: string[];
}

export interface MetricCardData {
  title: string;
  value: string;
  trend?: string;
  attentionSubtext?: string;
  rawCount?: number;
  rate?: number;
}

export interface DashboardMetrics {
  totalConversations: MetricCardData;
  openConversations: MetricCardData;
  aiResolvedRate: MetricCardData;
  humanHandoffs: MetricCardData;
}

export interface ActivityChartPoint {
  date: string;
  label: string;
  conversations: number;
  aiResolved: number;
  humanHandled: number;
}

export interface AIPerformanceData {
  resolutionRate: string;
  totalAiConversations: number;
  humanHandoffs: number;
  avgResponseTimeSeconds: string;
}

export interface RecentConversationItem {
  id: string;
  customerName: string;
  customerEmail?: string;
  message: string;
  channel: string;
  status: 'AI' | 'Human' | 'Resolved';
  assignee: string;
  timeAgo: string;
}

export interface NeedsAttentionItem {
  id: string;
  customerName: string;
  reason: string;
  timeAgo: string;
  channel: string;
  status: string;
}

export interface DashboardOverviewResponse {
  workspace: WorkspaceItem | null;
  workspaces: WorkspaceItem[];
  isEmpty: boolean;
  metrics: DashboardMetrics | null;
  activityChart: ActivityChartPoint[];
  aiPerformance: AIPerformanceData | null;
  recentConversations: RecentConversationItem[];
  needsAttention: NeedsAttentionItem[];
}
