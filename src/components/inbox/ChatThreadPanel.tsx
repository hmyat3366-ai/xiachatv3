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
} from 'lucide-react';

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

const COMMON_EMOJIS = ['👍', '👋', '❤️', '😊', '🙏', '🔥', '🎉', '✅', '🚀'];

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
        <h2 className="text-xl font-extrabold text-[#171717]">Select a conversation</h2>
        <p className="text-xs text-[#6B6B6B] max-w-sm">
          Choose a customer conversation from the list to view real-time chat history, collaborate with AI, and manage support handoffs.
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
      {/* Top Header Bar */}
      <div className="px-5 py-3.5 bg-white border-b border-[#E8E8E5] flex items-center justify-between gap-4 shrink-0 shadow-2xs">
        {/* Customer & Channel Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#171717] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
            {conversation.customerName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-[#171717] truncate">{conversation.customerName}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B]">
                {conversation.channel}
              </span>
            </div>
            <p className="text-[11px] text-[#6B6B6B] truncate">
              {conversation.customerEmail || 'No email registered'}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Human Handoff / Takeover button */}
          {isAIActive ? (
            <button
              onClick={onTakeover}
              className="px-3 py-1.5 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#FF8A2A]" />
              <span>Take Over</span>
            </button>
          ) : (
            <button
              onClick={onReturnToAI}
              className="px-3 py-1.5 rounded-xl bg-[#FFF0E5] hover:bg-[#FFE4D0] text-[#FF8A2A] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Return to AI</span>
            </button>
          )}

          {/* Assignee Quick Selector */}
          <div className="relative">
            <button
              onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
              className="px-3 py-1.5 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-semibold text-[#171717] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">{conversation.assignee}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isAssigneeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E8E8E5] rounded-2xl shadow-lg p-1.5 z-30 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">Assign to</p>
                {teamMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onAssign(m.name);
                      setIsAssigneeDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FFF0E5] hover:text-[#FF8A2A] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>{m.name}</span>
                    <span className="text-[10px] text-[#6B6B6B]">{m.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resolve / Reopen button */}
          {conversation.status === 'resolved' ? (
            <button
              onClick={() => onStatusChange('open')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Reopen
            </button>
          ) : (
            <button
              onClick={() => onStatusChange('resolved')}
              className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resolve</span>
            </button>
          )}

          {/* Customer Details Panel Toggle */}
          <button
            onClick={onToggleCustomerPanel}
            className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-gray-600 transition-colors cursor-pointer"
            title={isCustomerPanelOpen ? 'Hide Customer Details' : 'Show Customer Details'}
          >
            {isCustomerPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Messages Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF8A2A]" />
            <p className="text-xs text-[#6B6B6B]">Loading conversation history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B6B6B]">No messages recorded yet.</div>
        ) : (
          messages.map((msg) => {
            // Render System Events
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

            // Render Internal Notes
            if (msg.isInternalNote) {
              return (
                <div key={msg.id} className="flex justify-end my-2">
                  <div className="max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700">
                      <Lock className="w-3 h-3" />
                      <span>Internal Note • {msg.senderName}</span>
                    </div>
                    <p className="text-xs leading-relaxed font-medium">{msg.content}</p>
                    <span className="text-[10px] text-amber-600 block text-right font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
                  className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${
                    isAgent
                      ? 'bg-[#FF8A2A] text-white'
                      : isAI
                      ? 'bg-[#171717] text-[#FF8A2A]'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {isAgent ? 'Me' : isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble Body */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-[#6B6B6B]">
                      {msg.senderName || (isAgent ? 'Agent' : isAI ? 'Xia AI' : 'Customer')}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isAgent
                        ? 'bg-[#171717] text-white rounded-tr-none'
                        : isAI
                        ? 'bg-[#FFF0E5] border border-[#FF8A2A]/30 text-[#171717] rounded-tl-none font-medium'
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

      {/* AI Suggestion Bar (Above Composer) */}
      {conversation.draftMessage && (
        <div className="mx-4 sm:mx-6 mb-2 p-3 rounded-2xl bg-gradient-to-r from-[#FFF0E5] to-amber-50 border border-[#FF8A2A]/40 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#FF8A2A] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-spin" /> Xia AI Suggested Reply (Confidence: 96%)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateDraft}
                disabled={isGeneratingDraft}
                className="text-[11px] font-semibold text-[#6B6B6B] hover:text-[#171717] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                {isGeneratingDraft ? 'Generating...' : 'Regenerate'}
              </button>
              <button
                onClick={handleCopyDraft}
                className="text-[11px] font-semibold text-[#6B6B6B] hover:text-[#171717] flex items-center gap-1 cursor-pointer"
              >
                {copiedDraft ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedDraft ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <p className="text-xs text-[#171717] font-medium bg-white/70 p-2.5 rounded-xl border border-[#FF8A2A]/20">
            "{conversation.draftMessage}"
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleUseDraft}
              className="px-3 py-1 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Use Suggestion
            </button>
          </div>
        </div>
      )}

      {/* Bottom Message Composer */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#E8E8E5] space-y-2.5 shrink-0 shadow-sm">
        {/* Toggle Mode: Customer Message vs Internal Note */}
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
              Internal Note
            </button>
          </div>

          <button
            onClick={handleRegenerateDraft}
            className="text-xs font-bold text-[#FF8A2A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Suggest Reply
          </button>
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder={
              isInternalNote
                ? 'Write internal note for team members (customer won\'t see this)...'
                : 'Type customer response... (Enter = Send, Shift+Enter = New line)'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full p-3 rounded-2xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none transition-all resize-none ${
              isInternalNote
                ? 'bg-amber-50/50 border border-amber-300 focus:ring-2 focus:ring-amber-400'
                : 'bg-[#FAF9F6] border border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
            }`}
          />
        </div>

        {/* Composer Controls Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={() => setIsEmojiOpen(!isEmojiOpen)}
              className="p-2 rounded-xl text-gray-500 hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              title="Insert Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Emoji Quick Picker Popover */}
            {isEmojiOpen && (
              <div className="absolute left-0 bottom-full mb-2 bg-white border border-[#E8E8E5] rounded-2xl p-2 shadow-lg flex items-center gap-1 z-30">
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

            <label className="p-2 rounded-xl text-gray-500 hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors cursor-pointer" title="Attach file">
              <Paperclip className="w-4 h-4" />
              <input type="file" className="hidden" onChange={() => alert('Attachment upload ready')} />
            </label>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              isInternalNote
                ? 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50'
                : 'bg-[#FF8A2A] hover:bg-[#D96512] text-white disabled:opacity-50'
            }`}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isInternalNote ? 'Save Note' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
