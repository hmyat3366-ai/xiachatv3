import React from 'react';
import { Star, Quote } from 'lucide-react';

export const SocialProofSection: React.FC = () => {
  const logos = [
    { name: 'Northline', icon: '✦' },
    { name: 'Looma', icon: '●' },
    { name: 'Nova', icon: '▲' },
    { name: 'Orbit', icon: '⬡' },
    { name: 'Mono', icon: '◼' },
  ];

  return (
    <section className="py-24 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5]">
      {/* Spacious Testimonial Trust Box */}
      <div className="bg-white border border-[#E8E8E5] rounded-[36px] p-8 sm:p-14 max-w-[1000px] mx-auto subtle-card-shadow relative overflow-hidden">
        {/* Soft Warm Background Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FFF0E5] rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 text-center md:text-left relative z-10">
          {/* Avatar with Ring */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#171717] text-white p-1 ring-4 ring-[#FFF0E5] shadow-md flex items-center justify-center font-bold text-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                alt="Alex Morgan"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute">AM</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#FF8A2A] text-white p-2 rounded-full border-2 border-white shadow-xs">
              <Quote className="w-4 h-4 fill-current" />
            </div>
          </div>

          {/* Testimonial Content */}
          <div className="flex-1">
            <div className="flex items-center justify-center md:justify-start gap-1 text-[#FF8A2A] mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4.5 h-4.5 fill-[#FF8A2A]" />
              ))}
              <span className="text-xs font-bold text-[#171717] ml-2 bg-[#FFF0E5] px-2.5 py-0.5 rounded-full border border-[#FF8A2A]/20">
                5.0 Rated by Support Teams
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight mb-4 leading-snug">
              Built to make customer conversations easier.
            </h2>

            <blockquote className="text-lg sm:text-xl text-[#6B6B6B] italic font-normal leading-relaxed mb-6">
              "Xia Chat gives our team one place to manage conversations without constantly switching between platforms."
            </blockquote>

            <div>
              <div className="font-extrabold text-[#171717] text-base sm:text-lg">Alex Morgan</div>
              <div className="text-xs sm:text-sm text-[#6B6B6B] font-semibold">Operations Manager</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Fictional Logo Strip */}
      <div className="mt-16 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] mb-10">
          Trusted by fast-growing online stores & agencies
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 opacity-55 hover:opacity-100 transition-opacity">
          {logos.map((logo) => (
            <div 
              key={logo.name} 
              className="flex items-center gap-2.5 text-lg sm:text-xl font-black tracking-tight text-[#171717] cursor-default"
            >
              <span className="text-[#FF8A2A] text-xl">{logo.icon}</span>
              <span>{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
