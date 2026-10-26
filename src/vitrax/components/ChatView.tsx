// @ts-nocheck
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  CircleStop,
  FileText,
  ImagePlus,
  LoaderCircle,
  Menu,
  Paperclip,
  Plus,
  Sparkles,
  WandSparkles,
  X,
  Download,
} from 'lucide-react';
import type { ChatMessage, ModelInfo, ResponseDepth } from '../types';
import type { IngestedSource } from '../lib/sources/ingest';

/** Reveals streamed text at a steady, adaptive pace so bursts of chunks don't jump. */
function useSmoothText(target: string, live: boolean) {
  const [shown, setShown] = useState(live ? '' : target);
  const shownRef = useRef(shown);
  useEffect(() => {
    if (!live) { shownRef.current = target; setShown(target); return; }
    let raf = 0; let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      const cur = shownRef.current;
      if (!target.startsWith(cur)) shownRef.current = '';
      const remaining = target.length - shownRef.current.length;
      if (remaining > 0) {
        const step = Math.max(1, Math.round(remaining * dt / 180));
        shownRef.current = target.slice(0, shownRef.current.length + step);
        setShown(shownRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, live]);
  return shown;
}
function SmoothMarkdown({ content, live }: { content: string; live: boolean }) {
  const text = useSmoothText(content, live);
  return <div className={live ? 'stream-live' : undefined}><MarkdownContent content={text} /></div>;
}
const MarkdownContent = lazy(() => import('./MarkdownContent').then(module => ({ default: module.MarkdownContent })));

interface ChatSendOptions {
  depth: ResponseDepth;
  model: string;
  tool?: string;
  source?: IngestedSource;
  imageBase64?: string;
  mimeType?: string;
  attachment?: { name: string; type: string; size: number };
}

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, options: ChatSendOptions) => void;
  isStreaming: boolean;
  elapsedMs: number;
  onStopStreaming: () => void;
  onToggleSidebar: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  models: ModelInfo[];
  depth: ResponseDepth;
  onSelectDepth: (depth: ResponseDepth) => void;
  selectedSourceTitle?: string;
  onClearSelectedSource?: () => void;
  onGenerateDocumentPdf?: (prompt: string, title: string) => Promise<{ filename: string; pageCount: number }>;
}

type Attachment =
  | { kind: 'image'; name: string; type: string; size: number; dataUrl: string }
  | { kind: 'source'; name: string; type: string; size: number; source: IngestedSource };

const MODES: { id: ResponseDepth; label: string; detail: string }[] = [
  { id: 'auto', label: 'Auto', detail: 'Choose an available model for the request' },
  { id: 'quick', label: 'Quick', detail: 'Direct, concise answers with a smaller output budget' },
  { id: 'balanced', label: 'Balanced', detail: 'A capable general-purpose response' },
  { id: 'deep', label: 'Deep Analysis', detail: 'More thorough response; Auto prefers an available higher-capability model' },
];

const STARTER_PROMPTS = [
  { icon: '01', title: 'Understand a concept', prompt: 'Explain a difficult concept step by step, then give me a short example.' },
  { icon: '02', title: 'Study from a source', prompt: 'Use the source I attached. Summarize its main ideas and cite the pages you used.' },
  { icon: '03', title: 'Review an argument', prompt: 'Analyze this argument, identify its assumptions, and check where the reasoning may be weak.' },
  { icon: '04', title: 'Build or debug code', prompt: 'Help me solve this programming problem. Explain the approach before showing the code.' },
];

function elapsedLabel(milliseconds: number): string {
  const seconds = Math.max(0, milliseconds / 1000);
  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}

function formatModelLabel(model: ModelInfo): string {
  return model.name && model.name !== model.id ? model.name : `${model.provider} · ${model.id}`;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  elapsedMs,
  onStopStreaming,
  onToggleSidebar,
  selectedModel,
  onSelectModel,
  models,
  depth,
  onSelectDepth,
  selectedSourceTitle,
  onClearSelectedSource,
  onGenerateDocumentPdf,
}) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [activeMenu, setActiveMenu] = useState<'model' | 'mode' | 'pdf' | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | undefined>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfRequest, setPdfRequest] = useState('');
  const [pdfTitle, setPdfTitle] = useState('Study guide');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNotice, setPdfNotice] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  const stickRef = useRef(true);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => { stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120; };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !stickRef.current) return;
    const id = requestAnimationFrame(() => { node.scrollTop = node.scrollHeight; });
    return () => cancelAnimationFrame(id);
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAttachmentError('');
    setAttachment(null);

    if (file.type.startsWith('image/')) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type.toLowerCase())) {
        setAttachmentError('Choose a PNG, JPEG, WebP, or GIF image.');
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        setAttachmentError('Images must be 6 MB or smaller.');
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => setAttachmentError(`Could not read “${file.name}”.`);
      reader.onload = () => {
        if (typeof reader.result === 'string') setAttachment({ kind: 'image', name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
        else setAttachmentError(`Could not read “${file.name}”.`);
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      const { ingestSourceFile } = await import('../lib/sources/ingest');
      const source = await ingestSourceFile(file);
      setAttachment({ kind: 'source', name: file.name, type: file.type || source.contentType, size: file.size, source });
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'This file could not be extracted.');
    }
  };

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isStreaming || (!input.trim() && !attachment)) return;
    const prompt = input.trim() || (attachment?.kind === 'source'
      ? `Please analyze “${attachment.name}” and summarize its key ideas.`
      : `Please describe the image${attachment ? ` “${attachment.name}”` : ''}.`);
    const metadata = attachment ? { name: attachment.name, type: attachment.type, size: attachment.size } : undefined;
    onSendMessage(prompt, {
      depth,
      model: selectedModel,
      tool: selectedTool,
      source: attachment?.kind === 'source' ? attachment.source : undefined,
      imageBase64: attachment?.kind === 'image' ? attachment.dataUrl : undefined,
      mimeType: attachment?.kind === 'image' ? attachment.type : undefined,
      attachment: metadata,
    });
    setInput('');
    setAttachment(null);
    setAttachmentError('');
    setSelectedTool(undefined);
    setActiveMenu(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setPdfNotice('Clipboard access was blocked by the browser.');
      window.setTimeout(() => setPdfNotice(''), 3500);
    }
  };

  const exportMessage = async (message: ChatMessage) => {
    setExportingId(message.id);
    setPdfNotice('');
    try {
      const { createAndSaveDocumentPdf } = await import('../lib/pdf/documentPdf');
      const result = await createAndSaveDocumentPdf('VITRAX AI response', message.content);
      setPdfNotice(`Downloaded ${result.filename} · ${result.pageCount} page${result.pageCount === 1 ? '' : 's'}`);
    } catch (error) {
      setPdfNotice(error instanceof Error ? `PDF export failed: ${error.message}` : 'PDF export failed. No file was saved.');
    } finally {
      setExportingId(null);
      window.setTimeout(() => setPdfNotice(''), 5000);
    }
  };

  const createRequestedPdf = async () => {
    if (!onGenerateDocumentPdf || !pdfRequest.trim() || pdfBusy) return;
    setPdfBusy(true);
    setPdfNotice('');
    try {
      const result = await onGenerateDocumentPdf(pdfRequest.trim(), pdfTitle.trim() || 'Study guide');
      setPdfNotice(`Downloaded ${result.filename} · ${result.pageCount} page${result.pageCount === 1 ? '' : 's'}`);
      setPdfRequest('');
      setActiveMenu(null);
    } catch (error) {
      setPdfNotice(error instanceof Error ? error.message : 'The document could not be generated. No PDF was saved.');
    } finally {
      setPdfBusy(false);
    }
  };

  const onTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <main className="vitrax-chat flex min-w-0 flex-1 flex-col text-slate-100">
      <header className="chat-topbar flex h-[68px] flex-shrink-0 items-center justify-between px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onToggleSidebar} className="quiet-icon-button" title="Toggle navigation" aria-label="Toggle navigation">
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/60">Workspace</span>
              <span className="hidden sm:block h-1 w-1 rounded-full bg-violet-300/40" />
              <span className="truncate text-sm font-semibold text-slate-100">Conversation</span>
            </div>
            {selectedSourceTitle && (
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-violet-200/75">
                <FileText size={12} />
                <span className="truncate">Source active · {selectedSourceTitle}</span>
                {onClearSelectedSource && <button className="ml-1 opacity-70 hover:opacity-100" onClick={onClearSelectedSource} title="Detach source"><X size={12} /></button>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button onClick={() => setActiveMenu(activeMenu === 'model' ? null : 'model')} className="model-pill" aria-expanded={activeMenu === 'model'}>
              <span className="model-pulse" />
              <span className="max-w-[135px] truncate">{selectedModel === 'auto' ? 'Auto model' : models.find(model => model.id === selectedModel)?.name || selectedModel}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {activeMenu === 'model' && (
              <div className="floating-menu right-0 top-full z-30 mt-2 w-[min(340px,calc(100vw-32px))]">
                <button className={`menu-option ${selectedModel === 'auto' ? 'menu-option-active' : ''}`} onClick={() => { onSelectModel('auto'); setActiveMenu(null); }}>
                  <div><div className="font-medium">Auto selection</div><div className="menu-muted">Choose from models actually available to this project</div></div>
                  {selectedModel === 'auto' && <Check size={15} />}
                </button>
                {models.map(model => (
                  <button key={model.id} className={`menu-option ${selectedModel === model.id ? 'menu-option-active' : ''}`} onClick={() => { onSelectModel(model.id); setActiveMenu(null); }}>
                    <div><div className="font-medium">{formatModelLabel(model)}</div><div className="menu-muted">Live model ID · {model.id}</div></div>
                    {selectedModel === model.id && <Check size={15} />}
                  </button>
                ))}
                {models.length === 0 && <div className="px-3 py-3 text-xs text-slate-400">Model catalog unavailable. Check Settings for connection status.</div>}
              </div>
            )}
          </div>
          <span className={`hidden md:inline-flex items-center gap-1.5 text-[11px] ${models.length ? 'text-emerald-200/70' : 'text-amber-200/70'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${models.length ? 'bg-emerald-300' : 'bg-amber-300'}`} />
            {models.length ? 'Service connected' : 'AI unavailable'}
          </span>
        </div>
      </header>

      <section ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-7 sm:pt-8">
        {isEmpty ? (
          <div className="welcome-stage mx-auto flex min-h-full max-w-[920px] flex-col justify-center pb-5">
            <div className="welcome-heading flex items-center gap-4 sm:gap-6">
              <div className="vitrax-orb" aria-hidden="true"><span /><span /><span /></div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/55">
                  <Sparkles size={12} /> VITRAX Intelligence
                </div>
                <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.045em] text-white sm:text-[40px]">Think clearly.<br className="sm:hidden" /> Learn deeply.</h1>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">A focused workspace for conversation, source-based study, and making ideas useful.</p>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {STARTER_PROMPTS.map(item => (
                <button key={item.icon} onClick={() => { setInput(item.prompt); textareaRef.current?.focus(); }} className="prompt-card group text-left">
                  <span className="prompt-card-index">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-200 transition-colors group-hover:text-white">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{item.prompt}</span>
                  </span>
                  <ArrowDown className="mt-1 shrink-0 rotate-[-45deg] text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-violet-200" size={15} />
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="mr-1">Built for</span>
              <span className="welcome-tag">Careful answers</span><span className="welcome-tag">Your sources</span><span className="welcome-tag">Real exports</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[840px] space-y-7 pb-6">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const isLast = index === messages.length - 1;
              const isThinking = isStreaming && !isUser && isLast && !message.content;
              return (
                <article key={message.id} className={`message-row ${isUser ? 'message-row-user' : ''}`}>
                  {!isUser && <div className="assistant-mark" aria-label="VITRAX AI"><span>V</span></div>}
                  <div className={`message-body ${isUser ? 'message-body-user' : 'message-body-assistant'} ${message.error ? 'message-error' : ''}`}>
                    {isUser && message.attachments?.length ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {message.attachments.map((file, itemIndex) => <span className="message-attachment" key={`${message.id}-${itemIndex}`}><Paperclip size={12} />{file.name}</span>)}
                      </div>
                    ) : null}
                    {isThinking ? (
                      <div className="thinking-indicator"><span className="thinking-dots"><i /><i /><i /></span><span>Working with {elapsedLabel(elapsedMs)}</span></div>
                    ) : isUser ? (
                      <p className="whitespace-pre-wrap text-[14px] leading-7 text-slate-100">{message.content}</p>
                    ) : (
                      <>
                        {message.content && <Suspense fallback={<div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>}><SmoothMarkdown content={message.content} live={isStreaming && index === messages.length - 1} /></Suspense>}
                        {message.durationMs !== undefined && !isStreaming && (
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] tracking-wide text-slate-500"><Sparkles size={11} className="text-violet-300/80" />Answered in {elapsedLabel(message.durationMs)}</div>
                        )}
                        {message.content && !isStreaming && (
                          <div className="message-actions">
                            <button onClick={() => copyMessage(message)} title="Copy answer">{copiedId === message.id ? <Check size={14} /> : <span className="copy-symbol">Copy</span>}</button>
                            <button onClick={() => exportMessage(message)} title="Download answer as PDF" disabled={exportingId === message.id}>{exportingId === message.id ? <LoaderCircle size={14} className="animate-spin" /> : <span className="pdf-action-label"><Download size={13} />PDF</span>}</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
            <div className="h-3" />
          </div>
        )}
      </section>

      {pdfNotice && <div className="pdf-toast" role="status">{pdfNotice}</div>}

      <footer className="composer-dock flex-shrink-0 px-3 pb-3 pt-2 sm:px-7 sm:pb-6">
        <div className="mx-auto max-w-[840px]">
          {(attachment || attachmentError || selectedSourceTitle) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {attachment && (
                <div className="attachment-chip">
                  {attachment.kind === 'image' ? <ImagePlus size={13} /> : <FileText size={13} />}
                  <span className="max-w-[230px] truncate">{attachment.name}</span>
                  {attachment.kind === 'source' && <span className="text-emerald-200/70">text extracted</span>}
                  <button onClick={() => setAttachment(null)} title="Remove attachment"><X size={13} /></button>
                </div>
              )}
              {selectedSourceTitle && <div className="attachment-chip selected-source-chip"><FileText size={13} /><span className="max-w-[220px] truncate">Library source · {selectedSourceTitle}</span></div>}
              {attachmentError && <span className="text-xs text-rose-300">{attachmentError}</span>}
            </div>
          )}

          <form className="composer-panel" onSubmit={submit}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={onTextareaKeyDown}
              onInput={event => { const target = event.currentTarget; target.style.height = 'auto'; target.style.height = `${Math.min(target.scrollHeight, 180)}px`; }}
              placeholder={selectedSourceTitle ? `Ask about ${selectedSourceTitle}…` : 'Ask a question, explore an idea, or make something…'}
              className="composer-input"
              aria-label="Message VITRAX AI"
              maxLength={12000}
            />
            <div className="composer-controls">
              <div className="flex min-w-0 items-center gap-1.5">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.docx,.txt,.md,.markdown,.csv" className="hidden" onChange={handleFileChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="composer-icon" title="Attach an image or source file" aria-label="Attach file"><Plus size={17} /></button>
                <div className="relative">
                  <button type="button" onClick={() => setActiveMenu(activeMenu === 'mode' ? null : 'mode')} className="mode-pill" aria-expanded={activeMenu === 'mode'}>
                    <WandSparkles size={13} /><span>{MODES.find(mode => mode.id === depth)?.label || 'Balanced'}</span><ChevronDown size={12} />
                  </button>
                  {activeMenu === 'mode' && <div className="floating-menu bottom-full left-0 z-30 mb-2 w-64">{MODES.map(mode => <button key={mode.id} onClick={() => { onSelectDepth(mode.id); setActiveMenu(null); }} className={`menu-option ${depth === mode.id ? 'menu-option-active' : ''}`} type="button"><div><div className="font-medium">{mode.label}</div><div className="menu-muted">{mode.detail}</div></div>{depth === mode.id && <Check size={15} />}</button>)}</div>}
                </div>
                {onGenerateDocumentPdf && <button type="button" className="composer-secondary hidden sm:inline-flex" onClick={() => { setActiveMenu(activeMenu === 'pdf' ? null : 'pdf'); setPdfTitle('Study guide'); }}><FileText size={13} /><span>Create PDF</span></button>}
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-[10px] text-slate-600 sm:inline">Enter to send · Shift+Enter for a new line</span>
                {isStreaming ? (
                  <button type="button" onClick={onStopStreaming} className="send-button send-button-stop" aria-label="Stop generating" title="Stop generation"><CircleStop size={18} /></button>
                ) : (
                  <button type="submit" disabled={!input.trim() && !attachment} className="send-button" aria-label="Send message" title="Send message"><ArrowUp size={18} /></button>
                )}
              </div>
            </div>
          </form>

          {activeMenu === 'pdf' && onGenerateDocumentPdf && (
            <div className="pdf-request-panel mt-2">
              <div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-100">Create a document PDF</div><div className="mt-0.5 text-xs text-slate-500">Generated from a real model response, then downloaded as a PDF.</div></div><button onClick={() => setActiveMenu(null)} className="quiet-icon-button" aria-label="Close PDF form"><X size={16} /></button></div>
              <input value={pdfTitle} onChange={event => setPdfTitle(event.target.value)} placeholder="Document title" className="pdf-title-input mt-3" maxLength={120} />
              <textarea value={pdfRequest} onChange={event => setPdfRequest(event.target.value)} placeholder="Describe the document you want, its audience, length, sections, and tone…" className="pdf-request-input mt-2" rows={3} maxLength={1200} />
              <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-slate-500">{selectedSourceTitle ? `Will use selected source: ${selectedSourceTitle}` : 'No library source selected; the model will use your instructions.'}</span><button disabled={!pdfRequest.trim() || pdfBusy} onClick={createRequestedPdf} className="pdf-generate-button">{pdfBusy ? <><LoaderCircle size={14} className="animate-spin" />Generating…</> : <><Download size={14} />Generate & download</>}</button></div>
            </div>
          )}
        </div>
      </footer>
    </main>
  );
};
