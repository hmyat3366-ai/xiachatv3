import React, { useState } from 'react';
import type { NotificationPreferences } from '../../types/settings';
import { Mail, Monitor, Save, Check, Loader2 } from 'lucide-react';

interface NotificationsTabProps {
  preferences: NotificationPreferences | null;
  onSave: (prefs: NotificationPreferences) => Promise<boolean>;
  isSaving: boolean;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ preferences, onSave, isSaving }) => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    preferences || {
      emailAssignedToMe: true,
      emailCustomerReplied: true,
      emailAiHandoff: true,
      emailTeamInvitation: true,
      emailChannelDisconnected: true,
      emailSystemAlerts: true,
      browserNewConversation: true,
      browserAiHandoff: true,
      browserMention: true,
      browserAssignment: true,
    }
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(prefs);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">Notification Preferences</h2>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Control when and how Xia Chat notifies you about customer activity.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-3">
            <Mail className="w-5 h-5 text-[#FF8A2A]" />
            <h3 className="font-extrabold text-base text-[#171717]">Email Notifications</h3>
          </div>

          <div className="space-y-3">
            {[
              { key: 'emailAssignedToMe', title: 'Conversation assigned to me', desc: 'Notify me when a customer chat is assigned to me' },
              { key: 'emailCustomerReplied', title: 'Customer replied', desc: 'Notify me when a customer replies to an active conversation' },
              { key: 'emailAiHandoff', title: 'AI handoff requested', desc: 'Notify me when Xia AI requests human assistance' },
              { key: 'emailTeamInvitation', title: 'Team invitation updates', desc: 'Notify me when new team members accept workspace invites' },
              { key: 'emailChannelDisconnected', title: 'Channel disconnected alert', desc: 'Alert me immediately if a channel integration loses connection' },
              { key: 'emailSystemAlerts', title: 'System and security alerts', desc: 'Important platform status updates and security notices' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E8E5] cursor-pointer hover:bg-[#FAF9F6]">
                <div>
                  <span className="font-extrabold text-xs text-[#171717] block">{item.title}</span>
                  <span className="text-[11px] text-[#6B6B6B]">{item.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(prefs[item.key as keyof NotificationPreferences])}
                  onChange={() => toggle(item.key as keyof NotificationPreferences)}
                  className="w-4 h-4 accent-[#FF8A2A] rounded-md cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Browser & In-App Notifications */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-3">
            <Monitor className="w-5 h-5 text-[#FF8A2A]" />
            <h3 className="font-extrabold text-base text-[#171717]">Browser & In-App Notifications</h3>
          </div>

          <div className="space-y-3">
            {[
              { key: 'browserNewConversation', title: 'New incoming conversation', desc: 'Show desktop popup when a new customer chat starts' },
              { key: 'browserAiHandoff', title: 'Immediate AI Handoff popups', desc: 'Pop up desktop notification when AI hands off a customer' },
              { key: 'browserMention', title: 'Mentions & Tagged notes', desc: 'Notify me when a teammate tags me in internal customer notes' },
              { key: 'browserAssignment', title: 'Assignment sound & alerts', desc: 'Play notification chime when assigned a new customer' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E8E5] cursor-pointer hover:bg-[#FAF9F6]">
                <div>
                  <span className="font-extrabold text-xs text-[#171717] block">{item.title}</span>
                  <span className="text-[11px] text-[#6B6B6B]">{item.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(prefs[item.key as keyof NotificationPreferences])}
                  onChange={() => toggle(item.key as keyof NotificationPreferences)}
                  className="w-4 h-4 accent-[#FF8A2A] rounded-md cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : savedSuccess ? 'Saved Preferences!' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
