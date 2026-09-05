/**
 * Xia Chat AI Widget SDK (Enterprise Edition with Brand Color Adaptation)
 * Reusable embeddable customer support widget for any website (Static HTML, React, Next.js, Shopify, Ecommerce).
 * Supports automatic website brand color adaptation, dynamic dark/light mode inheritance, and isolated Shadow DOM.
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
    theme: (currentScript && currentScript.getAttribute('data-theme')) || 'auto',
    matchWebsiteTheme: true,
    autoDetectColor: true,
    configuredPrimaryColor: null,
    manualPrimaryColor: null,
    configuredSecondaryColor: null,
    currentEffectiveColor: '#6366F1',
    currentEffectiveTheme: 'light',
    position: (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right',
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
    pendingAttachment: null,
    isUploadingAttachment: false,
    lightboxUrl: null,
  };

  // -------------------------------------------------------------
  // COLOR & THEME DETECTION ENGINE
  // -------------------------------------------------------------

  function parseColorToRgb(colorStr) {
    if (!colorStr || typeof colorStr !== 'string') return null;
    colorStr = colorStr.trim();

    // Hex format #RGB or #RRGGBB
    if (colorStr.charAt(0) === '#') {
      var hex = colorStr.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map(function (c) { return c + c; }).join('');
      }
      if (hex.length === 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        };
      }
    }

    // rgb(r, g, b) or rgba(r, g, b, a)
    var rgbMatch = colorStr.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
      var alpha = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
      if (alpha < 0.1) return null; // Transparent
      return {
        r: Math.round(parseFloat(rgbMatch[1])),
        g: Math.round(parseFloat(rgbMatch[2])),
        b: Math.round(parseFloat(rgbMatch[3])),
      };
    }

    // HSL or named colors via computed dummy
    try {
      var dummy = document.createElement('div');
      dummy.style.color = colorStr;
      dummy.style.display = 'none';
      document.body.appendChild(dummy);
      var computed = window.getComputedStyle(dummy).color;
      document.body.removeChild(dummy);
      if (computed && computed !== colorStr) {
        return parseColorToRgb(computed);
      }
    } catch (e) {}

    return null;
  }

  function rgbToHex(r, g, b) {
    var toH = function (c) {
      var h = Math.max(0, Math.min(255, Math.round(c))).toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return '#' + toH(r) + toH(g) + toH(b);
  }

  function getRelativeLuminance(rgb) {
    var a = [rgb.r, rgb.g, rgb.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }

  function getContrastColor(rgb) {
    if (!rgb) return '#FFFFFF';
    var lum = getRelativeLuminance(rgb);
    return lum > 0.45 ? '#111827' : '#FFFFFF';
  }

  function isForbiddenColor(rgb) {
    if (!rgb) return true;
    var r = rgb.r, g = rgb.g, b = rgb.b;
    var lum = getRelativeLuminance(rgb);

    // Pure black or near-black
    if (lum < 0.04) return true;

    // Pure white or near-white
    if (lum > 0.90) return true;

    // Low-contrast gray (saturation test)
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    if (delta < 25) return true; // Grayscale / low contrast

    // Destructive alert red (e.g. #ef4444, #dc2626, #ff0000)
    if (r > 195 && g < 75 && b < 75) return true;

    // Body background match check
    try {
      if (document.body) {
        var bodyBg = window.getComputedStyle(document.body).backgroundColor;
        var parsedBg = parseColorToRgb(bodyBg);
        if (parsedBg && Math.abs(parsedBg.r - r) < 16 && Math.abs(parsedBg.g - g) < 16 && Math.abs(parsedBg.b - b) < 16) {
          return true;
        }
      }
    } catch (e) {}

    return false;
  }

  // Primary Color Detection Hierarchy (Priorities 2 -> 3 -> 4 -> 5)
  function detectHostPrimaryColor() {
    var customProps = [
      '--primary',
      '--primary-color',
      '--brand',
      '--brand-color',
      '--accent',
      '--accent-color',
      '--theme-primary',
    ];

    // Priority 2: CSS Custom Properties on :root or body
    try {
      if (document.documentElement) {
        var rootStyles = window.getComputedStyle(document.documentElement);
        for (var i = 0; i < customProps.length; i++) {
          var val = rootStyles.getPropertyValue(customProps[i]);
          if (val && val.trim()) {
            var rgb = parseColorToRgb(val);
            if (rgb && !isForbiddenColor(rgb)) {
              return rgbToHex(rgb.r, rgb.g, rgb.b);
            }
          }
        }
      }

      if (document.body) {
        var bodyStyles = window.getComputedStyle(document.body);
        for (var j = 0; j < customProps.length; j++) {
          var bVal = bodyStyles.getPropertyValue(customProps[j]);
          if (bVal && bVal.trim()) {
            var bRgb = parseColorToRgb(bVal);
            if (bRgb && !isForbiddenColor(bRgb)) {
              return rgbToHex(bRgb.r, bRgb.g, bRgb.b);
            }
          }
        }
      }
    } catch (e) {}

    // Priority 3: Analyze Dominant Visual Elements
    try {
      var selectors = [
        'button.btn-primary',
        'button.primary',
        '.btn-primary',
        'a.btn-primary',
        'button[type="submit"]',
        '.cta-button',
        'header nav a.active',
        'header .brand-icon',
        '.brand-icon',
        'header .brand',
      ];

      for (var s = 0; s < selectors.length; s++) {
        var el = document.querySelector(selectors[s]);
        if (el) {
          var elStyle = window.getComputedStyle(el);
          var bg = elStyle.backgroundColor;
          var rgbBg = parseColorToRgb(bg);
          if (rgbBg && !isForbiddenColor(rgbBg)) {
            return rgbToHex(rgbBg.r, rgbBg.g, rgbBg.b);
          }
          var col = elStyle.color;
          var rgbCol = parseColorToRgb(col);
          if (rgbCol && !isForbiddenColor(rgbCol)) {
            return rgbToHex(rgbCol.r, rgbCol.g, rgbCol.b);
          }
        }
      }
    } catch (e) {}

    // Priority 4: Meta Theme-Color Tag
    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta && meta.content) {
        var metaRgb = parseColorToRgb(meta.content);
        if (metaRgb && !isForbiddenColor(metaRgb)) {
          return rgbToHex(metaRgb.r, metaRgb.g, metaRgb.b);
        }
      }
    } catch (e) {}

    // Priority 5: Default Xia Chat Purple/Blue Fallback
    return '#6366F1';
  }

  function resolveEffectiveTheme() {
    if (state.theme === 'light') return 'light';
    if (state.theme === 'dark') return 'dark';

    // Theme mode 'auto' or matchWebsiteTheme:
    if (state.matchWebsiteTheme || state.theme === 'auto') {
      try {
        var isDarkClass = (document.documentElement && (
          document.documentElement.classList.contains('dark') ||
          document.documentElement.classList.contains('theme-dark') ||
          document.documentElement.getAttribute('data-theme') === 'dark' ||
          document.documentElement.getAttribute('data-mode') === 'dark'
        )) || (document.body && (
          document.body.classList.contains('dark') ||
          document.body.classList.contains('theme-dark') ||
          document.body.getAttribute('data-theme') === 'dark' ||
          document.body.getAttribute('data-mode') === 'dark'
        ));

        if (isDarkClass) return 'dark';

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
      } catch (e) {}
    }

    return 'light';
  }

  function resolveEffectivePrimaryColor() {
    // 1. Manual override from options or code
    if (state.manualPrimaryColor) {
      return state.manualPrimaryColor;
    }

    // 2. If autoDetectColor is explicitly OFF, use dashboard configured color
    if (!state.autoDetectColor && state.configuredPrimaryColor) {
      return state.configuredPrimaryColor;
    }

    // 3. Auto-detect from host site (CSS properties, dominant elements, metadata)
    var detected = detectHostPrimaryColor();
    if (detected && detected !== '#6366F1') {
      return detected;
    }

    // 4. Configured color from channel/workspace
    if (state.configuredPrimaryColor) {
      return state.configuredPrimaryColor;
    }

    // 5. Default Xia Chat Brand
    return detected || '#6366F1';
  }

  // -------------------------------------------------------------
  // GUEST VISITOR IDENTITY SYSTEM (No Login Required)
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // DYNAMIC STYLING & SHADOW DOM GENERATOR
  // -------------------------------------------------------------

  function generateCSS(primaryHex, position, theme) {
    var isLeft = position === 'bottom-left';
    var isDark = theme === 'dark';

    var rgb = parseColorToRgb(primaryHex) || { r: 99, g: 102, b: 241 };
    var contrastText = getContrastColor(rgb);

    // Tinted secondary surfaces
    var primaryLight = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.08)';
    var primaryBorder = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.25)';
    var primaryHover = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.16)';
    var primaryFocus = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.35)';

    var bgBody = isDark ? '#111827' : '#ffffff';
    var bgCard = isDark ? '#1f2937' : '#faf9f6';
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
        background: ${primaryHex};
        color: ${contrastText};
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22), 0 3px 8px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, background 0.25s ease;
        border: none;
        outline: none;
      }
      .xia-launcher:hover {
        transform: scale(1.08);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
      }
      .xia-launcher:active { transform: scale(0.95); }
      .xia-launcher svg { width: 28px; height: 28px; fill: ${contrastText}; }

      .xia-unread-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        background: #ef4444;
        color: #ffffff;
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
        transition: background 0.25s ease, color 0.25s ease;
      }
      .xia-window.open { display: flex; }

      @keyframes xiaSlideIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Header */
      .xia-header {
        background: ${primaryHex};
        background-image: linear-gradient(135deg, ${primaryHex}, rgba(0, 0, 0, 0.25));
        color: ${contrastText};
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
      .xia-avatar svg { width: 22px; height: 22px; fill: ${contrastText}; }
      .xia-title { font-weight: 700; font-size: 15px; line-height: 1.2; letter-spacing: -0.01em; color: ${contrastText}; }
      .xia-status-sub {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        opacity: 0.92;
        margin-top: 2px;
        color: ${contrastText};
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
        background: rgba(255, 255, 255, 0.18);
        border: none;
        color: ${contrastText};
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
      }
      .xia-close-btn:hover { background: rgba(255, 255, 255, 0.3); }
      .xia-close-btn svg { width: 18px; height: 18px; stroke: ${contrastText}; stroke-width: 2.2; }

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
        background: ${primaryHex};
        color: ${contrastText};
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
        border: 1px solid ${primaryBorder};
        color: ${isDark ? '#F3F4F6' : primaryHex};
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
        border-color: ${primaryHex};
        background: ${primaryHover};
        transform: translateX(3px);
      }
      .xia-starter-chip:active {
        background: ${primaryFocus};
      }
      .xia-starter-chip::after {
        content: '→';
        font-size: 13px;
        opacity: 0.7;
      }

      /* Email Identify Banner */
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
      .xia-identify-input:focus {
        border-color: ${primaryHex};
      }
      .xia-identify-btn {
        background: ${primaryHex};
        color: ${contrastText};
        border: none;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }

      /* Typing Indicator */
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
        background: ${primaryHex};
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
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .xia-input-row:focus-within {
        border-color: ${primaryHex};
        box-shadow: 0 0 0 2px ${primaryFocus};
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
        background: ${primaryHex};
        border: none;
        color: ${contrastText};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease, opacity 0.15s ease;
        flex-shrink: 0;
      }
      .xia-send-btn:hover { transform: scale(1.05); }
      .xia-send-btn:active { transform: scale(0.95); }
      .xia-send-btn svg { width: 16px; height: 16px; fill: ${contrastText}; }

      .xia-attach-btn {
        background: transparent;
        border: none;
        color: ${textSub};
        cursor: pointer;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: color 0.15s ease, background 0.15s ease;
        flex-shrink: 0;
      }
      .xia-attach-btn:hover {
        color: ${primaryHex};
        background: ${primaryHover};
      }
      .xia-attach-btn svg { width: 17px; height: 17px; fill: currentColor; }

      .xia-attachment-preview-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 10px;
        background: ${primaryHover};
        border: 1px dashed ${primaryBorder};
        border-radius: 10px;
        font-size: 11.5px;
        color: ${textMain};
      }
      .xia-att-preview-name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }
      .xia-att-remove-btn {
        background: none;
        border: none;
        color: ${textSub};
        cursor: pointer;
        font-size: 15px;
        font-weight: bold;
        padding: 0 4px;
        line-height: 1;
      }
      .xia-att-remove-btn:hover { color: #ef4444; }

      /* Message Attachments */
      .xia-attachments-wrap {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 6px;
      }
      .xia-img-thumb-wrap {
        border-radius: 12px;
        overflow: hidden;
        max-width: 220px;
        max-height: 160px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        transition: transform 0.15s ease;
        border: 1px solid rgba(0,0,0,0.08);
      }
      .xia-img-thumb-wrap:hover { transform: scale(1.02); }
      .xia-img-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .xia-doc-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: rgba(0,0,0,0.05);
        border-radius: 8px;
        font-size: 11.5px;
        color: inherit;
        text-decoration: none;
        border: 1px solid rgba(0,0,0,0.08);
        font-weight: 500;
      }
      .xia-doc-pill:hover { text-decoration: underline; }

      /* Lightbox Modal */
      .xia-lightbox {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(4px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 16px;
        animation: xiaMsgFade 0.2s ease;
      }
      .xia-lightbox-img {
        max-width: 95%;
        max-height: 85%;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        object-fit: contain;
      }
      .xia-lightbox-close {
        position: absolute;
        top: 14px;
        right: 14px;
        background: rgba(255,255,255,0.25);
        border: none;
        color: #fff;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.15s ease;
      }
      .xia-lightbox-close:hover { background: rgba(255,255,255,0.4); }

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

  // Update only the scoped style tag for instantaneous dynamic theme update
  function updateWidgetStyles() {
    if (!shadow) return;
    var styleTag = shadow.querySelector('#xia-scoped-styles');
    var css = generateCSS(state.currentEffectiveColor, state.position, state.currentEffectiveTheme);
    if (styleTag) {
      styleTag.textContent = css;
    }
  }

  // Render DOM into Shadow Root
  function renderDOM() {
    ensureShadowRoot();

    state.currentEffectiveColor = resolveEffectivePrimaryColor();
    state.currentEffectiveTheme = resolveEffectiveTheme();

    var isHuman = state.conversationStatus === 'human' || Boolean(state.assignedAgentName);
    var statusText = isHuman ? ('Live Agent: ' + (state.assignedAgentName || 'Assigned')) : (state.showAgentAvailability ? 'AI Support Active' : 'Online');

    shadow.innerHTML = `
      <style id="xia-scoped-styles">${generateCSS(state.currentEffectiveColor, state.position, state.currentEffectiveTheme)}</style>

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
          <div id="xia-attachment-preview-bar" class="xia-attachment-preview-bar" style="display:none;"></div>
          <div class="xia-input-row">
            <input type="file" id="xia-file-input" accept="image/*,application/pdf" style="display:none;" />
            <button type="button" class="xia-attach-btn" id="xia-attach-btn" title="Attach screenshot or document" aria-label="Attach File">
              <svg viewBox="0 0 24 24">
                <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5a3 3 0 0 0 6 0V5a4 4 0 0 0-8 0v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
              </svg>
            </button>
            <input type="text" class="xia-input" placeholder="Ask a question or track order..." />
            <button class="xia-send-btn" aria-label="Send Message">
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
          <div class="xia-branding">Powered by <a href="https://xiachat.ai" target="_blank" rel="noopener">Xia Chat AI</a></div>
        </div>

        <div id="xia-lightbox" class="xia-lightbox" style="display:none;"></div>
      </div>
    `;

    bindDOMEvents();
    renderMessages();
    setupThemeObservers();
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

      var attachmentsHtml = '';
      if (m.attachments && (Array.isArray(m.attachments) ? m.attachments.length > 0 : m.attachments !== '[]')) {
        try {
          var atts = Array.isArray(m.attachments) ? m.attachments : JSON.parse(m.attachments || '[]');
          if (atts && atts.length > 0) {
            attachmentsHtml = '<div class="xia-attachments-wrap">' + atts.map(function (att) {
              var url = typeof att === 'string' ? att : (att.url || '');
              var name = typeof att === 'object' && att !== null ? (att.fileName || att.name || 'Attachment') : 'Attachment';
              var isImg = /\.(png|jpe?g|webp|gif)$/i.test(url) || (att.contentType && att.contentType.startsWith('image/'));
              if (isImg) {
                return '<div class="xia-img-thumb-wrap" data-zoom-url="' + escapeHTML(url) + '"><img src="' + escapeHTML(url) + '" alt="' + escapeHTML(name) + '" class="xia-img-thumb" loading="lazy" /></div>';
              }
              return '<a href="' + escapeHTML(url) + '" target="_blank" rel="noopener" class="xia-doc-pill">📎 ' + escapeHTML(name) + '</a>';
            }).join('') + '</div>';
          }
        } catch (e) {}
      }

      var bubbleContent = '';
      if (attachmentsHtml) bubbleContent += attachmentsHtml;
      if (m.content) bubbleContent += (attachmentsHtml ? '<div style="margin-top:4px;">' : '') + escapeHTML(m.content) + (attachmentsHtml ? '</div>' : '');

      html += `
        <div class="xia-msg-wrap ${type}">
          ${labelHtml}
          <div class="xia-bubble">${bubbleContent}</div>
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

  // Update attachment preview bar UI
  function updateAttachmentPreviewUI(opts) {
    if (!shadow) return;
    var previewBar = shadow.querySelector('#xia-attachment-preview-bar');
    if (!previewBar) return;

    opts = opts || {};
    if (opts.isUploading) {
      previewBar.style.display = 'flex';
      previewBar.innerHTML = `
        <span style="font-size:13px;">⏳</span>
        <span class="xia-att-preview-name">Uploading ${escapeHTML(opts.fileName || 'file')}...</span>
      `;
      return;
    }

    if (opts.error) {
      previewBar.style.display = 'flex';
      previewBar.innerHTML = `
        <span style="color:#ef4444;">⚠️</span>
        <span class="xia-att-preview-name" style="color:#ef4444;">${escapeHTML(opts.error)}</span>
        <button type="button" class="xia-att-remove-btn" id="xia-att-clear-btn" aria-label="Dismiss">&times;</button>
      `;
      return;
    }

    if (state.pendingAttachment) {
      previewBar.style.display = 'flex';
      var isImg = state.pendingAttachment.contentType && state.pendingAttachment.contentType.startsWith('image/');
      previewBar.innerHTML = `
        <span>${isImg ? '🖼️' : '📎'}</span>
        <span class="xia-att-preview-name">${escapeHTML(state.pendingAttachment.fileName || 'Attachment')}</span>
        <button type="button" class="xia-att-remove-btn" id="xia-att-clear-btn" aria-label="Remove attachment">&times;</button>
      `;
    } else {
      previewBar.style.display = 'none';
      previewBar.innerHTML = '';
    }
  }

  // Handle file selection and direct Supabase Storage upload
  function handleWidgetFileUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    state.isUploadingAttachment = true;
    updateAttachmentPreviewUI({ isUploading: true, fileName: file.name });

    var reader = new FileReader();
    reader.onload = function (e) {
      var base64Data = e.target.result;
      fetch(apiBase + '/api/channels/public-widget/' + encodeURIComponent(state.siteKey) + '/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(state.apiKey ? { 'x-api-key': state.apiKey } : {}),
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          base64: base64Data,
        }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Upload failed with status ' + res.status);
          return res.json();
        })
        .then(function (data) {
          state.isUploadingAttachment = false;
          state.pendingAttachment = {
            url: data.url,
            fileName: data.fileName,
            fileSize: data.fileSize,
            contentType: data.contentType,
          };
          updateAttachmentPreviewUI();
        })
        .catch(function (err) {
          state.isUploadingAttachment = false;
          updateAttachmentPreviewUI({ error: 'Upload failed' });
          console.error('[Xia Chat] Upload error:', err);
        });
    };
    reader.readAsDataURL(file);
  }

  // Bind events for launcher, close button, input, starters
  function bindDOMEvents() {
    var launcher = shadow.querySelector('.xia-launcher');
    var closeBtn = shadow.querySelector('.xia-close-btn');
    var sendBtn = shadow.querySelector('.xia-send-btn');
    var input = shadow.querySelector('.xia-input');
    var body = shadow.querySelector('#xia-chat-body');
    var attachBtn = shadow.querySelector('#xia-attach-btn');
    var fileInput = shadow.querySelector('#xia-file-input');
    var previewBar = shadow.querySelector('#xia-attachment-preview-bar');
    var lightbox = shadow.querySelector('#xia-lightbox');

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

    if (attachBtn && fileInput) {
      attachBtn.onclick = function () {
        fileInput.click();
      };
      fileInput.onchange = function () {
        if (fileInput.files && fileInput.files[0]) {
          handleWidgetFileUpload(fileInput.files[0]);
          fileInput.value = '';
        }
      };
    }

    if (previewBar) {
      previewBar.onclick = function (e) {
        if (e.target.closest('#xia-att-clear-btn')) {
          state.pendingAttachment = null;
          updateAttachmentPreviewUI();
        }
      };
    }

    if (lightbox) {
      lightbox.onclick = function (e) {
        if (e.target.closest('.xia-lightbox-close') || e.target === lightbox) {
          lightbox.style.display = 'none';
          lightbox.innerHTML = '';
        }
      };
    }

    var doSend = function (overrideText) {
      var text = overrideText !== undefined ? overrideText : (input ? input.value : '');
      if ((!text || !text.trim()) && !state.pendingAttachment) return;
      if (state.isSending || state.isUploadingAttachment) return;
      if (input && overrideText === undefined) input.value = '';
      XiaChat.sendMessage(text ? text.trim() : '');
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
        var zoomWrap = e.target.closest('[data-zoom-url]');
        if (zoomWrap && lightbox) {
          var zoomUrl = zoomWrap.getAttribute('data-zoom-url');
          if (zoomUrl) {
            lightbox.style.display = 'flex';
            lightbox.innerHTML = `
              <button type="button" class="xia-lightbox-close" aria-label="Close Preview">&times;</button>
              <img src="${escapeHTML(zoomUrl)}" class="xia-lightbox-img" alt="Screenshot Preview" />
            `;
            return;
          }
        }

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

  // -------------------------------------------------------------
  // REAL-TIME OBSERVERS FOR HOST THEME CHANGES
  // -------------------------------------------------------------
  var observersAttached = false;
  function setupThemeObservers() {
    if (observersAttached) return;
    observersAttached = true;

    // 1. Media query observer for OS dark mode
    try {
      if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var onMqChange = function () {
          handleDynamicHostChange();
        };
        if (mq.addEventListener) {
          mq.addEventListener('change', onMqChange);
        } else if (mq.addListener) {
          mq.addListener(onMqChange);
        }
      }
    } catch (e) {}

    // 2. MutationObserver for host website class changes (e.g. toggling .dark or style)
    try {
      if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(function () {
          handleDynamicHostChange();
        });

        if (document.documentElement) {
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme', 'data-mode', 'style'],
          });
        }
        if (document.body) {
          observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'data-theme', 'data-mode', 'style'],
          });
        }
      }
    } catch (e) {}
  }

  function handleDynamicHostChange() {
    var newTheme = resolveEffectiveTheme();
    var newPrimary = resolveEffectivePrimaryColor();

    if (newTheme !== state.currentEffectiveTheme || newPrimary !== state.currentEffectiveColor) {
      state.currentEffectiveTheme = newTheme;
      state.currentEffectiveColor = newPrimary;
      updateWidgetStyles();
    }
  }

  // -------------------------------------------------------------
  // NETWORK & MESSAGING APIS
  // -------------------------------------------------------------

  function sendMessageToServer(content) {
    state.isSending = true;

    var attsToSend = state.pendingAttachment ? [state.pendingAttachment] : [];
    state.pendingAttachment = null;
    updateAttachmentPreviewUI();

    state.messages.push({
      senderType: 'customer',
      senderName: state.customerProfile.name || 'You',
      content: content,
      attachments: attsToSend,
      createdAt: new Date().toISOString(),
    });
    renderMessages();

    var payload = {
      message: content,
      attachments: attsToSend,
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
        if (data.primaryColor) state.configuredPrimaryColor = data.primaryColor;
        if (data.secondaryColor) state.configuredSecondaryColor = data.secondaryColor;
        if (data.autoDetectColor !== undefined) state.autoDetectColor = Boolean(data.autoDetectColor);
        if (data.matchWebsiteTheme !== undefined) state.matchWebsiteTheme = Boolean(data.matchWebsiteTheme);
        if (data.theme) state.theme = data.theme;
        state.position = data.position || state.position;
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
  // PUBLIC SDK API (window.XiaChat)
  // -------------------------------------------------------------
  XiaChat.init = function (options) {
    options = options || {};
    if (options.websiteId) state.siteKey = options.websiteId;
    if (options.siteKey) state.siteKey = options.siteKey;
    if (options.apiKey) state.apiKey = options.apiKey;
    if (options.theme) state.theme = options.theme;
    if (options.industry) state.industry = options.industry;
    if (options.position) state.position = options.position;
    if (options.primaryColor) state.manualPrimaryColor = options.primaryColor;
    if (options.autoDetectColor !== undefined) state.autoDetectColor = Boolean(options.autoDetectColor);
    if (options.matchWebsiteTheme !== undefined) state.matchWebsiteTheme = Boolean(options.matchWebsiteTheme);
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

  XiaChat.setColor = function (colorHex) {
    state.manualPrimaryColor = colorHex;
    handleDynamicHostChange();
  };

  XiaChat.setTheme = function (themeMode) {
    state.theme = themeMode;
    handleDynamicHostChange();
  };

  XiaChat.getEffectiveColor = function () {
    return state.currentEffectiveColor;
  };

  XiaChat.getEffectiveTheme = function () {
    return state.currentEffectiveTheme;
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
