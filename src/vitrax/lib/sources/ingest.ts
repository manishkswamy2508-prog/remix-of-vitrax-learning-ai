// @ts-nocheck
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/** Maximum size of an uploaded source file (8 MiB). */
export const MAX_SOURCE_FILE_SIZE = 8 * 1024 * 1024;
/** Guard against documents whose extracted text would be too large to handle safely. */
export const MAX_EXTRACTED_CHARACTERS = 2_000_000;

export type SourceContentType = 'pdf' | 'docx' | 'txt' | 'markdown' | 'csv';

export interface SourcePageRecord {
  pageNumber: number;
  content: string;
}

export interface SourceMetadata {
  fileName: string;
  mimeType: string;
  lastModified?: number;
  pageCount?: number;
  rowCount?: number;
  columnCount?: number;
  extractionMethod: 'pdfjs' | 'mammoth' | 'utf-8' | 'csv-parser';
  [key: string]: unknown;
}

export interface IngestedSource {
  title: string;
  content: string;
  contentType: SourceContentType;
  fileSize: number;
  /** Present for PDFs, including pages that contain no selectable text. */
  pages?: SourcePageRecord[];
  metadata: SourceMetadata;
}

export interface IngestOptions {
  /** Optional stricter cap; values above the hard limit are clamped to it. */
  maxExtractedCharacters?: number;
}

// Vite serves this worker as a browser URL instead of bundling worker code into the main thread.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const EXTENSION_TYPES: Record<string, SourceContentType> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
  md: 'markdown',
  markdown: 'markdown',
  csv: 'csv',
};

const MIME_TYPES: Record<string, SourceContentType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',
  'text/csv': 'csv',
  'application/csv': 'csv',
};

/** An error message in this class is suitable to show directly to an end user. */
export class SourceIngestionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SourceIngestionError';
  }
}

function sourceTypeForFile(file: File): SourceContentType {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const byExtension = extension ? EXTENSION_TYPES[extension] : undefined;
  const normalizedMime = file.type.trim().toLowerCase().split(';', 1)[0];
  const byMime = MIME_TYPES[normalizedMime];

  if (byExtension && (!byMime || byMime === byExtension || (byExtension === 'markdown' && byMime === 'txt'))) {
    return byExtension;
  }
  if (!extension && byMime) return byMime;
  if (byExtension) {
    throw new SourceIngestionError(`“${file.name}” has a file extension that does not match its declared type. Please choose a valid ${byExtension.toUpperCase()} file.`);
  }
  throw new SourceIngestionError(`“${file.name || 'This file'}” is not a supported source. Choose a PDF, DOCX, TXT, Markdown, or CSV file.`);
}

function enforceLength(text: string, cap: number, fileName: string): void {
  if (text.length > cap) {
    throw new SourceIngestionError(`“${fileName}” contains too much extracted text (over ${cap.toLocaleString()} characters). Use a shorter or smaller document; no text was truncated.`);
  }
}

function decodeUtf8(bytes: ArrayBuffer, fileName: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch (cause) {
    throw new SourceIngestionError(`“${fileName}” is not valid UTF-8 text and could not be read.`, { cause });
  }
}

/** Parse comma-separated records, supporting quoted commas/newlines and doubled quote escapes. */
function parseCsv(csv: string, fileName: string, cap: number): { content: string; rows: number; columns: number } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let afterQuote = false;

  const pushCell = () => { row.push(cell); cell = ''; afterQuote = false; };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
    if (rows.length > cap) {
      throw new SourceIngestionError(`“${fileName}” contains too many CSV records to extract safely; no rows were truncated.`);
    }
  };

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (inQuotes) {
      if (char === '"') {
        if (csv[i + 1] === '"') { cell += '"'; i += 1; }
        else { inQuotes = false; afterQuote = true; }
      } else {
        cell += char;
      }
      continue;
    }

    if (afterQuote && char !== ',' && char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
      throw new SourceIngestionError(`“${fileName}” contains malformed CSV quoting near character ${i + 1}.`);
    }
    if (char === '"') {
      if (cell.length !== 0 || afterQuote) {
        throw new SourceIngestionError(`“${fileName}” contains malformed CSV quoting near character ${i + 1}.`);
      }
      inQuotes = true;
    } else if (char === ',') {
      pushCell();
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && csv[i + 1] === '\n') i += 1;
      pushRow();
    } else if (!afterQuote) {
      cell += char;
    }

    // The tabular representation adds separators, so check during parsing as well as at completion.
    if (cell.length > cap) enforceLength(cell, cap, fileName);
  }
  if (inQuotes) throw new SourceIngestionError(`“${fileName}” has an unclosed quoted CSV field.`);
  if (cell.length > 0 || row.length > 0 || (csv.length > 0 && !/[\r\n]$/.test(csv))) pushRow();

  const columnCount = rows.reduce((maximum, current) => Math.max(maximum, current.length), 0);
  // Keep the extracted data explicitly tabular while making embedded line breaks readable in a cell.
  const content = rows.map((fields) => fields.map((field) => field.replace(/\r\n?\n?/g, ' ').replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
  enforceLength(content, cap, fileName);
  return { content, rows: rows.length, columns: columnCount };
}

function isTextItem(item: unknown): item is { str: string } {
  return typeof item === 'object' && item !== null && 'str' in item && typeof (item as { str?: unknown }).str === 'string';
}

async function extractPdf(file: File, cap: number): Promise<{ content: string; pages: SourcePageRecord[] }> {
  let document: pdfjsLib.PDFDocumentProxy | undefined;
  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | undefined;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    loadingTask = pdfjsLib.getDocument({ data });
    document = await loadingTask.promise;
    const pages: SourcePageRecord[] = [];
    let total = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .reduce<string[]>((items, item) => {
          if (isTextItem(item)) items.push(item.str);
          return items;
        }, [])
        .join(' ')
        .replace(/[\t ]+/g, ' ')
        .trim();
      total += text.length;
      if (total > cap) {
        throw new SourceIngestionError(`“${file.name}” contains too much extracted text (over ${cap.toLocaleString()} characters). Use a shorter document; no text was truncated.`);
      }
      pages.push({ pageNumber, content: text });
    }

    const content = pages.map((page) => page.content).filter(Boolean).join('\n\n');
    if (!content.trim()) {
      throw new SourceIngestionError(`No selectable text was found in “${file.name}”. It may be a scanned/image-only PDF. Scanned-document OCR is not available, so its text cannot be extracted.`);
    }
    return { content, pages };
  } catch (cause) {
    if (cause instanceof SourceIngestionError) throw cause;
    const detail = cause instanceof Error ? cause.message : '';
    const passwordHint = /password|encrypted/i.test(detail) ? ' The PDF may be password-protected.' : '';
    throw new SourceIngestionError(`Could not read “${file.name}”. The PDF may be corrupt or unsupported.${passwordHint}`, { cause });
  } finally {
    if (loadingTask) await loadingTask.destroy().catch(() => undefined);
  }
}

/** Extract supported browser File content locally. Nothing is uploaded or executed. */
export async function ingestSourceFile(file: File, options: IngestOptions = {}): Promise<IngestedSource> {
  if (typeof File === 'undefined' || !(file instanceof File)) {
    throw new SourceIngestionError('Choose a file from your device to add as a source.');
  }
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new SourceIngestionError(`“${file.name}” is larger than the 8 MiB limit. Choose a smaller file.`);
  }
  if (file.size === 0) throw new SourceIngestionError(`“${file.name}” is empty.`);

  const contentType = sourceTypeForFile(file);
  const requestedCap = options.maxExtractedCharacters;
  const cap = Number.isFinite(requestedCap) && requestedCap !== undefined && requestedCap > 0
    ? Math.min(Math.floor(requestedCap), MAX_EXTRACTED_CHARACTERS)
    : MAX_EXTRACTED_CHARACTERS;
  let content: string;
  let pages: SourcePageRecord[] | undefined;
  let extractionMethod: SourceMetadata['extractionMethod'];
  let extraMetadata: Partial<SourceMetadata> = {};

  if (contentType === 'pdf') {
    const result = await extractPdf(file, cap);
    content = result.content;
    pages = result.pages;
    extractionMethod = 'pdfjs';
    extraMetadata = { pageCount: pages.length };
  } else if (contentType === 'docx') {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      content = result.value;
      extractionMethod = 'mammoth';
    } catch (cause) {
      throw new SourceIngestionError(`Could not read “${file.name}”. The DOCX file may be corrupt or unsupported.`, { cause });
    }
  } else {
    const text = decodeUtf8(await file.arrayBuffer(), file.name);
    if (contentType === 'csv') {
      const parsed = parseCsv(text, file.name, cap);
      content = parsed.content;
      extractionMethod = 'csv-parser';
      extraMetadata = { rowCount: parsed.rows, columnCount: parsed.columns };
    } else {
      content = text;
      extractionMethod = 'utf-8';
    }
  }

  enforceLength(content, cap, file.name);
  if (!content.trim()) {
    throw new SourceIngestionError(`No text content was found in “${file.name}”. Choose a file that contains readable text.`);
  }

  return {
    title: file.name.trim() || 'Untitled source',
    content,
    contentType,
    fileSize: file.size,
    ...(pages ? { pages } : {}),
    metadata: {
      fileName: file.name || 'Untitled source',
      mimeType: file.type || 'application/octet-stream',
      ...(Number.isFinite(file.lastModified) && file.lastModified > 0 ? { lastModified: file.lastModified } : {}),
      extractionMethod,
      ...extraMetadata,
    },
  };
}
