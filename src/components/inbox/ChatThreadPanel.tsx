import React, { useState, useRef, useEffect } from 'react';
import type { ConversationItem, MessageItem, TeamMember } from '../../types/inbox';
import {
  User,
  Bot,
  UserCheck,
  Send,
  Paperclip,
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
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

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

const COMMON_EMOJIS = ['👍', '👋', '❤️', '😊', '🙏', '🔥', '🎉', '✅', '🚀', '⭐', '📦', '💬'];

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
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center space-y-4">
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    try {
      setIsSending(true);
      await onSendMessage(inputText.trim(), isInternalNote);
      setInputText('');
      setIsEmojiOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleUseDraft = () => {
    if (conversation.draftMessage) {
      setInputText(conversation.draftMessage);
      setIsInternalNote(false);
      textareaRef.current?.focus();
    }
  };

  const handleCopyDraft = () => {
    if (conversation.draftMessage) {
      navigator.clipboard.writeText(conversation.draftMessage);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const handleRegenerateDraft = async () => {
    setIsGeneratingDraft(true);
    await onGenerateAIDraft();
    setIsGeneratingDraft(false);
  };

  const isAIActive = conversation.status === 'ai';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F6] min-w-0 relative">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP HEADER TOOLBAR
         ───────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 bg-white border-b border-[#E8E8E5] flex items-center justify-between gap-4 shrink-0 shadow-2xs z-20">
        
        {/* Customer & Channel Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#171717] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
            {conversation.customerName ? conversation.customerName.charAt(0).toUpperCase() : 'C'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm text-[#171717] truncate">{conversation.customerName}</h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B] shrink-0">
                {conversation.channel}
              </span>
            </div>
            <p className="text-[11px] text-[#6B6B6B] truncate font-medium">
              {conversation.customerEmail || conversation.customerPhone || 'Direct Channel Visitor'}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI vs Human Takeover Button */}
          {isAIActive ? (
            <button
              onClick={onTakeover}
              className="px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-black active:bg-gray-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#FF8A2A] transition-transform group-hover:scale-110" />
              <span>Take Over</span>
            </button>
          ) : (
            <button
              onClick={onReturnToAI}
              className="px-3.5 py-1.5 rounded-xl bg-[#FFF0E5] hover:bg-[#FFE4D0] active:bg-[#FFD9BC] text-[#D96512] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-[#FF8A2A]/30 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Return to AI</span>
            </button>
          )}

          {/* Assignee Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
              className="px-3 py-1.5 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">{conversation.assignee || 'Unassigned'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isAssigneeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#E8E8E5] rounded-2xl shadow-xl p-1.5 z-40 space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-2.5 py-1">
                  Assign Agent
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
                        : 'text-[#171717] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className="text-[10px] text-[#8E8E93]">{m.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Action: Resolve / Reopen */}
          {conversation.status === 'resolved' ? (
            <button
              onClick={() => onStatusChange('open')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
            >
              Reopen
            </button>
          ) : (
            <button
              onClick={() => onStatusChange('resolved')}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resolve</span>
            </button>
          )}

          {/* Customer Details Toggle */}
          <button
            onClick={onToggleCustomerPanel}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isCustomerPanelOpen
                ? 'bg-[#171717] text-white border-[#171717]'
                : 'bg-white text-gray-600 border-[#E8E8E5] hover:bg-[#FAF9F6]'
            }`}
            title={isCustomerPanelOpen ? 'Hide Customer Profile' : 'Show Customer Profile'}
          >
            {isCustomerPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE AI/HUMAN STATUS PILL (SUBTLE BANNER)
         ───────────────────────────────────────────────────────────── */}
      <div className="px-5 py-2 bg-[#F2F2F0] border-b border-[#E8E8E5] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-[#171717]">
          {isAIActive ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[#FF8A2A] animate-pulse" />
              <span className="font-bold text-[#D96512]">AI Autonomous Mode:</span>
              <span className="text-[#6B6B6B]">Xia Assistant is replying with RAG Knowledge Base.</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="font-bold text-blue-700">Human Mode:</span>
              <span className="text-[#6B6B6B]">Assigned to {conversation.assignee || 'Human Agent'}. AI paused.</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
          <span>Confidence: {Math.round((conversation.confidenceScore || 0.95) * 100)}%</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CHAT MESSAGES THREAD STREAM
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF8A2A]" />
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
                    <Sparkles className="w-3.5 h-3.5 text-[#FF8A2A]" />
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            // Internal Private Agent Notes
            if (msg.isInternalNote) {
              return (
                <div key={msg.id} className="flex justify-end my-2">
                  <div className="max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 shadow-2xs space-y-1.5">
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
                      ? 'bg-[#171717] text-white'
                      : isAI
                      ? 'bg-gradient-to-tr from-[#FF8A2A] to-[#FFA85C] text-white shadow-xs'
                      : 'bg-white border border-[#E8E8E5] text-[#171717]'
                  }`}
                >
                  {isAgent ? 'Me' : isAI ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4 h-4 text-gray-600" />}
                </div>

                {/* Message Bubble Body */}
                <div className="space-y-1 min-w-0">
                  <div className={`flex items-center gap-2 px-1 ${isAgent ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] font-bold text-[#6B6B6B]">
                      {msg.senderName || (isAgent ? 'Support Agent' : isAI ? 'Xia AI Agent' : conversation.customerName)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isAgent
                        ? 'bg-[#171717] text-white rounded-tr-none font-medium'
                        : isAI
                        ? 'bg-gradient-to-br from-[#FFF5ED] via-[#FFF0E5] to-white border border-[#FF8A2A]/30 text-[#171717] rounded-tl-none font-medium'
                        : 'bg-white border border-[#E8E8E5] text-[#171717] rounded-tl-none font-normal'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. AI SMART SUGGESTION BAR (ABOVE COMPOSER)
         ───────────────────────────────────────────────────────────── */}
      {conversation.draftMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 sm:mx-6 mb-2 p-3.5 rounded-2xl bg-gradient-to-r from-[#FFF0E5] to-amber-50/80 border border-[#FF8A2A]/40 shadow-xs space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-[#D96512] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FF8A2A]" />
              <span>Xia AI Suggested Draft</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateDraft}
                disabled={isGeneratingDraft}
                className="text-[11px] font-bold text-[#6B6B6B] hover:text-[#171717] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${isGeneratingDraft ? 'animate-spin' : ''}`} />
                <span>{isGeneratingDraft ? 'Thinking...' : 'Regenerate'}</span>
              </button>

              <button
                onClick={handleCopyDraft}
                className="text-[11px] font-bold text-[#6B6B6B] hover:text-[#171717] flex items-center gap-1 cursor-pointer"
              >
                {copiedDraft ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDraft ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-[#171717] font-medium bg-white/80 p-2.5 rounded-xl border border-[#FF8A2A]/20 leading-relaxed">
            "{conversation.draftMessage}"
          </p>

          <div className="flex justify-end">
            <button
              onClick={handleUseDraft}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>Use Suggestion</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MESSAGE COMPOSER
         ───────────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#E8E8E5] space-y-2.5 shrink-0 shadow-sm z-10">
        
        {/* Toggle Mode: Customer Reply vs Internal Note */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5]">
            <button
              onClick={() => setIsInternalNote(false)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isInternalNote
                  ? 'bg-white text-[#171717] shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#171717]'
              }`}
            >
              Customer Reply
            </button>

            <button
              onClick={() => setIsInternalNote(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isInternalNote
                  ? 'bg-amber-100 text-amber-900 shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-amber-700'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Internal Note</span>
            </button>
          </div>

          <button
            onClick={handleRegenerateDraft}
            className="text-xs font-bold text-[#FF8A2A] hover:text-[#D96512] flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Suggest Reply</span>
          </button>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder={
              isInternalNote
                ? 'Add an internal note visible only to your workspace team...'
                : `Reply to ${conversation.customerName} on ${conversation.channel}... (Enter = Send, Shift+Enter = New line)`
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full p-3 rounded-2xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none transition-all resize-none leading-relaxed ${
              isInternalNote
                ? 'bg-amber-50/60 border border-amber-300 focus:ring-3 focus:ring-amber-200'
                : 'bg-[#FAF9F6] border border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
            }`}
          />
        </div>

        {/* Action Controls & Send Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={() => setIsEmojiOpen(!isEmojiOpen)}
              className="p-2 rounded-xl text-gray-500 hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              title="Insert Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Emoji Quick Popover */}
            {isEmojiOpen && (
              <div className="absolute left-0 bottom-full mb-2 bg-white border border-[#E8E8E5] rounded-2xl p-2 shadow-xl flex items-center gap-1 z-40">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setIsEmojiOpen(false);
                    }}
                    className="p-1.5 hover:bg-[#FFF0E5] rounded-lg text-base cursor-pointer transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <label
              className="p-2 rounded-xl text-gray-500 hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              title="Attach File or Image"
            >
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                onChange={() => alert('Attachment upload ready.')}
              />
            </label>
          </div>

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              isInternalNote
                ? 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50'
                : 'bg-[#FF8A2A] hover:bg-[#D96512] text-white disabled:opacity-50'
            }`}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isInternalNote ? 'Save Private Note' : 'Send Reply'}</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
