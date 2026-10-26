// @ts-nocheck
// Conversation context budgeting: keep recent turns verbatim, condense older ones.
import type { ChatMessage } from './types';

export interface Turn { role: 'user' | 'assistant'; content: string }

/**
 * Fit history into `budgetChars`. The latest turns are kept intact; older turns are condensed
 * into a single note (first sentence of each) so long conversations keep their thread without
 * an extra model call.
 */
export function fitHistory(turns: Turn[], budgetChars = 60_000): { messages: ChatMessage[]; condensed: number } {
  const kept: Turn[] = [];
  let used = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const len = turns[i].content.length;
    if (kept.length >= 2 && used + len > budgetChars) break;
    kept.unshift(turns[i]); used += len;
  }
  const older = turns.slice(0, turns.length - kept.length);
  if (!older.length) return { messages: kept, condensed: 0 };
  const summary = older.map(t => `- ${t.role === 'user' ? 'User asked' : 'Assistant said'}: ${t.content.replace(/\s+/g, ' ').slice(0, 220)}`).join('\n').slice(0, Math.max(2000, budgetChars * 0.15));
  const note: ChatMessage = { role: 'user', content: `[Earlier conversation, condensed]\n${summary}` };
  const ack: ChatMessage = { role: 'assistant', content: 'Understood, I will keep that earlier context in mind.' };
  return { messages: [note, ack, ...kept], condensed: older.length };
}
