import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

interface NavbarProps {
  onOpenCTA?: () => void;
  onOpenSignup?: () => void;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCTA, onOpenSignup, onNavigate }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 pt-4 sm:pt-6 transition-all duration-300 pointer-events-none">
      <div 
        className={`max-w-[1280px] mx-auto rounded-full px-6 py-3.5 transition-all duration-300 flex items-center justify-between border pointer-events-auto ${
          isScrolled 
            ? 'bg-[#FFFFFF]/95 backdrop-blur-md border-[#E8E8E5] shadow-sm' 
            : 'bg-[#FFFFFF] border-[#E8E8E5] shadow-[0_2px_16px_rgba(0,0,0,0.03)]'
        }`}
      >
        {/* Logo */}
        <a 
          href="#" 
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate('/');
            }
          }}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <Logo variant="full" size="md" />
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-[14px] font-semibold text-[#6B6B6B]">
          <a href="#product" className="hover:text-[#171717] transition-colors">Product</a>
          <a href="#features" className="hover:text-[#171717] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[#171717] transition-colors">How It Works</a>
          <a href="#use-cases" className="hover:text-[#171717] transition-colors">Use Cases</a>
          <a href="#pricing" className="hover:text-[#171717] transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-[#171717] transition-colors">FAQ</a>
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate && onNavigate('/dashboard')}
                className="px-4 py-2 rounded-full bg-[#FAF9F6] border border-[#E8E8E5] hover:bg-[#FFF0E5] hover:border-[#FF8A2A] text-[#171717] text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#FF8A2A] text-white text-xs font-bold flex items-center justify-center">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>Dashboard</span>
                <LayoutDashboard className="w-4 h-4 text-[#FF8A2A]" />
              </button>

              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onOpenCTA}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-[#171717] hover:bg-[#F7F7F5] transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={onOpenSignup || onOpenCTA}
                className="px-5 py-2.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white text-sm font-semibold shadow-xs transition-all duration-200 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-full text-[#171717] hover:bg-[#F7F7F5] transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 mx-auto max-w-[1280px] bg-[#FFFFFF] border border-[#E8E8E5] rounded-3xl p-6 shadow-xl flex flex-col gap-4 pointer-events-auto">
          <nav className="flex flex-col gap-3 font-semibold text-base text-[#171717]">
            <a 
              href="#product" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl hover:bg-[#F7F7F5]"
            >
              Product
            </a>
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl hover:bg-[#F7F7F5]"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl hover:bg-[#F7F7F5]"
            >
              How It Works
            </a>
            <a 
              href="#use-cases" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl hover:bg-[#F7F7F5]"
            >
              Use Cases
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl hover:bg-[#F7F7F5]"
            >
              Pricing
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl hover:bg-[#F7F7F5]"
            >
              FAQ
            </a>
          </nav>

          <div className="pt-3 border-t border-[#E8E8E5] flex flex-col gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onNavigate) onNavigate('/dashboard');
                }}
                className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white text-center font-bold shadow-xs text-sm cursor-pointer"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenCTA) onOpenCTA();
                }}
                className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white text-center font-bold shadow-xs text-sm cursor-pointer"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
