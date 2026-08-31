import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowLeft, AlertCircle, Users, RefreshCw, Hash } from 'lucide-react';

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
        <div className="w-14 h-14 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mb-3 shadow-xs">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-base font-black text-[#171717]">Select a Team Chat</h3>
        <p className="text-xs text-[#6B6B6B] max-w-sm mt-1 leading-relaxed">
          Choose a direct message or team group channel from the left sidebar to collaborate with teammates.
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
        setInputText(text);
      }
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message.');
      setInputText(text);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isGroup = conversation.type === 'group';

  return (
    <div className="flex-1 bg-[#FAF9F6] flex flex-col h-full min-w-0">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-white border-b border-[#E8E8E5] flex items-center justify-between sticky top-0 z-10 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToConversations && (
            <button
              onClick={onBackToConversations}
              className="p-1.5 text-gray-500 hover:text-[#171717] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                isGroup
                  ? 'bg-gradient-to-tr from-[#FF8A2A] to-[#FFA85C] text-white'
                  : 'bg-[#171717] text-white'
              }`}
            >
              {isGroup ? <Hash className="w-4 h-4" /> : (conversation.title || 'U').charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h2 className="font-black text-sm text-[#171717] truncate">
                {conversation.title || 'Direct Message'}
              </h2>
              <p className="text-[11px] text-[#6B6B6B] truncate font-medium">
                {isGroup
                  ? `${conversation.participants.length} teammates in this group`
                  : 'Direct Member Chat'}
              </p>
            </div>
          </div>
        </div>

        {onRefreshMessages && (
          <button
            onClick={onRefreshMessages}
            className="p-2 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            title="Refresh messages"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MESSAGE THREAD STREAM
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#FF8A2A]" />
            <p className="text-xs text-[#6B6B6B]">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#6B6B6B]">
            No messages yet. Send a message to start collaborating!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.isCurrentUser;
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] sm:max-w-[70%] ${
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${
                    isMe
                      ? 'bg-[#FF8A2A] text-white'
                      : 'bg-[#171717] text-white'
                  }`}
                >
                  {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
                </div>

                {/* Message Body */}
                <div className="space-y-1 min-w-0">
                  <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] font-bold text-[#6B6B6B]">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isMe
                        ? 'bg-[#171717] text-white rounded-tr-none font-medium'
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
          3. MESSAGE COMPOSER
         ───────────────────────────────────────────────────────────── */}
      <div className="p-3.5 bg-white border-t border-[#E8E8E5] space-y-2 shrink-0 shadow-sm">
        {sendError && (
          <div className="p-2 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{sendError}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={`Message ${conversation.title || 'teammates'}... (Enter to send)`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15 resize-none leading-relaxed"
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="p-3 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
