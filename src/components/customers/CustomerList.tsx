import React, { useState, useEffect } from 'react';
import type { Customer, CustomerFilterOption, CustomerSortOption } from '../../types/customer';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Trash2,
  ExternalLink,
  Tag,
  CheckCircle2,
  Building,
} from 'lucide-react';

interface CustomerListProps {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  stats: { total: number; active: number; new: number; vip: number };
  onSelectCustomer: (customerId: string) => void;
  onAddCustomerClick: () => void;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: CustomerFilterOption) => void;
  onSortChange: (sort: CustomerSortOption) => void;
  onPageChange: (newPage: number) => void;
  onToggleBlock: (customerId: string) => Promise<void>;
  onDeleteClick: (customer: Customer) => void;
  isLoading: boolean;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  total,
  page,
  totalPages,
  stats,
  onSelectCustomer,
  onAddCustomerClick,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onPageChange,
  onToggleBlock,
  onDeleteClick,
  isLoading,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<CustomerFilterOption>('all');
  const [activeSort, setActiveSort] = useState<CustomerSortOption>('recently_active');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Debounced search handling
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  const handleFilterSelect = (filter: CustomerFilterOption) => {
    setActiveFilter(filter);
    onFilterChange(filter);
  };

  const handleSortSelect = (sort: CustomerSortOption) => {
    setActiveSort(sort);
    onSortChange(sort);
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">Customers</h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Manage and understand everyone who interacts with your business.
          </p>
        </div>

        <button
          onClick={onAddCustomerClick}
          className="px-4 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Total Customers</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Active Contacts</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">New Contacts</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.new}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">VIP / Enterprise</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.vip}</p>
          </div>
        </div>
      </div>

      {/* Prominent Debounced Search, Filter Pills & Sort Menu */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E8E5] rounded-2xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['all', 'active', 'new', 'returning', 'vip'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterSelect(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                  activeFilter === f
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <select
            value={activeSort}
            onChange={(e) => handleSortSelect(e.target.value as CustomerSortOption)}
            className="px-3 py-1.5 bg-white border border-[#E8E8E5] rounded-xl text-xs font-bold text-[#171717] focus:outline-none focus:border-[#FF8A2A] cursor-pointer"
          >
            <option value="recently_active">Recently Active</option>
            <option value="recently_added">Recently Added</option>
            <option value="most_conversations">Most Conversations</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
          </select>
        </div>
      </div>

      {/* Customer List / Table View */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-12 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-extrabold text-[#171717]">No customers yet</h3>
            <p className="text-xs text-[#6B6B6B]">
              Customers will appear here automatically when they start conversations with your business via Website Chat or social channels.
            </p>
          </div>
          <button
            onClick={onAddCustomerClick}
            className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#171717]">
              <thead className="bg-[#FAF9F6] border-b border-[#E8E8E5] text-[11px] font-extrabold text-[#6B6B6B] uppercase tracking-wider">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Tags</th>
                  <th className="p-4">Conversations</th>
                  <th className="p-4">Last Active</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E5]/70">
                {customers.map((customer) => {
                  const isMenuOpen = activeMenuId === customer.id;

                  return (
                    <tr key={customer.id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#171717] text-[#FF8A2A] font-extrabold flex items-center justify-center text-sm shrink-0">
                            {customer.avatar}
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectCustomer(customer.id)}
                              className="font-extrabold text-xs text-[#171717] hover:text-[#FF8A2A] text-left transition-colors cursor-pointer block"
                            >
                              {customer.name}
                            </button>
                            {customer.company && (
                              <p className="text-[10px] text-[#6B6B6B] flex items-center gap-1 mt-0.5">
                                <Building className="w-3 h-3" /> {customer.company}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 space-y-0.5">
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-[#171717]">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.length > 0 ? (
                            customer.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tag === 'VIP' || tag === 'Enterprise'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400">No tags</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 font-bold text-[#171717]">
                          <MessageSquare className="w-3.5 h-3.5 text-[#FF8A2A]" /> {customer.totalConversations} chats
                        </span>
                      </td>

                      <td className="p-4 text-[#6B6B6B] text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {new Date(customer.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            customer.status === 'blocked'
                              ? 'bg-red-100 text-red-800'
                              : customer.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {customer.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveMenuId(isMenuOpen ? null : customer.id)}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#E8E8E5] rounded-2xl shadow-lg p-1.5 z-20 space-y-1 text-left">
                              <button
                                onClick={() => {
                                  onSelectCustomer(customer.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FFF0E5] hover:text-[#FF8A2A] flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View Profile
                              </button>

                              <button
                                onClick={() => {
                                  onToggleBlock(customer.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                {customer.status === 'blocked' ? 'Unblock Customer' : 'Block Customer'}
                              </button>

                              <div className="border-t border-[#E8E8E5] my-1" />

                              <button
                                onClick={() => {
                                  onDeleteClick(customer);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#E8E8E5] flex items-center justify-between bg-[#FAF9F6] text-xs font-bold text-[#6B6B6B]">
              <span>Page {page} of {totalPages} ({total} total customers)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
