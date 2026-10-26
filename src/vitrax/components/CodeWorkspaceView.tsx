// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import {
  Code2,
  Play,
  Save,
  FileCode,
  Folder,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Sparkles,
  CheckCircle2,
  Send,
  Menu,
  PanelLeft,
  PanelRight,
  X,
} from 'lucide-react';
import { CodeProject } from '../types';
import type { ModelInfo } from '../types';
import { Button } from '@/components/ui/button';

interface CodeWorkspaceViewProps {
  projects: CodeProject[];
  onUpdateProjects: (projects: CodeProject[]) => void;
  onToggleSidebar?: () => void;
  models: ModelInfo[];
}

export const CodeWorkspaceView: React.FC<CodeWorkspaceViewProps> = ({
  projects,
  onUpdateProjects,
  onToggleSidebar,
  models,
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0]?.id || '');
  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const [activeFile, setActiveFile] = useState<string>(currentProject?.activeFile || 'App.tsx');
  const [openTabs, setOpenTabs] = useState<string[]>([currentProject?.activeFile || 'App.tsx']);
  const [editorContent, setEditorContent] = useState<string>(currentProject?.files[activeFile] || '');
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>(typeof window !== 'undefined' && window.innerWidth < 900 ? 'editor' : 'split');
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const isWide = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const [explorerOpen, setExplorerOpen] = useState(isWide >= 768);
  const [assistantOpen, setAssistantOpen] = useState(isWide >= 1440);
  const isNarrow = () => typeof window !== 'undefined' && window.innerWidth < 768;
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  // AI-generated changes are local drafts; they are not written to the user's project directory.
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agent, setAgent] = useState<'claude' | 'codex'>('codex');
  const [agentModel, setAgentModel] = useState('auto');
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [agentLogs, setAgentLogs] = useState<{ role: 'user' | 'agent'; message: string; plan?: string; updatedFiles?: string[] }[]>([
    {
      role: 'agent',
      message: 'Ready for your coding request.',
    }
  ]);

  // Make sure there is always a project to work in.
  useEffect(() => {
    if (projects.length > 0) return;
    const starter = `export default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <main className="min-h-screen grid place-items-center p-8">\n      <div className="text-center space-y-4">\n        <h1 className="text-3xl font-bold">Hello from VITRAX</h1>\n        <p className="text-slate-400">Edit App.tsx or ask the Codex agent for a change.</p>\n        <button onClick={() => setCount(c => c + 1)} className="px-4 py-2 rounded-lg bg-teal-500 text-slate-950 font-semibold">Clicked {count} times</button>\n      </div>\n    </main>\n  );\n}\n`;
    const project: CodeProject = { id: `project-${crypto.randomUUID()}`, name: 'My first project', description: 'A browser-local code workspace.', activeFile: 'App.tsx', files: { 'App.tsx': starter }, updatedAt: Date.now() };
    onUpdateProjects([project]);
    setActiveProjectId(project.id);
  }, [projects.length]);

  // Keep the editor in sync when the active project changes or loads.
  useEffect(() => {
    if (!currentProject) return;
    const file = currentProject.files[activeFile] !== undefined ? activeFile : (currentProject.activeFile || Object.keys(currentProject.files)[0]);
    setActiveFile(file);
    setOpenTabs(tabs => (tabs.some(t => currentProject.files[t] !== undefined) ? tabs.filter(t => currentProject.files[t] !== undefined) : [file]));
    setEditorContent(currentProject.files[file] || '');
    setIsSaved(true);
  }, [currentProject?.id]);

  const handleCreateProject = () => {
    const projectName = window.prompt('Name your code workspace project:', 'Untitled project');
    if (!projectName?.trim()) return;
    const id = `project-${crypto.randomUUID()}`;
    const initialFile = `export default function App() {\n  const projectTitle = ${JSON.stringify(projectName.trim().slice(0, 80))};\n  return (\n    <main style={{ padding: 24, fontFamily: 'system-ui' }}>\n      <h1>{projectTitle}</h1>\n      <p>Your workspace is ready. Edit this file or ask VITRAX to draft a change.</p>\n    </main>\n  );\n}`;
    const project: CodeProject = { id, name: projectName.trim().slice(0, 80), description: 'A browser-local code workspace.', activeFile: 'App.tsx', files: { 'App.tsx': initialFile }, updatedAt: Date.now() };
    onUpdateProjects([...projects, project]);
    setActiveProjectId(id);
    setActiveFile('App.tsx');
    setOpenTabs(['App.tsx']);
    setEditorContent(initialFile);
    setIsSaved(true);
  };

  // Handle active file switch
  const handleSelectFile = (filename: string) => {
    if (currentProject && !isSaved) {
      handleSaveFile();
    }
    setActiveFile(filename);
    setOpenTabs(tabs => (tabs.includes(filename) ? tabs : [...tabs, filename]));
    setEditorContent(currentProject?.files[filename] || '');
    setIsSaved(true);
    if (isNarrow()) setExplorerOpen(false);
  };

  const handleCloseTab = (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(tabs => {
      const next = tabs.filter(t => t !== filename);
      if (filename === activeFile) {
        const fallback = next[next.length - 1] || Object.keys(currentProject?.files || {})[0] || '';
        if (fallback) {
          setActiveFile(fallback);
          setEditorContent(currentProject?.files[fallback] || '');
          setIsSaved(true);
        }
      }
      return next.length ? next : tabs;
    });
  };

  const handleEditorChange = (val: string) => {
    setEditorContent(val);
    setIsSaved(false);
  };

  const handleSaveFile = () => {
    if (!currentProject) return;
    const updatedFiles = { ...currentProject.files, [activeFile]: editorContent };
    const updatedProjects = projects.map(p =>
      p.id === currentProject.id ? { ...p, files: updatedFiles, updatedAt: Date.now() } : p
    );
    onUpdateProjects(updatedProjects);
    setIsSaved(true);
    setPreviewKey(k => k + 1);
  };

  // Ctrl/Cmd+S saves the active file, like VS Code.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const updateCursor = () => {
    const el = editorRef.current;
    if (!el) return;
    const upto = el.value.slice(0, el.selectionStart ?? 0);
    const line = upto.split('\n').length;
    const col = (el.selectionStart ?? 0) - upto.lastIndexOf('\n');
    setCursor({ line, col });
  };

  const syncGutterScroll = () => {
    if (gutterRef.current && editorRef.current) {
      gutterRef.current.scrollTop = editorRef.current.scrollTop;
    }
  };

  const handleCreateFile = () => {
    const filename = prompt('Enter new filename (e.g. components/TaskCard.tsx):');
    if (!filename || !currentProject) return;
    const updatedFiles = {
      ...currentProject.files,
      [filename]: `// ${filename}\nimport React from 'react';\n\nexport const ${filename.replace(/[^a-zA-Z0-9]/g, '')} = () => {\n  return <div>Component created</div>;\n};`,
    };
    const updated = projects.map(p =>
      p.id === currentProject.id ? { ...p, files: updatedFiles, activeFile: filename } : p
    );
    onUpdateProjects(updated);
    setActiveFile(filename);
    setOpenTabs(tabs => (tabs.includes(filename) ? tabs : [...tabs, filename]));
    setEditorContent(updatedFiles[filename]);
    setIsSaved(true);
  };

  const handleDeleteFile = (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject || Object.keys(currentProject.files).length <= 1) {
      alert('Cannot delete the only file in the project.');
      return;
    }
    if (!confirm(`Delete ${filename}?`)) return;

    const remainingFiles = { ...currentProject.files };
    delete remainingFiles[filename];

    const nextActive = Object.keys(remainingFiles)[0];
    const updated = projects.map(p =>
      p.id === currentProject.id ? { ...p, files: remainingFiles, activeFile: nextActive } : p
    );
    onUpdateProjects(updated);
    setOpenTabs(tabs => tabs.filter(t => remainingFiles[t]));
    setActiveFile(nextActive);
    setEditorContent(remainingFiles[nextActive]);
  };

  // AI Development Agent Submission
  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrompt.trim() || isAgentWorking || !currentProject) return;

    const userQuery = agentPrompt;
    setAgentPrompt('');
    setIsAgentWorking(true);

    setAgentLogs(prev => [...prev, { role: 'user', message: userQuery }]);

    try {
      const res = await fetch('/api/code/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userQuery,
          agent,
          model: agentModel,
          currentFiles: { ...currentProject.files, [activeFile]: editorContent },
          activeFile,
          history: agentLogs.slice(-8).map(l => ({ role: l.role, message: l.message })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `The model service returned HTTP ${res.status}.`);
      if (!data.updatedFiles || typeof data.updatedFiles !== 'object' || Array.isArray(data.updatedFiles)) throw new Error('The model did not return a usable set of file changes.');
      const proposedEntries = Object.entries(data.updatedFiles as Record<string, unknown>);
      const isSafePath = (filename: string) => filename.length > 0 && filename.length <= 180 && /^[A-Za-z0-9._/-]+$/.test(filename) && !filename.startsWith('/') && !filename.split('/').some(part => !part || part === '.' || part === '..');
      if (!proposedEntries.length || proposedEntries.length > 16 || proposedEntries.some(([name, content]) => !isSafePath(name) || typeof content !== 'string' || content.length > 50_000)) {
        throw new Error('The model returned an unsafe, oversized, or empty patch. No changes were applied.');
      }
      const updatedFiles = Object.fromEntries(proposedEntries as [string, string][]);
      const newFilesMap = { ...currentProject.files, ...updatedFiles };

      const updatedProjects = projects.map(p =>
        p.id === currentProject.id ? { ...p, files: newFilesMap, updatedAt: Date.now() } : p
      );
      onUpdateProjects(updatedProjects);

      if (updatedFiles[activeFile]) {
        setEditorContent(updatedFiles[activeFile]);
      }
      setOpenTabs(tabs => {
        const next = [...tabs];
        Object.keys(updatedFiles).forEach(name => { if (!next.includes(name)) next.push(name); });
        return next;
      });

      setAgentLogs(prev => [
        ...prev,
        {
          role: 'agent',
          message: data.summary || 'Project updated successfully.',
          model: data.model,
          agent: data.agent,
          plan: data.plan,
          updatedFiles: Object.keys(updatedFiles),
        }
      ]);
      setPreviewKey(k => k + 1);
    } catch (err: any) {
      console.error(err);
      setAgentLogs(prev => [
        ...prev,
        {
          role: 'agent',
          message: 'Could not apply the model response: ' + (err instanceof Error ? err.message : 'The request failed.'),
        }
      ]);
    } finally {
      setIsAgentWorking(false);
    }
  };

  // Build live sandbox iframe HTML
  const generatePreviewHtml = () => {
    if (!currentProject) return '';
    const appTsx = currentProject.files['App.tsx'] || 'export default function App() { return <div>No App.tsx</div>; }';

    const cleanAppCode = appTsx
      .replace(/import\s+React[^\n]*;/g, '')
      .replace(/import\s+{[^}]*}\s+from\s+['"][^'"]*['"];/g, '')
      .replace(/export\s+default\s+function\s+App\b/g, 'function App')
      .replace(/export\s+default\s+function\s*\(/g, 'function App(')
      .replace(/export\s+default\s+App\s*;?/g, '')
      .replace(/export\s+/g, '');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; background-color: #020617; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef } = React;

    const IconStub = () => <span style={{display:'inline-block', width:16, height:16, border:'1px solid #14b8a6', borderRadius:4, margin:'0 4px'}}></span>;
    const Calendar = IconStub;
    const CheckSquare = IconStub;
    const Clock = IconStub;
    const Plus = IconStub;
    const Trash2 = IconStub;
    const Award = IconStub;

    ${cleanAppCode}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
  };

  const handleExportSource = () => {
    if (!currentProject) return;
    const jsonStr = JSON.stringify(currentProject.files, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_source.json`;
    a.click();
  };

  const lineCount = editorContent.split('\n').length;
  const fileNames = currentProject ? Object.keys(currentProject.files) : [];
  const visibleTabs = openTabs.filter(name => fileNames.includes(name));

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Title Bar (VS Code style) */}
      <div className="h-12 border-b border-slate-800/80 px-3 sm:px-4 gap-3 flex items-center justify-between bg-slate-900/70 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Open menu" aria-label="Open menu">
              <Menu className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setExplorerOpen(o => !o)} className={`p-1.5 rounded-lg transition-colors ${explorerOpen ? 'text-teal-300 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Toggle file explorer" aria-label="Toggle file explorer">
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 ml-1 min-w-0">
            <Code2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span className="font-semibold text-xs sm:text-sm text-white truncate">{currentProject?.name || 'Code Project'}</span>
            <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 flex-shrink-0">
              Local draft
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {projects.length > 1 && (
            <select value={currentProject?.id} onChange={e => setActiveProjectId(e.target.value)} className="hidden md:block max-w-[140px] bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none" aria-label="Switch project">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button onClick={handleCreateProject} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-slate-800 text-slate-300 hover:text-white" title="Create a local code workspace"><Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New project</span></button>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            {(['editor', 'split', 'preview'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                  viewMode === mode ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={handleSaveFile}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !isSaved
                ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/20 hover:bg-teal-400'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Save (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
          <button
            onClick={handleExportSource}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Export project files"
          >
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setAssistantOpen(o => !o)} className={`p-1.5 rounded-lg transition-colors ${assistantOpen ? 'text-teal-300 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Toggle AI assistant" aria-label="Toggle AI assistant">
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main area: Explorer | Editor & Preview | AI Assistant */}
      <div className="relative flex-1 flex overflow-hidden">
        {(explorerOpen || assistantOpen) && <div className="md:hidden absolute inset-0 z-20 bg-black/50" onClick={() => { setExplorerOpen(false); setAssistantOpen(false); }} />}
        {/* Explorer */}
        {explorerOpen && (
          <div className="absolute md:relative inset-y-0 left-0 z-30 w-60 md:w-48 border-r border-slate-800/80 bg-slate-950 flex flex-col flex-shrink-0 shadow-2xl md:shadow-none">
            <div className="px-3 h-9 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-teal-400" />
                Explorer
              </span>
              <button
                onClick={handleCreateFile}
                className="p-1 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded transition-colors"
                title="Create new file"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
              {fileNames.map(filename => {
                const isActive = activeFile === filename;
                return (
                  <div
                    key={filename}
                    onClick={() => handleSelectFile(filename)}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-800/90 text-teal-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileCode className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                      <span className="truncate">{filename}</span>
                    </div>
                    <button
                      onClick={e => handleDeleteFile(filename, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity"
                      title="Delete file"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Editor & Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/30">
          {/* Tab Bar */}
          <div className="h-9 border-b border-slate-800 bg-slate-950 flex items-center px-1.5 gap-0.5 overflow-x-auto flex-shrink-0">
            {visibleTabs.map(name => {
              const isActive = name === activeFile;
              return (
                <div
                  key={name}
                  onClick={() => handleSelectFile(name)}
                  className={`group flex items-center gap-1.5 px-3 py-1 rounded-t-md text-xs font-mono cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 border-t-2 border-teal-400 text-teal-200'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
                  }`}
                >
                  <span>{name}</span>
                  {isActive && !isSaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {visibleTabs.length > 1 && (
                    <button
                      onClick={e => handleCloseTab(name, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-200"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Code Editor with line numbers */}
            {(viewMode === 'editor' || viewMode === 'split') && (
              <div className={`flex-1 flex bg-slate-950 min-w-0 ${viewMode === 'split' ? 'border-r border-slate-800' : ''}`}>
                <div
                  ref={gutterRef}
                  className="w-11 flex-shrink-0 overflow-hidden bg-slate-950 border-r border-slate-800/60 pt-4 pb-4 select-none"
                  aria-hidden="true"
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div
                      key={i}
                      className={`text-right pr-2.5 font-mono text-[11px] leading-relaxed ${i + 1 === cursor.line ? 'text-teal-300' : 'text-slate-600'}`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <textarea
                  ref={editorRef}
                  value={editorContent}
                  onChange={e => handleEditorChange(e.target.value)}
                  onKeyUp={updateCursor}
                  onClick={updateCursor}
                  onScroll={syncGutterScroll}
                  className="flex-1 p-4 bg-transparent font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed whitespace-pre overflow-auto selection:bg-teal-500/30"
                  spellCheck={false}
                  wrap="off"
                />
              </div>
            )}

            {/* Live Preview */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="flex-1 flex flex-col bg-slate-950 min-w-0">
                <div className="h-8 bg-slate-900/80 border-b border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Play className="w-3 h-3 text-teal-400" /> Preview
                  </span>
                  <button
                    onClick={() => setPreviewKey(k => k + 1)}
                    className="p-1 hover:text-slate-100 transition-colors"
                    title="Reload preview"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
                <iframe
                  key={previewKey}
                  srcDoc={generatePreviewHtml()}
                  sandbox="allow-scripts allow-modals"
                  title="App Sandbox Preview"
                  className="w-full flex-1 border-0 bg-slate-950"
                />
              </div>
            )}
          </div>

          {/* Status Bar (VS Code style) */}
          <div className="h-7 bg-slate-900 border-t border-slate-800 px-3 flex items-center justify-between text-[10px] font-mono text-slate-500 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-teal-400 truncate">{activeFile}</span>
              <span>{lineCount} lines</span>
              <span className="hidden xl:inline">Single-file browser preview · no package installs</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span>Ln {cursor.line}, Col {cursor.col}</span>
              <span className="hidden xl:inline">Ctrl+S to save</span>
              <span className={isSaved ? 'text-slate-500' : 'text-amber-400'}>{isSaved ? 'Saved' : 'Unsaved changes'}</span>
            </div>
          </div>
        </div>

        {/* AI Assistant */}
        {assistantOpen && (
          <div className="absolute lg:relative inset-y-0 right-0 z-30 w-full max-w-sm lg:w-96 border-l border-slate-800/80 bg-slate-950 flex flex-col flex-shrink-0 shadow-2xl lg:shadow-none">
            <div className="px-3 h-9 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-400" />
                {agent === 'claude' ? 'Claude' : 'Codex'} Agent
              </span>
              <span className="flex items-center gap-2"><span className="text-[10px] text-slate-500 font-mono">{isAgentWorking ? 'working…' : 'ready'}</span><button onClick={() => setAssistantOpen(false)} className="lg:hidden p-1 rounded text-slate-400 hover:text-white" aria-label="Close agent"><X className="w-3.5 h-3.5" /></button></span>
            </div>

            <div className="border-b border-border p-3 space-y-2">
              <div className="flex gap-2" role="group" aria-label="Coding agent">
                {(['codex', 'claude'] as const).map(choice => <Button key={choice} size="sm" variant={agent === choice ? 'default' : 'outline'} disabled={isAgentWorking} onClick={() => { setAgent(choice); setAgentModel('auto'); }} aria-pressed={agent === choice}>{choice === 'claude' ? 'Claude' : 'Codex'}</Button>)}
              </div>
              <select aria-label="Agent model" value={agentModel} onChange={e => setAgentModel(e.target.value)} disabled={isAgentWorking} className="w-full min-w-0 rounded-md border border-input bg-background text-foreground px-2 py-2 text-xs">
                <option value="auto">{agent === 'claude' ? 'Claude Sonnet 5' : 'GPT-6 Astra'} · default</option>
                {models.map(model => <option key={model.id} value={model.id}>{model.name} · {model.provider}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {agentLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs space-y-2 ${
                    log.role === 'user'
                      ? 'bg-teal-500/10 border border-teal-500/30 text-teal-200'
                      : 'bg-slate-900 border border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{log.role === 'user' ? 'YOU' : log.model || 'VITRAX AI'}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{log.message}</p>

                  {log.plan && (
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] text-teal-300">
                      <strong>Plan:</strong> {log.plan}
                    </div>
                  )}

                  {log.updatedFiles && log.updatedFiles.length > 0 && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-teal-400" />
                      <span>Updated: {log.updatedFiles.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
              {isAgentWorking && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-cyan-300 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{agent === 'claude' ? 'Claude' : 'Codex'} is preparing changes…</span>
                </div>
              )}
            </div>

            <form onSubmit={handleRunAgent} className="p-3 border-t border-slate-800/80 bg-slate-900/50">
              <div className="flex gap-1.5 mb-2 overflow-x-auto text-[10px] text-slate-400 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setAgentPrompt('Improve the active App.tsx with a responsive header and clear empty state')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-md whitespace-nowrap"
                >
                  + Responsive header
                </button>
                <button
                  type="button"
                  onClick={() => setAgentPrompt('Refactor the active App.tsx for clearer component structure and accessible controls')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-md whitespace-nowrap"
                >
                  + Refactor component
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-teal-500">
                <input
                  type="text"
                  aria-label="Coding request"
                  placeholder="Describe a feature, refactor, or bug to fix..."
                  value={agentPrompt}
                  onChange={e => setAgentPrompt(e.target.value)}
                  disabled={isAgentWorking}
                  className="flex-1 bg-transparent px-2 text-xs text-white focus:outline-none placeholder-slate-500"
                />
                <Button
                  type="submit"
                  aria-label="Send coding request"
                  disabled={!agentPrompt.trim() || isAgentWorking}
                  size="icon"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
