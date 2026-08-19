import React from 'react';
import type { InvoiceItem } from '../../types/billing';
import { FileText, ExternalLink, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface InvoiceHistoryTableProps {
  invoices: InvoiceItem[];
}

export const InvoiceHistoryTable: React.FC<InvoiceHistoryTableProps> = ({ invoices }) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: InvoiceItem['status']) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
          icon: CheckCircle2,
        };
      case 'open':
        return {
          label: 'Open',
          style: 'bg-amber-50 text-amber-800 border-amber-200/60',
          icon: Clock,
        };
      case 'failed':
        return {
          label: 'Failed',
          style: 'bg-rose-50 text-rose-800 border-rose-200/60',
          icon: XCircle,
        };
      case 'void':
        return {
          label: 'Void',
          style: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          style: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: Clock,
        };
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
      <div>
        <h3 className="text-xl font-extrabold text-[#171717] tracking-tight">Billing History & Invoices</h3>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          View past subscription payments, download PDF receipts, and review tax invoices.
        </p>
      </div>

      {invoices.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#E8E8E5]">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-[#E8E8E5] bg-[#FAF9F6] text-xs font-bold text-[#6B6B6B]">
                <th className="p-3.5">Invoice</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Receipt / Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E5] text-xs text-[#171717]">
              {invoices.map((inv) => {
                const statusBadge = getStatusBadge(inv.status);
                const StatusIcon = statusBadge.icon;

                return (
                  <tr key={inv.id} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="p-3.5 font-bold font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="p-3.5 text-[#6B6B6B] font-medium">
                      {formatDate(inv.periodStart || inv.createdAt)}
                    </td>
                    <td className="p-3.5 font-extrabold">
                      ${inv.amountPaid.toFixed(2)} {inv.currency.toUpperCase()}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.style}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusBadge.label}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {inv.hostedInvoiceUrl ? (
                        <a
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-[#E8E8E5] hover:bg-[#FAF9F6] text-[#171717] font-bold text-xs transition-all"
                        >
                          <span>View Invoice</span>
                          <ExternalLink className="w-3 h-3 text-[#6B6B6B]" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No URL available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-[#FAF9F6] border border-dashed border-[#E8E8E5] text-center space-y-2">
          <FileText className="w-6 h-6 text-gray-400 mx-auto" />
          <p className="text-xs font-bold text-[#171717]">No Invoices Available Yet</p>
          <p className="text-xs text-[#6B6B6B]">
            Invoices will appear here automatically after your first paid plan subscription renewal.
          </p>
        </div>
      )}
    </div>
  );
};
