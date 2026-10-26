// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, LoaderCircle, Sparkles } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { CodeWorkspaceView } from './components/CodeWorkspaceView';
import { LibraryView } from './components/LibraryView';
import { SettingsModal } from './components/SettingsModal';
import { FlashcardStudioView } from './components/FlashcardStudioView';
import { QuizLabView } from './components/QuizLabView';
import type { ChatMessage, Conversation, CodeProject, StudyPack, DocumentItem, MainView, ResponseDepth, ModelInfo } from './types';
import { loadConversations, saveConversations, loadProjects, saveProjects, loadStudyPacks, saveStudyPacks, loadDocuments, saveDocuments } from './lib/storage';
import { formatRetrievedExcerpts, retrieveRelevantChunks } from './lib/sources/retrieval';
import type { IngestedSource } from './lib/sources/ingest';

interface StudyPackOptions {
  cardCount: number;
  quizCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
}

interface ChatSendOptions {
  depth: ResponseDepth;
  model: string;
  tool?: string;
  source?: IngestedSource;
  imageBase64?: string;
  mimeType?: string;
  attachment?: { name: string; type: string; size: number };
}

interface StreamEvent {
  event: string;
  data: Record<string, unknown>;
}

function decodeSseBlock(block: string): StreamEvent | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  try {
    const parsed = JSON.parse(data.join('\n'));
    return parsed && typeof parsed === 'object' ? { event, data: parsed as Record<string, unknown> } : null;
  } catch {
    return null;
  }
}

function sourceFromDocument(doc: DocumentItem): IngestedSource {
  const contentType = doc.contentType || (['pdf', 'docx', 'txt', 'markdown', 'csv'].includes(doc.type)
    ? doc.type as IngestedSource['contentType']
    : 'txt');
  return {
    title: doc.title,
    content: doc.content,
    contentType,
    fileSize: 0,
    pages: doc.pages,
    metadata: {
      fileName: doc.title,
      mimeType: doc.mimeType || 'text/plain',
      extractionMethod: contentType === 'pdf' ? 'pdfjs' : contentType === 'docx' ? 'mammoth' : contentType === 'csv' ? 'csv-parser' : 'utf-8',
    },
  };
}

function sourceWithPageLabels(doc: DocumentItem): string {
  if (doc.pages?.length) {
    return doc.pages.map(page => `[Source: ${doc.title} | Page ${page.pageNumber}]\n${page.content}`).join('\n\n');
  }
  return `[Source: ${doc.title} | Page unavailable]\n${doc.content}`;
}

function readError(response: Response): Promise<string> {
  return response.json().then(data => typeof data?.error === 'string' ? data.error : typeof data?.message === 'string' ? data.message : `Request failed with HTTP ${response.status}.`).catch(() => `Request failed with HTTP ${response.status}.`);
}

export default function App() {
  const [currentView, setCurrentView] = useState<MainView>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [studyPacks, setStudyPacks] = useState<StudyPack[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sessionSourceDocument, setSessionSourceDocument] = useState<DocumentItem | null>(null);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [depth, setDepth] = useState<ResponseDepth>('balanced');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [aiStatus, setAiStatus] = useState<'loading' | 'online' | 'unavailable'>('loading');
  const [isStreaming, setIsStreaming] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [preferredPackId, setPreferredPackId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadedConversations = loadConversations();
    setConversations(loadedConversations);
    setActiveConversationId(loadedConversations[0]?.id || null);
    setProjects(loadProjects());
    setStudyPacks(loadStudyPacks());
    setDocuments(loadDocuments());
    setReady(true);

    fetch('/api/ai/status')
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload.models) || payload.models.length === 0) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'The model catalog is unavailable.');
        }
        setModels(payload.models as ModelInfo[]);
        setAiStatus('online');
      })
      .catch(() => {
        setModels([]);
        setAiStatus('unavailable');
      });
  }, []);

  useEffect(() => { if (ready) saveConversations(conversations); }, [conversations, ready]);
  useEffect(() => { if (ready) saveProjects(projects); }, [projects, ready]);
  useEffect(() => { if (ready) saveStudyPacks(studyPacks); }, [studyPacks, ready]);
  useEffect(() => { if (ready) saveDocuments(documents); }, [documents, ready]);

  useEffect(() => {
    if (!isStreaming) { setElapsedMs(0); return; }
    const start = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - start), 150);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  const selectedSource = useMemo(
    () => documents.find(doc => doc.id === selectedSourceId) || (sessionSourceDocument?.id === selectedSourceId ? sessionSourceDocument : undefined),
    [documents, selectedSourceId, sessionSourceDocument],
  );
  const activeConversation = conversations.find(conversation => conversation.id === activeConversationId);
  const activeMessages = activeConversation?.messages || [];

  const updateAssistantMessage = (conversationId: string, messageId: string, update: (message: ChatMessage) => ChatMessage) => {
    setConversations(previous => previous.map(conversation => conversation.id !== conversationId ? conversation : {
      ...conversation,
      messages: conversation.messages.map(message => message.id === messageId ? update(message) : message),
      updatedAt: Date.now(),
    }));
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  };

  const handleNewChat = () => {
    if (isStreaming) handleStopStreaming();
    const id = `conv-${crypto.randomUUID()}`;
    const conversation: Conversation = { id, title: 'New conversation', messages: [], updatedAt: Date.now(), model: selectedModel };
    setConversations(previous => [conversation, ...previous]);
    setActiveConversationId(id);
    setCurrentView('chat');
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(previous => {
      const next = previous.filter(conversation => conversation.id !== id);
      if (activeConversationId === id) setActiveConversationId(next[0]?.id || null);
      return next;
    });
  };

  const handleSendMessage = async (content: string, options: ChatSendOptions) => {
    if (isStreaming) return;
    if (options.source) {
      const existingSource = documents.find(doc => doc.title === options.source?.title && doc.content === options.source?.content);
      if (existingSource) {
        setSelectedSourceId(existingSource.id);
        setSessionSourceDocument(null);
      } else {
        const source = options.source;
        const sourceDocument: DocumentItem = {
          id: `doc-${crypto.randomUUID()}`,
          title: source.title,
          type: source.contentType,
          contentType: source.contentType,
          size: `${(source.fileSize / 1024).toFixed(1)} KB`,
          content: source.content,
          pages: source.pages,
          mimeType: source.metadata.mimeType,
          uploadedAt: Date.now(),
        };
        const savedCharacters = documents.reduce((total, doc) => total + doc.content.length, 0);
        if (savedCharacters + source.content.length <= 800_000) {
          setDocuments(previous => [sourceDocument, ...previous]);
          setSelectedSourceId(sourceDocument.id);
          setSessionSourceDocument(null);
        } else {
          setSessionSourceDocument(sourceDocument);
          setSelectedSourceId(sourceDocument.id);
        }
      }
    }
    const id = activeConversationId;
    let conversation = conversations.find(item => item.id === id);
    if (!id || !conversation) {
      const newId = `conv-${crypto.randomUUID()}`;
      conversation = { id: newId, title: content.slice(0, 56) || 'New conversation', messages: [], updatedAt: Date.now(), model: options.model };
      setConversations(previous => [conversation!, ...previous]);
      setActiveConversationId(newId);
    }
    const conversationId = conversation.id;
    const userMessage: ChatMessage = {
      id: `msg-${crypto.randomUUID()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      depth: options.depth,
      toolUsed: options.tool,
      ...(options.attachment ? { attachments: [options.attachment] } : {}),
    };
    const assistantId = `msg-${crypto.randomUUID()}`;
    const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() };
    const priorMessages = conversation.messages;
    const newMessages = [...priorMessages, userMessage, assistantMessage];
    const title = priorMessages.length === 0 ? content.replace(/\s+/g, ' ').slice(0, 56) : conversation.title;
    setConversations(previous => previous.map(item => item.id === conversationId
      ? { ...item, title, model: options.model, messages: newMessages, updatedAt: Date.now() }
      : item));
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let accumulated = '';
    let gotDone = false;
    let streamError = '';

    const sources: IngestedSource[] = [];
    if (selectedSource) sources.push(sourceFromDocument(selectedSource));
    if (options.source && !sources.some(source => source.title === options.source?.title)) sources.push(options.source);
    let documentContext = '';
    if (sources.length) {
      const excerpts = retrieveRelevantChunks(sources, content, { topK: 8, chunkSize: 850, overlap: 100 });
      documentContext = excerpts.length
        ? formatRetrievedExcerpts(excerpts)
        : sources.map(source => `[Source: ${source.title} | No matching passage]\nNo passage from this file matched the current question. Do not infer the source's contents.`).join('\n\n');
    }

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          messages: [...priorMessages, userMessage].map(message => ({ role: message.role, content: message.content })),
          mode: options.depth,
          model: options.model,
          tool: options.tool,
          documentContext,
          imageBase64: options.imageBase64,
          mimeType: options.mimeType,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(await readError(response));
      if (!response.body) throw new Error('The server returned no streaming response.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const handleBlock = (block: string) => {
        const item = decodeSseBlock(block);
        if (!item) return;
        if (item.event === 'chunk' && typeof item.data.text === 'string') {
          accumulated += item.data.text;
          updateAssistantMessage(conversationId, assistantId, message => ({ ...message, content: accumulated }));
        } else if (item.event === 'done') {
          gotDone = true;
          const durationMs = Number(item.data.durationMs);
          const model = typeof item.data.model === 'string' ? item.data.model : options.model;
          updateAssistantMessage(conversationId, assistantId, message => ({ ...message, durationMs: Number.isFinite(durationMs) ? durationMs : undefined, model }));
        } else if (item.event === 'error') {
          streamError = typeof item.data.message === 'string' ? item.data.message : 'The AI stream ended with an error.';
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';
        blocks.forEach(handleBlock);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleBlock(buffer);
      if (streamError) throw new Error(streamError);
      if (!accumulated.trim()) throw new Error(gotDone ? 'The AI service returned an empty response.' : 'The AI stream ended before a response arrived.');
    } catch (error) {
      if (controller.signal.aborted) {
        if (!accumulated.trim()) updateAssistantMessage(conversationId, assistantId, message => ({ ...message, content: 'Generation stopped before a response was produced.' }));
      } else {
        const message = error instanceof Error ? error.message : 'The request could not be completed.';
        updateAssistantMessage(conversationId, assistantId, assistant => ({
          ...assistant,
          content: accumulated ? `${accumulated}\n\n> Response interrupted: ${message}` : `**Request failed:** ${message}`,
          error: true,
        }));
      }
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleGenerateStudyPack = async (document: DocumentItem, options: StudyPackOptions) => {
    const sourceContent = sourceWithPageLabels(document);
    if (sourceContent.length > 24_000) throw new Error('This source exceeds the 24,000-character study-pack limit. No content was truncated. Use a shorter source or a focused excerpt.');
    const response = await fetch('/api/ai/study-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: document.title, sourceTitle: document.title, sourceContent, ...options }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const payload = await response.json();
    if (!payload.success || !payload.studyPack || !Array.isArray(payload.studyPack.flashcards) || !Array.isArray(payload.studyPack.quiz)) {
      throw new Error('The AI response did not contain a valid study pack. No pack was saved.');
    }
    const created: StudyPack = { ...payload.studyPack, createdAt: Date.now(), sourceTitle: document.title };
    setStudyPacks(previous => [created, ...previous]);
    setPreferredPackId(created.id);
  };

  const handleCreateDocumentPdf = async (prompt: string, title: string) => {
    let sourceContent = '';
    if (selectedSource) {
      sourceContent = sourceWithPageLabels(selectedSource);
      if (sourceContent.length > 24_000) throw new Error(`“${selectedSource.title}” exceeds the current document-generation input limit; no content was truncated. Choose a shorter source or generate from your own instructions.`);
    }
    const response = await fetch('/api/ai/document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, title, sourceContent, sourceTitle: selectedSource?.title }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json() as { title?: string; content?: string };
    if (typeof result.content !== 'string' || !result.content.trim()) throw new Error('The model returned no document content, so no PDF was saved.');
    const { createAndSaveDocumentPdf } = await import('./lib/pdf/documentPdf');
    return createAndSaveDocumentPdf(title || result.title || 'VITRAX document', result.content, selectedSource ? `Source: ${selectedSource.title}` : undefined);
  };

  const handleExportDocumentPdf = async (doc: DocumentItem) => {
    const { createAndSaveDocumentPdf } = await import('./lib/pdf/documentPdf');
    await createAndSaveDocumentPdf(doc.title, sourceWithPageLabels(doc), 'Extracted from a user-provided file; page labels are retained where available.');
  };

  const handleExportStudyPackPdf = async (pack: StudyPack) => {
    const cards = pack.flashcards.map((card, index) => `### Card ${index + 1} · ${card.topic}\n**Q:** ${card.front}\n\n**A:** ${card.back}${card.sourceRef ? `\n\nSource: ${card.sourceRef}` : ''}`).join('\n\n');
    const questions = pack.quiz.map((question, index) => `### Question ${index + 1}\n${question.question}\n\n${question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join('\n')}\n\n**Answer:** ${question.options[question.correctIndex]}\n\n**Explanation:** ${question.explanation}${question.sourceRef ? `\n\nSource: ${question.sourceRef}` : ''}`).join('\n\n');
    const formulas = pack.keyFormulas?.length ? `## Key formulas\n${pack.keyFormulas.map(formula => `- **${formula.name}**: ${formula.formula} — ${formula.meaning}`).join('\n')}` : '';
    const content = `# ${pack.title}\n\n${pack.summary}\n\n${formulas}\n\n## Flashcards\n\n${cards}\n\n## Quiz\n\n${questions}`;
    const { createAndSaveDocumentPdf } = await import('./lib/pdf/documentPdf');
    await createAndSaveDocumentPdf(pack.title, content, pack.sourceTitle ? `Generated from ${pack.sourceTitle}` : undefined);
  };

  const handleClearAllData = () => {
    Object.keys(localStorage).filter(key => key.startsWith('vitrax_')).forEach(key => localStorage.removeItem(key));
    setConversations([]);
    setActiveConversationId(null);
    setProjects([]);
    setStudyPacks([]);
    setDocuments([]);
    setSelectedSourceId(null);
    setSessionSourceDocument(null);
  };

  const prioritizedPacks = preferredPackId
    ? [...studyPacks].sort((left, right) => Number(right.id === preferredPackId) - Number(left.id === preferredPackId))
    : studyPacks;

  if (!ready) return <div className="app-loading"><div className="vitrax-orb vitrax-orb-small"><span /><span /><span /></div><span>Loading your workspace</span></div>;

  return (
    <div className={`vitrax-app ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'} ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}>
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={id => { setActiveConversationId(id); setCurrentView('chat'); setSidebarOpen(false); }}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(open => !open)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        aiStatus={aiStatus}
      />

      <div className="vitrax-main">
        {currentView === 'chat' && <ChatView
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          elapsedMs={elapsedMs}
          onStopStreaming={handleStopStreaming}
          onToggleSidebar={() => setSidebarOpen(open => !open)}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          models={models}
          depth={depth}
          onSelectDepth={setDepth}
          selectedSourceTitle={selectedSource?.title}
          onClearSelectedSource={() => { setSelectedSourceId(null); setSessionSourceDocument(null); }}
          onGenerateDocumentPdf={handleCreateDocumentPdf}
        />}

        {(currentView === 'code' || currentView === 'projects') && <CodeWorkspaceView projects={projects} models={models} onUpdateProjects={setProjects} onToggleSidebar={() => setSidebarOpen(open => !open)} />}

        {currentView === 'library' && <LibraryView
          documents={documents}
          studyPacks={studyPacks}
          conversations={conversations}
          onUploadDocument={document => setDocuments(previous => [document, ...previous])}
          onDeleteDocument={id => { setDocuments(previous => previous.filter(document => document.id !== id)); if (selectedSourceId === id) setSelectedSourceId(null); }}
          onDeleteStudyPack={id => setStudyPacks(previous => previous.filter(pack => pack.id !== id))}
          onSelectForChat={document => { setSelectedSourceId(document.id); setCurrentView('chat'); setSidebarOpen(false); }}
          onGenerateStudyPack={handleGenerateStudyPack}
          onOpenStudyPackInFlashcards={pack => { setPreferredPackId(pack.id); setCurrentView('flashcards'); }}
          onOpenStudyPackInQuiz={pack => { setPreferredPackId(pack.id); setCurrentView('quiz'); }}
          onOpenConversation={id => { setActiveConversationId(id); setCurrentView('chat'); }}
          onExportDocumentPdf={handleExportDocumentPdf}
          onExportStudyPackPdf={handleExportStudyPackPdf}
          onToggleSidebar={() => setSidebarOpen(open => !open)}
        />}

        {currentView === 'flashcards' && <FlashcardStudioView studyPacks={prioritizedPacks} onUpdatePacks={setStudyPacks} onOpenPDFStudio={() => setCurrentView('library')} onToggleSidebar={() => setSidebarOpen(open => !open)} />}
        {currentView === 'quiz' && <QuizLabView studyPacks={prioritizedPacks} onUpdatePacks={setStudyPacks} onToggleSidebar={() => setSidebarOpen(open => !open)} onOpenLibrary={() => setCurrentView('library')} />}

        {currentView === 'research' && <div className="workspace-page"><div className="workspace-heading"><div><div className="eyebrow"><AlertCircle size={14} /> Research scope</div><h1 className="workspace-title">Source-led research</h1><p className="workspace-description">This project currently has no live web-search integration. Ask from your imported sources, or use VITRAX chat for general knowledge; it will not invent browsing citations.</p></div></div><button className="primary-action" onClick={() => setCurrentView('library')}>Open source library</button></div>}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        depth={depth}
        onSelectDepth={setDepth}
        onClearAllData={handleClearAllData}
        availableModels={models}
        connectionStatus={aiStatus}
      />
      {aiStatus === 'loading' && <div className="service-status-toast"><LoaderCircle size={13} className="animate-spin" />Checking model catalog…</div>}
      {aiStatus === 'unavailable' && <div className="service-status-toast service-status-warning"><AlertCircle size={13} /><span>AI service unavailable · open Settings for details</span></div>}
      {sessionSourceDocument?.id === selectedSourceId && <div className="service-status-toast"><AlertCircle size={13} /><span>Source active for follow-ups in this session; it was not saved to the full library because its local text limit is reached.</span></div>}
    </div>
  );
}
