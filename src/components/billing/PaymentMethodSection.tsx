import React from 'react';
import type { PaymentMethod } from '../../types/billing';
import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';

interface PaymentMethodSectionProps {
  paymentMethod: PaymentMethod | null;
  onOpenPortal: () => void;
  canManageBilling: boolean;
  isActionLoading: boolean;
}

export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({
  paymentMethod,
  onOpenPortal,
  canManageBilling,
  isActionLoading,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[#171717] tracking-tight">Payment Method</h3>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Primary card used for recurring plan subscriptions and usage invoices.
          </p>
        </div>

        {canManageBilling && paymentMethod && (
          <button
            onClick={onOpenPortal}
            disabled={isActionLoading}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E8E8E5] hover:bg-[#FAF9F6] text-[#171717] text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
          >
            <span>Update Method</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#6B6B6B]" />
          </button>
        )}
      </div>

      {paymentMethod ? (
        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
              {paymentMethod.brand.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#171717]">
                {paymentMethod.brand} ending in <span className="font-mono">{paymentMethod.last4}</span>
              </p>
              {paymentMethod.expMonth && paymentMethod.expYear && (
                <p className="text-xs text-[#6B6B6B] font-medium">
                  Expires {String(paymentMethod.expMonth).padStart(2, '0')}/{paymentMethod.expYear}
                </p>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted & Secured by Stripe</span>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-dashed border-[#E8E8E5] text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8E8E5] flex items-center justify-center mx-auto text-[#6B6B6B]">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#171717]">No Payment Method On File</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Your workspace is currently on the Free plan. Adding a payment method allows instant tier upgrades.
            </p>
          </div>
          {canManageBilling && (
            <button
              onClick={onOpenPortal}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <span>Add Payment Method</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
