// @ts-nocheck
import React from 'react';
import { X, Settings, Cpu, ShieldCheck, Trash2, Server, LoaderCircle, AlertCircle, Check } from 'lucide-react';
import type { ModelInfo, ResponseDepth } from '../types';

type ConnectionStatus = 'loading' | 'online' | 'unavailable';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  depth: ResponseDepth;
  onSelectDepth: (depth: ResponseDepth) => void;
  onClearAllData: () => void;
  availableModels: ModelInfo[];
  connectionStatus: ConnectionStatus;
}

const modes: { id: ResponseDepth; label: string; description: string }[] = [
  { id: 'auto', label: 'Auto', description: 'Select an available model using the prompt and live catalog.' },
  { id: 'quick', label: 'Quick', description: 'Shorter output budget; Auto may choose a lighter available model.' },
  { id: 'balanced', label: 'Balanced', description: 'Standard response budget; Auto prefers a Sonnet-tier model when listed.' },
  { id: 'deep', label: 'Deep Analysis', description: 'Larger output budget and a more thorough prompt; Auto prefers an Opus tier when listed. No multi-agent verification is claimed.' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  depth,
  onSelectDepth,
  onClearAllData,
  availableModels,
  connectionStatus,
}) => {
  if (!isOpen) return null;
  const statusText = connectionStatus === 'online' ? `${availableModels.length} live models` : connectionStatus === 'loading' ? 'Checking model service' : 'Model service unavailable';

  return (
    <div className="settings-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-header"><div className="flex items-center gap-2.5"><span className="settings-icon"><Settings size={17} /></span><div><h2 id="settings-title">Settings</h2><p>Model access and local data</p></div></div><button onClick={onClose} className="quiet-icon-button" aria-label="Close settings"><X size={17} /></button></header>
        <div className="settings-content">
          <section className="settings-section">
            <div className="settings-section-heading"><Cpu size={15} /><span>Model selection</span></div>
            <div className="model-choice-list">
              <button onClick={() => onSelectModel('auto')} className={`model-choice ${selectedModel === 'auto' ? 'model-choice-active' : ''}`}>
                <span className="model-choice-radio">{selectedModel === 'auto' && <Check size={12} />}</span><span><strong>Auto selection</strong><small>Let VITRAX choose from models currently available to this project.</small></span>
              </button>
              {availableModels.map(model => <button key={model.id} onClick={() => onSelectModel(model.id)} className={`model-choice ${selectedModel === model.id ? 'model-choice-active' : ''}`}>
                <span className="model-choice-radio">{selectedModel === model.id && <Check size={12} />}</span><span><strong>{model.provider} · {model.id}</strong><small>Live model identifier returned by the managed catalog.</small></span>
              </button>)}
              {availableModels.length === 0 && <p className="settings-muted">No model IDs are available while the model service is offline.</p>}
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-heading"><SparklesIcon /><span>Default response mode</span></div>
            <div className="mode-choice-grid">{modes.map(mode => <button key={mode.id} onClick={() => onSelectDepth(mode.id)} className={`mode-choice ${depth === mode.id ? 'mode-choice-active' : ''}`}><strong>{mode.label}</strong><small>{mode.description}</small></button>)}</div>
          </section>

          <section className="connection-card">
            <div className="flex items-center justify-between gap-3"><div className="settings-section-heading mb-0"><Server size={15} /><span>AI connection</span></div><span className={`connection-badge ${connectionStatus}`}>{connectionStatus === 'loading' ? <LoaderCircle size={11} className="animate-spin" /> : connectionStatus === 'online' ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}{statusText}</span></div>
            <p>Requests are made through the server-side managed AI gateway. Provider credentials are not sent to the browser. If the service is unavailable, responses are not simulated.</p>
          </section>

          <section className="storage-card"><div className="settings-section-heading"><ShieldCheck size={15} /><span>Browser-local data</span></div><p>Conversations, uploaded source text, projects, and study progress are saved in this browser’s local storage. The source library caps extracted text at 800,000 characters and is not synced across devices. Source text is sent to the model only when you ask it to analyze that source.</p></section>

          <section className="settings-danger"><h3>Clear local data</h3><p>Remove VITRAX conversations, projects, sources, study packs, and review state from this browser.</p><button onClick={() => { if (window.confirm('Clear all VITRAX conversations, projects, source files, study packs, and review state from this browser?')) { onClearAllData(); onClose(); } }}><Trash2 size={14} />Clear VITRAX data</button></section>
        </div>
      </section>
    </div>
  );
};

function SparklesIcon() {
  return <span className="settings-sparkle" aria-hidden="true">✧</span>;
}
