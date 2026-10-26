import { describe, expect, it } from 'vitest';
import { resolveCodeAgent } from '../server/ai/agent';
import { buildRegistry } from '../server/ai/registry';
import { createRouter } from '../server/ai/router';
import { AiError, classifyHttp, isFallbackEligible } from '../server/ai/errors';

describe('coding agent routing', () => {
  it('routes Claude to Claude Sonnet 5', () => {
    expect(resolveCodeAgent('claude', 'auto').preferredModel).toBe('lovable:anthropic/claude-sonnet-5');
  });
  it('routes Codex to OpenAI', () => {
    expect(resolveCodeAgent('codex', 'auto').preferredModel).toBe('lovable:openai/gpt-6-astra');
  });
  it('honors configured model overrides for either agent', () => {
    expect(resolveCodeAgent('claude', 'groq:configured').preferredModel).toBe('groq:configured');
  });
  it('never silently changes an unavailable selected model', async () => {
    const router = createRouter({ registry: () => buildRegistry({ LOVABLE_API_KEY: 'test-only' }), env: {} });
    await expect(router.complete({ task: 'code', preferredModel: 'missing', messages: [{ role: 'user', content: 'Add a heading' }] })).rejects.toThrow('selected model is unavailable');
  });
  it('does not retry or fallback on refusals or access errors', () => {
    for (const kind of ['permission', 'quota', 'auth', 'refusal'] as const) expect(isFallbackEligible(kind)).toBe(false);
  });
  it('preserves credit-related 403 status and safe reason', () => {
    const error = classifyHttp(403, '{"message":"Workspace credit limit reached"}');
    expect(error.status).toBe(403);
    expect(error.message).toBe('Workspace credit limit reached');
  });
});