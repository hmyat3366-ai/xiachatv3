import React, { useState } from 'react';
import { Sparkles, UserCheck, ArrowRight, HeartHandshake } from 'lucide-react';

export const AIHumanSection: React.FC = () => {
  const [step, setStep] = useState<number>(3); // 1, 2, 3

  const flowSteps = [
    { num: '01', title: 'CUSTOMER', desc: 'Inquiry arrives from Web, WhatsApp or Email.' },
    { num: '02', title: 'AI UNDERSTANDS', desc: 'Xia AI checks your verified knowledge base.' },
    { num: '03', title: 'AI RESPONDS', desc: 'Routine questions answered in under 2 seconds.' },
    { num: '04', title: 'HUMAN HANDOFF', desc: 'Complex requests seamlessly route to team.' }
  ];

  return (
    <section className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5]">
      {/* Section Header */}
      <div className="text-center max-w-[860px] mx-auto mb-16">
        <span className="text-xs font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30 inline-flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-[#FF8A2A]" />
          Signature Collaboration Model
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          AI handles the routine. <br className="hidden sm:inline" />
          <span className="text-[#FF8A2A]">Your team handles what matters.</span>
        </h2>
        <p className="text-lg sm:text-xl text-[#6B6B6B] mt-5 max-w-[700px] mx-auto font-normal">
          Xia Chat is built to empower your support team—not replace them. Let AI triage FAQs while your humans focus on high-value relationships.
        </p>
      </div>

      {/* Visual Flow Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
        {flowSteps.map((s, idx) => (
          <div 
            key={idx} 
            className="bg-white border border-[#E8E8E5] rounded-[28px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-black text-[#FF8A2A] bg-[#FFF0E5] px-3 py-1 rounded-full border border-[#FF8A2A]/20">
                {s.num}
              </span>
              {idx < 3 && <ArrowRight className="w-4 h-4 text-gray-300 hidden lg:block" />}
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wider text-[#171717] uppercase mb-1">{s.title}</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-medium">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Large Signature Conversation UI Box */}
      <div className="bg-white border border-[#E8E8E5] rounded-[36px] p-6 sm:p-12 max-w-[960px] mx-auto subtle-card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8E8E5] pb-5 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-base font-black text-[#171717]">Live Collaboration Simulator</div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${step === 1 ? 'bg-[#FF8A2A] text-white shadow-xs' : 'bg-[#F7F7F5] text-[#6B6B6B]'}`}
            >
              1. Customer Ask
            </button>
            <button
              onClick={() => setStep(2)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${step === 2 ? 'bg-[#FF8A2A] text-white shadow-xs' : 'bg-[#F7F7F5] text-[#6B6B6B]'}`}
            >
              2. AI Response
            </button>
            <button
              onClick={() => setStep(3)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${step === 3 ? 'bg-[#FF8A2A] text-white shadow-xs' : 'bg-[#F7F7F5] text-[#6B6B6B]'}`}
            >
              3. Human Handoff
            </button>
          </div>
        </div>

        {/* Conversation Box */}
        <div className="bg-[#F7F7F5] rounded-[28px] p-5 sm:p-8 border border-[#E8E8E5] space-y-5">
          
          {/* Customer Message */}
          <div className="flex items-start gap-3.5 max-w-[88%]">
            <div className="w-9 h-9 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center font-extrabold text-xs text-gray-700 shadow-2xs">
              JS
            </div>
            <div>
              <div className="text-[11px] text-[#6B6B6B] mb-1 font-bold">Jane Smith • Webchat Customer</div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-xs border border-[#E8E8E5] text-sm sm:text-base text-[#171717] font-medium shadow-2xs">
                "Can I change my delivery address?"
              </div>
            </div>
          </div>

          {/* AI Response (Step >= 2) */}
          {step >= 2 && (
            <div className="flex items-start gap-3.5 max-w-[90%] ml-auto justify-end">
              <div className="text-right">
                <div className="text-[11px] text-[#D96512] mb-1 font-black flex items-center justify-end gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF8A2A]" /> Xia AI Assistant
                </div>
                <div className="bg-[#FFF0E5] p-4 rounded-2xl rounded-tr-xs border border-[#FF8A2A]/40 text-sm sm:text-base text-[#171717] font-medium shadow-2xs">
                  "Absolutely. Let me check your order."
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#FF8A2A] text-white flex-shrink-0 flex items-center justify-center font-black text-xs shadow-2xs">
                Xia
              </div>
            </div>
          )}

          {/* Handoff Banner (Step >= 3) */}
          {step >= 3 && (
            <div className="my-6 flex flex-col items-center justify-center">
              <div className="bg-white px-5 py-2.5 rounded-full border border-emerald-300 shadow-xs flex items-center gap-2.5 text-xs sm:text-sm font-black text-emerald-800">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Human agent joined the conversation</span>
              </div>
            </div>
          )}

          {/* Human Agent Response (Step >= 3) */}
          {step >= 3 && (
            <div className="flex items-start gap-3.5 max-w-[90%] ml-auto justify-end">
              <div className="text-right">
                <div className="text-[11px] text-[#171717] mb-1 font-extrabold">
                  Alex Morgan (Senior Support Lead)
                </div>
                <div className="bg-[#171717] text-white p-4 rounded-2xl rounded-tr-xs text-sm sm:text-base font-medium shadow-2xs">
                  "Hi Jane! I've updated your delivery address to 742 Evergreen Terrace. You'll receive a confirmation email shortly."
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#171717] text-white flex-shrink-0 flex items-center justify-center font-black text-xs shadow-2xs">
                AM
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
