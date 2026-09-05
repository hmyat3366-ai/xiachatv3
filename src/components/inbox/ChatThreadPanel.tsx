import React, { useState, useRef, useEffect } from 'react';
import type { ConversationItem, MessageItem, TeamMember } from '../../types/inbox';
import {
  User,
  Bot,
  UserCheck,
  Send,
  Smile,
  Lock,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  PanelRightOpen,
  PanelRightClose,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Archive,
  RefreshCw,
  BookOpen,
  ShieldCheck,
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  MoreHorizontal,
  X,
  Volume2,
  Paperclip,
  Image as ImageIcon,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { ConversationStatusBadge } from './ConversationStatusBadge';
import { HandoffButton } from './HandoffButton';
import { ResolveButton } from './ResolveButton';

interface ChatThreadPanelProps {
  conversation: ConversationItem | null;
  messages: MessageItem[];
  teamMembers: TeamMember[];
  onSendMessage: (content: string, isInternalNote: boolean, attachments?: string[]) => Promise<void>;
  onTakeover: () => Promise<void>;
  onReturnToAI: () => Promise<void>;
  onAssign: (assignee: string) => Promise<void>;
  onStatusChange: (status: string) => Promise<void>;
  onGenerateAIDraft: () => Promise<void>;
  isCustomerPanelOpen: boolean;
  onToggleCustomerPanel: () => void;
  isLoading: boolean;
}

const COMMON_EMOJIS = ['👍', '👋', '☕', '😊', '🙏', '🔥', '🎉', '✅', '🚀', '📦', '💬', '❤️'];

interface CannedResponse {
  shortcut: string;
  title: string;
  category: string;
  content: string;
}

const CANNED_RESPONSES: CannedResponse[] = [
  {
    shortcut: '/greeting',
    title: 'Warm Welcome',
    category: 'General',
    content: 'Hi there! 👋 Thanks for reaching out. How can I assist you today?',
  },
  {
    shortcut: '/order',
    title: 'Order Status & Tracking',
    category: 'Orders',
    content: 'Could you please share your Order ID or tracking number? I will check the delivery status for you right away.',
  },
  {
    shortcut: '/pricing',
    title: 'Pricing & Plans',
    category: 'Sales',
    content: 'We offer flexible plans tailored to your team size. You can view our full pricing details at our pricing page, or let me know your requirements!',
  },
  {
    shortcut: '/refund',
    title: 'Return & Refund Policy',
    category: 'Billing',
    content: 'We offer a 30-day money-back guarantee. If you are not completely satisfied, let us know and we will guide you through the instant refund process.',
  },
  {
    shortcut: '/transfer',
    title: 'Transfer to Specialist',
    category: 'Support',
    content: 'I am transferring your request to our senior technical specialist who will review your details shortly. Please hold on for just a moment!',
  },
  {
    shortcut: '/resolved',
    title: 'Resolution Confirmation',
    category: 'Closing',
    content: 'I am glad I could help! If you have any further questions down the line, feel free to message us again anytime. Have a wonderful day!',
  },
];

export const ChatThreadPanel: React.FC<ChatThreadPanelProps> = ({
  conversation,
  messages,
  teamMembers,
  onSendMessage,
  onTakeover,
  onReturnToAI,
  onAssign,
  onStatusChange,
  onGenerateAIDraft,
  isCustomerPanelOpen,
  onToggleCustomerPanel,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Canned Responses / Macros State
  const [selectedCannedIndex, setSelectedCannedIndex] = useState(0);

  // Voice & Video Call states
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Attachment states (Supabase Storage)
  const [attachments, setAttachments] = useState<Array<{ url: string; fileName: string; contentType?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  const messageContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Macro filtering
  const cannedQuery = inputText.startsWith('/') ? inputText.slice(1).toLowerCase() : '';
  const isCannedTriggered = inputText.startsWith('/') && !isInternalNote;
  const filteredCanned = isCannedTriggered
    ? CANNED_RESPONSES.filter(
        (c) => c.shortcut.toLowerCase().includes(cannedQuery) || c.title.toLowerCase().includes(cannedQuery)
      )
    : [];

  const handleSelectCanned = (canned: CannedResponse) => {
    setInputText(canned.content);
    setSelectedCannedIndex(0);
    textareaRef.current?.focus();
  };

  // Auto scroll to bottom strictly within the message container to avoid shifting parent layout
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Call timer effect
  useEffect(() => {
    let timer: any;
    if (isVoiceCallActive || isVideoCallActive) {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isVoiceCallActive, isVideoCallActive]);

  if (!conversation) {
    return (
      <div className="w-full h-full bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center shadow-xs">
          <Bot className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-[#171717] tracking-tight">Select a Conversation</h2>
        <p className="text-xs text-[#6B6B6B] max-w-sm leading-relaxed">
          Choose a conversation from the left inbox stream to monitor AI auto-responses, view customer history, or take over directly.
        </p>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCannedTriggered && filteredCanned.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCannedIndex((prev) => (prev + 1) % filteredCanned.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCannedIndex((prev) => (prev - 1 + filteredCanned.length) % filteredCanned.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const selected = filteredCanned[selectedCannedIndex] || filteredCanned[0];
        if (selected) {
          handleSelectCanned(selected);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInputText('');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (uploadEvt) => {
        const base64 = uploadEvt.target?.result as string;
        const res = await fetch(`/api/inbox/upload${conversation?.workspaceId ? `?workspaceId=${conversation.workspaceId}` : ''}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            base64,
          }),
        });

        if (!res.ok) {
          throw new Error('Upload failed with status ' + res.status);
        }

        const data = await res.json();
        setAttachments((prev) => [...prev, { url: data.url, fileName: data.fileName, contentType: data.contentType }]);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File upload error:', err);
      alert('Failed to upload file to Supabase Storage: ' + (err.message || 'Unknown error'));
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && attachments.length === 0) || isSending || isUploading) return;
    try {
      setIsSending(true);
      const attUrls = attachments.map((a) => a.url);
      await onSendMessage(trimmed || (attachments.length ? 'Sent an attachment' : ''), isInternalNote, attUrls);
      setInputText('');
      setAttachments([]);
      setIsEmojiOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  const currentStatus = (conversation.status || '').toUpperCase();
  const isAIActive = currentStatus === 'AI_HANDLING' || currentStatus === 'AI';
  const isHumanActive = currentStatus === 'HUMAN_HANDLING' || currentStatus === 'HUMAN' || currentStatus === 'ASSIGNED';
  const isWaiting = currentStatus === 'WAITING' || currentStatus === 'WAITING_CUSTOMER';
  const isResolved = currentStatus === 'RESOLVED';
  const isClosed = currentStatus === 'CLOSED';
  const hasHandoffRequest = Boolean(conversation.needsAttention);

  const formatCallDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col min-w-0 min-h-0 overflow-hidden relative bg-[#FAF9F6]">
      {/* ─────────────────────────────────────────────────────────────
          DEDICATED FIXED / STICKY CONVERSATION HEADER AREA
         ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-[#E8E8E5] z-30 shadow-2xs flex flex-col select-none">
        {/* TIER 1: Top AI / Human Status Bar */}
        <div className="px-4 sm:px-6 py-2 bg-slate-50/90 border-b border-[#E8E8E5]/70 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isAIActive ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B5CF6]" />
                </span>
                <span className="font-extrabold text-[#8B5CF6] shrink-0 text-[11px] uppercase tracking-wider">
                  AI Autonomous Mode
                </span>
                <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                <span className="text-slate-500 font-medium truncate text-xs hidden sm:inline">
                  Xia AI is auto-replying with Knowledge Base
                </span>
              </div>
            ) : isHumanActive ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-[#2563EB] shrink-0" />
                <span className="font-extrabold text-[#2563EB] shrink-0 text-[11px] uppercase tracking-wider">
                  Human Control Mode
                </span>
                <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                <span className="text-slate-500 font-medium truncate text-xs hidden sm:inline">
                  Handled by <strong className="text-slate-700 font-semibold">{conversation.assignee || 'Human Agent'}</strong>. AI auto-replies paused.
                </span>
              </div>
            ) : isResolved ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-[#10B981] shrink-0" />
                <span className="font-extrabold text-emerald-800 shrink-0 text-[11px] uppercase tracking-wider">
                  Conversation Resolved
                </span>
                <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                <span className="text-slate-500 font-medium truncate text-xs hidden sm:inline">
                  Archived. Automatically reopens upon new customer message.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                <span className="font-bold text-slate-700 text-xs">Open Ticket</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {conversation.csatRating ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 shadow-2xs"
                title={conversation.csatComment ? `Feedback: "${conversation.csatComment}"` : 'Customer Satisfaction Rating'}
              >
                <span>⭐ {conversation.csatRating}/5 CSAT</span>
                {conversation.csatComment && (
                  <span className="hidden md:inline font-normal italic max-w-[120px] truncate text-amber-700">
                    "{conversation.csatComment}"
                  </span>
                )}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[10.5px] font-bold border border-purple-200/60 shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-[#8B5CF6]" />
              <span>Confidence: {Math.round((conversation.confidenceScore || 0.95) * 100)}%</span>
            </span>
          </div>
        </div>

        {/* Handoff Requested Alert Banner (if needed) */}
        {hasHandoffRequest && (
          <div className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-amber-900 font-semibold min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
              <span className="font-bold text-amber-950">Takeover Requested:</span>
              <span className="truncate text-amber-800 font-medium">
                {conversation.attentionReason || conversation.handoffReason || 'Customer requested assistance from a human agent.'}
              </span>
            </div>
            <button
              onClick={onTakeover}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-2xs transition-transform active:scale-95"
            >
              Accept Conversation
            </button>
          </div>
        )}

        {/* TIER 2: Main Conversation Header Toolbar */}
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Customer avatar + Online indicator + Name + Channel */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#171717] to-slate-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
                {conversation.customerName ? conversation.customerName.charAt(0).toUpperCase() : 'C'}
              </div>
              {/* Online Indicator */}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Customer Online"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-sm text-slate-900 truncate">
                  {conversation.customerName}
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  {conversation.channel}
                </span>
                <ConversationStatusBadge status={conversation.status} size="xs" />
              </div>
              <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                {conversation.customerEmail || conversation.customerPhone || 'Direct Channel Visitor'}
              </p>
            </div>
          </div>

          {/* Right Action Controls Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Voice Call Button */}
            <button
              onClick={() => setIsVoiceCallActive(true)}
              className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer shadow-2xs"
              title="Start Voice Call"
            >
              <Phone className="w-4 h-4" />
            </button>

            {/* Video Call Button */}
            <button
              onClick={() => setIsVideoCallActive(true)}
              className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer shadow-2xs"
              title="Start Video Call"
            >
              <Video className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            {/* Assign Agent Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E8E8E5] bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Assign Agent"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline max-w-[100px] truncate">{conversation.assignee || 'Unassigned'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isAssigneeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#E8E8E5] rounded-2xl shadow-xl p-1.5 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2.5 py-1">
                    Assign Support Agent
                  </p>
                  {teamMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onAssign(m.name);
                        setIsAssigneeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                        conversation.assignee === m.name
                          ? 'bg-[#FFF0E5] text-[#D96512] font-bold'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span>{m.name}</span>
                      <span className="text-[10px] text-slate-400">{m.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Take Over vs Return to AI */}
            <HandoffButton
              status={conversation.status}
              onTakeover={onTakeover}
              onReturnToAI={onReturnToAI}
            />

            {/* Resolve / Reopen with Confirmation Modal */}
            <ResolveButton
              status={conversation.status}
              onResolve={() => onStatusChange('RESOLVED')}
              onReopen={() => onStatusChange('HUMAN_HANDLING')}
              customerName={conversation.customerName}
            />

            {/* More Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
                title="More Options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E8E8E5] rounded-xl shadow-xl p-1 z-40 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Ticket Link</span>
                  </button>
                  <button
                    onClick={() => {
                      onStatusChange('OPEN');
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mark as Open</span>
                  </button>
                  <button
                    onClick={() => {
                      onToggleCustomerPanel();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    {isCustomerPanelOpen ? <PanelRightClose className="w-3.5 h-3.5 text-slate-400" /> : <PanelRightOpen className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{isCustomerPanelOpen ? 'Hide Profile' : 'Show Profile'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Customer Details Panel Toggle (Desktop) */}
            <button
              onClick={onToggleCustomerPanel}
              className={`p-2 rounded-xl border transition-colors cursor-pointer hidden md:flex ${
                isCustomerPanelOpen
                  ? 'bg-slate-900 text-white border-black'
                  : 'bg-white text-slate-600 hover:text-black border-[#E8E8E5]'
              }`}
              title="Toggle customer details panel"
            >
              {isCustomerPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Voice Call In-Progress Bar */}
        {isVoiceCallActive && (
          <div className="px-4 sm:px-6 py-2.5 bg-emerald-600 text-white flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold">Voice Call Active with {conversation.customerName}</span>
                <span className="font-mono bg-emerald-700 px-2 py-0.5 rounded text-[11px]">
                  {formatCallDuration(callDuration)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isMuted ? 'bg-red-500 border-red-400' : 'bg-emerald-700 border-emerald-500 hover:bg-emerald-800'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsVoiceCallActive(false)}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HD VIDEO CALL MODAL OVERLAY
         ───────────────────────────────────────────────────────────── */}
      {isVideoCallActive && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6 text-center text-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-sm">HD Video Session</span>
              </div>
              <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                {formatCallDuration(callDuration)}
              </span>
            </div>

            {/* Video preview window simulation */}
            <div className="h-56 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 flex flex-col items-center justify-center border border-slate-800 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                {conversation.customerName ? conversation.customerName.charAt(0).toUpperCase() : 'C'}
              </div>
              <p className="font-bold text-sm mt-3">{conversation.customerName}</p>
              <p className="text-xs text-slate-400">Connecting encrypted WebRTC video stream...</p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-full border transition-colors cursor-pointer ${
                  isMuted ? 'bg-red-500 border-red-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
              </button>

              <button
                onClick={() => setIsVideoCallActive(false)}
                className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-transform active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Video Call</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TIER 3: MAIN CHAT MESSAGES THREAD (Independent Scroll Container)
         ───────────────────────────────────────────────────────────── */}
      <div ref={messageContainerRef} className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 bg-[#FAF9F6]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF8A3D]" />
            <p className="text-xs text-[#6B6B6B] font-medium">Loading message history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B6B6B]">No messages recorded in this conversation yet.</div>
        ) : (
          messages.map((msg) => {
            // System Event Bubble
            if (msg.senderType === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="px-3.5 py-1.5 rounded-full bg-white border border-[#E8E8E5] text-[11px] font-semibold text-[#6B6B6B] flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF8A3D]" />
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            // Internal Private Agent Notes
            if (msg.isInternalNote) {
              return (
                <div key={msg.id} className="flex justify-end my-2">
                  <div className="max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Private Team Note • {msg.senderName || 'Agent'}</span>
                      </span>
                      <span className="font-mono text-amber-600 font-normal">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed font-medium">{msg.content}</p>
                  </div>
                </div>
              );
            }

            const isAgent = msg.senderType === 'agent';
            const isAI = msg.senderType === 'ai';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[88%] sm:max-w-[75%] ${
                  isAgent ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Sender Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${
                    isAgent
                      ? 'bg-[#2563EB] text-white'
                      : isAI
                      ? 'bg-gradient-to-tr from-[#8B5CF6] to-indigo-600 text-white shadow-xs ring-2 ring-purple-100'
                      : 'bg-white border border-[#E8E8E5] text-[#171717]'
                  }`}
                >
                  {isAgent ? <UserCheck className="w-4 h-4" /> : isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4 text-slate-700" />}
                </div>

                {/* Message Bubble Body */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div
                    className={`flex items-center gap-2 text-[10px] font-bold ${
                      isAgent ? 'justify-end text-slate-500' : 'text-slate-500'
                    }`}
                  >
                    <span>{isAI ? 'Xia AI Assistant' : msg.senderName || (isAgent ? 'Support Agent' : conversation.customerName)}</span>
                    {isAI && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-100 text-[#8B5CF6] text-[9px] font-extrabold uppercase tracking-wider">
                        Autonomous AI
                      </span>
                    )}
                    <span className="font-normal font-mono text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed font-medium shadow-2xs ${
                      isAgent
                        ? 'bg-[#2563EB] text-white rounded-tr-xs'
                        : isAI
                        ? 'bg-white border border-purple-200/80 text-slate-900 rounded-tl-xs space-y-2'
                        : 'bg-white border border-[#E8E8E5] text-slate-900 rounded-tl-xs'
                    }`}
                  >
                    {/* Attachments rendering */}
                    {msg.attachments && (Array.isArray(msg.attachments) ? msg.attachments.length > 0 : Boolean(msg.attachments)) && (
                      <div className="flex flex-col gap-2 pt-1 pb-1.5">
                        {(Array.isArray(msg.attachments) ? msg.attachments : [msg.attachments]).map((att: any, attIdx: number) => {
                          const url = typeof att === 'string' ? att : att?.url;
                          const name = typeof att === 'string' ? 'Attachment' : (att?.fileName || att?.name || 'Attachment');
                          const isImg = /\.(png|jpe?g|webp|gif)$/i.test(url) || att?.contentType?.startsWith('image/');

                          if (isImg) {
                            return (
                              <div key={attIdx} className="overflow-hidden rounded-xl border border-black/10 max-w-[260px] shadow-2xs group relative">
                                <img
                                  src={url}
                                  alt={name}
                                  onClick={() => setPreviewImageModal(url)}
                                  className="w-full h-auto object-cover max-h-[190px] cursor-pointer transition-transform group-hover:scale-105"
                                  loading="lazy"
                                />
                              </div>
                            );
                          }

                          return (
                            <a
                              key={attIdx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors text-xs font-semibold underline truncate"
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate">{name}</span>
                              <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                            </a>
                          );
                        })}
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* AI Knowledge Source & Confidence Footer */}
                    {isAI && (
                      <div className="pt-2 mt-2 border-t border-purple-100/70 flex items-center justify-between gap-2 text-[10.5px] text-purple-700">
                        <span className="flex items-center gap-1 font-semibold truncate">
                          <BookOpen className="w-3 h-3 text-[#8B5CF6] shrink-0" />
                          <span className="truncate">Based on {msg.knowledgeSource || 'Store FAQ'}</span>
                        </span>
                        <span className="font-mono shrink-0 bg-purple-50 px-1.5 py-0.5 rounded font-bold border border-purple-200/50">
                          {Math.round((msg.confidenceScore || conversation.confidenceScore || 0.98) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RESOLVED TICKET BANNER
         ───────────────────────────────────────────────────────────── */}
      {isResolved && (
        <div className="px-4 sm:px-6 py-2.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>This conversation is marked as resolved.</span>
          </div>
          <button
            onClick={() => onStatusChange('HUMAN_HANDLING')}
            className="px-3 py-1 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Reopen Ticket
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TIER 4: MESSAGE INPUT COMPOSER
         ───────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 shrink-0 bg-white border-t border-[#E8E8E5] p-3 space-y-2">
        {/* Mode Switcher: Customer Reply vs Internal Note */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setIsInternalNote(false)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isInternalNote ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Reply
            </button>
            <button
              onClick={() => setIsInternalNote(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isInternalNote ? 'bg-amber-100 text-amber-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Internal Note</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setIsGeneratingDraft(true);
                await onGenerateAIDraft();
                setIsGeneratingDraft(false);
                if (conversation.draftMessage) {
                  setInputText(conversation.draftMessage);
                  setIsInternalNote(false);
                  textareaRef.current?.focus();
                }
              }}
              disabled={isGeneratingDraft}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 border border-purple-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Generate contextual AI response draft and insert into composer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>{isGeneratingDraft ? 'Drafting...' : 'AI Suggest Reply'}</span>
            </button>
          </div>
        </div>

        {/* Attachment Chips Bar */}
        {(attachments.length > 0 || isUploading) && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate max-w-[160px] font-medium text-slate-700">{att.fileName}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-red-500 cursor-pointer ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {isUploading && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium px-2 py-0.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading to Supabase Storage...</span>
              </div>
            )}
          </div>
        )}

        {/* Text Input & Actions */}
        <div
          className={`relative rounded-2xl border transition-all ${
            isInternalNote
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-300/20'
              : 'bg-[#FAF9F6] border-[#E8E8E5] focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15'
          }`}
        >
          {/* Canned Responses / Macros Floating Menu */}
          {isCannedTriggered && filteredCanned.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl border border-blue-200 shadow-2xl overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-2 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Canned Responses & Macros</span>
                </span>
                <span className="text-[10px] text-blue-600 font-medium">Use ↑↓ to navigate, Tab/Enter to insert</span>
              </div>
              <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                {filteredCanned.map((canned, idx) => {
                  const isSelected = idx === selectedCannedIndex;
                  return (
                    <button
                      key={canned.shortcut}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectCanned(canned);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded-md">
                          {canned.shortcut}
                        </span>
                        <span className="truncate">{canned.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium ml-2 shrink-0">
                        {canned.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={2}
            placeholder={
              isInternalNote
                ? 'Type an internal note visible only to teammates...'
                : `Reply to ${conversation.customerName}... (Press Enter to send, Shift+Enter for newline)`
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 bg-transparent text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#171717] hover:bg-white/80 transition-colors cursor-pointer"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#171717] hover:bg-white/80 transition-colors cursor-pointer disabled:opacity-50"
                title="Attach screenshot or file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={(!inputText.trim() && attachments.length === 0) || isSending || isUploading}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isInternalNote
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-[#2563EB] hover:bg-blue-700 text-white'
              } disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-95`}
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Emoji Picker */}
        {isEmojiOpen && (
          <div className="flex items-center gap-1 p-2 rounded-xl bg-white border border-[#E8E8E5] shadow-xs overflow-x-auto no-scrollbar">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  textareaRef.current?.focus();
                }}
                className="p-1 hover:bg-[#FAF9F6] rounded text-base transition-transform hover:scale-125 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Image Modal */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-red-400 p-1.5 rounded-full bg-black/40 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImageModal}
              alt="Enlarged screenshot"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
