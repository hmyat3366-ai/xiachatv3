import React, { useState, useEffect } from 'react';
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
  Send,
  Link as LinkIcon,
  Smile,
  Briefcase,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

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
  const [assistantTone, setAssistantTone] = useState<'friendly' | 'professional' | 'concise'>('friendly');
  const [assistantInstructions, setAssistantInstructions] = useState<string>(
    'Answer product questions, pricing, returns policy, and assist customers with friendly, accurate information.'
  );

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
    const fullInstructions = `[Tone: ${assistantTone}] ${assistantInstructions}`;
    const result = await completeOnboarding(assistantName, fullInstructions);
    setIsSubmitting(false);

    if (result.success) {
      setIsCompleted(true);
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 1500);
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
          .replace(/\s+/g, ' ')
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
  // 1. CELEBRATORY COMPLETION SCREEN
  // ─────────────────────────────────────────────────────────────
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Subtle particle bursts */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-[#FF8A2A]/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-3xl p-9 border border-[#E8E8E5] shadow-[0_20px_60px_rgba(0,0,0,0.08)] space-y-6 relative z-10"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FFF0E5] to-[#FFE0CC] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-11 h-11 text-[#FF8A2A]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              You're all set! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
              Your Xia Chat workspace <span className="font-bold text-[#171717]">"{workspaceName}"</span> and AI assistant are fully configured.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Workspace URL:</span>
              <span className="font-mono font-bold text-[#FF8A2A]">xia.chat/{workspaceSlug}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">AI Assistant:</span>
              <span className="font-bold text-[#171717]">{assistantName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Active Channels:</span>
              <span className="font-medium text-[#171717]">{customerChannels.join(', ') || 'Website Live Chat'}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 text-xs font-semibold text-[#FF8A2A]">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF8A2A]" />
            <span>Redirecting to your Unified Inbox...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MAIN ONBOARDING WIZARD
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#171717] flex flex-col justify-between selection:bg-[#FFF0E5] selection:text-[#D96512] relative overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-b from-[#FFF0E5]/60 to-transparent blur-3xl opacity-60" />
      </div>

      {/* Top Header: Logo & Multi-Step Progress Tracker */}
      <header className="relative z-10 w-full max-w-[860px] mx-auto px-6 pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-5">
        <Logo variant="full" size="md" onClick={() => onNavigate('/')} />

        {/* Progress Pills Stepper */}
        <div className="flex items-center gap-2 sm:gap-3 bg-white/90 px-3.5 py-2 rounded-full border border-[#E8E8E5] shadow-2xs backdrop-blur-md">
          {[
            { step: 1, label: 'Workspace' },
            { step: 2, label: 'Channels' },
            { step: 3, label: 'AI Assistant' },
          ].map((s, idx) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <React.Fragment key={s.step}>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                    isCurrent
                      ? 'bg-[#FF8A2A] text-white shadow-2xs'
                      : isDone
                      ? 'bg-[#FFF0E5] text-[#D96512]'
                      : 'text-[#8E8E93]'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/5">
                      {s.step}
                    </span>
                  )}
                  <span className="hidden xs:inline">{s.label}</span>
                </div>

                {idx < 2 && (
                  <div
                    className={`w-4 sm:w-6 h-[2px] rounded-full transition-colors ${
                      currentStep > s.step ? 'bg-[#FF8A2A]' : 'bg-[#E8E8E5]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-[720px] mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-[28px] p-7 sm:p-10 border border-[#E8E8E5] shadow-[0_16px_50px_rgba(0,0,0,0.05)]"
          >
            {/* Global Error Banner */}
            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-red-600 rotate-45" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 1: WORKSPACE SETUP
               ══════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold text-[#FF8A2A] uppercase tracking-wider bg-[#FFF0E5] px-2.5 py-1 rounded-md">
                    Step 01 of 03
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                    Let's create your workspace.
                  </h1>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                    Your workspace is the home for your team, omnichannel customer chats, and AI automation models.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-2">
                      Workspace Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="e.g. Acme Support or Vektor CX"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E8E5] text-sm font-medium bg-[#FAF9F6] focus:bg-white focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15 transition-all outline-none"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-2">
                      Workspace Custom Slug / Link
                    </label>
                    <div className="flex items-center rounded-xl border border-[#E8E8E5] bg-[#FAF9F6] overflow-hidden focus-within:border-[#FF8A2A] focus-within:ring-3 focus-within:ring-[#FF8A2A]/15 transition-all">
                      <span className="pl-4 text-xs font-bold text-[#8E8E93] bg-[#F2F2F0] py-3 pr-2.5 border-r border-[#E8E8E5] flex items-center gap-1">
                        <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>app.xiachat.ai/w/</span>
                      </span>
                      <input
                        type="text"
                        value={workspaceSlug}
                        onChange={(e) => {
                          setIsSlugUserEdited(true);
                          setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        }}
                        placeholder="acme-support"
                        className="w-full px-3 py-3 text-xs sm:text-sm font-bold bg-transparent outline-none text-[#171717]"
                      />
                    </div>
                    <p className="text-[11px] text-[#8E8E93] mt-1.5">
                      Your team members will use this URL to access your private dashboard.
                    </p>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Channels</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 2: BUSINESS & CHANNELS SETUP
               ══════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <form onSubmit={(e) => handleStep2Submit(e, false)} className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold text-[#FF8A2A] uppercase tracking-wider bg-[#FFF0E5] px-2.5 py-1 rounded-md">
                    Step 02 of 03
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                    Channels & Business Profile.
                  </h1>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                    Select where you interact with customers so we can preload the right message connectors.
                  </p>
                </div>

                <div className="space-y-5 pt-1">
                  {/* Business Type Cards */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-2">
                      What industry is your business in?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'E-commerce', label: 'E-commerce', icon: Store },
                        { id: 'SaaS', label: 'SaaS / Tech', icon: Laptop },
                        { id: 'Agency', label: 'Agency & Services', icon: Building2 },
                        { id: 'Retail', label: 'Retail & Local', icon: ShoppingBag },
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
                            className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#171717] ring-2 ring-[#FF8A2A]/30 shadow-2xs'
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

                  {/* Customer Channels Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider">
                        Primary Customer Channels
                      </label>
                      <span className="text-[10px] text-[#8E8E93] font-bold">Select all that apply</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'Website', label: 'Live Website Chat', icon: Globe },
                        { id: 'WhatsApp', label: 'WhatsApp Business', icon: MessageSquare },
                        { id: 'Instagram', label: 'Instagram Direct', icon: Share2 },
                        { id: 'Facebook', label: 'Facebook Messenger', icon: Send },
                        { id: 'Telegram', label: 'Telegram Bot', icon: MessageSquare },
                        { id: 'Email', label: 'Support Email', icon: Globe },
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
                                ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#171717] ring-2 ring-[#FF8A2A]/30 shadow-2xs'
                                : 'bg-[#FAF9F6] border-[#E8E8E5] text-[#6B6B6B] hover:border-gray-300 hover:bg-white'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center border text-white text-[10px] transition-colors ${
                                isSelected ? 'bg-[#FF8A2A] border-[#FF8A2A]' : 'border-gray-300 bg-white'
                              }`}
                            >
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
                <div className="pt-3 flex items-center justify-between">
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
                      className="px-4 py-2 text-xs font-bold text-[#8E8E93] hover:text-[#171717] cursor-pointer"
                    >
                      Skip for now
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to AI Setup</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 3: AI ASSISTANT PERSONA SETUP
               ══════════════════════════════════════════════════════════ */}
            {currentStep === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold text-[#FF8A2A] uppercase tracking-wider bg-[#FFF0E5] px-2.5 py-1 rounded-md">
                    Step 03 of 03
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                    Meet your AI Assistant.
                  </h1>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                    Set up your assistant's name, communication style, and prompt guidelines.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-2">
                      Assistant Display Name
                    </label>
                    <div className="relative">
                      <Bot className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={assistantName}
                        onChange={(e) => setAssistantName(e.target.value)}
                        placeholder="e.g. Xia Assistant or Nova"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8E8E5] text-sm font-medium bg-[#FAF9F6] focus:bg-white focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15 transition-all outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Tone Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-2">
                      Communication Style & Tone
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'friendly', label: 'Friendly & Warm', icon: Smile },
                        { id: 'professional', label: 'Professional', icon: Briefcase },
                        { id: 'concise', label: 'Fast & Direct', icon: Zap },
                      ].map((t) => {
                        const Icon = t.icon;
                        const isSelected = assistantTone === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setAssistantTone(t.id as any)}
                            className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#171717] ring-2 ring-[#FF8A2A]/30 font-bold'
                                : 'bg-[#FAF9F6] border-[#E8E8E5] text-[#6B6B6B] hover:bg-white font-medium'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                            <span className="text-xs">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Instructions & Suggestions */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-2">
                      Core Agent Knowledge & Prompt Guidelines
                    </label>
                    <textarea
                      rows={3}
                      value={assistantInstructions}
                      onChange={(e) => setAssistantInstructions(e.target.value)}
                      placeholder="e.g. Answer product questions, pricing, order tracking, and hand over complex issues to human agents."
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E8E5] text-xs sm:text-sm font-medium bg-[#FAF9F6] focus:bg-white focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15 transition-all outline-none resize-none leading-relaxed"
                    />

                    {/* Quick Suggestion Chips */}
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#FF8A2A]" />
                        <span>Click to append quick rules:</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Answer order status',
                          'Pricing & discount queries',
                          'Escalate refund requests to humans',
                          'Keep replies polite & short',
                          'Offer booking links',
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
                <div className="pt-3 flex items-center justify-between">
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
                    className="px-8 py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Completing Setup...</span>
                      </>
                    ) : (
                      <>
                        <span>Finish & Open Inbox</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-[860px] mx-auto px-6 py-4 text-center text-xs text-[#8E8E93]">
        <p>© {new Date().getFullYear()} Xia Chat Inc. · Need setup assistance? support@xiachat.ai</p>
      </footer>
    </div>
  );
};

export default OnboardingPage;
