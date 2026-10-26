// @ts-nocheck
import React, { useRef, useState } from 'react';
import { Menu, BookOpen, FileText, Upload, Search, Trash2, Sparkles, MessageSquare, Download, Layers, HelpCircle, LoaderCircle, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { DocumentItem, StudyPack, Conversation } from '../types';

const MAX_LIBRARY_TEXT_CHARACTERS = 800_000;

interface StudyPackRequest {
  cardCount: number;
  quizCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
}

interface LibraryViewProps {
  documents: DocumentItem[];
  studyPacks: StudyPack[];
  conversations: Conversation[];
  onUploadDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  onDeleteStudyPack: (id: string) => void;
  onSelectForChat: (doc: DocumentItem) => void;
  onGenerateStudyPack: (doc: DocumentItem, request: StudyPackRequest) => Promise<void>;
  onOpenStudyPackInFlashcards: (pack: StudyPack) => void;
  onOpenStudyPackInQuiz: (pack: StudyPack) => void;
  onOpenConversation: (id: string) => void;
  onExportDocumentPdf: (doc: DocumentItem) => Promise<void>;
  onExportStudyPackPdf: (pack: StudyPack) => Promise<void>;
  onToggleSidebar?: () => void;
}

const tabs = ['Sources', 'Study packs', 'Conversations'] as const;
type LibraryTab = typeof tabs[number];

function niceSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function sourceType(doc: DocumentItem): string {
  return (doc.contentType || doc.type).toUpperCase();
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  documents,
  studyPacks,
  conversations,
  onUploadDocument,
  onDeleteDocument,
  onDeleteStudyPack,
  onSelectForChat,
  onGenerateStudyPack,
  onOpenStudyPackInFlashcards,
  onOpenStudyPackInQuiz,
  onOpenConversation,
  onExportDocumentPdf,
  onExportStudyPackPdf,
  onToggleSidebar,
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('Sources');
  const [query, setQuery] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const [request, setRequest] = useState<StudyPackRequest>({ cardCount: 12, quizCount: 8, difficulty: 'Mixed' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filter = (value: string) => value.toLowerCase().includes(query.trim().toLowerCase());
  const visibleDocuments = documents.filter(doc => filter(doc.title) || filter(doc.content));
  const visiblePacks = studyPacks.filter(pack => filter(pack.title) || filter(pack.summary) || filter(pack.sourceTitle || ''));
  const visibleConversations = conversations.filter(conversation => filter(conversation.title || 'Untitled conversation'));

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadError('');
    setIngesting(true);
    try {
      const { ingestSourceFile } = await import('../lib/sources/ingest');
      const extracted = await ingestSourceFile(file);
      const savedCharacters = documents.reduce((total, item) => total + item.content.length, 0);
      if (savedCharacters + extracted.content.length > MAX_LIBRARY_TEXT_CHARACTERS) {
        throw new Error(`Your library would exceed its ${MAX_LIBRARY_TEXT_CHARACTERS.toLocaleString()}-character local storage limit. Delete a source first; no extracted text was saved or truncated.`);
      }
      const document: DocumentItem = {
        id: `doc-${crypto.randomUUID()}`,
        title: extracted.title,
        type: extracted.contentType,
        contentType: extracted.contentType,
        size: niceSize(extracted.fileSize),
        content: extracted.content,
        pages: extracted.pages,
        mimeType: extracted.metadata.mimeType,
        uploadedAt: Date.now(),
      };
      onUploadDocument(document);
      setActiveTab('Sources');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The file could not be extracted.');
    } finally {
      setIngesting(false);
    }
  };

  const runStudyPack = async (doc: DocumentItem) => {
    if (doc.content.length > 24_000) {
      setActionError(`“${doc.title}” is longer than the current study-pack input limit (24,000 characters). No text was silently truncated; choose a shorter source or use a focused excerpt.`);
      return;
    }
    setActionError('');
    setBusyId(doc.id);
    try {
      await onGenerateStudyPack(doc, request);
      setActiveTab('Study packs');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Study pack generation failed.');
    } finally {
      setBusyId('');
    }
  };

  const runPdf = async (doc: DocumentItem) => {
    setActionError('');
    setBusyId(`pdf-${doc.id}`);
    try { await onExportDocumentPdf(doc); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'PDF export failed.'); }
    finally { setBusyId(''); }
  };

  return (
    <main className="workspace-page library-page">
      <div className="workspace-heading">
        <div>
          {onToggleSidebar && <button onClick={onToggleSidebar} className="quiet-icon-button mb-3 -ml-1" aria-label="Open menu" title="Open menu"><Menu size={17} /></button>}
          <div className="eyebrow"><BookOpen size={14} /> VITRAX Knowledge</div>
          <h1 className="workspace-title">Your sources, ready to learn from.</h1>
          <p className="workspace-description">Extract supported files locally, ask source-grounded questions, then turn the material into review cards, quizzes, or downloadable PDFs.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button className="primary-action" disabled={ingesting} onClick={() => fileInputRef.current?.click()}>
            {ingesting ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
            {ingesting ? 'Reading file…' : 'Add a source'}
          </button>
          <span className="text-[10px] text-slate-500">PDF, DOCX, TXT, Markdown, CSV · max 8 MiB</span>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.markdown,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      <div className="source-trust-note"><ShieldCheck size={15} /><span>Files are extracted in your browser. Saved source text and chats stay in this browser’s local storage; the library caps saved extracted text at 800,000 characters. Source excerpts are sent to the AI service only when you ask it to analyze that source.</span></div>
      {uploadError && <div className="library-error" role="alert">{uploadError}</div>}
      {actionError && <div className="library-error" role="alert">{actionError}<button onClick={() => setActionError('')} aria-label="Dismiss error">×</button></div>}

      <div className="library-toolbar">
        <div className="library-tabs" role="tablist">{tabs.map(tab => <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}{tab === 'Sources' ? ` · ${documents.length}` : tab === 'Study packs' ? ` · ${studyPacks.length}` : ` · ${conversations.length}`}</button>)}</div>
        <div className="library-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this library" aria-label="Search library" /></div>
      </div>

      {activeTab === 'Sources' && (
        <section className="library-grid">
          {visibleDocuments.length === 0 ? <div className="empty-library"><div className="empty-library-icon"><FileText size={20} /></div><h2>No source files yet</h2><p>Add a readable PDF, Word document, note, or CSV. VITRAX will show what text it could extract before using it.</p><button className="secondary-action" onClick={() => fileInputRef.current?.click()}><Upload size={14} />Choose a source file</button></div> : visibleDocuments.map(doc => (
            <article key={doc.id} className="library-card">
              <div className="library-card-top"><div className="source-file-icon"><FileText size={17} /></div><span className="format-badge">{sourceType(doc)}</span><button className="subtle-delete" title="Remove source" onClick={() => onDeleteDocument(doc.id)}><Trash2 size={14} /></button></div>
              <h2 className="library-card-title" title={doc.title}>{doc.title}</h2>
              <p className="library-card-copy">{doc.content.slice(0, 190)}{doc.content.length > 190 ? '…' : ''}</p>
              <div className="library-meta"><span>{doc.size}</span><span>{doc.pages?.length ? `${doc.pages.length} pages` : `${doc.content.length.toLocaleString()} characters`}</span><span>{new Date(doc.uploadedAt).toLocaleDateString()}</span></div>
              <div className="library-card-actions">
                <button className="secondary-action" onClick={() => onSelectForChat(doc)}><MessageSquare size={13} />Ask source</button>
                <button className="secondary-action" onClick={() => void runStudyPack(doc)} disabled={busyId === doc.id}>{busyId === doc.id ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}Create study pack</button>
                <button className="icon-action" onClick={() => void runPdf(doc)} disabled={busyId === `pdf-${doc.id}`} title="Download source text as PDF">{busyId === `pdf-${doc.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === 'Study packs' && (
        <>
          {studyPacks.length > 0 && <div className="generation-controls"><span className="text-xs text-slate-400">Next study pack</span><label>Cards<select value={request.cardCount} onChange={event => setRequest(current => ({ ...current, cardCount: Number(event.target.value) }))}><option value={8}>8</option><option value={12}>12</option><option value={20}>20</option></select></label><label>Quiz questions<select value={request.quizCount} onChange={event => setRequest(current => ({ ...current, quizCount: Number(event.target.value) }))}><option value={5}>5</option><option value={8}>8</option><option value={12}>12</option></select></label><label>Difficulty<select value={request.difficulty} onChange={event => setRequest(current => ({ ...current, difficulty: event.target.value as StudyPackRequest['difficulty'] }))}><option>Mixed</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label></div>}
          <section className="library-grid">
            {visiblePacks.length === 0 ? <div className="empty-library"><div className="empty-library-icon"><Layers size={20} /></div><h2>No study packs yet</h2><p>Choose a source, set the card count and difficulty, and generate a quiz and flashcards grounded in its extracted text.</p><button className="secondary-action" onClick={() => setActiveTab('Sources')}>Browse sources</button></div> : visiblePacks.map(pack => (
              <article key={pack.id} className="library-card study-card">
                <div className="library-card-top"><div className="source-file-icon study-icon"><Layers size={17} /></div><span className="format-badge format-study">STUDY PACK</span><button className="subtle-delete" title="Delete study pack" onClick={() => onDeleteStudyPack(pack.id)}><Trash2 size={14} /></button></div>
                <h2 className="library-card-title">{pack.title}</h2><p className="library-card-copy">{pack.summary}</p>
                {pack.sourceTitle && <div className="source-attribution"><FileText size={12} />Generated from {pack.sourceTitle}</div>}
                <div className="library-meta"><span>{pack.flashcards.length} cards</span><span>{pack.quiz.length} questions</span><span>{new Date(pack.createdAt).toLocaleDateString()}</span></div>
                <div className="library-card-actions"><button className="secondary-action" onClick={() => onOpenStudyPackInFlashcards(pack)}><Layers size={13} />Review cards</button><button className="secondary-action" onClick={() => onOpenStudyPackInQuiz(pack)}><HelpCircle size={13} />Take quiz</button><button className="icon-action" onClick={() => void onExportStudyPackPdf(pack)} title="Download study pack as PDF"><Download size={14} /></button></div>
              </article>
            ))}
          </section>
        </>
      )}

      {activeTab === 'Conversations' && <section className="library-grid">{visibleConversations.length === 0 ? <div className="empty-library"><div className="empty-library-icon"><MessageSquare size={20} /></div><h2>No saved conversations</h2><p>Your chat history appears here and stays in this browser.</p></div> : visibleConversations.map(conversation => <button key={conversation.id} className="library-card conversation-card" onClick={() => onOpenConversation(conversation.id)}><div className="library-card-top"><div className="source-file-icon"><MessageSquare size={17} /></div><span className="format-badge">{conversation.messages.length} messages</span><ArrowUpRight size={15} className="text-slate-500" /></div><h2 className="library-card-title">{conversation.title || 'Untitled conversation'}</h2><p className="library-card-copy">{conversation.messages.at(-1)?.content || 'No messages yet.'}</p><div className="library-meta"><span>{new Date(conversation.updatedAt).toLocaleDateString()}</span><span>{conversation.model}</span></div></button>)}</section>}
    </main>
  );
};
