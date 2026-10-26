import React from 'react';
import { FileText, Menu } from 'lucide-react';

interface StudyTopBarProps {
  title: string;
  onToggleSidebar?: () => void;
  sourceTitle?: string;
  onOpenLibrary?: () => void;
  progressLabel: string;
  progress: number; // 0..1
}

/** NotebookLM-style sticky header: menu, source chip and a thin progress bar. */
export const StudyTopBar: React.FC<StudyTopBarProps> = ({ title, onToggleSidebar, sourceTitle, onOpenLibrary, progressLabel, progress }) => {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <div className="sticky top-0 z-20 border-b border-white/5 bg-[rgba(11,10,18,0.82)] backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {onToggleSidebar && (
          <button onClick={onToggleSidebar} className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors" aria-label="Open menu" title="Open menu">
            <Menu className="w-4 h-4" />
          </button>
        )}
        <span className="font-semibold text-sm text-white whitespace-nowrap">{title}</span>
        {sourceTitle && (
          <button
            onClick={onOpenLibrary}
            className="min-w-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-300/20 bg-violet-400/10 text-violet-100 text-[11px] font-medium hover:bg-violet-400/20 transition-colors"
            title={`Source: ${sourceTitle}`}
          >
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[160px] sm:max-w-[280px]">{sourceTitle}</span>
          </button>
        )}
        <span className="ml-auto hidden sm:inline text-[11px] text-slate-400 whitespace-nowrap">{progressLabel}</span>
        <span className="ml-auto sm:ml-0 text-[11px] font-mono text-violet-200">{pct}%</span>
      </div>
      <div className="h-[3px] w-full bg-white/5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={progressLabel}>
        <div className="h-full bg-gradient-to-r from-violet-400 to-teal-300 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
