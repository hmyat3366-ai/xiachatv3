(function () {
  'use strict';

  // 1. Resolve Script & Configuration Attributes
  var currentScript = document.currentScript || document.querySelector('script[data-site-key]');
  var siteKey = currentScript ? currentScript.getAttribute('data-site-key') : 'auto-detect';
  if (!siteKey) siteKey = 'auto-detect';

  var scriptSrc = currentScript && currentScript.src ? currentScript.src : '';
  var apiBase = '';
  try {
    apiBase = new URL(scriptSrc).origin;
  } catch (e) {
    apiBase = window.location.origin;
  }

  // 2. Session Management (localStorage)
  var STORAGE_KEY = 'xia_chat_session_' + siteKey;
  var session = { visitorId: '', conversationId: '' };

  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      session = JSON.parse(stored);
    }
  } catch (e) {}

  if (!session.visitorId) {
    session.visitorId = 'visitor_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {}
  }

  // State
  var widgetConfig = {
    widgetName: 'AI Support Assistant',
    welcomeMessage: 'Hi 👋 How can I help you today?',
    conversationStarters: ['📦 Track Order', '☕ Product Information', '💳 Pricing', '🧑‍💼 Talk to Human'],
    primaryColor: '#C88A58',
    position: 'bottom-right',
    showAgentAvailability: true,
  };

  var isOpen = false;
  var messages = [];
  var isSending = false;
  var conversationStatus = 'ai';
  var assignedAgentName = '';
  var pollInterval = null;
  var sseSource = null;

  // 3. Create Container & Shadow DOM (Isolated CSS)
  var container = document.createElement('div');
  container.id = 'xia-chat-widget-root';
  document.body.appendChild(container);

  var shadow = container.attachShadow ? container.attachShadow({ mode: 'open' }) : container;

  // 4. Scoped Styles
  function getStyles(color, position) {
    var isLeft = position === 'bottom-left';
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
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2), 0 3px 8px rgba(0, 0, 0, 0.1);
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
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26);
      }
      .xia-launcher:active { transform: scale(0.95); }
      .xia-launcher svg { width: 28px; height: 28px; fill: white; }

      .xia-window {
        position: fixed;
        bottom: 96px;
        ${isLeft ? 'left: 24px;' : 'right: 24px;'}
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 560px;
        max-height: calc(100vh - 120px);
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18), 0 4px 14px rgba(0, 0, 0, 0.08);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483646;
        border: 1px solid rgba(0, 0, 0, 0.08);
        animation: xiaFadeUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .xia-window.open { display: flex; }

      @keyframes xiaFadeUp {
        from { opacity: 0; transform: translateY(18px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Header */
      .xia-header {
        background: ${color};
        background-image: linear-gradient(135deg, ${color}, rgba(0,0,0,0.2));
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .xia-header-left { display: flex; align-items: center; gap: 12px; }
      .xia-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.22);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
      }
      .xia-avatar svg { width: 22px; height: 22px; fill: white; }
      .xia-title { font-size: 15px; font-weight: 700; line-height: 1.2; letter-spacing: -0.2px; }
      .xia-status-sub {
        font-size: 11px;
        opacity: 0.95;
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 3px;
        font-weight: 600;
      }
      .xia-status-dot {
        width: 7px;
        height: 7px;
        background: #10B981;
        border-radius: 50%;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
      }
      .xia-status-dot.human {
        background: #F59E0B;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.4);
      }
      .xia-close-btn {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.85;
        transition: opacity 0.2s;
      }
      .xia-close-btn:hover { opacity: 1; background: rgba(255, 255, 255, 0.15); }
      .xia-close-btn svg { width: 20px; height: 20px; stroke: white; stroke-width: 2.2; }

      /* Message Area */
      .xia-body {
        flex: 1;
        padding: 16px 18px;
        overflow-y: auto;
        background: #F9FAFB;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
      }
      .xia-msg-wrap { display: flex; flex-direction: column; width: 100%; }
      .xia-msg-wrap.visitor { align-items: flex-end; }
      .xia-msg-wrap.ai, .xia-msg-wrap.agent, .xia-msg-wrap.system { align-items: flex-start; }
      
      .xia-sender-label {
        font-size: 10.5px;
        font-weight: 700;
        color: #6B7280;
        margin-bottom: 3px;
        padding: 0 6px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .xia-sender-label.agent {
        color: ${color};
      }
      .xia-agent-badge {
        font-size: 9.5px;
        background: rgba(0, 0, 0, 0.06);
        padding: 1px 5px;
        border-radius: 4px;
        text-transform: uppercase;
        font-weight: 800;
      }

      .xia-bubble {
        max-width: 84%;
        padding: 11px 15px;
        border-radius: 18px;
        font-size: 13.5px;
        line-height: 1.48;
        word-break: break-word;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .xia-msg-wrap.visitor .xia-bubble {
        background: ${color};
        color: #ffffff;
        border-bottom-right-radius: 4px;
      }
      .xia-msg-wrap.ai .xia-bubble {
        background: #ffffff;
        color: #1F2937;
        border: 1px solid #E5E7EB;
        border-bottom-left-radius: 4px;
      }
      .xia-msg-wrap.agent .xia-bubble {
        background: #ffffff;
        color: #111827;
        border: 1.5px solid ${color};
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      }
      .xia-msg-wrap.system .xia-bubble {
        background: #FEF3C7;
        color: #92400E;
        border: 1px solid #FDE68A;
        font-size: 12px;
        border-radius: 12px;
        max-width: 95%;
      }
      .xia-time {
        font-size: 10px;
        color: #9CA3AF;
        margin-top: 4px;
        padding: 0 4px;
      }

      /* Typing indicator */
      .xia-typing {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 10px 14px;
        background: #ffffff;
        border: 1px solid #E5E7EB;
        border-radius: 18px;
        border-bottom-left-radius: 4px;
        width: fit-content;
      }
      .xia-typing-dot {
        width: 6px;
        height: 6px;
        background: #9CA3AF;
        border-radius: 50%;
        animation: xiaBounce 1.4s infinite ease-in-out both;
      }
      .xia-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .xia-typing-dot:nth-child(2) { animation-delay: -0.16s; }
      @keyframes xiaBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }

      /* Quick Replies / Conversation Starters */
      .xia-starters {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
        margin-bottom: 6px;
        animation: xiaFadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .xia-starter-chip {
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.12);
        color: #374151;
        padding: 7px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        user-select: none;
      }
      .xia-starter-chip:hover {
        background: ${color};
        color: #ffffff;
        border-color: ${color};
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
      }
      .xia-starter-chip:active {
        transform: scale(0.96);
      }

      /* Footer */
      .xia-footer {
        padding: 12px 16px;
        background: #ffffff;
        border-top: 1px solid #E5E7EB;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .xia-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .xia-input {
        flex: 1;
        padding: 10px 14px;
        border-radius: 20px;
        border: 1px solid #D1D5DB;
        font-size: 13.5px;
        outline: none;
        transition: border-color 0.2s;
      }
      .xia-input:focus { border-color: ${color}; }
      .xia-send-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: ${color};
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s, transform 0.1s;
        flex-shrink: 0;
      }
      .xia-send-btn:hover { opacity: 0.92; }
      .xia-send-btn:active { transform: scale(0.95); }
      .xia-send-btn svg { width: 16px; height: 16px; fill: white; margin-left: 2px; }
      .xia-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

      .xia-branding {
        font-size: 10px;
        color: #9CA3AF;
        text-align: center;
        letter-spacing: 0.2px;
      }
      .xia-branding a { color: #6B7280; text-decoration: none; font-weight: 600; }

      @media (max-width: 480px) {
        .xia-window {
          bottom: 0;
          right: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `;
  }

  // 5. Render DOM Structure
  function renderDOM() {
    var isHuman = conversationStatus === 'human' || Boolean(assignedAgentName);
    var statusText = isHuman
      ? `Live Agent (${assignedAgentName || 'Online'})`
      : widgetConfig.showAgentAvailability ? 'AI Support Active' : 'Online';

    shadow.innerHTML = `
      <style>${getStyles(widgetConfig.primaryColor, widgetConfig.position)}</style>
      
      <!-- Launcher Button -->
      <button class="xia-launcher" aria-label="Open Chat">
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>

      <!-- Chat Window -->
      <div class="xia-window ${isOpen ? 'open' : ''}">
        <div class="xia-header">
          <div class="xia-header-left">
            <div class="xia-avatar">
              <svg viewBox="0 0 24 24">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
              </svg>
            </div>
            <div>
              <div class="xia-title">${escapeHTML(widgetConfig.widgetName)}</div>
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
            <input type="text" class="xia-input" placeholder="Ask a question..." />
            <button class="xia-send-btn" aria-label="Send">
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
          <div class="xia-branding">Powered by <a href="https://xiachat.ai" target="_blank" rel="noopener">Xia Chat</a></div>
        </div>
      </div>
    `;

    setupEvents();
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, function (tag) {
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

  function renderMessages() {
    var body = shadow.querySelector('#xia-chat-body');
    if (!body) return;

    var html = '';
    messages.forEach(function (m) {
      var isCustomer = m.senderType === 'customer' || m.senderType === 'visitor';
      var isAgent = m.senderType === 'agent' || m.senderType === 'user';
      var isSystem = m.senderType === 'system';
      var type = isCustomer ? 'visitor' : (isAgent ? 'agent' : (isSystem ? 'system' : 'ai'));

      var labelHtml = '';
      if (isAgent) {
        labelHtml = `<div class="xia-sender-label agent"><span>${escapeHTML(m.senderName || 'Human Agent')}</span><span class="xia-agent-badge">Live Agent</span></div>`;
      } else if (!isCustomer && !isSystem) {
        labelHtml = `<div class="xia-sender-label"><span>${escapeHTML(m.senderName || widgetConfig.widgetName)}</span></div>`;
      }

      html += `
        <div class="xia-msg-wrap ${type}">
          ${labelHtml}
          <div class="xia-bubble">${escapeHTML(m.content)}</div>
          <div class="xia-time">${formatTime(m.createdAt)}</div>
        </div>
      `;
    });

    if (isSending) {
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

    if (messages.filter(function (m) { return m.senderType === 'customer' || m.senderType === 'visitor'; }).length === 0 && Array.isArray(widgetConfig.conversationStarters) && widgetConfig.conversationStarters.length > 0) {
      html += `
        <div class="xia-starters">
          ${widgetConfig.conversationStarters.map(function (s) {
            var label = typeof s === 'object' && s !== null ? (s.label || s.prompt || '') : String(s);
            var prompt = typeof s === 'object' && s !== null ? (s.prompt || s.label || '') : String(s);
            return `<button type="button" class="xia-starter-chip" data-starter="${escapeHTML(prompt)}">${escapeHTML(label)}</button>`;
          }).join('')}
        </div>
      `;
    }

    body.innerHTML = html;
    body.scrollTop = body.scrollHeight;
  }

  function updateStatusHeader() {
    var statusDot = shadow.querySelector('.xia-status-dot');
    var statusLabel = shadow.querySelector('#xia-status-label');
    if (!statusLabel) return;

    var isHuman = conversationStatus === 'human' || Boolean(assignedAgentName);
    if (isHuman) {
      if (statusDot) statusDot.classList.add('human');
      statusLabel.textContent = `Live Agent (${assignedAgentName || 'Assigned'})`;
    } else {
      if (statusDot) statusDot.classList.remove('human');
      statusLabel.textContent = widgetConfig.showAgentAvailability ? 'AI Support Active' : 'Online';
    }
  }

  // 6. Realtime Sync: SSE Stream + Active 2-Second Polling
  function startPolling() {
    stopPolling();
    fetchHistory();
    pollInterval = setInterval(fetchHistory, 2000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function connectSSE() {
    if (!session.conversationId || typeof EventSource === 'undefined') return;
    if (sseSource) {
      try { sseSource.close(); } catch (e) {}
    }

    try {
      var sseUrl = apiBase + '/api/channels/public-widget/' + encodeURIComponent(siteKey) + '/conversation/' + encodeURIComponent(session.conversationId) + '/events';
      sseSource = new EventSource(sseUrl);

      sseSource.onmessage = function (event) {
        try {
          var data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.payload) {
            var newMsg = data.payload;
            if (!newMsg.isInternalNote) {
              var exists = messages.some(function (m) { return m.id === newMsg.id; });
              if (!exists) {
                messages.push({
                  id: newMsg.id,
                  senderType: newMsg.senderType,
                  senderName: newMsg.senderName,
                  content: newMsg.content,
                  createdAt: newMsg.createdAt,
                });
                if (newMsg.senderType === 'agent') {
                  conversationStatus = 'human';
                  assignedAgentName = newMsg.senderName || 'Agent';
                  updateStatusHeader();
                }
                renderMessages();
              }
            }
          } else if (data.type === 'status_change' && data.payload) {
            conversationStatus = data.payload.status || conversationStatus;
            assignedAgentName = data.payload.assignee || assignedAgentName;
            updateStatusHeader();
          }
        } catch (e) {}
      };

      sseSource.onerror = function () {
        // SSE reconnect handles itself, fallback polling continues
      };
    } catch (e) {}
  }

  function fetchHistory() {
    if (!session.conversationId) return;
    fetch(apiBase + '/api/channels/public-widget/' + encodeURIComponent(siteKey) + '/conversation/' + encodeURIComponent(session.conversationId))
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.status) {
          conversationStatus = data.status;
          updateStatusHeader();
        }

        if (data.messages && data.messages.length > 0) {
          var hasChange = false;
          if (data.messages.length !== messages.length) {
            hasChange = true;
          } else if (data.messages.length > 0) {
            var lastNew = data.messages[data.messages.length - 1];
            var lastOld = messages[messages.length - 1];
            if (lastNew && lastOld && lastNew.id !== lastOld.id) {
              hasChange = true;
            }
          }

          if (hasChange) {
            messages = data.messages;
            // Check if any agent messages exist
            var agentMsg = messages.filter(function (m) { return m.senderType === 'agent'; }).pop();
            if (agentMsg) {
              conversationStatus = 'human';
              assignedAgentName = agentMsg.senderName || assignedAgentName;
              updateStatusHeader();
            }
            renderMessages();
          }
        }
      })
      .catch(function () {});
  }

  function setupEvents() {
    var launcher = shadow.querySelector('.xia-launcher');
    var closeBtn = shadow.querySelector('.xia-close-btn');
    var win = shadow.querySelector('.xia-window');
    var input = shadow.querySelector('.xia-input');
    var sendBtn = shadow.querySelector('.xia-send-btn');

    launcher.addEventListener('click', function () {
      isOpen = !isOpen;
      if (isOpen) {
        win.classList.add('open');
        input.focus();
        startPolling();
        connectSSE();
      } else {
        win.classList.remove('open');
        stopPolling();
      }
    });

    closeBtn.addEventListener('click', function () {
      isOpen = false;
      win.classList.remove('open');
      stopPolling();
    });

    function doSend(customText) {
      var text = (typeof customText === 'string' ? customText : (input.value || '')).trim();
      if (!text || isSending) return;

      input.value = '';
      messages.push({
        senderType: 'customer',
        content: text,
        createdAt: new Date().toISOString(),
      });
      isSending = true;
      renderMessages();

      // Post message to backend
      fetch(apiBase + '/api/channels/public-widget/' + encodeURIComponent(siteKey) + '/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          visitorId: session.visitorId,
          conversationId: session.conversationId || undefined,
        }),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          isSending = false;
          if (data.conversationId) {
            var isFirstTime = !session.conversationId;
            session.conversationId = data.conversationId;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            } catch (e) {}

            if (isFirstTime) {
              connectSSE();
              startPolling();
            }
          }

          if (data.isHandoff) {
            conversationStatus = 'open';
            updateStatusHeader();
          }

          if (data.reply) {
            messages.push({
              senderType: data.isHandoff ? 'system' : 'ai',
              content: data.reply,
              createdAt: new Date().toISOString(),
            });
          }
          renderMessages();
        })
        .catch(function (err) {
          console.error('[Xia Chat Widget] Error sending message:', err);
          isSending = false;
          messages.push({
            senderType: 'ai',
            content: 'Sorry, we encountered a network issue. Please try again.',
            createdAt: new Date().toISOString(),
          });
          renderMessages();
        });
    }

    // Quick replies click delegation
    var chatBody = shadow.querySelector('#xia-chat-body');
    if (chatBody) {
      chatBody.addEventListener('click', function (e) {
        var chip = e.target.closest('.xia-starter-chip');
        if (chip) {
          var starter = chip.getAttribute('data-starter');
          if (starter) {
            doSend(starter);
          }
        }
      });
    }

    sendBtn.addEventListener('click', function () { doSend(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });
  }

  // 7. Fetch Configuration & Boot Widget
  fetch(apiBase + '/api/channels/public-widget/' + encodeURIComponent(siteKey))
    .then(function (res) {
      if (!res.ok) throw new Error('Status ' + res.status);
      return res.json();
    })
    .then(function (data) {
      widgetConfig.widgetName = data.widgetName || widgetConfig.widgetName;
      widgetConfig.welcomeMessage = data.welcomeMessage || widgetConfig.welcomeMessage;
      if (Array.isArray(data.conversationStarters) && data.conversationStarters.length > 0) {
        widgetConfig.conversationStarters = data.conversationStarters;
      }
      widgetConfig.primaryColor = data.primaryColor || widgetConfig.primaryColor;
      widgetConfig.position = data.position || widgetConfig.position;
      widgetConfig.showAgentAvailability = data.showAgentAvailability !== false;

      messages = [
        {
          senderType: 'ai',
          content: widgetConfig.welcomeMessage,
          createdAt: new Date().toISOString(),
        },
      ];

      renderDOM();
      renderMessages();

      if (session.conversationId) {
        fetchHistory();
        connectSSE();
      }
    })
    .catch(function (err) {
      console.warn('[Xia Chat Widget] Using default configuration:', err.message);
      messages = [
        {
          senderType: 'ai',
          content: widgetConfig.welcomeMessage,
          createdAt: new Date().toISOString(),
        },
      ];
      renderDOM();
      renderMessages();
    });
})();
