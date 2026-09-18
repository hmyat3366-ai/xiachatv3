import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import type { KnowledgeSource } from '../../types/knowledge';
import {
  Bot,
  Send,
  X,
  Sparkles,
  FileText,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentChatModalProps {
  isOpen: boolean;
  source: KnowledgeSource | null;
  workspaceId?: string;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  onConnectedToAgent?: (sourceId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  confidence?: number;
}

export const DocumentChatModal: React.FC<DocumentChatModalProps> = ({
  isOpen,
  source,
  workspaceId,
  onClose,
  onNavigate,
  onConnectedToAgent,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when modal opens or source changes
  useEffect(() => {
    if (source && isOpen) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `မင်္ဂလာပါ! "${source.name}" ဖိုင်နှင့် ပတ်သက်၍ မည်သည့်အချက်အလက်ကိုမဆို မေးမြန်းနိုင်ပါသည်။ (Ask me anything from this document!)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInputPrompt('');
    }
  }, [source, isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen || !source) return null;

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputPrompt('');
    setIsLoading(true);

    try {
      const wsQuery = workspaceId ? `?workspaceId=${workspaceId}` : '';
      const res = await apiFetch(`/api/knowledge-base/${source.id}/ask${wsQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.reply || 'No direct answer could be found in this document.',
          confidence: data.confidenceScore || 0.95,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errData = await res.json().catch(() => ({}));
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: errData.error || 'စာရွက်စာတမ်းမှ အချက်အလက်ကို ရယူရန် မအောင်မြင်ပါ။ ထပ်မံကြိုးစားကြည့်ပါ။',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Network error: မေးခွန်းကို ဖြေကြားနိုင်ခြင်း မရှိပါ။',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectToAgent = async () => {
    try {
      setIsConnecting(true);
      const wsQuery = workspaceId ? `?workspaceId=${workspaceId}` : '';
      const res = await apiFetch(`/api/knowledge-base/${source.id}/use${wsQuery}`, {
        method: 'POST',
      });
      if (res.ok) {
        setIsConnected(true);
        if (onConnectedToAgent) onConnectedToAgent(source.id);
        setTimeout(() => setIsConnected(false), 3000);
      }
    } catch (err) {
      console.error('Error connecting source to agent:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Quick suggestions based on document
  const quickQuestions = [
    { en: 'Summarize this document', my: 'ဤဖိုင်ကို အကျဉ်းချုပ်ပြပါ' },
    { en: 'What are the main skills & experience?', my: 'အဓိက ကျွမ်းကျင်မှုနှင့် အတွေ့အကြုံများ' },
    { en: 'What projects are included?', my: 'ပါဝင်သော ပရောဂျက်များအကြောင်း' },
    { en: 'Key highlights & details', my: 'အဓိက အချက်အလက်များ' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl border border-[#E8E8E5] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#E8E8E5] flex items-center justify-between bg-[#FAF9F6]">
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center shrink-0 border border-[#FF8A2A]/20">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#171717] truncate">{source.name}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                    {source.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-[#6B6B6B] truncate mt-0.5 font-mono">
                  {source.chunkCount || 1} vector chunks indexed • Interactive Document AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleConnectToAgent}
                disabled={isConnecting}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-[#FF8A2A] hover:bg-[#D96512] text-white shadow-2xs'
                }`}
                title="Connect this document to your AI Assistant"
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Connected!</span>
                  </>
                ) : isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Use with AI Agent</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-[#171717] rounded-xl hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="px-5 py-2.5 bg-white border-b border-[#E8E8E5] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Suggested:</span>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.my)}
                disabled={isLoading}
                className="px-3 py-1 rounded-full bg-[#FAF9F6] border border-[#E8E8E5] hover:border-[#FF8A2A] hover:bg-[#FFF0E5] text-xs text-[#171717] whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {q.my}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#FAF9F6]/60 min-h-[320px]">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                      isUser ? 'bg-[#171717] text-white' : 'bg-[#FF8A2A] text-white shadow-xs'
                    }`}
                  >
                    {isUser ? 'You' : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                        isUser
                          ? 'bg-[#171717] text-white rounded-tr-none'
                          : 'bg-white border border-[#E8E8E5] text-[#171717] rounded-tl-none font-medium shadow-2xs'
                      }`}
                    >
                      {msg.text}
                    </div>

                    <div className="flex items-center gap-2 px-1 text-[10px] text-gray-400 font-mono">
                      <span>{msg.timestamp}</span>
                      {!isUser && msg.confidence && (
                        <>
                          <span>•</span>
                          <span className="text-[#FF8A2A] font-semibold">
                            {Math.round(msg.confidence * 100)}% Match
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2.5 text-xs text-[#FF8A2A] font-semibold bg-white p-3 rounded-2xl border border-[#E8E8E5] w-fit shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF8A2A]" />
                <span>AI သည် "{source.name}" ထဲမှ အချက်အလက်များကို ရှာဖွေပြီး ဖြေကြားနေပါသည်...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-[#E8E8E5] space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Ask anything about "${source.name}" (မြန်မာလို သို့မဟုတ် English ဖြင့် မေးနိုင်ပါသည်)...`}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl border border-[#E8E8E5] text-xs font-medium focus:outline-none focus:border-[#FF8A2A] bg-[#FAF9F6] focus:bg-white shadow-2xs transition-all"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || isLoading}
                className="px-5 py-3 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FF8A2A]" />
                <span>Direct Document RAG Retrieval active</span>
              </span>

              {onNavigate && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('/ai-agents');
                  }}
                  className="text-[#FF8A2A] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full AI Agent Playground</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
