import React from 'react';
import type { SettingsTab, SettingsOverviewData, NotificationPreferences, WorkspaceAIDefaults } from '../../types/settings';
import { ProfileTab } from './ProfileTab';
import { NotificationsTab } from './NotificationsTab';
import { SecurityTab } from './SecurityTab';
import { WorkspaceTab } from './WorkspaceTab';
import { AIPreferencesTab } from './AIPreferencesTab';
import { PrivacyTab } from './PrivacyTab';
import { AccountTab } from './AccountTab';
import {
  User,
  Bell,
  Lock,
  Building2,
  Bot,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

interface SettingsLayoutProps {
  data: SettingsOverviewData | null;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onSaveProfile: (name: string, jobTitle: string, phone: string) => Promise<boolean>;
  onSaveNotifications: (prefs: NotificationPreferences) => Promise<boolean>;
  onChangePassword: (curr: string, next: string) => Promise<{ success: boolean; message?: string }>;
  onSaveAIDefaults: (defaults: WorkspaceAIDefaults) => Promise<boolean>;
  onExportData: () => void;
  onDeleteAccount: (confirmText: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  onNavigate: (path: string) => void;
  isLoading: boolean;
  isSaving: boolean;
}

const TABS: Array<{ id: SettingsTab; label: string; icon: React.ElementType; desc: string }> = [
  { id: 'profile', label: 'Profile', icon: User, desc: 'Personal details & avatar' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email & desktop alerts' },
  { id: 'security', label: 'Security', icon: Lock, desc: 'Password & active sessions' },
  { id: 'workspace', label: 'Workspace', icon: Building2, desc: 'Workspace & team navigation' },
  { id: 'ai', label: 'AI Preferences', icon: Bot, desc: 'Defaults & safety rules' },
  { id: 'privacy', label: 'Privacy & Data', icon: ShieldCheck, desc: 'Data retention & exports' },
  { id: 'account', label: 'Account', icon: AlertTriangle, desc: 'Danger zone & deletion' },
];

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  data,
  activeTab,
  onTabChange,
  onSaveProfile,
  onSaveNotifications,
  onChangePassword,
  onSaveAIDefaults,
  onExportData,
  onDeleteAccount,
  onNavigate,
  isLoading,
  isSaving,
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Page Header */}
      <div className="border-b border-[#E8E8E5] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">Account & Platform Settings</h1>
        <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
          Manage your personal profile, notification preferences, security, and workspace defaults.
        </p>
      </div>

      {/* Mobile Top Navigation Pills */}
      <div className="flex sm:hidden overflow-x-auto pb-2 gap-1.5 border-b border-[#E8E8E5]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'bg-white border border-[#E8E8E5] text-[#6B6B6B]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar Navigation (Desktop) */}
        <div className="hidden md:block md:col-span-1 bg-white rounded-3xl border border-[#E8E8E5] p-3 shadow-2xs space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#FFF0E5] text-[#FF8A2A] font-extrabold border border-[#FF8A2A]/30'
                    : 'text-[#6B6B6B] hover:bg-[#FAF9F6] hover:text-[#171717]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                  <div>
                    <span className="text-xs font-bold block">{tab.label}</span>
                    <span className="text-[10px] text-[#6B6B6B] leading-tight block">{tab.desc}</span>
                  </div>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-[#FF8A2A]" />}
              </button>
            );
          })}
        </div>

        {/* Right Content Panel */}
        <div className="md:col-span-3">
          {isLoading ? (
            <div className="bg-white rounded-3xl border border-[#E8E8E5] p-8 shadow-2xs animate-pulse h-96" />
          ) : (
            <>
              {activeTab === 'profile' && (
                <ProfileTab
                  profile={data?.profile || null}
                  onSave={onSaveProfile}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsTab
                  preferences={data?.notifications || null}
                  onSave={onSaveNotifications}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'security' && (
                <SecurityTab
                  onChangePassword={onChangePassword}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'workspace' && (
                <WorkspaceTab
                  workspaceName={data?.workspace?.name}
                  onNavigate={onNavigate}
                />
              )}

              {activeTab === 'ai' && (
                <AIPreferencesTab
                  aiDefaults={data?.aiDefaults || null}
                  onSave={onSaveAIDefaults}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'privacy' && (
                <PrivacyTab onExportData={onExportData} />
              )}

              {activeTab === 'account' && (
                <AccountTab
                  onDeleteAccount={onDeleteAccount}
                  isDeleting={isSaving}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
