// @ts-nocheck
// Structured-output parsing and validation for study packs, plus large-source condensation.
import { AiError } from './errors';

export const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function parseJsonObject(text: string): Record<string, unknown> {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  if (first < 0 || last <= first) throw new AiError('malformed', 'No JSON object in output.');
  try {
    const parsed = JSON.parse(stripped.slice(first, last + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new AiError('malformed', 'Invalid JSON in output.');
  }
}

export interface Flashcard { id: string; topic: string; front: string; back: string; hint?: string; difficulty: string; sourceRef?: string }
export interface QuizQuestion { id: string; question: string; options: string[]; correctIndex: number; explanation: string; hint?: string; sourceRef?: string }

/** Validate and de-duplicate model output. Requires at least `minRatio` of the requested items. */
export function normalizeStudyPack(raw: Record<string, unknown>, opts: { cardCount: number; quizCount: number; topic: string; minRatio?: number }) {
  const seenF = new Set<string>();
  const flashcards: Flashcard[] = (Array.isArray(raw.flashcards) ? raw.flashcards : []).flatMap((item: any) => {
    if (!item || typeof item !== 'object') return [];
    const front = clean(item.front, 700), back = clean(item.back, 1800);
    if (!front || !back || seenF.has(norm(front))) return [];
    seenF.add(norm(front));
    return [{ id: '', topic: clean(item.topic, 120) || opts.topic || 'Key concept', front, back, hint: clean(item.hint, 300) || undefined,
      difficulty: ['Easy', 'Medium', 'Hard'].includes(String(item.difficulty)) ? String(item.difficulty) : 'Medium', sourceRef: clean(item.sourceRef, 240) || undefined }];
  }).slice(0, opts.cardCount).map((c, i) => ({ ...c, id: `card-${i + 1}` }));

  const seenQ = new Set<string>();
  const quiz: QuizQuestion[] = (Array.isArray(raw.quiz) ? raw.quiz : []).flatMap((item: any) => {
    if (!item || typeof item !== 'object') return [];
    const question = clean(item.question, 900);
    const options = Array.isArray(item.options) ? item.options.slice(0, 6).map((o: unknown) => clean(o, 500)) : [];
    const correctIndex = Number(item.correctIndex);
    const explanation = clean(item.explanation, 1600);
    if (!question || seenQ.has(norm(question)) || options.length < 2 || options.some((o: string) => !o)) return [];
    if (new Set(options.map(norm)).size !== options.length) return [];
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length || !explanation) return [];
    seenQ.add(norm(question));
    return [{ id: '', question, options, correctIndex, explanation, hint: clean(item.hint, 300) || undefined, sourceRef: clean(item.sourceRef, 240) || undefined }];
  }).slice(0, opts.quizCount).map((q, i) => ({ ...q, id: `q-${i + 1}` }));

  const ratio = opts.minRatio ?? 0.8;
  if (flashcards.length < Math.ceil(opts.cardCount * ratio) || quiz.length < Math.ceil(opts.quizCount * ratio)) {
    throw new AiError('malformed', `Only ${flashcards.length}/${opts.cardCount} cards and ${quiz.length}/${opts.quizCount} questions were valid.`);
  }
  const keyFormulas = (Array.isArray(raw.keyFormulas) ? raw.keyFormulas.slice(0, 24) : []).flatMap((f: any) => {
    const name = clean(f?.name, 160), formula = clean(f?.formula, 400), meaning = clean(f?.meaning, 900);
    return name && formula && meaning ? [{ name, formula, meaning }] : [];
  });
  return { title: clean(raw.title, 180), summary: clean(raw.summary, 1200), flashcards, quiz, keyFormulas };
}

/**
 * Fit a long source into `budget` characters by taking evenly spaced, paragraph-aligned
 * chunks across the whole document (keeps page labels), instead of only the first pages.
 */
export function condenseSource(text: string, budget = 24_000, chunk = 1_500): { text: string; condensed: boolean } {
  if (text.length <= budget) return { text, condensed: false };
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += chunk) parts.push(text.slice(i, i + chunk));
  const take = Math.max(1, Math.floor(budget / (chunk + 20)));
  const step = parts.length / take;
  const picked: string[] = [];
  for (let k = 0; k < take; k++) picked.push(parts[Math.floor(k * step)]);
  return { text: picked.join('\n[…]\n'), condensed: true };
}
