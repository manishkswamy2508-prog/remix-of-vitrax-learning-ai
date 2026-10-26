import { AiError } from './errors';

export type CodeAgent = 'claude' | 'codex';
export const AGENT_DEFAULTS = {
  claude: 'lovable:anthropic/claude-sonnet-5',
  codex: 'lovable:openai/gpt-6-astra',
};

export function resolveCodeAgent(agent: unknown, model: unknown) {
  if (agent !== undefined && agent !== 'claude' && agent !== 'codex') {
    throw new AiError('invalid_request', 'Choose Claude or Codex.');
  }
  const choice: CodeAgent = agent === 'claude' ? 'claude' : 'codex';
  return { agent: choice, preferredModel: typeof model === 'string' && model !== 'auto' && model ? model : AGENT_DEFAULTS[choice] };
}

export function codePatchSchema(files: Record<string, unknown>) {
  // Strict output cannot contain an arbitrary-key map: normalize a bounded array after generation.
  return {
    type: 'object', additionalProperties: false,
    properties: {
      plan: { type: 'string' }, summary: { type: 'string' },
      files: { type: 'array', items: { type: 'object', additionalProperties: false,
        properties: { name: { type: 'string' }, content: { type: 'string' } }, required: ['name', 'content'] } },
    }, required: ['plan', 'summary', 'files'],
  };
}