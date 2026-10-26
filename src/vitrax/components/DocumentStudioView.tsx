// @ts-nocheck
import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  BookOpen, 
  HelpCircle, 
  Printer, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  FileCheck,
  Search,
  Plus
} from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentStudioViewProps {
  documents: DocumentItem[];
  onUploadDocument: (doc: DocumentItem) => void;
  onSelectForChat: (content: string) => void;
  onGenerateStudyPack: (topic: string, content: string) => void;
  onSendToDeepAnalysis: (content: string) => void;
  onExportPDF: (title: string, content: string) => void;
}

export const DocumentStudioView: React.FC<DocumentStudioViewProps> = ({
  documents,
  onUploadDocument,
  onSelectForChat,
  onGenerateStudyPack,
  onSendToDeepAnalysis,
  onExportPDF,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const filteredDocs = documents.filter((d) => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const questionsCount = (text.match(/Problem \d|Question \d|Q\d|\b\([a-d]\)\b|\b[A-D]\.\b/gi) || []).length;

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.md') ? 'notes' : 'exam',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        uploadedAt: Date.now(),
        content: text,
        questionsDetected: Math.max(1, questionsCount),
      };

      onUploadDocument(newDoc);
      setSelectedDocId(newDoc.id);
    };

    reader.readAsText(file);
  };

  const handleCreateCustomDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customContent.trim()) return;

    const questionsCount = (customContent.match(/Problem \d|Question \d|Q\d|\b\([a-d]\)\b|\b[A-D]\.\b/gi) || []).length;
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: customTitle.trim(),
      type: 'notes',
      size: `${(customContent.length / 1024).toFixed(1)} KB`,
      uploadedAt: Date.now(),
      content: customContent.trim(),
      questionsDetected: questionsCount,
    };

    onUploadDocument(newDoc);
    setSelectedDocId(newDoc.id);
    setCustomTitle('');
    setCustomContent('');
    setIsAddingNew(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4" />
              <span>Document Intelligence & Academic OCR</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Document Studio & Question Extractor
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Ingest academic papers, syllabus materials, and exam question sheets. Parse mathematical equations and extract structured questions into interactive study modules.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-95 transition-all">
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
              <input
                type="file"
                accept=".txt,.md,.pdf,.csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsAddingNew(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Document Browser, Right Preview & Extraction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Document List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search uploaded documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredDocs.map((doc) => {
              const isSelected = doc.id === selectedDoc?.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-teal-500 shadow-md shadow-teal-500/10'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase bg-slate-950 text-teal-400 px-2 py-0.5 rounded border border-slate-800">
                      {doc.type.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500">{doc.size}</span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-200 truncate">
                    {doc.title}
                  </h4>
                  {doc.questionsDetected ? (
                    <p className="text-[11px] text-teal-400 mt-1 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      {doc.questionsDetected} questions detected
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Academic lecture material
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Document Viewer & Action Strip */}
        <div className="lg:col-span-2 space-y-4">
          {isAddingNew ? (
            <form onSubmit={handleCreateCustomDoc} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-display font-bold text-white text-base">Create Custom Document / Notes</h3>
              <input
                type="text"
                placeholder="Document Title (e.g. MIT Physics Exam 2026)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <textarea
                placeholder="Paste exam questions, lecture notes, or markdown formulas..."
                rows={12}
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
                >
                  Save Document
                </button>
              </div>
            </form>
          ) : selectedDoc ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
              {/* Document Header & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    {selectedDoc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedDoc.size} • Uploaded {new Date(selectedDoc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onSelectForChat(selectedDoc.content)}
                    className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Send as context to Chat"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Attach to Chat</span>
                  </button>

                  <button
                    onClick={() => onGenerateStudyPack(selectedDoc.title, selectedDoc.content)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Extract Flashcards & Quiz"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Build Study Pack</span>
                  </button>

                  <button
                    onClick={() => onSendToDeepAnalysis(selectedDoc.content)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Run 4-stage pipeline"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Deep Analysis</span>
                  </button>
                </div>
              </div>

              {/* Document Text Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-[500px] overflow-y-auto">
                <pre className="font-mono text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed selection:bg-teal-500/30">
                  {selectedDoc.content}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
              No document selected. Upload or choose a document on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
