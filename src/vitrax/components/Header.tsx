// @ts-nocheck
import React from 'react';
import { 
  Cpu, 
  MessageSquare, 
  Layers, 
  FileText, 
  Printer, 
  BookOpen, 
  HelpCircle, 
  Compass, 
  Server, 
  Zap, 
  PlusCircle,
  Sparkles,
  Activity
} from 'lucide-react';

export type ActiveTab = 
  | 'chat'
  | 'deep_analysis'
  | 'document_studio'
  | 'pdf_studio'
  | 'flashcards'
  | 'quiz'
  | 'research'
  | 'model_hub';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewChat: () => void;
  selectedModelName: string;
  totalTokensCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewChat,
  selectedModelName,
  totalTokensCount,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'chat', label: 'Chat & Canvas', icon: MessageSquare },
    { id: 'deep_analysis', label: 'Deep Analysis', icon: Layers },
    { id: 'document_studio', label: 'Document Studio', icon: FileText },
    { id: 'pdf_studio', label: 'PDF Studio', icon: Printer },
    { id: 'flashcards', label: 'Flashcard Studio', icon: BookOpen },
    { id: 'quiz', label: 'Quiz Lab', icon: HelpCircle },
    { id: 'research', label: 'Deep Research', icon: Compass },
    { id: 'model_hub', label: 'Model Hub', icon: Server },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 transition-all">
      {/* Top telemetry and Brand Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('chat')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-teal-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full border-2 border-slate-950 shadow-sm shadow-teal-400/80" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight text-white flex items-center">
                VITRAX<span className="text-teal-400 ml-1">AI</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                FRONTIER 6.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multi-Model Intelligence & Learning Studio
            </p>
          </div>
        </div>

        {/* Live Compute Telemetry Bar */}
        <div className="hidden md:flex items-center space-x-3 bg-slate-900/80 border border-slate-800 rounded-full px-3.5 py-1.5 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">Engine:</span>
            <span className="font-semibold text-slate-200 truncate max-w-[140px]">{selectedModelName}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Context:</span>
            <span className="font-mono text-teal-300">1.05M tokens</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Processed:</span>
            <span className="font-mono text-cyan-300">{(totalTokensCount + 1420).toLocaleString()} tok</span>
          </div>
        </div>

        {/* Right CTA buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onNewChat}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 active:scale-95 transition-all"
            title="Start new frontier reasoning session"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* Primary Workspace Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto pb-2 pt-1 scrollbar-none text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-teal-300 shadow-sm border border-teal-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.id === 'deep_analysis' && (
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full border border-indigo-500/30">
                    4-Stage
                  </span>
                )}
                {item.id === 'pdf_studio' && (
                  <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded-full border border-teal-500/30">
                    PDF
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
