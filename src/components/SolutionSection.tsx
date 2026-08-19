import React, { useState } from 'react';
import { 
  Inbox, 
  Users, 
  Sparkles, 
  BookOpen, 
  BarChart2, 
  UserCheck, 
  Settings, 
  Search, 
  Send, 
  CheckCircle2, 
  Tag, 
  Filter,
  MoreVertical,
  Zap
} from 'lucide-react';

interface ChatItem {
  id: string;
  name: string;
  avatar: string;
  channel: 'Shopify' | 'WhatsApp' | 'Webchat';
  time: string;
  lastMessage: string;
  unread: boolean;
  status: 'AI Replied' | 'Human Handoff' | 'Resolved';
  messages: Array<{
    sender: 'customer' | 'ai' | 'agent';
    text: string;
    time: string;
  }>;
  customerInfo: {
    email: string;
    orders: string;
    totalSpent: string;
    location: string;
    tags: string[];
  };
}

export const SolutionSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'ai' | 'knowledge' | 'analytics'>('inbox');
  const [selectedChatId, setSelectedChatId] = useState<string>('chat1');
  const [userInput, setUserInput] = useState('');

  const chats: ChatItem[] = [
    {
      id: 'chat1',
      name: 'Sophia Martinez',
      avatar: 'SM',
      channel: 'Shopify',
      time: '2m ago',
      lastMessage: 'Do you deliver on weekends?',
      unread: true,
      status: 'AI Replied',
      messages: [
        { sender: 'customer', text: 'Hi! I ordered the Artisan Ceramic Mug yesterday. Do you deliver on weekends?', time: '10:14 AM' },
        { sender: 'ai', text: 'Hello Sophia! Yes, weekend delivery is available for selected zip codes in your area. Your package (Order #8492) is currently scheduled for Saturday morning delivery!', time: '10:14 AM' },
        { sender: 'customer', text: 'That is awesome, thank you so much!', time: '10:15 AM' }
      ],
      customerInfo: {
        email: 'sophia.m@gmail.com',
        orders: '4 Orders',
        totalSpent: '$320.50',
        location: 'Austin, TX',
        tags: ['VIP Customer', 'Frequent Buyer', 'Weekend Delivery']
      }
    },
    {
      id: 'chat2',
      name: 'David Chen',
      avatar: 'DC',
      channel: 'WhatsApp',
      time: '12m ago',
      lastMessage: 'Can I speak with a human agent about bulk rates?',
      unread: false,
      status: 'Human Handoff',
      messages: [
        { sender: 'customer', text: 'Can I speak with a human agent about bulk rates for our team of 25?', time: '10:02 AM' },
        { sender: 'ai', text: 'Of course! I am notifying our Sales lead now.', time: '10:02 AM' },
        { sender: 'agent', text: 'Hi David! Marcus here from Team Xia. I can give you a 20% discount on 25+ seats.', time: '10:05 AM' }
      ],
      customerInfo: {
        email: 'david.chen@enterprise.co',
        orders: '1 Order',
        totalSpent: '$1,200.00',
        location: 'San Francisco, CA',
        tags: ['B2B Agency', 'High Intent']
      }
    },
    {
      id: 'chat3',
      name: 'Elena Rostova',
      avatar: 'ER',
      channel: 'Webchat',
      time: '1h ago',
      lastMessage: 'Thanks for resolving my refund request!',
      unread: false,
      status: 'Resolved',
      messages: [
        { sender: 'customer', text: 'I need to check if my refund was processed.', time: '09:10 AM' },
        { sender: 'ai', text: 'I matched your account with Refund #RF-9912. It was processed today at 9:00 AM to your original payment method.', time: '09:10 AM' },
        { sender: 'customer', text: 'Thanks for resolving my refund request!', time: '09:12 AM' }
      ],
      customerInfo: {
        email: 'elena.r@designhub.io',
        orders: '2 Orders',
        totalSpent: '$180.00',
        location: 'Chicago, IL',
        tags: ['Refund Verified', 'Resolved']
      }
    }
  ];

  const currentChat = chats.find(c => c.id === selectedChatId) || chats[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    currentChat.messages.push({
      sender: 'agent',
      text: userInput,
      time: 'Just now'
    });
    setUserInput('');
  };

  return (
    <section id="product" className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto scroll-mt-24">
      {/* Section Header */}
      <div className="text-center max-w-[860px] mx-auto mb-16">
        <span className="text-xs font-black uppercase tracking-wider text-[#FF8A2A] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30">
          Flagship Workspace
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          One place for every conversation.
        </h2>
        <p className="text-lg sm:text-xl text-[#6B6B6B] mt-5 max-w-[700px] mx-auto font-normal">
          Unite customer conversations, AI automation, and human support agents inside one powerful, real-time dashboard.
        </p>
      </div>

      {/* Flagship SaaS Showcase Container */}
      <div className="relative">
        
        {/* Floating Pills Around Dashboard */}
        <div className="hidden xl:flex absolute -top-6 left-12 z-20 items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#FF8A2A]/40 shadow-md text-xs font-extrabold text-[#D96512] animate-bounce">
          <Sparkles className="w-4 h-4 text-[#FF8A2A]" />
          <span>AI replied</span>
        </div>

        <div className="hidden xl:flex absolute top-16 -right-6 z-20 items-center gap-2 bg-white px-4 py-2 rounded-full border border-blue-300 shadow-md text-xs font-extrabold text-blue-700">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span>Human takeover</span>
        </div>

        <div className="hidden xl:flex absolute bottom-28 -left-8 z-20 items-center gap-2 bg-white px-4 py-2 rounded-full border border-purple-300 shadow-md text-xs font-extrabold text-purple-700">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span>Knowledge matched</span>
        </div>

        <div className="hidden xl:flex absolute -bottom-6 right-16 z-20 items-center gap-2 bg-white px-4 py-2 rounded-full border border-emerald-300 shadow-md text-xs font-extrabold text-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Customer resolved</span>
        </div>

        {/* Realistic Dashboard UI Frame */}
        <div className="bg-white border border-[#E8E8E5] rounded-[36px] sm:rounded-[44px] shadow-[0_20px_60px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col md:flex-row min-h-[640px]">
          
          {/* Sidebar Left */}
          <div className="w-full md:w-60 bg-[#F7F7F5] border-r border-[#E8E8E5] p-4 sm:p-5 flex flex-col justify-between flex-shrink-0">
            <div>
              {/* Workspace Header */}
              <div className="flex items-center gap-2.5 px-3 py-2 mb-6">
                <div className="w-8 h-8 rounded-xl bg-[#FF8A2A] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  X
                </div>
                <span className="font-black text-base text-[#171717] tracking-tight">Xia Workspace</span>
              </div>

              {/* Navigation Tabs */}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('inbox')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'inbox' ? 'bg-white text-[#171717] shadow-2xs border border-[#E8E8E5]' : 'text-[#6B6B6B] hover:text-[#171717]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Inbox className="w-4 h-4 text-[#FF8A2A]" />
                    <span>Inbox</span>
                  </div>
                  <span className="bg-[#FFF0E5] text-[#D96512] text-[10px] font-extrabold px-2 py-0.5 rounded-full">12</span>
                </button>

                <button
                  onClick={() => setActiveTab('ai')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'ai' ? 'bg-white text-[#171717] shadow-2xs border border-[#E8E8E5]' : 'text-[#6B6B6B] hover:text-[#171717]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>AI Engine</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
                </button>

                <button
                  onClick={() => setActiveTab('knowledge')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'knowledge' ? 'bg-white text-[#171717] shadow-2xs border border-[#E8E8E5]' : 'text-[#6B6B6B] hover:text-[#171717]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Knowledge Base</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'analytics' ? 'bg-white text-[#171717] shadow-2xs border border-[#E8E8E5]' : 'text-[#6B6B6B] hover:text-[#171717]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart2 className="w-4 h-4 text-emerald-600" />
                    <span>Analytics</span>
                  </div>
                </button>

                <div className="pt-4 border-t border-[#E8E8E5] space-y-1">
                  <div className="px-3 py-1 text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">Management</div>
                  <a href="#product" className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-[#6B6B6B] hover:text-[#171717]">
                    <Users className="w-4 h-4" />
                    <span>Team Members</span>
                  </a>
                  <a href="#product" className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-[#6B6B6B] hover:text-[#171717]">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Profile Footer */}
            <div className="pt-4 border-t border-[#E8E8E5] flex items-center gap-2.5 px-2">
              <div className="w-9 h-9 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
                AM
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-black text-[#171717] truncate">Alex Morgan</div>
                <div className="text-[10px] text-[#6B6B6B] truncate font-medium">Operations Lead</div>
              </div>
            </div>
          </div>

          {/* Conversation List Panel */}
          <div className="w-full md:w-80 border-r border-[#E8E8E5] flex flex-col flex-shrink-0 bg-white">
            <div className="p-4 border-b border-[#E8E8E5]">
              <div className="relative mb-2.5">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#6B6B6B]" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-8 pr-3 py-2 bg-[#F7F7F5] border border-[#E8E8E5] rounded-xl text-xs focus:outline-none focus:border-[#FF8A2A] font-medium"
                  readOnly
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] font-semibold">
                <span className="font-black text-[#171717]">All Messages (28)</span>
                <span className="flex items-center gap-1 cursor-pointer hover:text-[#171717]">
                  <Filter className="w-3 h-3" /> Filter
                </span>
              </div>
            </div>

            {/* List items */}
            <div className="overflow-y-auto flex-1 divide-y divide-[#E8E8E5]">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 cursor-pointer transition-colors flex items-start gap-3.5 ${
                    selectedChatId === chat.id ? 'bg-[#FFF0E5]/60 border-l-4 border-l-[#FF8A2A]' : 'hover:bg-[#F7F7F5]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#171717] text-white flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-2xs">
                    {chat.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-black text-[#171717] truncate">{chat.name}</span>
                      <span className="text-[10px] text-[#6B6B6B] font-semibold">{chat.time}</span>
                    </div>
                    <p className="text-[11px] text-[#6B6B6B] truncate mb-2 font-medium">{chat.lastMessage}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {chat.channel}
                      </span>
                      <span 
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          chat.status === 'AI Replied' ? 'bg-[#FFF0E5] text-[#D96512]' :
                          chat.status === 'Human Handoff' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {chat.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Conversation Main Panel */}
          <div className="flex-1 flex flex-col bg-[#F7F7F5]/40">
            {/* Header */}
            <div className="p-4 bg-white border-b border-[#E8E8E5] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
                  {currentChat.avatar}
                </div>
                <div>
                  <div className="text-xs font-black text-[#171717]">{currentChat.name}</div>
                  <div className="text-[10px] text-[#6B6B6B] font-semibold flex items-center gap-1.5">
                    <span>via {currentChat.channel}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold">Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-[#FFF0E5] text-[#D96512] px-3 py-1 rounded-full border border-[#FF8A2A]/30">
                  {currentChat.status}
                </span>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {currentChat.messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex flex-col ${msg.sender === 'customer' ? 'items-start' : 'items-end'}`}
                >
                  <div 
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      msg.sender === 'customer' 
                        ? 'bg-white border border-[#E8E8E5] text-[#171717] rounded-tl-xs font-medium' 
                        : msg.sender === 'ai'
                        ? 'bg-[#FFF0E5] border border-[#FF8A2A]/40 text-[#171717] rounded-tr-xs font-medium'
                        : 'bg-[#171717] text-white rounded-tr-xs font-medium'
                    }`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-[#D96512] mb-1">
                        <Sparkles className="w-3 h-3 fill-[#FF8A2A] text-[#FF8A2A]" />
                        Xia AI Assistant (Automated)
                      </div>
                    )}
                    {msg.sender === 'agent' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 mb-1">
                        <UserCheck className="w-3 h-3" />
                        Human Agent Takeover
                      </div>
                    )}
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-[#6B6B6B] font-semibold mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-[#E8E8E5] flex items-center gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type a message or let Xia AI suggest..."
                className="flex-1 px-4 py-2.5 bg-[#F7F7F5] border border-[#E8E8E5] rounded-xl text-xs focus:outline-none focus:border-[#FF8A2A] font-medium"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#FF8A2A] hover:bg-[#D96512] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Customer Profile Right Panel */}
          <div className="hidden lg:flex w-72 border-l border-[#E8E8E5] bg-white p-5 flex-col justify-between">
            <div>
              <div className="text-[11px] font-black text-gray-400 mb-4 uppercase tracking-wider">Customer Profile</div>
              
              <div className="text-center pb-5 border-b border-[#E8E8E5] mb-5">
                <div className="w-14 h-14 rounded-full bg-[#171717] text-white mx-auto flex items-center justify-center font-bold text-lg mb-2 shadow-xs">
                  {currentChat.avatar}
                </div>
                <div className="font-extrabold text-base text-[#171717]">{currentChat.name}</div>
                <div className="text-xs text-[#6B6B6B] font-medium">{currentChat.customerInfo.email}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-semibold">{currentChat.customerInfo.location}</div>
              </div>

              {/* Order Stats */}
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center border border-[#E8E8E5]">
                  <div className="text-[10px] text-[#6B6B6B] font-semibold">Orders</div>
                  <div className="text-xs font-black text-[#171717]">{currentChat.customerInfo.orders}</div>
                </div>
                <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center border border-[#E8E8E5]">
                  <div className="text-[10px] text-[#6B6B6B] font-semibold">Total Spent</div>
                  <div className="text-xs font-black text-emerald-700">{currentChat.customerInfo.totalSpent}</div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="text-xs font-bold text-[#171717] mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#FF8A2A]" /> Customer Tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentChat.customerInfo.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] bg-[#FFF0E5] text-[#D96512] font-bold px-2.5 py-1 rounded-full border border-[#FF8A2A]/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Knowledge match confidence */}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-xs text-purple-900 mt-4">
              <div className="font-black mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-600" /> AI Knowledge Confidence
              </div>
              <div className="font-medium text-[11px]">98.4% match with shipping policy FAQ.</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
