import React, { useState, useEffect } from 'react';
import type { Channel, ChannelType, WebsiteWidgetConfig } from '../../types/channel';
import {
  Globe,
  MessageSquare,
  Camera,
  Phone,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Bot,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Plus,
} from 'lucide-react';

interface ConnectChannelModalProps {
  isOpen: boolean;
  channels: Channel[];
  availableAgents: Array<{ id: string; name: string }>;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onConnectWebsite: (
    websiteName: string,
    websiteUrl: string,
    agentId: string,
    config: WebsiteWidgetConfig
  ) => Promise<boolean>;
}

export const ConnectChannelModal: React.FC<ConnectChannelModalProps> = ({
  isOpen,
  channels,
  availableAgents,
  onClose,
  onNavigate,
  onConnectWebsite,
}) => {
  // Navigation & Flow State
  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType | null>(null);
  const [step, setStep] = useState<number>(1); // 1: Channel Info, 2: AI Agent, 3: Widget Setup, 4: Finish/Install

  // Form Fields (Website Chat)
  const [websiteName, setWebsiteName] = useState('My Business Website');
  const [websiteUrl, setWebsiteUrl] = useState('https://example.com');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(availableAgents[0]?.id || '');
  const [widgetName, setWidgetName] = useState('Xia Support Chat');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can we help you today?');
  const [primaryColor, setPrimaryColor] = useState('#FF8A2A');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');

  // Status & Response States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [flowState, setFlowState] = useState<'selecting' | 'wizard' | 'success' | 'error'>('selecting');
  const [errorMessage, setErrorMessage] = useState('');

  // Update selected agent if availableAgents load asynchronously
  useEffect(() => {
    if (availableAgents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(availableAgents[0].id);
    }
  }, [availableAgents, selectedAgentId]);

  // Handle ESC Key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Check if channel is already connected
  const isChannelConnected = (type: ChannelType) => {
    const found = channels.find((c) => c.type === type);
    return found?.status === 'connected';
  };

  const handleSelectChannel = (type: ChannelType) => {
    setSelectedChannelType(type);

    if (isChannelConnected(type)) {
      // If already connected, navigate to details
      const found = channels.find((c) => c.type === type);
      if (found) {
        onClose();
        if (type === 'website') {
          onNavigate('/channels/website');
        }
      }
      return;
    }

    setFlowState('wizard');
    setStep(1);
  };

  const handleNextStep = () => {
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinishSetup = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const success = await onConnectWebsite(websiteName, websiteUrl, selectedAgentId, {
        widgetName,
        welcomeMessage,
        primaryColor,
        position,
        enableAI: true,
        enableHandoff: true,
        showAgentAvailability: true,
      });

      if (success) {
        setFlowState('success');
      } else {
        setErrorMessage('Failed to configure website chat channel.');
        setFlowState('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setFlowState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const embedCode = `<script src="${window.location.origin}/widget.js" data-site-key="${channels.find((c) => c.type === 'website')?.id || 'site-key'}" async></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-2xl w-full p-6 sm:p-8 shadow-xl space-y-6 relative my-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
          <div className="flex items-center gap-3">
            {flowState !== 'selecting' && flowState !== 'success' && flowState !== 'error' && (
              <button
                onClick={() => {
                  if (step > 1) handlePrevStep();
                  else setFlowState('selecting');
                }}
                className="p-1.5 rounded-xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] hover:bg-gray-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#171717]">
                {flowState === 'selecting' && 'Connect a channel'}
                {flowState === 'wizard' && `Connect ${selectedChannelType === 'website' ? 'Website Chat' : selectedChannelType?.toUpperCase()}`}
                {flowState === 'success' && 'Channel Connected'}
                {flowState === 'error' && "Couldn't connect channel"}
              </h2>
              <p className="text-xs text-[#6B6B6B]">
                {flowState === 'selecting' && 'Choose where your customers message you so Xia Chat can bring their conversations into one unified inbox.'}
                {flowState === 'wizard' && selectedChannelType === 'website' && 'Configure widget identity, AI agent, and embed code.'}
                {flowState === 'wizard' && selectedChannelType !== 'website' && 'Connect your social media messaging platform.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCREEN 1: CHANNEL SELECTOR */}
        {flowState === 'selecting' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Website Chat */}
            <div
              onClick={() => handleSelectChannel('website')}
              className="bg-[#FAF9F6] hover:bg-white border border-[#E8E8E5] hover:border-[#FF8A2A] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                {isChannelConnected('website') ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Connected
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF8A2A] transition-colors" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#171717]">Website Chat</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Connect a live chat widget to your website.</p>
              </div>
            </div>

            {/* Facebook Messenger */}
            <div
              onClick={() => handleSelectChannel('facebook')}
              className="bg-[#FAF9F6] hover:bg-white border border-[#E8E8E5] hover:border-blue-500 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                {isChannelConnected('facebook') ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Connected
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#171717]">Facebook Messenger</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Receive and reply to Facebook messages.</p>
              </div>
            </div>

            {/* Instagram */}
            <div
              onClick={() => handleSelectChannel('instagram')}
              className="bg-[#FAF9F6] hover:bg-white border border-[#E8E8E5] hover:border-pink-500 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                {isChannelConnected('instagram') ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Connected
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-pink-500 transition-colors" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#171717]">Instagram</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Manage Instagram customer conversations.</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div
              onClick={() => handleSelectChannel('whatsapp')}
              className="bg-[#FAF9F6] hover:bg-white border border-[#E8E8E5] hover:border-emerald-500 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Phone className="w-5 h-5" />
                </div>
                {isChannelConnected('whatsapp') ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Connected
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#171717]">WhatsApp</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Connect your WhatsApp Business conversations.</p>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: WEBSITE CHAT WIZARD */}
        {flowState === 'wizard' && selectedChannelType === 'website' && (
          <div className="space-y-6">
            {/* Progress Stepper */}
            <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3 text-xs font-bold">
              <span className={`flex items-center gap-1.5 ${step >= 1 ? 'text-[#FF8A2A]' : 'text-gray-400'}`}>
                <span className="w-5 h-5 rounded-full bg-[#FFF0E5] flex items-center justify-center text-[10px]">1</span> Website
              </span>
              <span className={`flex items-center gap-1.5 ${step >= 2 ? 'text-[#FF8A2A]' : 'text-gray-400'}`}>
                <span className="w-5 h-5 rounded-full bg-[#FFF0E5] flex items-center justify-center text-[10px]">2</span> AI Agent
              </span>
              <span className={`flex items-center gap-1.5 ${step >= 3 ? 'text-[#FF8A2A]' : 'text-gray-400'}`}>
                <span className="w-5 h-5 rounded-full bg-[#FFF0E5] flex items-center justify-center text-[10px]">3</span> Widget
              </span>
              <span className={`flex items-center gap-1.5 ${step >= 4 ? 'text-[#FF8A2A]' : 'text-gray-400'}`}>
                <span className="w-5 h-5 rounded-full bg-[#FFF0E5] flex items-center justify-center text-[10px]">4</span> Install
              </span>
            </div>

            {/* STEP 1: WEBSITE INFORMATION */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-[#171717]">Step 1: Website Information</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#171717]">Website Name</label>
                    <input
                      type="text"
                      value={websiteName}
                      onChange={(e) => setWebsiteName(e.target.value)}
                      placeholder="e.g. Acme Online Store"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#171717]">Website URL</label>
                    <input
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: AI AGENT SELECTION */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-[#171717]">Step 2: Choose AI Agent</h3>
                {availableAgents.length > 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#171717]">Default AI Agent</label>
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                      >
                        {availableAgents.map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-[#6B6B6B] mt-1">
                        This agent will automatically handle eligible conversations coming from this website widget.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                    <Bot className="w-8 h-8 text-amber-600 mx-auto" />
                    <div>
                      <h4 className="font-bold text-xs text-amber-900">No AI agents yet</h4>
                      <p className="text-[11px] text-amber-700 mt-0.5">Create an AI agent first in your workspace.</p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onNavigate('/ai-agents');
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" /> Create AI Agent
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: WIDGET SETUP */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-[#171717]">Step 3: Widget Appearance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#171717]">Widget Title</label>
                      <input
                        type="text"
                        value={widgetName}
                        onChange={(e) => setWidgetName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#171717]">Welcome Greeting</label>
                      <input
                        type="text"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#171717]">Brand Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-[#E8E8E5]"
                        />
                        <span className="text-xs font-mono text-[#6B6B6B]">{primaryColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#171717]">Widget Position</label>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setPosition('bottom-right')}
                          className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                            position === 'bottom-right'
                              ? 'bg-[#171717] text-white shadow-2xs'
                              : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B]'
                          }`}
                        >
                          Bottom Right
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosition('bottom-left')}
                          className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                            position === 'bottom-left'
                              ? 'bg-[#171717] text-white shadow-2xs'
                              : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B]'
                          }`}
                        >
                          Bottom Left
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Widget Mini Preview */}
                  <div className="bg-[#FAF9F6] rounded-2xl border border-[#E8E8E5] p-3 flex flex-col justify-between h-48 shadow-2xs">
                    <div className="p-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                      <span>{widgetName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-[#E8E8E5] text-[11px] text-[#171717] max-w-[85%] self-start shadow-2xs">
                      {welcomeMessage}
                    </div>
                    <div className="text-[10px] text-[#6B6B6B] text-center italic">Widget Live Preview</div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: INSTALLATION */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-[#171717]">Step 4: Installation Code</h3>
                <p className="text-xs text-[#6B6B6B]">
                  Copy and paste this script before the closing <code className="text-[#FF8A2A]">&lt;/body&gt;</code> tag on your website.
                </p>

                <div className="p-4 rounded-2xl bg-[#171717] text-[#FAF9F6] text-xs font-mono overflow-x-auto leading-relaxed select-all">
                  {embedCode}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] hover:bg-[#FFE4D0] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Installation Code'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E5]">
              {step > 1 ? (
                <button
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinishSetup}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSubmitting ? 'Connecting...' : 'Finish Setup'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 2 (SOCIAL CHANNELS): META / WHATSAPP REAL OAUTH CHECK */}
        {flowState === 'wizard' && selectedChannelType !== 'website' && (
          <div className="space-y-4 py-4">
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-amber-900">
                    {selectedChannelType === 'facebook' && 'Facebook Messenger Integration'}
                    {selectedChannelType === 'instagram' && 'Instagram Direct Messages'}
                    {selectedChannelType === 'whatsapp' && 'WhatsApp Business API'}
                  </h3>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {selectedChannelType?.toUpperCase()} integration credentials are not configured in your environment yet. Please contact your system administrator to add Meta OAuth API keys.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setFlowState('selecting')}
                className="px-4 py-2 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
              >
                Back to Channels
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 3: SUCCESS STATE */}
        {flowState === 'success' && (
          <div className="space-y-6 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-[#171717]">Channel Connected!</h3>
              <p className="text-xs text-[#6B6B6B]">
                Website Chat is now live and connected to your Xia Chat workspace.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] max-w-sm mx-auto text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Channel:</span>
                <span className="font-bold text-[#171717]">Website Live Chat</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Default AI Agent:</span>
                <span className="font-bold text-[#171717]">Xia Support Assistant</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onNavigate('/inbox');
                }}
                className="px-4 py-2.5 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
              >
                Go to Inbox
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 4: ERROR STATE */}
        {flowState === 'error' && (
          <div className="space-y-6 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-[#171717]">Couldn't connect this channel</h3>
              <p className="text-xs text-[#6B6B6B]">{errorMessage || 'Something went wrong while setting up the channel configuration.'}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setFlowState('selecting')}
                className="px-4 py-2 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => setFlowState('wizard')}
                className="px-5 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
