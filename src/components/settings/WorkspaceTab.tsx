import React from 'react';
import { Building2, Users, ArrowRight, ShieldCheck } from 'lucide-react';

interface WorkspaceTabProps {
  workspaceName?: string;
  onNavigate: (path: string) => void;
}

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({ workspaceName, onNavigate }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">Workspace Administration</h2>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Manage your workspace information, team members, and role-based access controls.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Workspace Identity Card */}
        <div
          onClick={() => onNavigate('/settings/workspace')}
          className="bg-white p-6 rounded-3xl border border-[#E8E8E5] shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#FF8A2A] transition-colors" />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-[#171717]">Workspace Settings</h3>
            <p className="text-xs text-[#6B6B6B]">
              Configure workspace name, logo, description, timezone, and default language.
            </p>
          </div>

          <div className="pt-2 text-xs font-bold text-[#FF8A2A]">
            Manage Workspace Settings →
          </div>
        </div>

        {/* Team Members & Roles Card */}
        <div
          onClick={() => onNavigate('/team')}
          className="bg-white p-6 rounded-3xl border border-[#E8E8E5] shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 transition-colors" />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-[#171717]">Team Members & Roles</h3>
            <p className="text-xs text-[#6B6B6B]">
              Invite teammates, manage active roles (Owner, Admin, Member), and pending invitations.
            </p>
          </div>

          <div className="pt-2 text-xs font-bold text-purple-700">
            Manage Team Members →
          </div>
        </div>

        {/* Billing & Subscription Card */}
        <div
          onClick={() => onNavigate('/settings/billing')}
          className="bg-white p-6 rounded-3xl border border-[#E8E8E5] shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-[#171717]">Billing & Subscription</h3>
            <p className="text-xs text-[#6B6B6B]">
              Manage workspace plan tier, real-time usage metrics, payment method, and invoice history.
            </p>
          </div>

          <div className="pt-2 text-xs font-bold text-emerald-700">
            Manage Billing & Plans →
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#6B6B6B] flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <span>Currently editing settings for <strong>{workspaceName || 'Active Workspace'}</strong>.</span>
      </div>
    </div>
  );
};
