import React from 'react';
import { Mail, Phone, MapPin, Calendar, MessageSquare, ExternalLink, Globe } from 'lucide-react';
import type { CustomerProfile } from '../../types/inbox';

interface CustomerProfileCardProps {
  customer: CustomerProfile;
  className?: string;
}

export const CustomerProfileCard: React.FC<CustomerProfileCardProps> = ({ customer, className = '' }) => {
  const firstLetter = (customer.name || 'C').charAt(0).toUpperCase();

  const formattedDate = (() => {
    try {
      if (!customer.firstSeen) return 'Recently';
      return new Date(customer.firstSeen).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  })();

  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-4 ${className}`}>
      {/* Avatar & Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#FF8A3D] to-[#FFA85C] text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
          {firstLetter}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-sm text-slate-900 truncate">{customer.name || 'Anonymous Visitor'}</h4>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active" />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Globe className="w-3 h-3 text-slate-400" />
            {customer.channel || 'Website Live Chat'}
          </span>
        </div>
      </div>

      {/* Structured Details Grid */}
      <div className="space-y-2.5 pt-1 text-xs">
        {/* Email */}
        <div className="flex items-center justify-between gap-2 text-slate-600">
          <span className="flex items-center gap-2 text-slate-400 font-medium">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            Email
          </span>
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="font-medium text-slate-800 hover:text-[#FF8A3D] truncate max-w-[170px] transition-colors"
            >
              {customer.email}
            </a>
          ) : (
            <span className="text-slate-400 italic">Not provided</span>
          )}
        </div>

        {/* Phone */}
        <div className="flex items-center justify-between gap-2 text-slate-600">
          <span className="flex items-center gap-2 text-slate-400 font-medium">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            Phone
          </span>
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="font-medium text-slate-800 hover:text-[#FF8A3D] transition-colors"
            >
              {customer.phone}
            </a>
          ) : (
            <span className="text-slate-400 italic">Not provided</span>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center justify-between gap-2 text-slate-600">
          <span className="flex items-center gap-2 text-slate-400 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            Location
          </span>
          <span className="font-medium text-slate-800 truncate">
            {customer.location || 'San Francisco, CA'}
          </span>
        </div>

        {/* First Seen */}
        <div className="flex items-center justify-between gap-2 text-slate-600">
          <span className="flex items-center gap-2 text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            First Seen
          </span>
          <span className="font-medium text-slate-800">{formattedDate}</span>
        </div>

        {/* Total Conversations */}
        <div className="flex items-center justify-between gap-2 text-slate-600">
          <span className="flex items-center gap-2 text-slate-400 font-medium">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            Total Chats
          </span>
          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
            {customer.totalConversations || 1}
          </span>
        </div>
      </div>
    </div>
  );
};
