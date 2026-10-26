// @ts-nocheck
import React, { useState } from 'react';
import { X, Play, Code2, ExternalLink, RefreshCw, Copy, Check } from 'lucide-react';

interface CodeSandboxModalProps {
  code: string;
  language: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CodeSandboxModal: React.FC<CodeSandboxModalProps> = ({
  code,
  language,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [iframeKey, setIframeKey] = useState(0);

  if (!isOpen) return null;

  const isWebCode = ['html', 'javascript', 'js', 'xml', 'svg'].includes(language.toLowerCase()) || 
                    code.includes('<!DOCTYPE html>') || 
                    code.includes('<html') || 
                    code.includes('<div');

  const wrappedHtml = isWebCode
    ? code.includes('<!DOCTYPE html>') || code.includes('<html')
      ? code
      : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 1.5rem; background: #0f172a; color: #f8fafc; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`
    : `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: ui-monospace, monospace; padding: 2rem; background: #0f172a; color: #38bdf8; }
    pre { white-space: pre-wrap; font-size: 14px; }
  </style>
</head>
<body>
  <div style="color: #94a3b8; font-size: 12px; margin-bottom: 12px;">// Execution Output (${language.toUpperCase()} Sandbox)</div>
  <pre>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-teal-400" />
              VITRAX Interactive Code Sandbox
              <span className="text-xs font-mono uppercase bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded border border-teal-500/20">
                {language || 'code'}
              </span>
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                Live Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'code'
                    ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Source
              </button>
            </div>

            {activeTab === 'preview' && (
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                title="Reload Preview"
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Copy Code"
            >
              {copied ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Close Sandbox"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden">
          {activeTab === 'preview' ? (
            <iframe
              key={iframeKey}
              srcDoc={wrappedHtml}
              sandbox="allow-scripts allow-modals"
              title="Code Preview"
              className="w-full h-full border-0 bg-slate-950"
            />
          ) : (
            <pre className="p-6 text-sm font-mono text-slate-300 overflow-auto h-full selection:bg-teal-500/30">
              <code>{code}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
