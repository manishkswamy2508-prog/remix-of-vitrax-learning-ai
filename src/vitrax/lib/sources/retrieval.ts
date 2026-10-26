// @ts-nocheck
import type { IngestedSource, SourcePageRecord } from './ingest';

export interface SourceReference {
  title: string;
  sourceIndex: number;
  pageNumber?: number;
}

export interface RetrievalChunk {
  id: string;
  text: string;
  source: SourceReference;
  score: number;
}

export interface RetrievalOptions {
  /** Desired chunk length in characters; clamped to 200–2,000. */
  chunkSize?: number;
  /** Overlap in characters; clamped below the selected chunk size. */
  overlap?: number;
  /** Result count; clamped to 1–20. Defaults to 5. */
  topK?: number;
}

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 120;
const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function termsOf(value: string): string[] {
  return [...new Set(normalizeText(value).split(/\s+/).filter(Boolean))];
}

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, Math.floor(value as number))) : fallback;
}

function splitPageText(text: string, maxLength: number, overlap: number): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxLength, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf(' ', end);
      // Avoid tiny chunks when a long token has no nearby whitespace.
      if (boundary > start + Math.floor(maxLength * 0.55)) end = boundary;
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    const nextStart = Math.max(start + 1, end - overlap);
    const whitespace = normalized.indexOf(' ', nextStart);
    start = whitespace !== -1 && whitespace < end ? whitespace + 1 : nextStart;
  }
  return chunks;
}

function sourcePages(source: IngestedSource): SourcePageRecord[] {
  if (Array.isArray(source.pages) && source.pages.length > 0) return source.pages;
  return [{ pageNumber: 0, content: source.content }];
}

/** Split one or more ingested sources into overlapping chunks retaining source/page references. */
export function chunkSources(sources: readonly IngestedSource[], options: RetrievalOptions = {}): RetrievalChunk[] {
  const chunkSize = boundedInteger(options.chunkSize, DEFAULT_CHUNK_SIZE, 200, 2_000);
  const overlap = Math.min(boundedInteger(options.overlap, DEFAULT_OVERLAP, 0, chunkSize - 1), chunkSize - 1);
  const chunks: RetrievalChunk[] = [];

  sources.forEach((source, sourceIndex) => {
    if (!source || typeof source.content !== 'string') return;
    sourcePages(source).forEach((page) => {
      if (!page || typeof page.content !== 'string') return;
      splitPageText(page.content, chunkSize, overlap).forEach((text, chunkIndex) => {
        chunks.push({
          id: `${sourceIndex}:${page.pageNumber || 'source'}:${chunkIndex}`,
          text,
          source: {
            title: source.title?.trim() || source.metadata?.fileName?.trim() || `Source ${sourceIndex + 1}`,
            sourceIndex,
            ...(Number.isInteger(page.pageNumber) && page.pageNumber > 0 ? { pageNumber: page.pageNumber } : {}),
          },
          score: 0,
        });
      });
    });
  });
  return chunks;
}

/**
 * Score chunks by the share of unique normalized query terms they contain, with a small
 * frequency boost. Only matching chunks are returned, in descending relevance order.
 */
export function retrieveRelevantChunks(
  sources: readonly IngestedSource[],
  query: string,
  options: RetrievalOptions = {},
): RetrievalChunk[] {
  const queryTerms = termsOf(query);
  if (queryTerms.length === 0 || !Array.isArray(sources) || sources.length === 0) return [];
  const topK = boundedInteger(options.topK, DEFAULT_TOP_K, 1, MAX_TOP_K);
  const scored = chunkSources(sources, options).flatMap((chunk) => {
    const normalizedChunk = ` ${normalizeText(chunk.text)} `;
    let matched = 0;
    let occurrences = 0;
    for (const term of queryTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = normalizedChunk.match(new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'g'));
      if (matches?.length) {
        matched += 1;
        occurrences += matches.length;
      }
    }
    if (matched === 0) return [];
    const coverage = matched / queryTerms.length;
    const frequencyBoost = Math.min(0.2, Math.max(0, occurrences - matched) * 0.02);
    return [{ ...chunk, score: Math.min(1, coverage + frequencyBoost) }];
  });

  return scored
    .sort((left, right) => right.score - left.score || left.source.sourceIndex - right.source.sourceIndex || (left.source.pageNumber ?? 0) - (right.source.pageNumber ?? 0))
    .slice(0, topK);
}

/** Format retrieved chunks with explicit source and page labels suitable for UI excerpts. */
export function formatRetrievedExcerpts(chunks: readonly RetrievalChunk[]): string {
  return chunks
    .filter((chunk) => chunk && typeof chunk.text === 'string' && chunk.text.trim())
    .map((chunk) => {
      const title = chunk.source?.title?.trim() || `Source ${(chunk.source?.sourceIndex ?? 0) + 1}`;
      const page = Number.isInteger(chunk.source?.pageNumber) && (chunk.source?.pageNumber ?? 0) > 0
        ? `Page ${chunk.source?.pageNumber}`
        : 'Page unavailable';
      return `[Source: ${title} | ${page}]\n${chunk.text.trim()}`;
    })
    .join('\n\n');
}
