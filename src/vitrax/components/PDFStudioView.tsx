// @ts-nocheck
import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  BookOpen, 
  FileCheck, 
  CheckCircle2, 
  Sparkles,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { StudyPack } from '../types';

interface PDFStudioViewProps {
  studyPacks: StudyPack[];
}

export const PDFStudioView: React.FC<PDFStudioViewProps> = ({ studyPacks }) => {
  const [selectedPackId, setSelectedPackId] = useState<string>(studyPacks[0]?.id || '');
  const [docType, setDocType] = useState<'full_book' | 'formula_sheet' | 'mcq_bank' | 'flashcard_sheet'>('full_book');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const activePack = studyPacks.find((p) => p.id === selectedPackId) || studyPacks[0];

  const handleDownload = async () => {
    if (!activePack) return;
    setDownloadError(null);
    try {
      const { createAndSaveDocumentPdf } = await import('../lib/pdf/documentPdf');
      const sections = [`# ${activePack.title}`, activePack.summary];
      if (docType === 'full_book' || docType === 'formula_sheet') {
        if (activePack.keyFormulas?.length) sections.push(`## Key formulas\n${activePack.keyFormulas.map(item => `- **${item.name}**: ${item.formula} — ${item.meaning}`).join('\n')}`);
      }
      if (docType === 'full_book' || docType === 'mcq_bank') {
        if (activePack.quiz?.length) sections.push(`## Practice questions\n${activePack.quiz.map((item, index) => `### Question ${index + 1}\n${item.question}\n\n${item.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join('\n')}\n\n**Answer:** ${item.options[item.correctIndex]}\n\n**Explanation:** ${item.explanation}${item.sourceRef ? `\n\nSource: ${item.sourceRef}` : ''}`).join('\n\n')}`);
      }
      if (docType === 'full_book' || docType === 'flashcard_sheet') {
        if (activePack.flashcards?.length) sections.push(`## Flashcards\n${activePack.flashcards.map((card, index) => `### Card ${index + 1} · ${card.topic}\n**Q:** ${card.front}\n\n**A:** ${card.back}${card.hint ? `\n\nHint: ${card.hint}` : ''}${card.sourceRef ? `\n\nSource: ${card.sourceRef}` : ''}`).join('\n\n')}`);
      }
      const result = await createAndSaveDocumentPdf(activePack.title, sections.join('\n\n'), activePack.sourceTitle ? `Generated from ${activePack.sourceTitle}` : undefined);
      setDownloadSuccess(result.filename);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'The PDF could not be created.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Printer className="w-4 h-4" />
              <span>Study Material Export</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              VITRAX PDF Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Export the selected study pack as a readable A4 PDF. Answer keys are generated content, not independently certified.
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={!activePack}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center space-x-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="bg-teal-500/10 border border-teal-500/40 rounded-2xl p-4 flex items-center space-x-3 text-teal-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <span>Successfully generated and downloaded <strong>{downloadSuccess}</strong></span>
        </div>
      )}
      {downloadError && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200" role="alert">PDF export failed: {downloadError}</div>}

      {/* Main Studio Controls & Layout Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Controls */}
        <div className="space-y-5 lg:col-span-1">
          {/* Select Study Pack */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
              1. Select Source Study Pack
            </h3>
            <div className="space-y-2">
              {studyPacks.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    pack.id === activePack?.id
                      ? 'bg-slate-800 border-teal-500 text-white font-medium shadow-sm'
                      : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="font-semibold text-slate-200 truncate">{pack.title}</p>
                  <p className="text-[11px] text-teal-400 mt-1">
                    {pack.keyFormulas?.length || 0} formulas • {pack.quiz?.length || 0} MCQs • {pack.flashcards?.length || 0} flashcards
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Select Document Layout */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
              2. Select Document Format
            </h3>
            <div className="space-y-2">
              {[
                { id: 'full_book', name: 'Comprehensive Exam Book', desc: 'Formulas + Solved MCQs + Flashcards' },
                { id: 'formula_sheet', name: 'Master Formula Sheet', desc: 'Theoretical equations & physical laws' },
                { id: 'mcq_bank', name: 'Solved Practice Paper', desc: 'Questions, options, explanations & keys' },
                { id: 'flashcard_sheet', name: 'Flashcard Revision Grid', desc: 'Compact two-sided revision cards' },
              ].map((fmt) => (
                <label
                  key={fmt.id}
                  className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    docType === fmt.id
                      ? 'bg-slate-800 border-teal-500/80 text-teal-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="docType"
                    checked={docType === fmt.id}
                    onChange={() => setDocType(fmt.id as any)}
                    className="mt-1 accent-teal-400"
                  />
                  <div>
                    <p className="font-semibold text-xs text-slate-200">{fmt.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{fmt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable Sheet Preview */}
        <div className="lg:col-span-2">
          {activePack ? (
            <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-300 min-h-[640px] max-h-[750px] overflow-y-auto font-sans">
              {/* Document Header */}
              <div className="border-b-2 border-teal-600 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-widest text-teal-700">
                    VITRAX AI • Study Material Export
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
                  {activePack.title}
                </h2>
                <p className="text-xs text-slate-600 mt-1 italic">
                  {activePack.summary}
                </p>
              </div>

              {/* Formula Section Preview */}
              {(docType === 'full_book' || docType === 'formula_sheet') && activePack.keyFormulas?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-sm text-slate-900 mb-3 uppercase tracking-wide border-b border-slate-200 pb-1">
                    1. High-Yield Theoretical Equations
                  </h3>
                  <div className="space-y-3">
                    {activePack.keyFormulas.map((f, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="font-bold text-teal-800">{f.name}</div>
                        <div className="font-mono text-slate-900 my-1 font-semibold">{f.formula}</div>
                        <div className="text-slate-600 text-[11px]">{f.meaning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MCQs Section Preview */}
              {(docType === 'full_book' || docType === 'mcq_bank') && activePack.quiz?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-sm text-slate-900 mb-3 uppercase tracking-wide border-b border-slate-200 pb-1">
                    2. Practice Questions & Answer Keys
                  </h3>
                  <div className="space-y-4">
                    {activePack.quiz.map((q, i) => (
                      <div key={i} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                        <div className="font-bold text-slate-900">
                          Q{i + 1}: {q.question}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                          {q.options.map((opt, optI) => (
                            <div
                              key={optI}
                              className={`text-[11px] ${
                                optI === q.correctIndex ? 'font-bold text-teal-700' : 'text-slate-600'
                              }`}
                            >
                              [{optI === q.correctIndex ? '✓' : ' '}] {String.fromCharCode(65 + optI)}. {opt}
                            </div>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                          Explanation: {q.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flashcards Section Preview */}
              {(docType === 'full_book' || docType === 'flashcard_sheet') && activePack.flashcards?.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm text-slate-900 mb-3 uppercase tracking-wide border-b border-slate-200 pb-1">
                    3. High-Density Flashcard Review Grid
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activePack.flashcards.map((card, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        <div className="text-[10px] font-bold text-teal-700 uppercase">{card.topic} [{card.difficulty}]</div>
                        <div className="font-semibold text-slate-900 mt-1">F: {card.front}</div>
                        <div className="text-slate-700 mt-1 text-[11px]">B: {card.back}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">No study pack selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};
