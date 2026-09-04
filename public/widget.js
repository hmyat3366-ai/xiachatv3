/**
 * Xia Chat AI Widget SDK (Enterprise Edition)
 * Reusable embeddable customer support widget for any website (Static HTML, React, Next.js, Shopify, Ecommerce).
 * Compatible with Intercom, Zendesk AI, and Crisp architectures.
 */
(function (window, document) {
  'use strict';

  // Global namespace
  var XiaChat = window.XiaChat || {};

  // Resolve Script & Default Attributes
  var currentScript = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var scriptSrc = currentScript && currentScript.src ? currentScript.src : '';
  var apiBase = '';
  try {
    apiBase = new URL(scriptSrc).origin;
  } catch (e) {
    apiBase = window.location.origin;
  }

  // Pre-configured Industry Quick Actions
  var INDUSTRY_QUICK_ACTIONS = {
    coffee_shop: [
      { label: '☕ View Menu', prompt: 'Can I see your coffee menu and signature blends?' },
      { label: '📦 Track Order', prompt: 'Where is my order?' },
      { label: '🛒 Place Order', prompt: 'How do I place an order for freshly roasted beans?' },
      { label: '💳 Payment Help', prompt: 'What payment methods do you accept?' },
      { label: '👤 Talk to Human', prompt: 'I want to talk with human support please.' },
    ],
    saas: [
      { label: '🚀 Product Demo', prompt: 'Can you give me a quick product demo?' },
      { label: '💰 Pricing', prompt: 'What are your pricing plans and features?' },
      { label: '🔧 Technical Support', prompt: 'I need technical support with my integration.' },
      { label: '📚 Documentation', prompt: 'Where can I find your API and integration docs?' },
      { label: '👤 Contact Sales', prompt: 'I would like to speak with your sales team.' },
    ],
    ecommerce: [
      { label: '🛍 Browse Products', prompt: 'Can you recommend your bestselling products?' },
      { label: '📦 Order Tracking', prompt: 'Where is my order?' },
      { label: '🔄 Return & Refund', prompt: 'What is your return and refund policy?' },
      { label: '💳 Payment Issue', prompt: 'I have an issue with my payment.' },
      { label: '👤 Human Support', prompt: 'I want to talk with human support please.' },
    ],
  };

  // State
  var state = {
    initialized: false,
    siteKey: (currentScript && currentScript.getAttribute('data-site-key')) || 'auto-detect',
    apiKey: (currentScript && currentScript.getAttribute('data-api-key')) || '',
    industry: (currentScript && currentScript.getAttribute('data-industry')) || 'coffee_shop',
    theme: (currentScript && currentScript.getAttribute('data-theme')) || 'light',
    position: (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right',
    primaryColor: '#FF8A2A',
    widgetName: 'Xia AI Assistant',
    welcomeMessage: 'Hi 👋 How can I help you today?',
    conversationStarters: [],
    productContext: null,
    isOpen: false,
    messages: [],
    isSending: false,
    conversationStatus: 'ai',
    assignedAgentName: '',
    customerProfile: { name: '', email: '', phone: '' },
    pollInterval: null,
    sseSource: null,
  };

  // 3. Guest Visitor Identity System (No Login Required)
  var visitorIdentity = (function () {
    var visitorId = '';
    var sessionId = '';
    var browserId = '';

    try {
      visitorId = localStorage.getItem('xia_visitor_id') || '';
      browserId = localStorage.getItem('xia_browser_id') || '';
      sessionId = sessionStorage.getItem('xia_session_id') || '';
    } catch (e) {}

    var gen = function (prefix) {
      return prefix + '_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    };

    if (!visitorId) {
      visitorId = gen('visitor');
      try { localStorage.setItem('xia_visitor_id', visitorId); } catch (e) {}
    }
    if (!browserId) {
      browserId = gen('browser');
      try { localStorage.setItem('xia_browser_id', browserId); } catch (e) {}
    }
    if (!sessionId) {
      sessionId = gen('session');
      try { sessionStorage.setItem('xia_session_id', sessionId); } catch (e) {}
    }

    return {
      visitorId: visitorId,
      sessionId: sessionId,
      browserId: browserId,
    };
  })();

  var STORAGE_CONV_KEY = function () {
    return 'xia_conv_' + state.siteKey;
  };

  var savedConvId = '';
  try {
    savedConvId = localStorage.getItem(STORAGE_CONV_KEY()) || '';
  } catch (e) {}

  // Isolated Container & Shadow Root
  var container = null;
  var shadow = null;

  function ensureShadowRoot() {
    if (container && shadow) return;
    container = document.getElementById('xia-chat-widget-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'xia-chat-widget-root';
      document.body.appendChild(container);
    }
    shadow = container.attachShadow ? container.attachShadow({ mode: 'open' }) : container;
  }

  // Generate CSS with full Dark/Light Theme and Responsive Mobile sizing
  function generateCSS(color, position, theme) {
    var isLeft = position === 'bottom-left';
    var isDark = theme === 'dark';

    var bgBody = isDark ? '#111827' : '#ffffff';
    var bgCard = isDark ? '#1f2937' : '#f9fafb';
    var textMain = isDark ? '#f9fafb' : '#111827';
    var textSub = isDark ? '#9ca3af' : '#6b7280';
    var borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    var aiMsgBg = isDark ? '#1f2937' : '#f3f4f6';
    var aiMsgText = isDark ? '#f3f4f6' : '#1f2937';

    return `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      
      .xia-launcher {
        position: fixed;
        bottom: 24px;
        ${isLeft ? 'left: 24px;' : 'right: 24px;'}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22), 0 3px 8px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
        border: none;
        outline: none;
      }
      .xia-launcher:hover {
        transform: scale(1.08);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
      }
      .xia-launcher:active { transform: scale(0.95); }
      .xia-launcher svg { width: 28px; height: 28px; fill: white; }

      .xia-unread-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        background: #ef4444;
        color: white;
        border: 2px solid ${bgBody};
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        min-width: 20px;
        height: 20px;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }
      .xia-unread-badge.active { display: flex; }

      .xia-window {
        position: fixed;
        bottom: 96px;
        ${isLeft ? 'left: 24px;' : 'right: 24px;'}
        width: 390px;
        max-width: calc(100vw - 32px);
        height: 600px;
        max-height: calc(100vh - 120px);
        background: ${bgBody};
        color: ${textMain};
        border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 4px 14px rgba(0, 0, 0, 0.08);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483646;
        border: 1px solid ${borderCol};
        animation: xiaSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .xia-window.open { display: flex; }

      @keyframes xiaSlideIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Header */
      .xia-header {
        background: ${color};
        background-image: linear-gradient(135deg, ${color}, rgba(0, 0, 0, 0.25));
        color: white;
        padding: 16px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
      }
      .xia-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .xia-avatar {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.22);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .xia-avatar svg { width: 22px; height: 22px; fill: white; }
      .xia-title { font-weight: 700; font-size: 15px; line-height: 1.2; letter-spacing: -0.01em; }
      .xia-status-sub {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        opacity: 0.92;
        margin-top: 2px;
      }
      .xia-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
      }
      .xia-status-dot.human {
        background: #38bdf8;
        box-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
      }

      .xia-close-btn {
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: white;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
      }
      .xia-close-btn:hover { background: rgba(255, 255, 255, 0.25); }
      .xia-close-btn svg { width: 18px; height: 18px; stroke: white; stroke-width: 2.2; }

      /* Body */
      .xia-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: ${bgCard};
      }
      .xia-body::-webkit-scrollbar { width: 5px; }
      .xia-body::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.25); border-radius: 4px; }

      /* Message Bubbles */
      .xia-msg-wrap {
        display: flex;
        flex-direction: column;
        max-width: 82%;
        animation: xiaMsgFade 0.2s ease-out;
      }
      @keyframes xiaMsgFade {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .xia-msg-wrap.visitor { align-self: flex-end; align-items: flex-end; }
      .xia-msg-wrap.ai, .xia-msg-wrap.agent, .xia-msg-wrap.system { align-self: flex-start; align-items: flex-start; }

      .xia-sender-label {
        font-size: 11px;
        font-weight: 600;
        color: ${textSub};
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .xia-agent-badge {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        background: #e0f2fe;
        color: #0284c7;
        padding: 1px 5px;
        border-radius: 4px;
        font-weight: 700;
      }

      .xia-bubble {
        padding: 11px 14px;
        border-radius: 16px;
        font-size: 13.5px;
        line-height: 1.48;
        word-break: break-word;
        white-space: pre-wrap;
      }
      .xia-msg-wrap.visitor .xia-bubble {
        background: ${color};
        color: #ffffff;
        border-bottom-right-radius: 4px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
      }
      .xia-msg-wrap.ai .xia-bubble {
        background: ${aiMsgBg};
        color: ${aiMsgText};
        border-bottom-left-radius: 4px;
        border: 1px solid ${borderCol};
      }
      .xia-msg-wrap.agent .xia-bubble {
        background: #eff6ff;
        color: #1e3a8a;
        border: 1px solid #bfdbfe;
        border-bottom-left-radius: 4px;
      }
      .xia-msg-wrap.system .xia-bubble {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
        font-size: 12.5px;
        font-style: italic;
      }

      .xia-time {
        font-size: 10px;
        color: ${textSub};
        margin-top: 3px;
        padding: 0 4px;
      }

      /* Quick Action Starters */
      .xia-starters {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 6px;
        width: 100%;
      }
      .xia-starter-chip {
        background: ${bgBody};
        border: 1px solid ${borderCol};
        color: ${textMain};
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        transition: all 0.18s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .xia-starter-chip:hover {
        border-color: ${color};
        background: ${color}10;
        color: ${color};
        transform: translateX(3px);
      }
      .xia-starter-chip::after {
        content: '→';
        font-size: 13px;
        opacity: 0.6;
      }

      /* Email Identify Banner (Guest -> Customer Merge) */
      .xia-identify-banner {
        background: ${bgBody};
        border: 1px solid ${borderCol};
        border-radius: 12px;
        padding: 10px 12px;
        margin-top: 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .xia-identify-title {
        font-size: 11.5px;
        font-weight: 600;
        color: ${textMain};
      }
      .xia-identify-form {
        display: flex;
        gap: 6px;
      }
      .xia-identify-input {
        flex: 1;
        border: 1px solid ${borderCol};
        background: ${bgCard};
        color: ${textMain};
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 8px;
        outline: none;
      }
      .xia-identify-btn {
        background: ${color};
        color: white;
        border: none;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }

      /* Typing indicator */
      .xia-typing {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 14px;
        background: ${aiMsgBg};
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        width: fit-content;
        border: 1px solid ${borderCol};
      }
      .xia-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${textSub};
        animation: xiaBounce 1.2s infinite ease-in-out;
      }
      .xia-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .xia-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes xiaBounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }

      /* Footer & Composer */
      .xia-footer {
        padding: 12px 14px;
        background: ${bgBody};
        border-top: 1px solid ${borderCol};
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .xia-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${bgCard};
        border: 1px solid ${borderCol};
        border-radius: 12px;
        padding: 4px 8px 4px 12px;
        transition: border-color 0.2s ease;
      }
      .xia-input-row:focus-within {
        border-color: ${color};
        box-shadow: 0 0 0 2px ${color}20;
      }
      .xia-input {
        flex: 1;
        border: none;
        background: transparent;
        color: ${textMain};
        font-size: 13.5px;
        outline: none;
        padding: 8px 0;
      }
      .xia-send-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: ${color};
        border: none;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease, background 0.15s ease;
        flex-shrink: 0;
      }
      .xia-send-btn:hover { transform: scale(1.05); }
      .xia-send-btn:active { transform: scale(0.95); }
      .xia-send-btn svg { width: 16px; height: 16px; fill: white; }

      .xia-branding {
        font-size: 10px;
        text-align: center;
        color: ${textSub};
      }
      .xia-branding a {
        color: inherit;
        text-decoration: none;
        font-weight: 600;
      }
      .xia-branding a:hover { text-decoration: underline; }
    `;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, function (tag) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag);
    });
  }

  function formatTime(iso) {
    try {
      var d = iso ? new Date(iso) : new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  // Render DOM into Shadow Root
  function renderDOM() {
    ensureShadowRoot();

    var starters = (state.conversationStarters && state.conversationStarters.length > 0)
      ? state.conversationStarters
      : (INDUSTRY_QUICK_ACTIONS[state.industry] || INDUSTRY_QUICK_ACTIONS['coffee_shop']);

    var isHuman = state.conversationStatus === 'human' || Boolean(state.assignedAgentName);
    var statusText = isHuman ? ('Live Agent: ' + (state.assignedAgentName || 'Assigned')) : (state.showAgentAvailability ? 'AI Support Active' : 'Online');

    shadow.innerHTML = `
      <style>${generateCSS(state.primaryColor, state.position, state.theme)}</style>

      <button class="xia-launcher" aria-label="Open AI Customer Support">
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0-2-.9-2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
        <span class="xia-unread-badge" id="xia-unread-badge">1</span>
      </button>

      <div class="xia-window ${state.isOpen ? 'open' : ''}">
        <div class="xia-header">
          <div class="xia-header-left">
            <div class="xia-avatar">
              <svg viewBox="0 0 24 24">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
              </svg>
            </div>
            <div>
              <div class="xia-title">${escapeHTML(state.widgetName)}</div>
              <div class="xia-status-sub">
                <span class="xia-status-dot ${isHuman ? 'human' : ''}"></span>
                <span id="xia-status-label">${escapeHTML(statusText)}</span>
              </div>
            </div>
          </div>
          <button class="xia-close-btn" aria-label="Close Chat">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="xia-body" id="xia-chat-body"></div>

        <div class="xia-footer">
          <div class="xia-input-row">
            <input type="text" class="xia-input" placeholder="Ask a question or track order..." />
            <button class="xia-send-btn" aria-label="Send Message">
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
          <div class="xia-branding">Powered by <a href="https://xiachat.ai" target="_blank" rel="noopener">Xia Chat AI</a></div>
        </div>
      </div>
    `;

    bindDOMEvents();
    renderMessages();
  }

  // Render conversation messages & dynamic starters
  function renderMessages() {
    var body = shadow ? shadow.querySelector('#xia-chat-body') : null;
    if (!body) return;

    var html = '';
    var customerCount = 0;

    state.messages.forEach(function (m) {
      var isCustomer = m.senderType === 'customer' || m.senderType === 'visitor';
      var isAgent = m.senderType === 'agent' || m.senderType === 'user';
      var isSystem = m.senderType === 'system';
      var type = isCustomer ? 'visitor' : (isAgent ? 'agent' : (isSystem ? 'system' : 'ai'));

      if (isCustomer) customerCount++;

      var labelHtml = '';
      if (isAgent) {
        labelHtml = `<div class="xia-sender-label agent"><span>${escapeHTML(m.senderName || 'Live Agent')}</span><span class="xia-agent-badge">Live Specialist</span></div>`;
      } else if (!isCustomer && !isSystem) {
        labelHtml = `<div class="xia-sender-label"><span>${escapeHTML(m.senderName || state.widgetName)}</span></div>`;
      }

      html += `
        <div class="xia-msg-wrap ${type}">
          ${labelHtml}
          <div class="xia-bubble">${escapeHTML(m.content)}</div>
          <div class="xia-time">${formatTime(m.createdAt)}</div>
        </div>
      `;
    });

    if (state.isSending) {
      html += `
        <div class="xia-msg-wrap ai">
          <div class="xia-typing">
            <span class="xia-typing-dot"></span>
            <span class="xia-typing-dot"></span>
            <span class="xia-typing-dot"></span>
          </div>
        </div>
      `;
    }

    // Dynamic Quick Actions shown on first opening or when customer hasn't asked questions
    if (customerCount === 0) {
      var starters = (state.conversationStarters && state.conversationStarters.length > 0)
        ? state.conversationStarters
        : (INDUSTRY_QUICK_ACTIONS[state.industry] || INDUSTRY_QUICK_ACTIONS['coffee_shop']);

      html += `
        <div class="xia-starters">
          ${starters.map(function (s) {
            var label = typeof s === 'object' && s !== null ? (s.label || s.prompt || '') : String(s);
            var prompt = typeof s === 'object' && s !== null ? (s.prompt || s.label || '') : String(s);
            return `<button type="button" class="xia-starter-chip" data-starter="${escapeHTML(prompt)}">${escapeHTML(label)}</button>`;
          }).join('')}
        </div>
      `;
    }

    // Guest identification prompt if no email has been linked yet
    if (!state.customerProfile.email && customerCount >= 1) {
      html += `
        <div class="xia-identify-banner">
          <div class="xia-identify-title">Get conversation updates via email:</div>
          <div class="xia-identify-form">
            <input type="email" class="xia-identify-input" id="xia-visitor-email-input" placeholder="name@example.com" />
            <button type="button" class="xia-identify-btn" id="xia-save-email-btn">Save</button>
          </div>
        </div>
      `;
    }

    body.innerHTML = html;
    body.scrollTop = body.scrollHeight;
  }

  // Update status dot and agent label in header
  function updateHeaderStatus() {
    if (!shadow) return;
    var statusDot = shadow.querySelector('.xia-status-dot');
    var statusLabel = shadow.querySelector('#xia-status-label');
    if (!statusLabel) return;

    var isHuman = state.conversationStatus === 'human' || Boolean(state.assignedAgentName);
    if (isHuman) {
      if (statusDot) statusDot.classList.add('human');
      statusLabel.textContent = `Live Agent: ${state.assignedAgentName || 'Assigned'}`;
    } else {
      if (statusDot) statusDot.classList.remove('human');
      statusLabel.textContent = state.showAgentAvailability ? 'AI Support Active' : 'Online';
    }
  }

  // Bind events for launcher, close button, input, starters
  function bindDOMEvents() {
    var launcher = shadow.querySelector('.xia-launcher');
    var windowEl = shadow.querySelector('.xia-window');
    var closeBtn = shadow.querySelector('.xia-close-btn');
    var sendBtn = shadow.querySelector('.xia-send-btn');
    var input = shadow.querySelector('.xia-input');
    var body = shadow.querySelector('#xia-chat-body');

    if (launcher) {
      launcher.onclick = function () {
        XiaChat.toggle();
      };
    }

    if (closeBtn) {
      closeBtn.onclick = function () {
        XiaChat.close();
      };
    }

    var doSend = function (overrideText) {
      var text = overrideText !== undefined ? overrideText : (input ? input.value : '');
      if (!text || !text.trim() || state.isSending) return;
      if (input && overrideText === undefined) input.value = '';
      XiaChat.sendMessage(text.trim());
    };

    if (sendBtn) {
      sendBtn.onclick = function () { doSend(); };
    }

    if (input) {
      input.onkeydown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          doSend();
        }
      };
    }

    if (body) {
      body.onclick = function (e) {
        var chip = e.target.closest('.xia-starter-chip');
        if (chip) {
          var starter = chip.getAttribute('data-starter');
          if (starter) {
            doSend(starter);
          }
          return;
        }

        var saveEmailBtn = e.target.closest('#xia-save-email-btn');
        if (saveEmailBtn) {
          var emailInput = shadow.querySelector('#xia-visitor-email-input');
          if (emailInput && emailInput.value && emailInput.value.includes('@')) {
            XiaChat.identify({ email: emailInput.value.trim() });
          }
        }
      };
    }
  }

  // Core API: Send Message
  function sendMessageToServer(content) {
    state.isSending = true;
    state.messages.push({
      senderType: 'customer',
      senderName: state.customerProfile.name || 'You',
      content: content,
      createdAt: new Date().toISOString(),
    });
    renderMessages();

    var payload = {
      message: content,
      visitorId: visitorIdentity.visitorId,
      sessionId: visitorIdentity.sessionId,
      browserId: visitorIdentity.browserId,
      conversationId: savedConvId || undefined,
      customerName: state.customerProfile.name || undefined,
      customerEmail: state.customerProfile.email || undefined,
      productContext: state.productContext || undefined,
    };

    fetch(apiBase + '/api/channels/public-widget/' + encodeURIComponent(state.siteKey) + '/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(state.apiKey ? { 'x-api-key': state.apiKey } : {}),
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        state.isSending = false;
        if (data.conversationId) {
          var isFirst = !savedConvId;
          savedConvId = data.conversationId;
          try {
            localStorage.setItem(STORAGE_CONV_KEY(), savedConvId);
          } catch (e) {}

          if (isFirst) {
            connectSSE();
            startPolling();
          }
        }

        if (data.isHandoff) {
          state.conversationStatus = 'human';
          updateHeaderStatus();
        }

        if (data.reply) {
          state.messages.push({
            senderType: data.isHandoff ? 'system' : 'ai',
            senderName: data.isHandoff ? 'System' : state.widgetName,
            content: data.reply,
            createdAt: new Date().toISOString(),
          });
        }
        renderMessages();
      })
      .catch(function (err) {
        console.error('[Xia Chat] Error delivering message:', err);
        state.isSending = false;
        state.messages.push({
          senderType: 'ai',
          senderName: state.widgetName,
          content: 'Sorry, I had trouble reaching the support server. Please check your connection and try again.',
          createdAt: new Date().toISOString(),
        });
        renderMessages();
      });
  }

  // Core API: Identify Guest Visitor with Email (Merges history)
  function identifyVisitor(customerData) {
    if (!customerData || !customerData.email) return Promise.reject(new Error('Email is required'));

    state.customerProfile.email = customerData.email.trim();
    if (customerData.name) state.customerProfile.name = customerData.name.trim();
    if (customerData.phone) state.customerProfile.phone = customerData.phone.trim();

    return fetch(apiBase + '/api/channels/public-widget/' + encodeURIComponent(state.siteKey) + '/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(state.apiKey ? { 'x-api-key': state.apiKey } : {}),
      },
      body: JSON.stringify({
        visitorId: visitorIdentity.visitorId,
        email: state.customerProfile.email,
        name: state.customerProfile.name,
        phone: state.customerProfile.phone,
        conversationId: savedConvId || undefined,
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderMessages();
        return data;
      })
      .catch(function (err) {
        console.warn('[Xia Chat] Visitor identify warning:', err);
      });
  }

  // Fetch Conversation History
  function fetchHistory() {
    if (!savedConvId) return;

    fetch(apiBase + '/api/channels/public-widget/' + encodeURIComponent(state.siteKey) + '/conversation/' + encodeURIComponent(savedConvId))
      .then(function (res) {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          state.messages = data.messages;
          if (data.status === 'HUMAN_HANDLING' || data.status === 'human') {
            state.conversationStatus = 'human';
          }
          updateHeaderStatus();
          renderMessages();
        }
      })
      .catch(function () {});
  }

  // Realtime: SSE + Polling Fallback
  function connectSSE() {
    if (!savedConvId || typeof EventSource === 'undefined') return;
    if (state.sseSource) {
      try { state.sseSource.close(); } catch (e) {}
    }

    try {
      var sseUrl = apiBase + '/api/channels/public-widget/' + encodeURIComponent(state.siteKey) + '/conversation/' + encodeURIComponent(savedConvId) + '/events';
      state.sseSource = new EventSource(sseUrl);

      state.sseSource.addEventListener('message', function (e) {
        try {
          var payload = JSON.parse(e.data);
          if (payload.type === 'message' && payload.data) {
            var msg = payload.data;
            var exists = state.messages.some(function (m) { return m.id === msg.id; });
            if (!exists) {
              state.messages.push(msg);
              renderMessages();
            }
          } else if (payload.type === 'status_change') {
            state.conversationStatus = payload.status === 'HUMAN_HANDLING' ? 'human' : 'ai';
            if (payload.assignee) state.assignedAgentName = payload.assignee;
            updateHeaderStatus();
          }
        } catch (err) {}
      });

      state.sseSource.onerror = function () {
        // Fallback gracefully to polling
        startPolling();
      };
    } catch (e) {
      startPolling();
    }
  }

  function startPolling() {
    stopPolling();
    fetchHistory();
    state.pollInterval = setInterval(fetchHistory, 3000);
  }

  function stopPolling() {
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
    }
  }

  // Load Remote Widget Configuration
  function loadConfig() {
    var url = apiBase + '/api/channels/public-widget/' + encodeURIComponent(state.siteKey) + '?industry=' + encodeURIComponent(state.industry);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load widget config: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.siteKey && state.siteKey === 'auto-detect') {
          state.siteKey = data.siteKey;
        }
        state.widgetName = data.widgetName || state.widgetName;
        state.welcomeMessage = data.welcomeMessage || state.welcomeMessage;
        if (Array.isArray(data.conversationStarters) && data.conversationStarters.length > 0) {
          state.conversationStarters = data.conversationStarters;
        }
        state.primaryColor = data.primaryColor || state.primaryColor;
        state.position = data.position || state.position;
        state.theme = data.theme || state.theme;
        state.showAgentAvailability = data.showAgentAvailability !== false;

        // Initialize greeting message
        if (state.messages.length === 0) {
          state.messages = [
            {
              senderType: 'ai',
              senderName: state.widgetName,
              content: state.welcomeMessage,
              createdAt: new Date().toISOString(),
            },
          ];
        }

        renderDOM();

        if (savedConvId) {
          fetchHistory();
          connectSSE();
        }
        return state;
      })
      .catch(function (err) {
        console.warn('[Xia Chat] Falling back to default configuration:', err.message);
        if (state.messages.length === 0) {
          state.messages = [
            {
              senderType: 'ai',
              senderName: state.widgetName,
              content: state.welcomeMessage,
              createdAt: new Date().toISOString(),
            },
          ];
        }
        renderDOM();
      });
  }

  // -------------------------------------------------------------
  // Public SDK API (window.XiaChat)
  // -------------------------------------------------------------
  XiaChat.init = function (options) {
    options = options || {};
    if (options.websiteId) state.siteKey = options.websiteId;
    if (options.siteKey) state.siteKey = options.siteKey;
    if (options.apiKey) state.apiKey = options.apiKey;
    if (options.theme) state.theme = options.theme;
    if (options.industry) state.industry = options.industry;
    if (options.position) state.position = options.position;
    if (options.primaryColor) state.primaryColor = options.primaryColor;
    if (options.widgetName) state.widgetName = options.widgetName;
    if (options.welcomeMessage) state.welcomeMessage = options.welcomeMessage;
    if (options.conversationStarters) state.conversationStarters = options.conversationStarters;
    if (options.productContext) state.productContext = options.productContext;

    state.initialized = true;
    return loadConfig();
  };

  XiaChat.open = function () {
    state.isOpen = true;
    if (shadow) {
      var w = shadow.querySelector('.xia-window');
      if (w) w.classList.add('open');
      var badge = shadow.querySelector('#xia-unread-badge');
      if (badge) badge.classList.remove('active');
    }
  };

  XiaChat.close = function () {
    state.isOpen = false;
    if (shadow) {
      var w = shadow.querySelector('.xia-window');
      if (w) w.classList.remove('open');
    }
  };

  XiaChat.toggle = function () {
    if (state.isOpen) XiaChat.close();
    else XiaChat.open();
  };

  XiaChat.sendMessage = function (text) {
    if (!text || !text.trim()) return;
    sendMessageToServer(text.trim());
  };

  XiaChat.identify = function (customerData) {
    return identifyVisitor(customerData);
  };

  XiaChat.setContext = function (productContext) {
    state.productContext = productContext;
  };

  XiaChat.getVisitorId = function () {
    return visitorIdentity.visitorId;
  };

  XiaChat.getSessionId = function () {
    return visitorIdentity.sessionId;
  };

  XiaChat.getBrowserId = function () {
    return visitorIdentity.browserId;
  };

  // Expose to window
  window.XiaChat = XiaChat;

  // Auto-init on DOMContentLoaded or immediately if DOM is ready
  function autoBoot() {
    if (!state.initialized) {
      XiaChat.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBoot);
  } else {
    autoBoot();
  }
})(window, document);
