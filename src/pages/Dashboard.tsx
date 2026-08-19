import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { MetricCard } from '../components/dashboard/MetricCard';
import { ConversationActivity } from '../components/dashboard/ConversationActivity';
import { AIPerformance } from '../components/dashboard/AIPerformance';
import { RecentConversations } from '../components/dashboard/RecentConversations';
import { NeedsAttention } from '../components/dashboard/NeedsAttention';
import { QuickActions } from '../components/dashboard/QuickActions';
import { EmptyState } from '../components/dashboard/EmptyState';
import { LoadingSkeleton } from '../components/dashboard/LoadingSkeleton';
import { ErrorState } from '../components/dashboard/ErrorState';
import type { DashboardOverviewResponse, DateRangePeriod } from '../types/dashboard';
import { MessageSquare, Inbox, Bot, UserCheck, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentPath, onNavigate }) => {
  const { user, resendVerification } = useAuth();

  // Dashboard Data State
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Filters State
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [period, setPeriod] = useState<DateRangePeriod>('7d');

  // Email verification resend state
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Time-based greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = useCallback(async (wsId?: string | null, p?: DateRangePeriod) => {
    try {
      setIsLoading(true);
      setIsError(false);

      const targetPeriod = p || period;
      let url = `/api/dashboard/overview?period=${targetPeriod}`;
      if (wsId) {
        url += `&workspaceId=${wsId}`;
      }

      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }

      const resData: DashboardOverviewResponse = await res.json();
      setData(resData);

      if (resData.workspace && !activeWorkspaceId) {
        setActiveWorkspaceId(resData.workspace.id);
      }
    } catch (err) {
      console.error('Error loading dashboard overview:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId, period]);

  useEffect(() => {
    fetchDashboardData(activeWorkspaceId, period);
  }, [fetchDashboardData, activeWorkspaceId, period]);

  const handleSelectWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    fetchDashboardData(workspaceId, period);
  };

  const handleCreateWorkspace = async (name: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/dashboard/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const resData = await res.json();
        setActiveWorkspaceId(resData.workspace.id);
        fetchDashboardData(resData.workspace.id, period);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage(null);
    const result = await resendVerification();
    setIsResending(false);
    setResendMessage({
      text: result.success
        ? (result.message || 'Verification email sent! Check your inbox.')
        : (result.error || 'Failed to resend. Please try again.'),
      isError: !result.success,
    });
    setTimeout(() => setResendMessage(null), 5000);
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'there';
  const greeting = getGreeting();

  return (
    <DashboardLayout
      currentPath={currentPath}
      onNavigate={onNavigate}
      workspaces={data?.workspaces || []}
      currentWorkspace={data?.workspace || null}
      onSelectWorkspace={handleSelectWorkspace}
      onCreateWorkspace={handleCreateWorkspace}
    >
      {/* Email Verification Banner if applicable */}
      {user && !user.emailVerified && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Verify your email address</p>
              <p className="text-[11px] text-amber-700">
                Please verify your email ({user.email}) to enable daily support digest emails.
              </p>
              {resendMessage && (
                <p className={`text-[11px] font-semibold mt-1 ${resendMessage.isError ? 'text-red-700' : 'text-emerald-700'}`}>
                  {resendMessage.text}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
          >
            {isResending ? 'Sending...' : 'Resend Link'}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && <LoadingSkeleton />}

      {/* Error State */}
      {!isLoading && isError && (
        <ErrorState onRetry={() => fetchDashboardData(activeWorkspaceId, period)} />
      )}

      {/* Empty State for Brand New Workspaces */}
      {!isLoading && !isError && data?.isEmpty && (
        <EmptyState
          workspaceName={data?.workspace?.name}
          onNavigate={onNavigate}
        />
      )}

      {/* Main Dashboard Home Overview View */}
      {!isLoading && !isError && data && !data.isEmpty && (
        <div className="space-y-6">
          {/* Dashboard Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
                {greeting}, {userName}
              </h1>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
                Here's what's happening with your customer conversations.
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white p-1 rounded-2xl border border-[#E8E8E5] shadow-2xs flex items-center gap-1 shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setPeriod('today')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === 'today'
                    ? 'bg-[#FF8A2A] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6]'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod('7d')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === '7d'
                    ? 'bg-[#FF8A2A] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6]'
                }`}
              >
                7 days
              </button>
              <button
                onClick={() => setPeriod('30d')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === '30d'
                    ? 'bg-[#FF8A2A] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6]'
                }`}
              >
                30 days
              </button>
            </div>
          </div>

          {/* 4 Key Metric Cards */}
          {data.metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Conversations"
                value={data.metrics.totalConversations.value}
                trend={data.metrics.totalConversations.trend}
                icon={MessageSquare}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
              />
              <MetricCard
                title="Open Conversations"
                value={data.metrics.openConversations.value}
                attentionSubtext={data.metrics.openConversations.attentionSubtext}
                icon={Inbox}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
              />
              <MetricCard
                title="AI Resolved"
                value={data.metrics.aiResolvedRate.value}
                trend={data.metrics.aiResolvedRate.trend}
                icon={Bot}
                iconBg="bg-[#FFF0E5]"
                iconColor="text-[#FF8A2A]"
              />
              <MetricCard
                title="Human Handoffs"
                value={data.metrics.humanHandoffs.value}
                trend={data.metrics.humanHandoffs.trend}
                icon={UserCheck}
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
              />
            </div>
          )}

          {/* Conversation Activity SVG Chart */}
          <ConversationActivity
            data={data.activityChart}
            period={period}
            onPeriodChange={(p) => setPeriod(p)}
          />

          {/* AI Performance Section */}
          <AIPerformance
            data={data.aiPerformance}
            onNavigate={onNavigate}
          />

          {/* Grid Layout: Recent Conversations (Large) & Needs Attention + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Recent Conversations */}
            <div className="lg:col-span-2">
              <RecentConversations
                conversations={data.recentConversations}
                onNavigate={onNavigate}
              />
            </div>

            {/* Right 1 Col: Needs Attention & Quick Actions */}
            <div className="space-y-6">
              <NeedsAttention
                items={data.needsAttention}
                onNavigate={onNavigate}
              />
              <QuickActions onNavigate={onNavigate} />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
