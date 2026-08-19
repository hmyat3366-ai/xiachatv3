import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { 
  Building2, 
  Store, 
  Laptop, 
  ShoppingBag, 
  GraduationCap, 
  HelpCircle, 
  Globe, 
  MessageSquare, 
  Bot, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Loader2, 
  Sparkles,
  CheckCircle2,
  Share2,
  Send
} from 'lucide-react';

interface OnboardingPageProps {
  onNavigate: (path: string) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onNavigate }) => {
  const { user, saveOnboardingStep1, saveOnboardingStep2, completeOnboarding, fetchOnboardingData } = useAuth();

  // Current Step (1, 2, 3)
  const [currentStep, setCurrentStep] = useState<number>(user?.onboardingStep || 1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1 State: Workspace
  const defaultWsName = user?.name ? `${user.name.split(' ')[0]}'s Workspace` : 'My Workspace';
  const [workspaceName, setWorkspaceName] = useState<string>(defaultWsName);
  const [workspaceSlug, setWorkspaceSlug] = useState<string>('');
  const [isSlugUserEdited, setIsSlugUserEdited] = useState<boolean>(false);

  // Step 2 State: Business
  const [businessType, setBusinessType] = useState<string>('SaaS');
  const [customerChannels, setCustomerChannels] = useState<string[]>(['Website', 'WhatsApp']);

  // Step 3 State: AI Assistant
  const [assistantName, setAssistantName] = useState<string>('Xia Assistant');
  const [assistantInstructions, setAssistantInstructions] = useState<string>('');

  // Hydrate user's existing step & data on mount (persists progress across refreshes)
  useEffect(() => {
    if (user) {
      if (user.onboardingStep) {
        setCurrentStep(user.onboardingStep);
      }
      fetchOnboardingData().then((data) => {
        if (data) {
          if (data.workspaceName) setWorkspaceName(data.workspaceName);
          if (data.workspaceSlug) {
            setWorkspaceSlug(data.workspaceSlug);
            setIsSlugUserEdited(true);
          }
          if (data.businessType) setBusinessType(data.businessType);
          if (data.customerChannels && data.customerChannels.length > 0) {
            setCustomerChannels(data.customerChannels);
          }
          if (data.assistantName) setAssistantName(data.assistantName);
          if (data.assistantInstructions) setAssistantInstructions(data.assistantInstructions);
        }
      });
    }
  }, [user, fetchOnboardingData]);

  // Auto-generate slug from workspace name if not manually edited
  useEffect(() => {
    if (!isSlugUserEdited) {
      const generated = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setWorkspaceSlug(generated || 'my-workspace');
    }
  }, [workspaceName, isSlugUserEdited]);

  // Step 1 Submit
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!workspaceName.trim()) {
      setErrorMsg('Please enter a workspace name.');
      return;
    }

    setIsSubmitting(true);
    const result = await saveOnboardingStep1(workspaceName, workspaceSlug);
    setIsSubmitting(false);

    if (result.success) {
      setCurrentStep(2);
    } else {
      setErrorMsg(result.error || 'Failed to save workspace.');
    }
  };

  // Step 2 Submit
  const handleStep2Submit = async (e?: React.FormEvent, skip = false) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    setIsSubmitting(true);
    const result = await saveOnboardingStep2(
      skip ? undefined : businessType,
      skip ? [] : customerChannels
    );
    setIsSubmitting(false);

    if (result.success) {
      setCurrentStep(3);
    } else {
      setErrorMsg(result.error || 'Failed to save business preferences.');
    }
  };

  // Step 3 Submit (Finish Setup)
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    setIsSubmitting(true);
    const result = await completeOnboarding(assistantName, assistantInstructions);
    setIsSubmitting(false);

    if (result.success) {
      setIsCompleted(true);
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 1200);
    } else {
      setErrorMsg(result.error || 'Failed to finish setup.');
    }
  };

  // Toggle quick suggestion pill in AI Assistant instructions
  const toggleSuggestionPill = (pillText: string) => {
    if (assistantInstructions.includes(pillText)) {
      setAssistantInstructions(
        assistantInstructions
          .replace(pillText, '')
          .replace(/,\s*,/g, ',')
          .trim()
      );
    } else {
      const updated = assistantInstructions
        ? `${assistantInstructions.trim()}, ${pillText}`
        : pillText;
      setAssistantInstructions(updated);
    }
  };

  // Toggle customer channels
  const toggleChannel = (channel: string) => {
    if (customerChannels.includes(channel)) {
      setCustomerChannels(customerChannels.filter((c) => c !== channel));
    } else {
      setCustomerChannels([...customerChannels, channel]);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // COMPLETION SCREEN
  // ─────────────────────────────────────────────────────────────
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8E8E5] shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9 text-[#FF8A2A]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-[#171717]">You're all set! 🎉</h2>
            <p className="text-sm text-[#6B6B6B]">
              Your Xia Chat workspace and AI assistant are ready. Entering your dashboard now...
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#FF8A2A]" />
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN ONBOARDING LAYOUT
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#171717] flex flex-col justify-between selection:bg-[#FFF0E5] selection:text-[#D96512]">
      
      {/* ── Top Bar: Logo & 3-Step Progress Indicator ── */}
      <header className="w-full max-w-[800px] mx-auto px-6 pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Brand Logo */}
        <Logo variant="full" size="md" onClick={() => onNavigate('/')} />

        {/* Progress Steps (01 Workspace | 02 Business | 03 AI Assistant) */}
        <div className="flex items-center gap-3">
          {[
            { step: 1, label: '01 Workspace' },
            { step: 2, label: '02 Business' },
            { step: 3, label: '03 AI Assistant' },
          ].map((s, idx) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <React.Fragment key={s.step}>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#FF8A2A] text-white shadow-xs'
                      : isDone
                      ? 'bg-[#FFF0E5] text-[#D96512]'
                      : 'bg-white/80 text-[#8E8E93] border border-[#E8E8E5]'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span>{s.step}.</span>
                  )}
                  <span className="hidden sm:inline-block">{s.label.split(' ')[1]}</span>
                </div>

                {idx < 2 && (
                  <div
                    className={`w-6 h-[2px] rounded-full transition-colors ${
                      currentStep > s.step ? 'bg-[#FF8A2A]' : 'bg-[#E8E8E5]'
                    }`}
                  ></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </header>

      {/* ── Main Content Container (Max Width 680px) ── */}
      <main className="w-full max-w-[680px] mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
        
        <div className="bg-white rounded-3xl p-7 sm:p-10 border border-[#E8E8E5] shadow-[0_10px_35px_rgba(0,0,0,0.04)] transition-all">
          
          {/* Global Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 1: WORKSPACE SETUP
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#FF8A2A] uppercase tracking-wider">Step 01 / 03</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
                  Let's set up your workspace.
                </h1>
                <p className="text-sm text-[#6B6B6B]">
                  Your workspace is where your team manages customer conversations, channels, and AI agents.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-2">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Support"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E8E5] text-sm font-medium bg-[#FAF9F6] focus:bg-white focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-2">
                    Workspace URL / Slug
                  </label>
                  <div className="flex items-center rounded-xl border border-[#E8E8E5] bg-[#FAF9F6] overflow-hidden focus-within:border-[#FF8A2A] focus-within:ring-2 focus-within:ring-[#FF8A2A]/20 transition-all">
                    <span className="pl-4 text-xs font-semibold text-[#8E8E93] bg-[#F7F7F5] py-3 pr-2 border-r border-[#E8E8E5]">
                      xia.chat/
                    </span>
                    <input
                      type="text"
                      value={workspaceSlug}
                      onChange={(e) => {
                        setIsSlugUserEdited(true);
                        setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      }}
                      placeholder="acme-support"
                      className="w-full px-3 py-3 text-sm font-medium bg-transparent outline-none text-[#171717]"
                    />
                  </div>
                  <p className="text-[11px] text-[#8E8E93] mt-1.5">
                    Your team will use this unique URL to access your custom inbox.
                  </p>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 2: BUSINESS SETUP
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <form onSubmit={(e) => handleStep2Submit(e, false)} className="space-y-6">
              
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#FF8A2A] uppercase tracking-wider">Step 02 / 03</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
                  Tell us about your business.
                </h1>
                <p className="text-sm text-[#6B6B6B]">
                  This helps Xia Chat tailor your customer support experience and AI routing models.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                
                {/* Question 1: Business Type */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-2.5">
                    What type of business do you run?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'E-commerce', label: 'E-commerce', icon: Store },
                      { id: 'Agency', label: 'Agency', icon: Building2 },
                      { id: 'SaaS', label: 'SaaS / Tech', icon: Laptop },
                      { id: 'Retail', label: 'Retail', icon: ShoppingBag },
                      { id: 'Education', label: 'Education', icon: GraduationCap },
                      { id: 'Other', label: 'Other', icon: HelpCircle },
                    ].map((b) => {
                      const Icon = b.icon;
                      const isSelected = businessType === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBusinessType(b.id)}
                          className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#171717] ring-1 ring-[#FF8A2A]'
                              : 'bg-[#FAF9F6] border-[#E8E8E5] text-[#6B6B6B] hover:border-gray-300 hover:bg-white'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                          <span className="text-xs font-bold">{b.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question 2: Customer Channels */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-2.5">
                    Where do you talk to your customers? <span className="text-[#8E8E93] font-normal uppercase text-[10px]">(Select multiple)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'Website', label: 'Website Chat', icon: Globe },
                      { id: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
                      { id: 'Instagram', label: 'Instagram DM', icon: Share2 },
                      { id: 'Facebook', label: 'Facebook', icon: Send },
                      { id: 'Messenger', label: 'Messenger', icon: MessageSquare },
                      { id: 'Other', label: 'Other Channels', icon: HelpCircle },
                    ].map((c) => {
                      const Icon = c.icon;
                      const isSelected = customerChannels.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleChannel(c.id)}
                          className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#171717] ring-1 ring-[#FF8A2A]'
                              : 'bg-[#FAF9F6] border-[#E8E8E5] text-[#6B6B6B] hover:border-gray-300 hover:bg-white'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center border text-white text-[10px] ${
                            isSelected ? 'bg-[#FF8A2A] border-[#FF8A2A]' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                          <span className="text-xs font-semibold truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Step 2 Actions */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleStep2Submit(e, true)}
                    className="px-4 py-2.5 text-xs font-semibold text-[#8E8E93] hover:text-[#171717] cursor-pointer"
                  >
                    Skip for now
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: AI ASSISTANT SETUP
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#FF8A2A] uppercase tracking-wider">Step 03 / 03</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
                  Meet your AI assistant.
                </h1>
                <p className="text-sm text-[#6B6B6B]">
                  Give your assistant a little context so it can handle customer inquiries autonomously.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                
                <div>
                  <label className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-2">
                    AI Assistant Name
                  </label>
                  <div className="relative">
                    <Bot className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                      placeholder="e.g. Xia Assistant"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8E8E5] text-sm font-medium bg-[#FAF9F6] focus:bg-white focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-2">
                    What should your AI help customers with?
                  </label>
                  <textarea
                    rows={3}
                    value={assistantInstructions}
                    onChange={(e) => setAssistantInstructions(e.target.value)}
                    placeholder="e.g. Answer product questions, order status, pricing, returns, and common support questions."
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E8E5] text-sm font-medium bg-[#FAF9F6] focus:bg-white focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all outline-none resize-none"
                  ></textarea>

                  {/* Quick Suggestion Pills */}
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-[#8E8E93] mb-2 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF8A2A]" />
                      <span>Quick Suggestions (click to add):</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Product questions',
                        'Order support',
                        'Pricing & plans',
                        'Returns & refunds',
                        'General support',
                      ].map((pill) => {
                        const isAdded = assistantInstructions.includes(pill);
                        return (
                          <button
                            key={pill}
                            type="button"
                            onClick={() => toggleSuggestionPill(pill)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-[#FFF0E5] text-[#D96512] border border-[#FF8A2A]/40'
                                : 'bg-[#FAF9F6] text-[#6B6B6B] border border-[#E8E8E5] hover:bg-white'
                            }`}
                          >
                            {isAdded ? `✓ ${pill}` : `+ ${pill}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* Step 3 Actions */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Finishing Setup...</span>
                    </>
                  ) : (
                    <>
                      <span>Finish Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="w-full max-w-[800px] mx-auto px-6 py-4 text-center text-xs text-[#8E8E93]">
        <p>© {new Date().getFullYear()} Xia Chat Inc. · Need help? Contact support@xiachat.ai</p>
      </footer>

    </div>
  );
};
