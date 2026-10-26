// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Shuffle, 
  CheckCircle, 
  HelpCircle, 
  AlertTriangle, 
  Plus, 
  Printer, 
  Pencil,
  Trash2,
  Sparkles,
  Layers
} from 'lucide-react';
import { StudyTopBar } from './StudyTopBar';
import { StudyPack, Flashcard } from '../types';

interface FlashcardStudioViewProps {
  studyPacks: StudyPack[];
  onUpdatePacks: (packs: StudyPack[]) => void;
  onOpenPDFStudio: () => void;
  onToggleSidebar?: () => void;
}

export const FlashcardStudioView: React.FC<FlashcardStudioViewProps> = ({
  studyPacks,
  onUpdatePacks,
  onOpenPDFStudio,
  onToggleSidebar,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string>(studyPacks[0]?.id || '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'known' | 'uncertain' | 'review'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState('');

  // New card modal form state
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newTopic, setNewTopic] = useState('Core Concept');
  const [newDiff, setNewDiff] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const currentPack = studyPacks.find((p) => p.id === selectedPackId) || studyPacks[0];

  const cards = (currentPack?.flashcards || []).filter((c) => {
    if (selectedFilter === 'all') return true;
    return c.state === selectedFilter;
  });

  const activeCard: Flashcard | undefined = cards[currentIndex] || cards[0];

  // Reset index when filter or pack changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedPackId, selectedFilter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAddModal) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards.length, currentIndex, showAddModal]);

  const handleNext = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    if (!currentPack) return;
    const shuffled = [...currentPack.flashcards].sort(() => Math.random() - 0.5);
    const updated = studyPacks.map((p) => (p.id === currentPack.id ? { ...p, flashcards: shuffled } : p));
    onUpdatePacks(updated);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleSetCardState = (cardId: string, state: 'known' | 'uncertain' | 'review') => {
    if (!currentPack) return;
    const updatedCards = currentPack.flashcards.map((c) => (c.id === cardId ? { ...c, state, lastReviewed: Date.now() } : c));
    const updatedPacks = studyPacks.map((p) =>
      p.id === currentPack.id ? { ...p, flashcards: updatedCards } : p
    );
    onUpdatePacks(updatedPacks);
    handleNext();
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim() || !currentPack) return;

    const newCard: Flashcard = {
      id: `card-${Date.now()}`,
      topic: newTopic.trim(),
      front: newFront.trim(),
      back: newBack.trim(),
      difficulty: newDiff,
      state: 'new',
    };

    const updated = studyPacks.map((p) => p.id !== currentPack.id ? p : {
      ...p,
      flashcards: editingCardId
        ? p.flashcards.map(card => card.id === editingCardId ? { ...card, topic: newCard.topic, front: newCard.front, back: newCard.back, difficulty: newCard.difficulty } : card)
        : [newCard, ...p.flashcards],
    });
    onUpdatePacks(updated);
    setNewFront('');
    setNewBack('');
    setEditingCardId(null);
    setShowAddModal(false);
  };

  const handleEditCard = () => {
    if (!activeCard) return;
    setEditingCardId(activeCard.id);
    setNewFront(activeCard.front);
    setNewBack(activeCard.back);
    setNewTopic(activeCard.topic);
    setNewDiff(activeCard.difficulty);
    setShowAddModal(true);
  };

  const handleRemoveCard = () => {
    if (!activeCard || !currentPack || !window.confirm('Remove this flashcard from the saved deck?')) return;
    onUpdatePacks(studyPacks.map(pack => pack.id === currentPack.id ? { ...pack, flashcards: pack.flashcards.filter(card => card.id !== activeCard.id) } : pack));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleExportPdf = async () => {
    if (!currentPack) return;
    setPdfNotice('');
    try {
      const { createAndSaveDocumentPdf } = await import('../lib/pdf/documentPdf');
      const content = `# ${currentPack.title} — Flashcards\n\n${currentPack.summary}\n\n${currentPack.flashcards.map((card, index) => `## Card ${index + 1} · ${card.topic}\n**Q:** ${card.front}\n\n**A:** ${card.back}${card.hint ? `\n\nHint: ${card.hint}` : ''}${card.sourceRef ? `\n\nSource: ${card.sourceRef}` : ''}`).join('\n\n')}`;
      const result = await createAndSaveDocumentPdf(`${currentPack.title}-Flashcards`, content, currentPack.sourceTitle ? `Generated from ${currentPack.sourceTitle}` : undefined);
      setPdfNotice(`Downloaded ${result.filename} · ${result.pageCount} page${result.pageCount === 1 ? '' : 's'}`);
    } catch (error) {
      setPdfNotice(error instanceof Error ? `PDF export failed: ${error.message}` : 'PDF export failed.');
    }
  };

  // Stats calculation
  const totalInDeck = currentPack?.flashcards.length || 0;
  const knownCount = currentPack?.flashcards.filter((c) => c.state === 'known').length || 0;
  const uncertainCount = currentPack?.flashcards.filter((c) => c.state === 'uncertain').length || 0;
  const reviewCount = currentPack?.flashcards.filter((c) => c.state === 'review').length || 0;

  return (
    <div className="h-full overflow-y-auto">
    <StudyTopBar
      title="Flashcards"
      onToggleSidebar={onToggleSidebar}
      sourceTitle={currentPack?.sourceTitle || currentPack?.title}
      onOpenLibrary={onOpenPDFStudio}
      progressLabel={totalInDeck ? `${knownCount} of ${totalInDeck} mastered · Card ${Math.min(currentIndex + 1, cards.length || 1)} of ${cards.length}` : 'No cards yet'}
      progress={totalInDeck ? knownCount / totalInDeck : 0}
    />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {pdfNotice && <div className="rounded-xl border border-violet-300/15 bg-violet-400/5 px-3 py-2 text-xs text-violet-100" role="status">{pdfNotice}</div>}
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Source-based Learning & Confidence Review</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Flashcard Mastery Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Interactive review cards with reveal, shuffle, saved self-assessment, and editable source-based content.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={handleEditCard} disabled={!activeCard} className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"><Pencil className="w-3.5 h-3.5" /><span>Edit card</span></button>
            <button onClick={handleRemoveCard} disabled={!activeCard} className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 disabled:opacity-40 text-slate-300 hover:text-rose-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors" title="Remove current flashcard"><Trash2 className="w-3.5 h-3.5" /></button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Card</span>
            </button>
            <button
              onClick={() => void handleExportPdf()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Export PDF Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deck Selector & Spaced Repetition Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Pack Selector */}
        <div className="sm:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Active Deck:</span>
            <select
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="block mt-1 bg-slate-950 border border-slate-700 text-teal-300 font-semibold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400"
            >
              {studyPacks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.flashcards?.length || 0} cards)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleShuffle}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-400 transition-colors"
            title="Shuffle deck"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Pill 1: Known */}
        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'known' ? 'all' : 'known')}
          className={`cursor-pointer bg-slate-900/80 border rounded-2xl p-4 transition-all ${
            selectedFilter === 'known' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Known (Mastered)</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {knownCount} <span className="text-xs text-slate-500 font-normal">/ {totalInDeck}</span>
          </div>
        </div>

        {/* Stats Pill 2: Needs Revision */}
        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'review' ? 'all' : 'review')}
          className={`cursor-pointer bg-slate-900/80 border rounded-2xl p-4 transition-all ${
            selectedFilter === 'review' ? 'border-rose-500 bg-rose-500/10' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold">
            <span>Needs Revision</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {reviewCount} <span className="text-xs text-slate-500 font-normal">/ {totalInDeck}</span>
          </div>
        </div>
      </div>

      {/* 3D Flashcard Interactive Canvas */}
      {activeCard ? (
        <div className="flex flex-col items-center space-y-6">
          {/* Card counter bar */}
          <div className="flex items-center justify-between w-full max-w-2xl px-2 text-xs text-slate-400">
            <span className="font-mono">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <span className="text-slate-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Space</kbd> to flip • <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">→</kbd> to navigate
            </span>
          </div>

          {/* 3D Flip Card Container */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-2xl h-80 sm:h-96 perspective-1000 cursor-pointer select-none group"
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front of Card */}
              <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 p-8 sm:p-10 flex flex-col justify-between shadow-2xl group-hover:border-teal-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                    {activeCard.topic}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {activeCard.difficulty}
                  </span>
                </div>

                <div className="my-auto text-center px-4">
                  <p className="text-lg sm:text-xl font-display font-semibold text-white leading-relaxed">
                    {activeCard.front}
                  </p>
                  {activeCard.hint && (
                    <p className="text-xs text-slate-400 mt-4 italic bg-slate-800/50 py-1.5 px-3 rounded-lg inline-block border border-slate-700/50">
                      Hint: {activeCard.hint}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
                  <span className="flex items-center gap-1 text-teal-400/80">
                    <RotateCw className="w-3.5 h-3.5" />
                    Click to reveal answer
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">QUESTION</span>
                </div>
              </div>

              {/* Back of Card */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 border border-teal-500/60 p-8 sm:p-10 flex flex-col justify-between shadow-2xl glow-teal">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-teal-300 bg-teal-500/20 px-3 py-1 rounded-full border border-teal-500/30">
                    Answer
                  </span>
                  <span className="text-xs font-mono text-teal-400">
                    REVEALED
                  </span>
                </div>

                <div className="my-auto text-left px-2 overflow-y-auto max-h-[220px]">
                  <p className="text-sm sm:text-base text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
                    {activeCard.back}
                  </p>
                  {activeCard.sourceRef && <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-cyan-200/80">Source: {activeCard.sourceRef}</p>}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                  <span className="flex items-center gap-1 text-teal-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Answer revealed
                  </span>
                  <span className="font-mono text-[11px] text-teal-500">VITRAX AI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation and Spaced Repetition Confidence Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-2xl">
            <button
              onClick={handlePrev}
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Previous card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Confidence markers */}
            <button
              onClick={() => handleSetCardState(activeCard.id, 'review')}
              className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Hard (Needs Review)</span>
            </button>

            <button
              onClick={() => handleSetCardState(activeCard.id, 'uncertain')}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Uncertain (Medium)</span>
            </button>

            <button
              onClick={() => handleSetCardState(activeCard.id, 'known')}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Known (Easy)</span>
            </button>

            <button
              onClick={handleNext}
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Next card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          No cards match the active filter. Choose "All" or create a new card.
        </div>
      )}

      {/* Add Custom Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-white text-lg">{editingCardId ? 'Edit Flashcard' : 'Add New Flashcard'}</h3>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Topic</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Front (Question or Prompt)</label>
                <textarea
                  rows={2}
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Back (Solution or Definition)</label>
                <textarea
                  rows={3}
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingCardId(null); }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
                >
                  {editingCardId ? 'Save Changes' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
