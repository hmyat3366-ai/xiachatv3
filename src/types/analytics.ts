export type AnalyticsPreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

export interface KPIMetric {
  value: number;
  changePct: number | null;
}

export interface AnalyticsKPIs {
  totalConversations: KPIMetric;
  resolvedConversations: KPIMetric;
  aiResolutionRate: KPIMetric;
  humanHandoffRate: KPIMetric;
  avgFirstResponseSeconds: number;
  avgResolutionSeconds: number;
  newCustomers: KPIMetric;
  totalMessages: KPIMetric;
}

export interface TrendDataPoint {
  date: string;
  total: number;
  resolved: number;
}

export interface AIPerformanceSummary {
  handled: number;
  resolved: number;
  handoffs: number;
  resolutionRate: number;
}

export interface AgentPerformanceItem {
  id: string;
  name: string;
  conversations: number;
  resolved: number;
  handoffs: number;
  resolutionRate: number;
  avgResponseTimeSec: number;
}

export interface ChannelPerformanceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  conversations: number;
  resolved: number;
  aiResolutionRate: number;
  avgResponseTimeSec: number;
}

export interface StatusDistribution {
  open: number;
  aiHandling: number;
  human: number;
  resolved: number;
}

export interface HourlyDistributionItem {
  hour: string;
  count: number;
}

export interface AnalyticsData {
  workspace: { id: string; name: string; slug: string };
  dateBounds: {
    startDate: string;
    endDate: string;
    prevStartDate: string;
    prevEndDate: string;
    durationDays: number;
  };
  kpis: AnalyticsKPIs;
  trends: TrendDataPoint[];
  aiPerformance: AIPerformanceSummary;
  agentPerformance: AgentPerformanceItem[];
  channelPerformance: ChannelPerformanceItem[];
  statusDistribution: StatusDistribution;
  hourlyDistribution: HourlyDistributionItem[];
}
