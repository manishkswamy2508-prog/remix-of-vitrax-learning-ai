// @ts-nocheck
import React, { useState } from 'react';
import { 
  Layers, 
  Play, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  FileCheck, 
  Printer, 
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { OrchestrationStage } from '../types';

interface DeepAnalysisViewProps {
  onExportToPDF?: (title: string, content: string) => void;
}

export const DeepAnalysisView: React.FC<DeepAnalysisViewProps> = ({ onExportToPDF }) => {
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('Quantum Physics & Mechanics');
  const [isRunning, setIsRunning] = useState(false);
  const [stages, setStages] = useState<OrchestrationStage[]>([]);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleProblems = [
    {
      title: 'Quantum Tunneling Transmission Coefficient',
      query: 'Derive the transmission coefficient T for an electron of energy E incident on a rectangular potential barrier of height V_0 (E < V_0) and width 2a. Solve the 1D Schrödinger equation in all three regions, apply boundary continuity for psi and d(psi)/dx, and prove that T ~ 16(E/V_0)(1 - E/V_0) e^(-2 kappa a).',
      subject: 'Quantum Physics & Mechanics',
    },
    {
      title: 'Navier-Stokes Boundary Layer & Blasius Equation',
      query: 'Derive the Blasius similarity equation f\'\'\' + (1/2) f f\'\' = 0 for laminar boundary layer flow over a flat plate with zero pressure gradient. State the Prandtl boundary-layer assumptions, define similarity variable eta, and outline the Runge-Kutta numerical shooting method.',
      subject: 'Fluid Dynamics & Aerospace',
    },
    {
      title: 'Distributed Paxos vs Raft Consensus',
      query: 'Formulate a formal proof of safety and liveness invariants for the Raft consensus protocol. Prove that the Leader Completeness property strictly prevents uncommitted log entries from being overwritten across network partitions.',
      subject: 'Distributed Systems & Algorithms',
    },
  ];

  const handleRunOrchestration = async () => {
    if (!prompt.trim() || isRunning) return;

    setIsRunning(true);
    setErrorMsg(null);
    setFinalAnswer(null);

    // Set initial running state
    setStages([
      { name: 'Hosted model analysis', status: 'running' },
    ]);
    setActiveStageIdx(0);

    try {
      const res = await fetch('/api/ai/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, subject }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'The hosted model analysis failed.');
      }

      const result = await res.json();
      setStages(result.stages || []);
      setFinalAnswer(result.finalAnswer || '');
      setActiveStageIdx(Math.max(0, (result.stages || []).length - 1));
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Hosted model analysis failed.';
      setErrorMsg(message);
      setStages([{ name: 'Hosted model analysis', status: 'failed', content: message }]);
      setActiveStageIdx(0);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Hosted Model Analysis</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              VITRAX Deep Analysis Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Ask for a thorough single-model analysis of a technical problem. The app reports the actual response and does not claim independent multi-agent verification.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>One model request</span>
            </span>
          </div>
        </div>
      </div>

      {/* Input & Problem Selection */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-300 font-semibold">Sample prompts:</span>
          <div className="flex flex-wrap gap-2">
            {sampleProblems.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(sp.query);
                  setSubject(sp.subject);
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-300 border border-slate-700 text-xs transition-colors"
              >
                {sp.title}
              </button>
            ))}
          </div>
        </div>

        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Enter a problem or technical question for a hosted model analysis..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Target Domain:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-teal-300 text-xs font-semibold focus:outline-none focus:border-teal-400"
            />
          </div>

          <button
            onClick={handleRunOrchestration}
            disabled={!prompt.trim() || isRunning}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
              prompt.trim() && !isRunning
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-teal-500/20 hover:from-teal-400 hover:to-cyan-400 active:scale-95'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Waiting for model response...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Deep Analysis</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Visual 4-Stage Pipeline Progress Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stages.map((stage, idx) => {
          const isActive = activeStageIdx === idx;
          const isDone = stage.status === 'completed';
          const isCurrentRunning = stage.status === 'running';

          return (
            <button
              key={idx}
              onClick={() => setActiveStageIdx(idx)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isActive
                  ? 'bg-slate-800 border-teal-500 shadow-lg shadow-teal-500/10'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Result 0{idx + 1}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                ) : isCurrentRunning ? (
                  <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <h4 className="font-semibold text-xs text-slate-200 line-clamp-2">
                {stage.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                {isDone ? (
                  <span className="text-teal-400 font-medium">Model response completed</span>
                ) : isCurrentRunning ? (
                  <span className="text-cyan-400 font-medium">Reasoning...</span>
                ) : (
                  <span>Awaiting Execution</span>
                )}
              </p>
            </button>
          );
        })}
      </div>

      {/* Stage Detail Inspector Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="font-display font-bold text-base text-white">
              {stages[activeStageIdx]?.name || 'Analysis Response'}
            </h3>
          </div>

          {stages[activeStageIdx]?.content && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(stages[activeStageIdx]?.content || '');
              }}
              className="text-xs text-slate-400 hover:text-teal-300 transition-colors"
            >
              Copy Stage Output
            </button>
          )}
        </div>

        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800/80 min-h-[220px] max-h-[500px] overflow-y-auto">
          {stages[activeStageIdx]?.content ? (
            <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-slate-200 leading-relaxed selection:bg-teal-500/30">
              {stages[activeStageIdx]?.content}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
              <Sparkles className="w-8 h-8 mb-2 opacity-30" />
              <span>Run one hosted model request to generate a response. It is not an independent verification report.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
