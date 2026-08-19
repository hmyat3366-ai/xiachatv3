import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowLeft, AlertCircle, ShieldCheck, Users, RefreshCw } from 'lucide-react';

export interface TeamMessageItem {
  id: string;
  conversationId: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatar: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isCurrentUser: boolean;
  status?: 'sending' | 'sent' | 'failed';
}

export interface ConversationDetail {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
  }>;
}

interface ChatAreaProps {
  conversation: ConversationDetail | null;
  messages: TeamMessageItem[];
  isLoadingMessages: boolean;
  onSendMessage: (content: string) => Promise<boolean>;
  onBackToConversations?: () => void;
  onRefreshMessages?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  isLoadingMessages,
  onSendMessage,
  onBackToConversations,
  onRefreshMessages,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoadingMessages]);

  if (!conversation) {
    return (
      <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center h-full">
        <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E8E5] text-gray-300 flex items-center justify-center mb-3 shadow-xs">
          <Users className="w-7 h-7 text-[#FF8A2A]" />
        </div>
        <h3 className="text-sm font-bold text-[#171717]">Select a conversation</h3>
        <p className="text-xs text-[#6B6B6B] max-w-sm mt-1">
          Choose an internal chat from the list or start a new conversation with your workspace members.
        </p>
      </div>
    );
  }

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    const text = inputText.trim();

    try {
      setIsSending(true);
      setSendError(null);
      setInputText('');

      const success = await onSendMessage(text);
      if (!success) {
        setSendError('Failed to send message. Please try again.');
        setInputText(text); // Restore failed text
      }
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message.');
      setInputText(text);
    } finally {
      setIsSending(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 bg-[#FAF9F6] flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8E8E5] flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToConversations && (
            <button
              onClick={onBackToConversations}
              className="p-1.5 text-gray-500 hover:text-[#171717] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 rounded-full bg-[#171717] text-white text-xs font-bold flex items-center justify-center shrink-0">
            {conversation.title ? conversation.title.charAt(0).toUpperCase() : 'T'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#171717] truncate">{conversation.title}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200 shrink-0">
                <ShieldCheck className="w-3 h-3" />
                Internal Workspace Chat
              </span>
            </div>
            <p className="text-[11px] text-[#6B6B6B] truncate">
              {conversation.participants.map((p) => p.name).join(', ')}
            </p>
          </div>
        </div>

        {onRefreshMessages && (
          <button
            onClick={onRefreshMessages}
            title="Refresh messages"
            className="p-2 text-gray-400 hover:text-[#171717] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                <div className="w-48 h-12 rounded-2xl bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <p className="text-xs font-medium text-[#6B6B6B]">This is the start of your internal conversation.</p>
            <p className="text-[11px] text-gray-400">Messages sent here are visible only to workspace members.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.isCurrentUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#171717] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {msg.senderAvatar}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[80%] sm:max-w-[70%] space-y-1 ${msg.isCurrentUser ? 'items-end' : ''}`}>
                <div className={`flex items-center gap-2 text-[10px] text-[#6B6B6B] ${msg.isCurrentUser ? 'justify-end' : ''}`}>
                  <span className="font-bold text-[#171717]">{msg.senderName}</span>
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                    msg.isCurrentUser
                      ? 'bg-[#FF8A2A] text-white rounded-tr-xs'
                      : 'bg-white text-[#171717] border border-[#E8E8E5] rounded-tl-xs'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Status Indicator */}
                {msg.isCurrentUser && (
                  <div className="flex items-center justify-end gap-1 text-[10px] text-[#6B6B6B]">
                    {msg.status === 'sending' && (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Sending...
                      </span>
                    )}
                    {msg.status === 'failed' && (
                      <span className="flex items-center gap-1 text-red-600 font-bold">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Alert Banner */}
      {sendError && (
        <div className="mx-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{sendError}</span>
          </div>
          <button
            onClick={() => setSendError(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Message Composer */}
      <div className="p-4 bg-white border-t border-[#E8E8E5] shrink-0">
        <div className="flex items-end gap-2 bg-[#FAF9F6] border border-[#E8E8E5] rounded-2xl p-2 focus-within:border-[#FF8A2A] transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type internal team message... (Enter to send, Shift+Enter for newline)"
            className="flex-1 bg-transparent text-xs text-[#171717] placeholder-gray-400 p-2 focus:outline-none resize-none max-h-32 min-h-[36px]"
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-xl bg-[#FF8A2A] text-white hover:bg-[#e0771e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
