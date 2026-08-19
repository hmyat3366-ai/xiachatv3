import React from 'react';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#E8E8E5] pt-20 pb-14 px-4 sm:px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 pb-14 border-b border-[#E8E8E5]">
          
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-5">
            <a href="#" className="inline-block">
              <Logo variant="full" size="md" />
            </a>
            <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-[360px] font-medium">
              One inbox for every customer conversation. Combining AI assistance with human support for small businesses and e-commerce.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-[#D96512] bg-[#FFF0E5] px-3.5 py-1.5 rounded-full w-fit border border-[#FF8A2A]/20">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A2A] animate-pulse" />
              <span>Systems Operational • 99.99% Uptime</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-black text-[#171717] text-sm mb-5 uppercase tracking-wider">Product</h4>
            <ul className="space-y-3 text-xs text-[#6B6B6B] font-semibold">
              <li><a href="#features" className="hover:text-[#171717] transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-[#171717] transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-[#171717] transition-colors">Pricing</a></li>
              <li><a href="#product" className="hover:text-[#171717] transition-colors">Integrations</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-black text-[#171717] text-sm mb-5 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3 text-xs text-[#6B6B6B] font-semibold">
              <li><a href="#" className="hover:text-[#171717] transition-colors">About</a></li>
              <li><a href="#" className="hover:text-[#171717] transition-colors">Contact</a></li>
              <li>
                <a href="#" className="hover:text-[#171717] transition-colors flex items-center gap-1.5">
                  <span>Careers</span>
                  <span className="bg-[#FFF0E5] text-[#D96512] text-[9px] font-extrabold px-1.5 py-0.5 rounded">Hiring</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-black text-[#171717] text-sm mb-5 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3 text-xs text-[#6B6B6B] font-semibold">
              <li><a href="#" className="hover:text-[#171717] transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-[#171717] transition-colors">Documentation</a></li>
              <li><a href="#faq" className="hover:text-[#171717] transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-[#171717] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#171717] transition-colors">Terms of Service</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B6B6B] font-semibold">
          <div>© 2026 Xia Chat. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#171717] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#171717] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#171717] transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
