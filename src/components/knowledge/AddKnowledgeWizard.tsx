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
  Sparkles,
  File,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';

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

  // Text State
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');

  // FAQ State
  const [faqName, setFaqName] = useState('');
  const [faqPairs, setFaqPairs] = useState<FaqPair[]>([
    { question: 'What is your return & refund policy?', answer: 'Customers can return unused items in original packaging within 30 days for a full refund.' },
    { question: 'How do I track my order delivery?', answer: 'Order tracking links are emailed upon dispatch. You can also ask Xia Assistant with your order number.' },
  ]);

  // URL State
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');

  // Document State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Error State
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
      setErrorMessage('Please enter a name for this knowledge source.');
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
      setErrorMessage('Please enter a name for this FAQ collection.');
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
      setErrorMessage('Please enter a valid URL.');
      return;
    }
    try {
      const generatedName = urlName.trim() || new URL(urlInput).hostname;
      await onSaveUrl(urlInput.trim(), generatedName);
    } catch {
      setErrorMessage('Please enter a valid web URL (e.g. https://company.com/help).');
    }
  };

  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!uploadedFile) {
      setErrorMessage('Please select or drop a file to upload.');
      return;
    }
    try {
      const nameToUse = docName.trim() || uploadedFile.name;
      const fileExt = uploadedFile.name.split('.').pop() || 'txt';
      await onSaveDocument(nameToUse, fileExt, `Document content extracted from ${uploadedFile.name}`);
    } catch {
      setErrorMessage('Failed to upload and vectorize document.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-gray-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#171717]">Add Knowledge Source</h1>
          <p className="text-xs text-[#6B6B6B]">
            Ingest structured information to enable semantic RAG search for your AI assistants.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'text', label: 'Manual Text', desc: 'Articles & Policies', icon: FileText },
          { id: 'faq', label: 'FAQ Pairs', desc: 'Questions & Answers', icon: HelpCircle },
          { id: 'url', label: 'Website Scraping', desc: 'Crawl Help Center', icon: Globe },
          { id: 'document', label: 'Upload Document', desc: 'PDF, DOCX, TXT', icon: UploadCloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setErrorMessage(null);
              }}
              className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#171717] ring-2 ring-[#FF8A2A]/30 shadow-2xs'
                  : 'bg-white border-[#E8E8E5] text-[#6B6B6B] hover:bg-[#FAF9F6]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isSelected ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
              <div>
                <p className="text-xs font-bold text-[#171717]">{tab.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. MANUAL TEXT INGESTION */}
        {activeTab === 'text' && (
          <form onSubmit={handleSubmitText} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1.5">Knowledge Source Title</label>
              <input
                type="text"
                placeholder="e.g. Return & Warranty Guidelines"
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-semibold focus:outline-none focus:border-[#FF8A2A]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1.5">Text Body & Instructions</label>
              <textarea
                rows={7}
                placeholder="Paste internal documentation, product specs, or terms of service..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs font-mono text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isSaving ? 'Vectorizing...' : 'Save & Vectorize'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. FAQ INGESTION */}
        {activeTab === 'faq' && (
          <form onSubmit={handleSubmitFaq} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1.5">FAQ Collection Title</label>
              <input
                type="text"
                placeholder="e.g. Customer Support FAQs"
                value={faqName}
                onChange={(e) => setFaqName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-semibold focus:outline-none focus:border-[#FF8A2A]"
                autoFocus
              />
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#171717]">Q&A Pairs ({faqPairs.length})</label>
                <button
                  type="button"
                  onClick={handleAddFaqPair}
                  className="text-xs font-bold text-[#FF8A2A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Q&A
                </button>
              </div>

              {faqPairs.map((faq, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#FF8A2A]">Question #{idx + 1}</span>
                    {faqPairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFaqPair(idx)}
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. What payment methods are accepted?"
                    value={faq.question}
                    onChange={(e) => handleFaqChange(idx, 'question', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E8E8E5] text-xs font-semibold focus:outline-none focus:border-[#FF8A2A]"
                  />
                  <textarea
                    rows={2}
                    placeholder="Answer text..."
                    value={faq.answer}
                    onChange={(e) => handleFaqChange(idx, 'answer', e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] resize-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isSaving ? 'Vectorizing...' : 'Save & Vectorize FAQs'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 3. WEBSITE URL INGESTION */}
        {activeTab === 'url' && (
          <form onSubmit={handleSubmitUrl} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1.5">Website or Help Center URL</label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="url"
                  placeholder="https://acme.com/help or https://docs.yourcompany.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-semibold focus:outline-none focus:border-[#FF8A2A]"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1.5">Custom Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Official Documentation"
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-semibold focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-blue-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" /> Autonomous Web Crawler
              </p>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Xia Chat will fetch public web pages, strip navigation boilerplate, extract readable text, and generate vector embeddings automatically.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isSaving ? 'Crawling & Indexing...' : 'Crawl & Ingest Website'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 4. DOCUMENT UPLOAD */}
        {activeTab === 'document' && (
          <form onSubmit={handleSubmitDocument} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1.5">Document Title</label>
              <input
                type="text"
                placeholder="e.g. Employee Support Handbook 2026"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-semibold focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>

            {/* Drag and drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setUploadedFile(e.dataTransfer.files[0]);
                  if (!docName) setDocName(e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, ''));
                }
              }}
              className={`p-8 rounded-3xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-[#FF8A2A] bg-[#FFF0E5]/50'
                  : 'border-[#E8E8E5] bg-[#FAF9F6] hover:bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="file"
                id="doc-upload"
                className="hidden"
                accept=".pdf,.docx,.txt,.csv,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedFile(e.target.files[0]);
                    if (!docName) setDocName(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                  }
                }}
              />

              <label htmlFor="doc-upload" className="cursor-pointer block space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E8E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-2xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#171717]">
                    {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOCX, TXT, CSV or Markdown (up to 25MB)</p>
                </div>
              </label>
            </div>

            {uploadedFile && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">{uploadedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-gray-400 hover:text-red-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving || !uploadedFile}
                className="px-6 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isSaving ? 'Extracting & Vectorizing...' : 'Upload & Vectorize'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
