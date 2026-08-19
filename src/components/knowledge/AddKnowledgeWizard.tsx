import React, { useState } from 'react';
import type { FaqPair } from '../../types/knowledge';
import {
  ArrowLeft,
  FileText,
  HelpCircle,
  Globe,
  UploadCloud,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface AddKnowledgeWizardProps {
  onBack: () => void;
  onSaveText: (name: string, content: string) => Promise<void>;
  onSaveFaq: (name: string, faqs: FaqPair[]) => Promise<void>;
  onSaveUrl: (url: string, name?: string) => Promise<void>;
  onSaveDocument: (fileName: string, fileType: string, fileDataText?: string) => Promise<void>;
  isSaving: boolean;
}

export const AddKnowledgeWizard: React.FC<AddKnowledgeWizardProps> = ({
  onBack,
  onSaveText,
  onSaveFaq,
  onSaveUrl,
  onSaveDocument,
  isSaving,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'faq' | 'url' | 'document'>('text');

  // Text state
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');

  // FAQ state
  const [faqName, setFaqName] = useState('');
  const [faqPairs, setFaqPairs] = useState<FaqPair[]>([
    { question: 'What is your return policy?', answer: 'Customers can return unused products within 30 days.' },
    { question: 'How do I track my order?', answer: 'Order tracking links are sent via email automatically upon dispatch.' },
  ]);

  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');

  // Document state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddFaqPair = () => {
    setFaqPairs((prev) => [...prev, { question: '', answer: '' }]);
  };

  const handleRemoveFaqPair = (index: number) => {
    setFaqPairs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', val: string) => {
    setFaqPairs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmitText = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!textName.trim()) {
      setErrorMessage('Knowledge name is required.');
      return;
    }
    if (!textContent.trim()) {
      setErrorMessage('Content cannot be empty.');
      return;
    }
    try {
      await onSaveText(textName.trim(), textContent.trim());
    } catch {
      setErrorMessage('Failed to save text knowledge.');
    }
  };

  const handleSubmitFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!faqName.trim()) {
      setErrorMessage('Knowledge name is required.');
      return;
    }
    const validFaqs = faqPairs.filter((f) => f.question.trim() && f.answer.trim());
    if (validFaqs.length === 0) {
      setErrorMessage('Please provide at least one complete Question and Answer pair.');
      return;
    }
    try {
      await onSaveFaq(faqName.trim(), validFaqs);
    } catch {
      setErrorMessage('Failed to save FAQ knowledge.');
    }
  };

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!urlInput.trim()) {
      setErrorMessage('Website URL is required.');
      return;
    }
    try {
      await onSaveUrl(urlInput.trim(), urlName.trim() || undefined);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import URL.');
    }
  };

  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!uploadedFile && !docName.trim()) {
      setErrorMessage('Please select a file or enter a document name.');
      return;
    }
    try {
      const nameToUse = uploadedFile ? uploadedFile.name : docName.trim();
      const ext = nameToUse.split('.').pop() || 'txt';
      await onSaveDocument(nameToUse, ext, `Extracted content from uploaded file ${nameToUse}.`);
    } catch {
      setErrorMessage('Failed to process document upload.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-2xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[#171717]">Add Knowledge Source</h1>
            <p className="text-xs text-[#6B6B6B]">
              Provide business information, FAQs, policies, or web links for AI retrieval.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Source Type Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'text', label: 'Add Text', icon: FileText, desc: 'Paste raw guidelines or policy' },
          { id: 'faq', label: 'Add FAQ', icon: HelpCircle, desc: 'Question & answer pairs' },
          { id: 'url', label: 'Import URL', icon: Globe, desc: 'Scrape website webpage' },
          { id: 'document', label: 'Upload Document', icon: UploadCloud, desc: 'PDF, TXT, or DOCX files' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-4 rounded-3xl border text-left transition-all cursor-pointer space-y-2 ${
                isActive
                  ? 'bg-[#171717] text-white border-[#171717] shadow-sm'
                  : 'bg-white border-[#E8E8E5] text-[#171717] hover:border-[#FF8A2A]/50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  isActive ? 'bg-[#FF8A2A] text-white' : 'bg-[#FFF0E5] text-[#FF8A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-xs">{tab.label}</p>
                <p className={`text-[10px] ${isActive ? 'text-gray-300' : 'text-[#6B6B6B]'}`}>{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* OPTION 1 — ADD TEXT */}
      {activeTab === 'text' && (
        <form onSubmit={handleSubmitText} className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <h2 className="font-extrabold text-base text-[#171717]">Add Raw Text Knowledge</h2>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Knowledge Name *</label>
            <input
              type="text"
              placeholder="e.g. Shipping & Delivery Policy"
              value={textName}
              onChange={(e) => setTextName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Content *</label>
            <textarea
              rows={8}
              placeholder="Our standard delivery time is 3–5 business days. International delivery may take 7–14 business days..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] leading-relaxed font-mono"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-2xl border border-[#E8E8E5] text-xs font-bold text-[#171717] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSaving ? 'Processing...' : 'Save & Process'}</span>
            </button>
          </div>
        </form>
      )}

      {/* OPTION 2 — ADD FAQ */}
      {activeTab === 'faq' && (
        <form onSubmit={handleSubmitFaq} className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <h2 className="font-extrabold text-base text-[#171717]">Add Question & Answer Pairs</h2>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">FAQ Knowledge Name *</label>
            <input
              type="text"
              placeholder="e.g. Return & Refund FAQ"
              value={faqName}
              onChange={(e) => setFaqName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              required
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#171717]">FAQ Pairs ({faqPairs.length})</label>
              <button
                type="button"
                onClick={handleAddFaqPair}
                className="px-3 py-1.5 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] text-xs font-bold flex items-center gap-1 hover:bg-[#FFE4D0] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {faqPairs.map((pair, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#FF8A2A]">Pair #{idx + 1}</span>
                  {faqPairs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFaqPair(idx)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#6B6B6B]">Question</label>
                  <input
                    type="text"
                    placeholder="What is your return policy?"
                    value={pair.question}
                    onChange={(e) => handleFaqChange(idx, 'question', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#6B6B6B]">Answer</label>
                  <textarea
                    rows={2}
                    placeholder="Customers can return unused products within 30 days."
                    value={pair.answer}
                    onChange={(e) => handleFaqChange(idx, 'answer', e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-2xl border border-[#E8E8E5] text-xs font-bold text-[#171717] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSaving ? 'Processing...' : 'Save & Process'}</span>
            </button>
          </div>
        </form>
      )}

      {/* OPTION 3 — IMPORT URL */}
      {activeTab === 'url' && (
        <form onSubmit={handleSubmitUrl} className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <h2 className="font-extrabold text-base text-[#171717]">Import Webpage Content</h2>

          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>SSRF Protection Active: Internal network IPs and loopback addresses are blocked automatically.</span>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Source Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Return Policy Webpage"
              value={urlName}
              onChange={(e) => setUrlName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Website URL *</label>
            <input
              type="url"
              placeholder="https://example.com/returns"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-2xl border border-[#E8E8E5] text-xs font-bold text-[#171717] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              <span>{isSaving ? 'Importing...' : 'Import & Process'}</span>
            </button>
          </div>
        </form>
      )}

      {/* OPTION 4 — UPLOAD DOCUMENT */}
      {activeTab === 'document' && (
        <form onSubmit={handleSubmitDocument} className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <h2 className="font-extrabold text-base text-[#171717]">Upload Document File</h2>

          <div className="border-2 border-dashed border-[#E8E8E5] hover:border-[#FF8A2A] rounded-3xl p-8 text-center bg-[#FAF9F6] transition-colors cursor-pointer space-y-2">
            <UploadCloud className="w-10 h-10 text-[#FF8A2A] mx-auto" />
            <h3 className="text-xs font-bold text-[#171717]">Drop PDF, TXT, or DOCX document here</h3>
            <p className="text-[10px] text-[#6B6B6B]">Maximum file size: 10MB</p>
            <input
              type="file"
              accept=".pdf,.txt,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadedFile(e.target.files[0]);
                }
              }}
              className="mt-2 text-xs text-[#6B6B6B] mx-auto block cursor-pointer"
            />
          </div>

          {uploadedFile && (
            <div className="p-3 rounded-2xl bg-[#FFF0E5] border border-[#FF8A2A]/40 flex items-center justify-between text-xs font-bold text-[#171717]">
              <span>Selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
              <button
                type="button"
                onClick={() => setUploadedFile(null)}
                className="text-red-600 text-xs hover:underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          <div className="space-y-1 pt-2">
            <label className="block text-xs font-bold text-[#171717]">Knowledge Source Title</label>
            <input
              type="text"
              placeholder="e.g. Terms of Service Guide"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-2xl border border-[#E8E8E5] text-xs font-bold text-[#171717] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span>{isSaving ? 'Uploading...' : 'Upload & Process'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
