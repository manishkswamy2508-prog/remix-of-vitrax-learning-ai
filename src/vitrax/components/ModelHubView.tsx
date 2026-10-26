// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Cpu, RefreshCw, Server, CheckCircle2, AlertCircle, CircleHelp, ArrowUpRight } from 'lucide-react';
import type { ModelInfo } from '../types';

interface ModelHubViewProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export const ModelHubView: React.FC<ModelHubViewProps> = ({ selectedModel, onSelectModel }) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [status, setStatus] = useState<'loading' | 'online' | 'unavailable'>('loading');
  const [error, setError] = useState('');

  const refresh = async () => {
    setStatus('loading');
    setError('');
    try {
      const response = await fetch('/api/ai/status');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(payload.models)) throw new Error(payload.error || `Model catalog returned HTTP ${response.status}.`);
      setModels(payload.models);
      setStatus(payload.models.length ? 'online' : 'unavailable');
    } catch (failure) {
      setModels([]);
      setStatus('unavailable');
      setError(failure instanceof Error ? failure.message : 'The live model catalog could not be loaded.');
    }
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <main className="workspace-page model-hub-page">
      <div className="workspace-heading">
        <div><div className="eyebrow"><Server size={14} /> Model access</div><h1 className="workspace-title">Models available to this project.</h1><p className="workspace-description">This list comes from the live managed model catalog. It reports model IDs—not invented GPU capacity, parameter counts, latency, or accuracy scores.</p></div>
        <button className="secondary-action" onClick={() => void refresh()} disabled={status === 'loading'}>{status === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}Refresh catalog</button>
      </div>

      <div className={`catalog-status ${status}`}>
        {status === 'online' ? <CheckCircle2 size={16} /> : status === 'loading' ? <RefreshCw size={15} className="animate-spin" /> : <AlertCircle size={15} />}
        <span>{status === 'online' ? `${models.length} model${models.length === 1 ? '' : 's'} currently listed by the managed service.` : status === 'loading' ? 'Checking the managed service catalog…' : error || 'The model service is currently unavailable.'}</span>
      </div>

      {models.length > 0 ? <section className="model-catalog-grid">{models.map(model => <article key={model.id} className={`model-catalog-card ${selectedModel === model.id ? 'model-catalog-active' : ''}`}>
        <div className="model-catalog-top"><span className="model-catalog-icon"><Cpu size={17} /></span><span className="format-badge">{model.provider}</span>{selectedModel === model.id && <span className="selected-model-label">Selected</span>}</div>
        <h2>{model.id}</h2><p>This identifier is present in the live model catalog for this project. Actual availability may change with service configuration.</p>
        <div className="model-catalog-meta"><span>Catalog entry</span><code>{model.id}</code></div>
        <button className="secondary-action" disabled={selectedModel === model.id} onClick={() => onSelectModel(model.id)}>{selectedModel === model.id ? 'Current model' : 'Use this model'}<ArrowUpRight size={13} /></button>
      </article>)}</section> : status !== 'loading' ? <div className="empty-library"><div className="empty-library-icon"><CircleHelp size={20} /></div><h2>No model entries available</h2><p>VITRAX will not generate a substitute response while the actual model service is unavailable.</p></div> : null}
      <p className="model-catalog-note">A model’s presence in this catalog does not guarantee a particular response quality, performance level, or unlimited usage. Quick, Balanced, Deep Analysis, and Auto change the actual request behavior; Auto may select from the listed models.</p>
    </main>
  );
};
