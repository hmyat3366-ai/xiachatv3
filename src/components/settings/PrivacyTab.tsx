import React from 'react';
import { Database, Download, ShieldCheck, Lock } from 'lucide-react';

interface PrivacyTabProps {
  onExportData: () => void;
}

export const PrivacyTab: React.FC<PrivacyTabProps> = ({ onExportData }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">Privacy & Data Controls</h2>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Manage data retention, privacy settings, and download your account data archive.</p>
      </div>

      {/* Export Data Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-[#171717]">Export My Data</h3>
            <p className="text-xs text-[#6B6B6B]">Download a secure JSON archive containing your account profile and workspace metadata.</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#6B6B6B] space-y-1">
          <p className="font-bold text-[#171717] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" /> Data Privacy Safeguard
          </p>
          <p className="text-[11px]">
            Data exports include sanitized account metadata and workspace configurations. Private passwords and authorization secrets are strictly excluded.
          </p>
        </div>

        <button
          onClick={onExportData}
          className="px-4 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Request Data Export (.JSON)</span>
        </button>
      </div>

      {/* Privacy Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <span className="font-extrabold text-xs text-[#171717] flex items-center gap-1.5">
            <Database className="w-4 h-4 text-blue-600" /> Data Retention Policy
          </span>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            Workspace conversations, messages, and customer records are retained indefinitely for training and analytics unless explicitly deleted.
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <span className="font-extrabold text-xs text-[#171717] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> AI Training Transparency
          </span>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            Your customer conversations are strictly isolated to your workspace. Customer data is never sold or shared with external model trainers.
          </p>
        </div>
      </div>
    </div>
  );
};
