import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const faqs: FAQItem[] = [
    {
      question: 'What is Xia Chat?',
      answer: 'Xia Chat is an AI-powered customer communication platform built for small businesses, e-commerce stores, and agencies. It unifies your customer messages from WhatsApp, Shopify, Webchat, and Email into one organized workspace while combining autonomous AI assistance with human team support.'
    },
    {
      question: 'How does the AI work?',
      answer: 'Xia Chat uses advanced natural language AI trained on your uploaded business documentation (FAQs, website content, product catalogs). When a customer sends a message, Xia AI analyzes the intent, retrieves accurate facts from your knowledge base, and formulates a helpful response in under 2 seconds.'
    },
    {
      question: 'Can I connect multiple customer channels?',
      answer: 'Yes! Xia Chat connects directly to WhatsApp Business, Shopify, WooCommerce, Webchat widgets, and Email. All messages flow into a single unified inbox so your team never needs to switch between apps.'
    },
    {
      question: 'Can my team take over an AI conversation?',
      answer: 'Absolutely. Xia Chat is designed around AI + Human collaboration. At any moment during a live chat, human agents can step in with a single click, taking over full control of the conversation without losing any chat history or context.'
    },
    {
      question: 'Can I train Xia Chat with my own business knowledge?',
      answer: 'Yes, training takes just a few minutes. You can paste your website URL, upload PDF manuals, or add custom Q&As directly in your dashboard. Xia AI continuously syncs with your updates so answers stay accurate.'
    },
    {
      question: 'Is Xia Chat suitable for small businesses?',
      answer: 'Xia Chat was specifically built with small online businesses, e-commerce stores, and small support teams in mind. It provides enterprise-grade customer support automation without complex code or high costs.'
    },
    {
      question: 'Is there a free plan?',
      answer: 'We offer a 14-day free trial with full access to all features so you can test Xia Chat with your team. We also offer flexible Starter plans designed for early-stage businesses.'
    }
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-28 px-4 sm:px-8 max-w-[1040px] mx-auto border-t border-[#E8E8E5] scroll-mt-24">
      {/* Section Header */}
      <div className="text-center max-w-[760px] mx-auto mb-16">
        <span className="text-xs font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30 inline-flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#FF8A2A]" />
          Clear Answers
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          Frequently asked questions
        </h2>
        <p className="text-lg sm:text-xl text-[#6B6B6B] mt-5 font-normal">
          Everything you need to know about Xia Chat, AI support, and setup.
        </p>
      </div>

      {/* Clean Accordion List */}
      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`bg-white border rounded-[28px] transition-all duration-300 overflow-hidden ${
                isOpen 
                  ? 'border-[#FF8A2A] shadow-xs ring-1 ring-[#FF8A2A]/20' 
                  : 'border-[#E8E8E5] hover:border-[#171717]/20'
              }`}
            >
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full p-6 sm:p-7 text-left flex items-center justify-between gap-5 font-extrabold text-lg sm:text-xl text-[#171717] focus:outline-none"
              >
                <span>{faq.question}</span>
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                    isOpen ? 'bg-[#FFF0E5] text-[#FF8A2A] rotate-180' : 'bg-[#F7F7F5] text-gray-500'
                  }`}
                >
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              {isOpen && (
                <div className="px-6 sm:px-7 pb-7 text-base sm:text-lg text-[#6B6B6B] leading-relaxed border-t border-[#E8E8E5]/50 pt-5 font-normal animate-in fade-in duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
