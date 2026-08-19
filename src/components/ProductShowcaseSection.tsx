import React, { useState } from 'react';
import { 
  Inbox, 
  Sparkles, 
  BookOpen, 
  Users, 
  FileText,
  TrendingUp
} from 'lucide-react';

export const ProductShowcaseSection: React.FC = () => {
  const [selectedFeatureTab, setSelectedFeatureTab] = useState<'inbox' | 'ai' | 'knowledge' | 'team'>('inbox');

  return (
    <section className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5]">
      {/* Section Header */}
      <div className="text-center max-w-[880px] mx-auto mb-16">
        <span className="text-xs font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30">
          Product Reveal Tour
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          Everything your team needs to <br className="hidden sm:inline" />
          <span className="text-[#FF8A2A]">stay in the conversation.</span>
        </h2>
        <p className="text-lg sm:text-xl text-[#6B6B6B] mt-5 font-normal">
          Explore the exact features and capabilities powering modern e-commerce and agency support workflows.
        </p>
      </div>

      {/* Interactive Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 mb-12">
        <button
          onClick={() => setSelectedFeatureTab('inbox')}
          className={`px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            selectedFeatureTab === 'inbox' 
              ? 'bg-[#171717] text-white shadow-md' 
              : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
          }`}
        >
          <Inbox className="w-4 h-4 text-[#FF8A2A]" />
          <span>Unified Inbox</span>
        </button>

        <button
          onClick={() => setSelectedFeatureTab('ai')}
          className={`px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            selectedFeatureTab === 'ai' 
              ? 'bg-[#171717] text-white shadow-md' 
              : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#FF8A2A]" />
          <span>AI Responses</span>
        </button>

        <button
          onClick={() => setSelectedFeatureTab('knowledge')}
          className={`px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            selectedFeatureTab === 'knowledge' 
              ? 'bg-[#171717] text-white shadow-md' 
              : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#FF8A2A]" />
          <span>Knowledge Base</span>
        </button>

        <button
          onClick={() => setSelectedFeatureTab('team')}
          className={`px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            selectedFeatureTab === 'team' 
              ? 'bg-[#171717] text-white shadow-md' 
              : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
          }`}
        >
          <Users className="w-4 h-4 text-[#FF8A2A]" />
          <span>Team & Assignment</span>
        </button>
      </div>

      {/* Large Full-Width Showcase Frame */}
      <div className="bg-white border border-[#E8E8E5] rounded-[36px] sm:rounded-[44px] p-7 sm:p-10 subtle-card-shadow">
        
        {/* TAB 1: UNIFIED INBOX */}
        {selectedFeatureTab === 'inbox' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-2xl font-black text-[#171717]">Unified Multi-Channel Stream</h3>
                <p className="text-xs sm:text-sm text-[#6B6B6B] font-medium">All incoming messages across WhatsApp, Webchat, Email, and Instagram routed instantly.</p>
              </div>
              <span className="text-xs bg-[#FFF0E5] text-[#D96512] font-black px-3.5 py-1.5 rounded-full border border-[#FF8A2A]/30">
                100% Real-time Sync
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#F7F7F5] p-5 rounded-2xl border border-[#E8E8E5]">
                <div className="text-xs font-black text-[#171717] mb-1">Channel Filtering</div>
                <div className="text-[11px] text-[#6B6B6B] mb-4 font-medium">Group messages by source or agent tag</div>
                <div className="space-y-2.5">
                  <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs flex justify-between shadow-2xs font-bold">
                    <span>Shopify Store</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">18 Active</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs flex justify-between shadow-2xs font-bold">
                    <span>WhatsApp Business</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded">9 Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F7F7F5] p-5 rounded-2xl border border-[#E8E8E5]">
                <div className="text-xs font-black text-[#171717] mb-1">Smart Priority Triage</div>
                <div className="text-[11px] text-[#6B6B6B] mb-4 font-medium">AI ranks urgent inquiries automatically</div>
                <div className="space-y-2.5">
                  <div className="bg-white p-3 rounded-xl border border-rose-200 text-xs flex justify-between shadow-2xs font-bold">
                    <span className="text-rose-700">High Value Refund</span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded">Urgent</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs flex justify-between shadow-2xs font-bold">
                    <span>Standard Shipping FAQ</span>
                    <span className="text-[10px] bg-[#FFF0E5] text-[#D96512] font-extrabold px-2 py-0.5 rounded">AI Handled</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F7F7F5] p-5 rounded-2xl border border-[#E8E8E5]">
                <div className="text-xs font-black text-[#171717] mb-1">Status Tracking</div>
                <div className="text-[11px] text-[#6B6B6B] mb-4 font-medium">Open, Pending, Handoff, and Resolved</div>
                <div className="space-y-2.5">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs flex justify-between shadow-2xs font-bold">
                    <span className="text-emerald-800">Resolved Today</span>
                    <span className="text-[10px] font-black text-emerald-700">142 Tickets</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs flex justify-between shadow-2xs font-bold">
                    <span>Average Wait Time</span>
                    <span className="text-[10px] font-black text-[#171717]">48 seconds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI RESPONSES */}
        {selectedFeatureTab === 'ai' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-2xl font-black text-[#171717]">Autonomous AI Customer Assistant</h3>
                <p className="text-xs sm:text-sm text-[#6B6B6B] font-medium">Context-aware AI trained on your exact business voice, tone, and policies.</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-extrabold px-3.5 py-1.5 rounded-full border border-emerald-200">
                GPT-4o Precision Engine
              </span>
            </div>

            <div className="bg-[#F7F7F5] p-6 rounded-2xl border border-[#E8E8E5] space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-[#171717]">
                <Sparkles className="w-4 h-4 text-[#FF8A2A]" />
                <span>Sample AI Automated Resolution:</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-[#E8E8E5] space-y-3 text-xs sm:text-sm shadow-2xs">
                <div className="font-extrabold text-[#171717]">Q: "Do you ship internationally to Canada and Australia?"</div>
                <div className="text-[#6B6B6B] bg-[#FFF0E5] p-4 rounded-xl border border-[#FF8A2A]/20 font-medium leading-relaxed">
                  "Yes, we ship to Canada and Australia! Standard shipping takes 4-7 business days, and orders over $100 CAD / AUD qualify for free express delivery."
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 font-bold">
                  <span>Knowledge Match: Shipping Rules v2.4</span>
                  <span className="text-emerald-600">Confidence Score: 99.8%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KNOWLEDGE BASE */}
        {selectedFeatureTab === 'knowledge' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-2xl font-black text-[#171717]">Centralized Knowledge Base</h3>
                <p className="text-xs sm:text-sm text-[#6B6B6B] font-medium">Sync website links, PDF manuals, and Google Docs in seconds.</p>
              </div>
              <span className="text-xs bg-purple-50 text-purple-700 font-extrabold px-3.5 py-1.5 rounded-full border border-purple-200">
                Instant Auto-Sync
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F7F7F5] p-5 rounded-2xl border border-[#E8E8E5]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-[#171717] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Connected Documents</span>
                  </span>
                  <span className="text-[10px] bg-white px-2.5 py-1 rounded font-extrabold">14 Files</span>
                </div>
                <div className="space-y-2.5 text-xs font-bold">
                  <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] flex justify-between shadow-2xs">
                    <span>Return_Policy_2026.pdf</span>
                    <span className="text-[#D96512]">Indexed</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] flex justify-between shadow-2xs">
                    <span>Product_Sizing_Guide.docx</span>
                    <span className="text-[#D96512]">Indexed</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F7F7F5] p-5 rounded-2xl border border-[#E8E8E5]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-[#171717] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>AI Accuracy Rating</span>
                  </span>
                  <span className="text-xs font-black text-emerald-700">99.4%</span>
                </div>
                <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed font-medium">
                  Your AI assistant strictly adheres to your verified documentation, avoiding hallucinations or inaccurate statements.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEAM & ASSIGNMENT */}
        {selectedFeatureTab === 'team' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-2xl font-black text-[#171717]">Collaborative Agent Routing</h3>
                <p className="text-xs sm:text-sm text-[#6B6B6B] font-medium">Assign tickets by language, skill, or workload automatically.</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 font-extrabold px-3.5 py-1.5 rounded-full border border-blue-200">
                Team Workflows
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#F7F7F5] p-5 rounded-2xl border border-[#E8E8E5] text-xs space-y-2.5">
                <div className="font-black text-[#171717]">Alex Morgan</div>
                <div className="text-[10px] text-[#6B6B6B] font-semibold">Operations & VIP Sales</div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E8E8E5] flex justify-between font-bold shadow-2xs">
                  <span>Active Tickets</span>
                  <span className="text-[#FF8A2A]">4</span>
                </div>
              </div>

              <div className="bg-[#F7F7F5] p-5 rounded-2xl border border-[#E8E8E5] text-xs space-y-2.5">
                <div className="font-black text-[#171717]">Sarah Jenkins</div>
                <div className="text-[10px] text-[#6B6B6B] font-semibold">Technical & Refunds</div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E8E8E5] flex justify-between font-bold shadow-2xs">
                  <span>Active Tickets</span>
                  <span className="text-[#FF8A2A]">2</span>
                </div>
              </div>

              <div className="bg-[#F7F7F5] p-5 rounded-2xl border border-[#E8E8E5] text-xs space-y-2.5">
                <div className="font-black text-[#171717]">Xia AI Engine</div>
                <div className="text-[10px] text-[#D96512] font-black">Automated Triage</div>
                <div className="bg-[#FFF0E5] p-2.5 rounded-xl border border-[#FF8A2A]/30 flex justify-between font-extrabold text-[#D96512] shadow-2xs">
                  <span>Active Automated</span>
                  <span>28</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
