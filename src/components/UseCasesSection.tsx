import React from 'react';
import { ShoppingBag, Building2, Headphones, Package, MessageSquare, CheckCircle } from 'lucide-react';

export const UseCasesSection: React.FC = () => {
  const useCases = [
    {
      id: 'ecom',
      title: 'Online Stores',
      subtitle: 'Handle product, order and delivery questions faster.',
      description: 'Integrate directly with Shopify or WooCommerce to answer tracking, sizing, and refund questions automatically.',
      icon: <ShoppingBag className="w-6 h-6 text-[#FF8A2A]" />,
      features: ['Order tracking lookups', 'Returns & Exchanges AI', 'Product sizing advice'],
      uiPreview: (
        <div className="bg-[#F7F7F5] rounded-2xl p-4 border border-[#E8E8E5] mt-6">
          <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-[#FF8A2A]" />
              <div>
                <div className="font-extrabold text-[#171717]">Order #8492 Status</div>
                <div className="text-[10px] text-[#6B6B6B] font-medium">Out for delivery via FedEx</div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded">Auto-Answered</span>
          </div>
        </div>
      )
    },
    {
      id: 'agencies',
      title: 'Small Agencies',
      subtitle: 'Manage leads and client conversations from one workspace.',
      description: 'Capture inbound client leads from your website and WhatsApp without losing prospective project opportunities.',
      icon: <Building2 className="w-6 h-6 text-[#FF8A2A]" />,
      features: ['24/7 lead qualification', 'Multi-client workspace', 'CRM lead sync'],
      uiPreview: (
        <div className="bg-[#F7F7F5] rounded-2xl p-4 border border-[#E8E8E5] mt-6">
          <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-extrabold text-[#171717]">Inbound Retainer Lead</div>
                <div className="text-[10px] text-[#6B6B6B] font-medium">Qualified $5k/mo budget</div>
              </div>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded">High Intent</span>
          </div>
        </div>
      )
    },
    {
      id: 'support-teams',
      title: 'Small Support Teams',
      subtitle: 'Reduce repetitive work and focus on important conversations.',
      description: 'Eliminate agent burnout by letting Xia AI filter out low-tier repetitive tickets, leaving your humans for complex cases.',
      icon: <Headphones className="w-6 h-6 text-[#FF8A2A]" />,
      features: ['Automatic ticket routing', 'Collaborative private notes', 'CSAT metric tracking'],
      uiPreview: (
        <div className="bg-[#F7F7F5] rounded-2xl p-4 border border-[#E8E8E5] mt-6">
          <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <div>
                <div className="font-extrabold text-[#171717]">Team Backlog Reduced</div>
                <div className="text-[10px] text-[#6B6B6B] font-medium">78% automated resolution</div>
              </div>
            </div>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded">Efficiency</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <section id="use-cases" className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5] scroll-mt-24">
      {/* Section Header */}
      <div className="text-center max-w-[840px] mx-auto mb-20">
        <span className="text-xs font-black uppercase tracking-wider text-[#FF8A2A] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30">
          Tailored Use Cases
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          Built for teams that talk to customers every day.
        </h2>
      </div>

      {/* 3 Large Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {useCases.map((uc) => (
          <div
            key={uc.id}
            className="bg-white border border-[#E8E8E5] rounded-[36px] p-8 sm:p-9 subtle-card-shadow hover-card-shadow flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#FFF0E5] border border-[#FF8A2A]/30 flex items-center justify-center mb-6 shadow-2xs">
                {uc.icon}
              </div>

              <h3 className="text-2xl font-black text-[#171717] mb-2">{uc.title}</h3>
              <p className="text-xs font-black text-[#D96512] mb-3">{uc.subtitle}</p>
              <p className="text-sm text-[#6B6B6B] leading-relaxed mb-6 font-medium">{uc.description}</p>

              {/* Bullet points */}
              <div className="space-y-2.5 mb-6">
                {uc.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-[#171717]">
                    <span className="w-2 h-2 rounded-full bg-[#FF8A2A]" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Miniature Product Interface */}
            {uc.uiPreview}
          </div>
        ))}
      </div>
    </section>
  );
};
