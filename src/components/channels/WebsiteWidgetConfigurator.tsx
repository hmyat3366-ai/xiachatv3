import React, { useState } from 'react';
import type { WebsiteWidgetConfig } from '../../types/channel';
import {
  ArrowLeft,
  Globe,
  Palette,
  Bot,
  Code,
  Copy,
  Check,
  Send,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return 0.5;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

interface WebsiteWidgetConfiguratorProps {
  channelId: string;
  initialConfig: WebsiteWidgetConfig;
  availableAgents: Array<{ id: string; name: string }>;
  defaultAgentId?: string | null;
  onBack: () => void;
  onSave: (config: WebsiteWidgetConfig, agentId?: string) => Promise<void>;
  isSaving: boolean;
}

export const WebsiteWidgetConfigurator: React.FC<WebsiteWidgetConfiguratorProps> = ({
  channelId,
  initialConfig,
  availableAgents,
  defaultAgentId,
  onBack,
  onSave,
  isSaving,
}) => {
  const [widgetName, setWidgetName] = useState(initialConfig.widgetName || 'Xia Support Chat');
  const [welcomeMessage, setWelcomeMessage] = useState(initialConfig.welcomeMessage || 'Hello! How can we help you today?');
  const [primaryColor, setPrimaryColor] = useState(initialConfig.primaryColor || '#6366F1');
  const [secondaryColor, setSecondaryColor] = useState(initialConfig.secondaryColor || '#C2691E');
  const [autoDetectColor, setAutoDetectColor] = useState(initialConfig.autoDetectColor !== false);
  const [matchWebsiteTheme, setMatchWebsiteTheme] = useState(initialConfig.matchWebsiteTheme !== false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(initialConfig.theme || 'auto');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>(initialConfig.position || 'bottom-right');
  const [selectedAgentId, setSelectedAgentId] = useState(defaultAgentId || (availableAgents[0]?.id || ''));
  const [enableAI, setEnableAI] = useState(initialConfig.enableAI !== false);
  const [enableHandoff, setEnableHandoff] = useState(initialConfig.enableHandoff !== false);
  const [showAgentAvailability, setShowAgentAvailability] = useState(initialConfig.showAgentAvailability !== false);

  // Simulated auto-detected color from host website
  const detectedWebsiteColor = '#C2691E';

  // Preview Theme toggle in live sandbox
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');

  // Copy code state
  const [isCopied, setIsCopied] = useState(false);

  // Interactive Test Sandbox state
  const [testMessages, setTestMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    { sender: 'agent', text: welcomeMessage },
  ]);
  const [testInput, setTestInput] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);

  type EmbedPlatform = 'html' | 'react' | 'wordpress' | 'shopify' | 'gtm';
  const [embedPlatform, setEmbedPlatform] = useState<EmbedPlatform>('html');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://xiachat.ai';

  const platformSnippets: Record<EmbedPlatform, { label: string; title: string; desc: string; code: string; ext: string }> = {
    html: {
      label: 'HTML / JS',
      title: 'Universal HTML Embed',
      desc: 'Paste this snippet right before the closing </body> tag on any website or static HTML page.',
      code: `<!-- Xia Chat AI Widget -->\n<script\n  src="${origin}/widget.js"\n  data-site-key="${channelId}"\n  data-position="${position}"\n  data-theme="${theme}"\n  async\n></script>`,
      ext: 'html',
    },
    react: {
      label: 'React / Next.js',
      title: 'Next.js 13/14/15 App Router & React',
      desc: 'Add to app/layout.tsx (App Router) or pages/_app.tsx for high-speed lazy-loaded hydration without blocking FCP.',
      code: `// app/layout.tsx\nimport Script from 'next/script';\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n        <Script\n          src="${origin}/widget.js"\n          data-site-key="${channelId}"\n          strategy="lazyOnload"\n        />\n      </body>\n    </html>\n  );\n}`,
      ext: 'tsx',
    },
    wordpress: {
      label: 'WordPress',
      title: 'WordPress & WooCommerce',
      desc: 'Add to your theme functions.php or insert via Header & Footer Scripts plugin.',
      code: `// In your theme's functions.php or custom plugin:\nadd_action('wp_footer', function() {\n    ?>\n    <script \n        src="${origin}/widget.js" \n        data-site-key="${channelId}" \n        async>\n    </script>\n    <?php\n});`,
      ext: 'php',
    },
    shopify: {
      label: 'Shopify',
      title: 'Shopify Liquid Theme',
      desc: 'In Shopify Admin -> Online Store -> Themes -> Actions -> Edit Code -> theme.liquid. Paste right before </body>.',
      code: `<!-- Xia Chat AI Widget for Shopify -->\n<script\n  src="${origin}/widget.js"\n  data-site-key="${channelId}"\n  data-industry="ecommerce"\n  async\n></script>`,
      ext: 'liquid',
    },
    gtm: {
      label: 'Google Tag Manager',
      title: 'Google Tag Manager (GTM)',
      desc: 'Create a "Custom HTML" Tag in GTM, paste this script, and trigger on "All Pages" (Page View).',
      code: `<script\n  src="${origin}/widget.js"\n  data-site-key="${channelId}"\n  async\n></script>`,
      ext: 'html',
    },
  };

  const currentSnippet = platformSnippets[embedPlatform];

  const isDarkPrimary = getLuminance(primaryColor) <= 0.45;
  const contrastText = isDarkPrimary ? '#FFFFFF' : '#111827';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentSnippet.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApplyDetectedColor = () => {
    setPrimaryColor(detectedWebsiteColor);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(
      {
        widgetName,
        welcomeMessage,
        primaryColor,
        secondaryColor,
        autoDetectColor,
        matchWebsiteTheme,
        theme,
        position,
        enableAI,
        enableHandoff,
        showAgentAvailability,
      },
      selectedAgentId
    );
  };

  const handleSendTestMessage = () => {
    if (!testInput.trim() || isTestLoading) return;
    const userMsg = testInput.trim();
    setTestMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setTestInput('');
    setIsTestLoading(true);

    setTimeout(() => {
      setTestMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `Thanks for asking! As an AI assistant configured for ${widgetName}, I'm here to help with your inquiry regarding "${userMsg}".`,
        },
      ]);
      setIsTestLoading(false);
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8E8E5] shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] hover:bg-[#F0EFEA] text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-xl text-[#171717]">Website Live Chat Widget</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Customize appearance, automatic brand color inheritance, AI agent routing, and embed code.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#E5781E] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns (2 cols): Settings Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1 — GENERAL IDENTITY */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E8E5]">
              <Globe className="w-5 h-5 text-[#FF8A2A]" />
              <h2 className="font-extrabold text-base text-[#171717]">1. General Identity & Greeting</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Widget Title / Header Name</label>
                <input
                  type="text"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  placeholder="e.g. Xia Support Chat"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Welcome Message Greeting</label>
                <textarea
                  rows={2}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2 — APPEARANCE, COLOR & BRANDING */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#FF8A2A]" />
                <h2 className="font-extrabold text-base text-[#171717]">2. Appearance, Color & Branding</h2>
              </div>
              <span className="text-[11px] font-bold text-[#FF8A2A] bg-[#FFF0E5] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Brand Detection
              </span>
            </div>

            {/* Auto Detect Website Color Toggle */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-[#171717] block">Auto-Detect Website Brand Color</span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Detects CSS custom properties (<code className="text-[#FF8A2A]">--primary</code>, <code className="text-[#FF8A2A]">--brand</code>) &amp; dominant buttons on host site.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoDetectColor}
                  onChange={(e) => setAutoDetectColor(e.target.checked)}
                  className="w-4 h-4 accent-[#FF8A2A] cursor-pointer"
                />
              </div>

              {autoDetectColor && (
                <div className="pt-2 border-t border-[#E8E8E5] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6B6B6B]">Detected Host Color:</span>
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: detectedWebsiteColor }}
                    />
                    <span className="font-mono text-xs font-bold text-[#171717]">{detectedWebsiteColor}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyDetectedColor}
                    className="text-[11px] font-bold text-[#FF8A2A] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    Use Detected Color ✓
                  </button>
                </div>
              )}
            </div>

            {/* Manual Color Pickers with Contrast Indicator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#171717]">Primary Brand Color</label>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: primaryColor, color: contrastText }}
                  >
                    {isDarkPrimary ? 'White Text' : 'Dark Text'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[#E8E8E5]"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs font-mono text-[#171717] w-28"
                  />
                  {/* Quick Color Presets */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {[
                      { name: 'Coffee', hex: '#C2691E' },
                      { name: 'SaaS', hex: '#6366F1' },
                      { name: 'Ecommerce', hex: '#2563EB' },
                      { name: 'Eco', hex: '#059669' },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setPrimaryColor(preset.hex)}
                        title={`Preset: ${preset.name} (${preset.hex})`}
                        className="w-5 h-5 rounded-full border border-black/10 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#171717]">Secondary Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[#E8E8E5]"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs font-mono text-[#171717] w-28"
                  />
                </div>
              </div>
            </div>

            {/* Theme Mode & Match Website Theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Widget Theme Mode</label>
                <div className="grid grid-cols-3 gap-1 bg-[#FAF9F6] p-1 rounded-2xl border border-[#E8E8E5]">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      theme === 'light' ? 'bg-white shadow-2xs text-[#171717]' : 'text-[#6B6B6B] hover:text-[#171717]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      theme === 'dark' ? 'bg-[#171717] text-white shadow-2xs' : 'text-[#6B6B6B] hover:text-[#171717]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('auto')}
                    className={`py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      theme === 'auto' ? 'bg-[#FF8A2A] text-white shadow-2xs' : 'text-[#6B6B6B] hover:text-[#171717]'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Auto
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Widget Screen Position</label>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setPosition('bottom-right')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      position === 'bottom-right'
                        ? 'bg-[#171717] text-white shadow-2xs'
                        : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B]'
                    }`}
                  >
                    Bottom Right
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('bottom-left')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      position === 'bottom-left'
                        ? 'bg-[#171717] text-white shadow-2xs'
                        : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B]'
                    }`}
                  >
                    Bottom Left
                  </button>
                </div>
              </div>
            </div>

            {/* Match Host Website Theme Dynamically */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer">
              <div>
                <span className="font-bold text-xs text-[#171717] block">Match Website Dark/Light Theme Dynamically</span>
                <span className="text-[11px] text-[#6B6B6B]">
                  Widget automatically switches when host website toggles dark/light mode classes (<code className="text-[#FF8A2A]">.dark</code>) in real-time.
                </span>
              </div>
              <input
                type="checkbox"
                checked={matchWebsiteTheme}
                onChange={(e) => setMatchWebsiteTheme(e.target.checked)}
                className="w-4 h-4 accent-[#FF8A2A] cursor-pointer"
              />
            </label>
          </div>

          {/* SECTION 3 — AI AGENT ASSIGNMENT */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E8E5]">
              <Bot className="w-5 h-5 text-[#FF8A2A]" />
              <h2 className="font-extrabold text-base text-[#171717]">3. Connected AI Agent Assignment</h2>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Select AI Agent Persona</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              >
                {availableAgents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 4 — BEHAVIOR */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E8E5]">
              <MessageSquare className="w-5 h-5 text-[#FF8A2A]" />
              <h2 className="font-extrabold text-base text-[#171717]">4. Conversation Behavior</h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-[#171717] block">Enable AI Auto-Reply</span>
                  <span className="text-[10px] text-[#6B6B6B]">Allow assigned AI agent to answer visitor questions automatically</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableAI}
                  onChange={(e) => setEnableAI(e.target.checked)}
                  className="w-4 h-4 accent-[#FF8A2A] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-[#171717] block">Enable Human Handoff</span>
                  <span className="text-[10px] text-[#6B6B6B]">Allow customer to request a live support team agent</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableHandoff}
                  onChange={(e) => setEnableHandoff(e.target.checked)}
                  className="w-4 h-4 accent-[#FF8A2A] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-[#171717] block">Show Agent Availability Indicator</span>
                  <span className="text-[10px] text-[#6B6B6B]">Display online badge on widget header</span>
                </div>
                <input
                  type="checkbox"
                  checked={showAgentAvailability}
                  onChange={(e) => setShowAgentAvailability(e.target.checked)}
                  className="w-4 h-4 accent-[#FF8A2A] cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* SECTION 5 — MULTI-PLATFORM EMBED HUB */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-[#FF8A2A]" />
                <div>
                  <h2 className="font-extrabold text-base text-[#171717]">5. Multi-Platform Embed Hub</h2>
                  <p className="text-xs text-[#6B6B6B]">Deploy to your website in seconds with 1-click code snippets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] hover:bg-[#FFE4D0] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              {(Object.keys(platformSnippets) as EmbedPlatform[]).map((pKey) => {
                const item = platformSnippets[pKey];
                const isActive = embedPlatform === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setEmbedPlatform(pKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Platform Instruction & Info */}
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-blue-950">{currentSnippet.title}</div>
                <div className="text-blue-800/80 mt-0.5 leading-relaxed">{currentSnippet.desc}</div>
              </div>
            </div>

            {/* Code Display Area */}
            <div className="relative rounded-2xl bg-[#171717] text-[#FAF9F6] text-xs font-mono overflow-hidden shadow-inner">
              <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                <span className="font-semibold text-gray-300">Snippet ({currentSnippet.ext.toUpperCase()})</span>
                <span className="text-[10px] text-gray-500 font-mono">Site Key: {channelId}</span>
              </div>
              <pre className="p-4 overflow-x-auto leading-relaxed select-all">
                <code>{currentSnippet.code}</code>
              </pre>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Shadow DOM isolation prevents host CSS leakage. Zero external dependencies.</span>
            </div>
          </div>
        </div>

        {/* Right Column: SECTION 6 — INTERACTIVE LIVE TEST SANDBOX */}
        <div className="space-y-4">
          <div
            className={`sticky top-6 rounded-3xl border shadow-lg overflow-hidden flex flex-col h-[540px] transition-colors ${
              previewTheme === 'dark' ? 'bg-[#111827] border-gray-800' : 'bg-white border-[#E8E8E5]'
            }`}
          >
            {/* Live Preview Mode Switcher */}
            <div className="px-4 py-2 bg-black/5 flex items-center justify-between border-b border-black/5">
              <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">Live Preview</span>
              <div className="flex items-center gap-1 bg-black/10 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewTheme('light')}
                  className={`p-1 rounded text-xs cursor-pointer ${
                    previewTheme === 'light' ? 'bg-white shadow-2xs text-[#171717]' : 'text-gray-500'
                  }`}
                  title="Preview Light Mode"
                >
                  <Sun className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme('dark')}
                  className={`p-1 rounded text-xs cursor-pointer ${
                    previewTheme === 'dark' ? 'bg-gray-800 shadow-2xs text-white' : 'text-gray-500'
                  }`}
                  title="Preview Dark Mode"
                >
                  <Moon className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Simulated Live Widget Header */}
            <div
              className="p-4 flex items-center justify-between transition-colors"
              style={{
                backgroundColor: primaryColor,
                color: contrastText,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                >
                  <Bot className="w-4 h-4" style={{ color: contrastText }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs">{widgetName}</h3>
                  {showAgentAvailability && (
                    <p className="text-[10px] opacity-90 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Test Messages Stream */}
            <div
              className={`flex-1 p-4 overflow-y-auto space-y-3 transition-colors ${
                previewTheme === 'dark' ? 'bg-[#1F2937]' : 'bg-[#FAF9F6]'
              }`}
            >
              {testMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'font-medium rounded-br-xs'
                        : previewTheme === 'dark'
                        ? 'bg-[#111827] text-gray-200 border border-gray-700 rounded-bl-xs'
                        : 'bg-white border border-[#E8E8E5] text-[#171717] rounded-bl-xs shadow-2xs'
                    }`}
                    style={
                      msg.sender === 'user'
                        ? { backgroundColor: primaryColor, color: contrastText }
                        : {}
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTestLoading && (
                <div className="flex justify-start">
                  <div
                    className={`p-3 rounded-2xl text-xs flex items-center gap-1.5 animate-pulse ${
                      previewTheme === 'dark'
                        ? 'bg-[#111827] text-gray-400 border border-gray-700'
                        : 'bg-white border border-[#E8E8E5] text-[#6B6B6B]'
                    }`}
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: primaryColor }} /> AI Agent typing...
                  </div>
                </div>
              )}
            </div>

            {/* Quick Starters Simulation */}
            <div
              className={`px-3 py-2 border-t flex gap-1.5 overflow-x-auto ${
                previewTheme === 'dark' ? 'bg-[#111827] border-gray-800' : 'bg-white border-[#E8E8E5]'
              }`}
            >
              {['☕ View Menu', '📦 Track Order', '💳 Help'].map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => {
                    setTestMessages((prev) => [
                      ...prev,
                      { sender: 'user', text: starter },
                      { sender: 'agent', text: `Here is the info for: ${starter}` },
                    ]);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all border"
                  style={{
                    backgroundColor: `${primaryColor}14`,
                    borderColor: `${primaryColor}40`,
                    color: previewTheme === 'dark' ? '#F3F4F6' : primaryColor,
                  }}
                >
                  {starter}
                </button>
              ))}
            </div>

            {/* Test Input Box */}
            <div
              className={`p-3 border-t flex items-center gap-2 ${
                previewTheme === 'dark' ? 'bg-[#111827] border-gray-800' : 'bg-white border-[#E8E8E5]'
              }`}
            >
              <input
                type="text"
                placeholder="Test chat with widget..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                className={`flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none ${
                  previewTheme === 'dark'
                    ? 'bg-[#1F2937] border border-gray-700 text-white'
                    : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#171717]'
                }`}
                style={{
                  outlineColor: primaryColor,
                }}
              />
              <button
                onClick={handleSendTestMessage}
                disabled={!testInput.trim() || isTestLoading}
                className="p-2 rounded-xl cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
                style={{ backgroundColor: primaryColor, color: contrastText }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
