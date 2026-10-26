// @ts-nocheck
import { jsPDF } from 'jspdf';

export interface DocumentPdfResult {
  /** The sanitized filename used for the download, including the .pdf suffix. */
  filename: string;
  /** Number of pages in the generated document. */
  pageCount: number;
}

/**
 * Cheat-sheet style PDF renderer.
 * Renders markdown as a colorful, sectioned study sheet: a dark title banner,
 * numbered color-coded section bands, tinted content cards, dark code blocks,
 * yellow tip boxes and striped tables — inspired by hand-made lab cheat sheets.
 */

const PAGE_MARGIN = 13;
const HEADER_HEIGHT = 26;
const FOOTER_TOP = 284;
const CONTENT_START = 34;
const BODY_BOTTOM = FOOTER_TOP - 6;
const CARD_PAD = 3.2;
const CARD_GAP = 2.6;

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; text: string; ordered: boolean; marker: string }
  | { kind: 'code'; lines: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'tip'; text: string }
  | { kind: 'spacer' };

interface Accent {
  name: string;
  main: [number, number, number];
  dark: [number, number, number];
  tint: [number, number, number];
  border: [number, number, number];
}

const ACCENTS: Accent[] = [
  { name: 'teal', main: [13, 148, 136], dark: [15, 118, 110], tint: [240, 253, 250], border: [153, 246, 228] },
  { name: 'violet', main: [124, 58, 237], dark: [109, 40, 217], tint: [245, 243, 255], border: [221, 214, 254] },
  { name: 'amber', main: [217, 119, 6], dark: [180, 83, 9], tint: [255, 251, 235], border: [253, 230, 138] },
  { name: 'rose', main: [225, 29, 72], dark: [190, 18, 60], tint: [255, 241, 242], border: [254, 205, 211] },
  { name: 'sky', main: [2, 132, 199], dark: [3, 105, 161], tint: [240, 249, 255], border: [186, 230, 253] },
  { name: 'emerald', main: [5, 150, 105], dark: [4, 120, 87], tint: [236, 253, 245], border: [167, 243, 208] },
];

const INK: [number, number, number] = [30, 41, 59];
const INK_SOFT: [number, number, number] = [71, 85, 105];
const NAVY: [number, number, number] = [17, 24, 39];
const CODE_BG: [number, number, number] = [15, 23, 42];
const CODE_FG: [number, number, number] = [226, 232, 240];
const TIP_BG: [number, number, number] = [254, 249, 195];
const TIP_BORDER: [number, number, number] = [250, 204, 21];

/** Build the PDF without saving it (used by tests and by createAndSaveDocumentPdf). */
export function buildDocumentPdf(
  title: string,
  content: string,
  sourceAttribution?: string,
): { doc: jsPDF; filename: string; pageCount: number } {
  if (typeof title !== 'string' || !title.trim()) {
    throw new TypeError('A non-empty document title is required.');
  }
  if (typeof content !== 'string') {
    throw new TypeError('Document content must be a string.');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const bottomLimit = Math.min(BODY_BOTTOM, pageHeight - 13);
  let y = CONTENT_START;
  let sectionIndex = 0;
  let accent: Accent = ACCENTS[0];

  const drawHeader = () => {
    // Dark navy banner with accent underline, like a printed cheat sheet.
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');
    doc.setFillColor(45, 212, 191);
    doc.rect(0, HEADER_HEIGHT, pageWidth, 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(248, 250, 252);
    const brand = doc.splitTextToSize(stripInlineMarkdown(title.trim()), contentWidth - 46) as string[];
    doc.text(brand[0] ?? 'VITRAX AI', PAGE_MARGIN, 12);
    if (brand[1]) {
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184);
      doc.text(brand[1], PAGE_MARGIN, 18.5);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(45, 212, 191);
    doc.text('VITRAX AI', pageWidth - PAGE_MARGIN, 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Study sheet · ${new Date().toLocaleDateString()}`, pageWidth - PAGE_MARGIN, 16, { align: 'right' });
    doc.setTextColor(203, 213, 225);
    doc.text('Revise - Practice - Score!', pageWidth - PAGE_MARGIN, 21.5, { align: 'right' });
  };

  const startNewPage = () => {
    doc.addPage();
    drawHeader();
    y = CONTENT_START;
  };

  const ensureRoom = (height: number) => {
    if (y + height > bottomLimit) startNewPage();
  };

  const setText = (font: 'helvetica' | 'courier', style: 'normal' | 'bold' | 'italic', size: number, color: [number, number, number]) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const drawCard = (height: number, fill: [number, number, number], border: [number, number, number]) => {
    doc.setFillColor(...fill);
    doc.setDrawColor(...border);
    doc.setLineWidth(0.35);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth, height, 2.2, 2.2, 'FD');
  };

  // ---------- markdown parsing ----------

  const normalizeMath = (value: string) => value
    .replace(/\\(?:left|right)\b/g, '')
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
    .replace(/\\times\b/g, ' x ')
    .replace(/\\cdot\b/g, ' * ')
    .replace(/\\(?:pi|alpha|beta|gamma|theta|lambda|mu|sigma|omega)\b/g, (match) => match.slice(1))
    .replace(/\\(?:sum|int|infty|approx|neq|leq|geq)\b/g, (match) => ({
      '\\sum': 'sum', '\\int': 'integral', '\\infty': 'infinity',
      '\\approx': 'approximately', '\\neq': 'not equal to',
      '\\leq': '<=', '\\geq': '>=',
    }[match] ?? match.slice(1)))
    .replace(/\\rightarrow\b|\\to\b/g, ' -> ')
    .replace(/\\([{}$])/g, '$1')
    .replace(/[{}]/g, (brace) => brace === '{' ? '(' : ')')
    .replace(/\$\$?/g, '')
    .replace(/\\\[|\\\]|\\\(|\\\)/g, '')
    .replace(/\\([A-Za-z]+)\b/g, '$1');

  const stripInlineMarkdown = (value: string) => normalizeMath(value)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const isTableRow = (line: string) => /^\|(.+)\|$/.test(line) && line.includes('|');
  const isTableDivider = (line: string) => /^\|[\s:|-]+\|$/.test(line);
  const splitTableRow = (line: string) => line.slice(1, -1).split('|').map(cell => stripInlineMarkdown(cell.trim()));

  const parseBlocks = (value: string): Block[] => {
    const lines = value.replace(/\r\n?/g, '\n').split('\n');
    const blocks: Block[] = [];
    let paragraph: string[] = [];
    let codeLines: string[] | null = null;

    const flushParagraph = () => {
      const text = stripInlineMarkdown(paragraph.join(' '));
      if (text) blocks.push({ kind: 'paragraph', text });
      paragraph = [];
    };
    const flushCode = () => {
      if (codeLines && codeLines.length) blocks.push({ kind: 'code', lines: codeLines });
      codeLines = null;
    };

    for (let i = 0; i < lines.length; i += 1) {
      const rawLine = lines[i];
      const line = rawLine.trim();

      if (/^```|^~~~/.test(line)) {
        if (codeLines) {
          flushCode();
        } else {
          flushParagraph();
          codeLines = [];
        }
        continue;
      }
      if (codeLines) {
        codeLines.push(rawLine.replace(/\s+$/g, ''));
        continue;
      }
      if (!line) {
        flushParagraph();
        if (blocks.length && blocks[blocks.length - 1].kind !== 'spacer') blocks.push({ kind: 'spacer' });
        continue;
      }
      if (isTableRow(line)) {
        flushParagraph();
        const rows: string[][] = [];
        let header: string[] | null = null;
        while (i < lines.length && isTableRow(lines[i].trim())) {
          const rowLine = lines[i].trim();
          if (!isTableDivider(rowLine)) {
            const cells = splitTableRow(rowLine);
            if (!header) header = cells;
            else rows.push(cells);
          }
          i += 1;
        }
        i -= 1;
        if (header) blocks.push({ kind: 'table', header, rows });
        continue;
      }
      const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (heading) {
        flushParagraph();
        blocks.push({ kind: 'heading', level: heading[1].length, text: stripInlineMarkdown(heading[2]) });
        continue;
      }
      const listItem = /^(?:([-+*])\s+|(\d+)[.)]\s+)(.+)$/.exec(line);
      if (listItem) {
        flushParagraph();
        blocks.push({ kind: 'list', text: stripInlineMarkdown(listItem[3]), ordered: Boolean(listItem[2]), marker: listItem[2] ? `${listItem[2]}.` : '•' });
        continue;
      }
      if (/^>\s?/.test(line)) {
        flushParagraph();
        blocks.push({ kind: 'tip', text: stripInlineMarkdown(line.replace(/^>\s?/, '')) });
        continue;
      }
      if (/^---+$|^\*\*\*+$|^___+$/.test(line)) {
        flushParagraph();
        blocks.push({ kind: 'spacer' });
        continue;
      }
      paragraph.push(line);
    }
    flushParagraph();
    flushCode();
    return blocks.filter((block, index, all) => block.kind !== 'spacer' || (index > 0 && index < all.length - 1));
  };

  const blocks = parseBlocks(content);
  if (sourceAttribution?.trim()) {
    blocks.push({ kind: 'spacer' });
    blocks.push({ kind: 'tip', text: `Source: ${stripInlineMarkdown(sourceAttribution.trim())}` });
  }

  // ---------- rendering ----------

  drawHeader();

  const renderSectionBand = (text: string) => {
    sectionIndex += 1;
    accent = ACCENTS[(sectionIndex - 1) % ACCENTS.length];
    const bandHeight = 10.5;
    ensureRoom(bandHeight + 14);
    y += 2;
    doc.setFillColor(...accent.main);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth, bandHeight, 2.4, 2.4, 'F');
    // Numbered chip
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(PAGE_MARGIN + 1.6, y + 1.6, 7.4, 7.4, 1.8, 1.8, 'F');
    setText('helvetica', 'bold', 10, accent.dark);
    doc.text(String(sectionIndex), PAGE_MARGIN + 5.3, y + 7, { align: 'center' });
    setText('helvetica', 'bold', 11.5, [255, 255, 255]);
    const label = doc.splitTextToSize(text.toUpperCase(), contentWidth - 14) as string[];
    doc.text(label[0] ?? '', PAGE_MARGIN + 11, y + 7.2);
    y += bandHeight + 2.5;
  };

  const renderSubHeading = (text: string) => {
    setText('helvetica', 'bold', 10.5, accent.dark);
    const lines = doc.splitTextToSize(text, contentWidth - CARD_PAD * 2) as string[];
    const height = lines.length * 4.4 + 2;
    ensureRoom(height + 6);
    y += 1;
    doc.setFillColor(...accent.main);
    doc.roundedRect(PAGE_MARGIN, y - 3.4, 1.6, 4.6, 0.8, 0.8, 'F');
    doc.text(lines, PAGE_MARGIN + 3.4, y);
    y += height;
  };

  const renderParagraph = (text: string) => {
    setText('helvetica', 'normal', 9.5, INK_SOFT);
    const lines = doc.splitTextToSize(text, contentWidth - CARD_PAD * 2) as string[];
    const height = lines.length * 4.3 + CARD_PAD * 1.6;
    ensureRoom(height);
    drawCard(height, [255, 255, 255], accent.border);
    doc.text(lines, PAGE_MARGIN + CARD_PAD, y + CARD_PAD + 2.6);
    y += height + CARD_GAP;
  };

  const renderListGroup = (items: Extract<Block, { kind: 'list' }>[]) => {
    setText('helvetica', 'normal', 9.5, INK);
    const rendered = items.map(item => ({
      marker: item.marker,
      lines: doc.splitTextToSize(item.text, contentWidth - CARD_PAD * 2 - 7) as string[],
    }));
    const height = rendered.reduce((sum, item) => sum + item.lines.length * 4.3 + 1.1, CARD_PAD * 1.6);
    ensureRoom(height);
    drawCard(height, accent.tint, accent.border);
    let itemY = y + CARD_PAD + 2.6;
    for (const item of rendered) {
      setText('helvetica', 'bold', 9.5, accent.dark);
      doc.text(item.marker, PAGE_MARGIN + CARD_PAD, itemY);
      setText('helvetica', 'normal', 9.5, INK);
      doc.text(item.lines, PAGE_MARGIN + CARD_PAD + 6, itemY);
      itemY += item.lines.length * 4.3 + 1.1;
    }
    y += height + CARD_GAP;
  };

  const renderCode = (lines: string[]) => {
    setText('courier', 'normal', 8.2, CODE_FG);
    const wrapped: string[] = [];
    for (const line of lines) {
      const parts = doc.splitTextToSize(line || ' ', contentWidth - CARD_PAD * 2 - 2) as string[];
      wrapped.push(...parts);
    }
    const height = wrapped.length * 3.7 + CARD_PAD * 2;
    ensureRoom(Math.min(height, 40));
    if (height > bottomLimit - CONTENT_START) {
      // Very long code: split across pages chunk by chunk.
      let cursor = 0;
      while (cursor < wrapped.length) {
        const available = Math.floor((bottomLimit - y - CARD_PAD * 2) / 3.7);
        const slice = wrapped.slice(cursor, cursor + available);
        const sliceHeight = slice.length * 3.7 + CARD_PAD * 2;
        drawCard(sliceHeight, CODE_BG, CODE_BG);
        doc.text(slice, PAGE_MARGIN + CARD_PAD + 1, y + CARD_PAD + 2.2);
        y += sliceHeight + CARD_GAP;
        cursor += available;
        if (cursor < wrapped.length) startNewPage();
      }
      return;
    }
    ensureRoom(height);
    drawCard(height, CODE_BG, CODE_BG);
    doc.text(wrapped, PAGE_MARGIN + CARD_PAD + 1, y + CARD_PAD + 2.2);
    y += height + CARD_GAP;
  };

  const renderTip = (text: string) => {
    setText('helvetica', 'normal', 9.5, [113, 63, 18]);
    const lines = doc.splitTextToSize(text, contentWidth - CARD_PAD * 2 - 8) as string[];
    const height = lines.length * 4.3 + CARD_PAD * 2;
    ensureRoom(height);
    drawCard(height, TIP_BG, TIP_BORDER);
    setText('helvetica', 'bold', 9.5, [161, 98, 7]);
    doc.text('TIP', PAGE_MARGIN + CARD_PAD, y + CARD_PAD + 2.6);
    setText('helvetica', 'normal', 9.5, [113, 63, 18]);
    doc.text(lines, PAGE_MARGIN + CARD_PAD + 9, y + CARD_PAD + 2.6);
    y += height + CARD_GAP;
  };

  const renderTable = (header: string[], rows: string[][]) => {
    const cols = header.length;
    const colWidth = (contentWidth - CARD_PAD * 2) / cols;
    setText('helvetica', 'bold', 8.8, [255, 255, 255]);
    const headerLines = header.map(cell => doc.splitTextToSize(cell, colWidth - 2.4) as string[]);
    const headerHeight = Math.max(...headerLines.map(l => l.length)) * 3.9 + 3.4;
    const bodyRows = rows.map(row => {
      setText('helvetica', 'normal', 8.8, INK);
      const cells = Array.from({ length: cols }, (_, i) => doc.splitTextToSize(row[i] ?? '', colWidth - 2.4) as string[]);
      return { cells, height: Math.max(...cells.map(c => c.length)) * 3.9 + 3 };
    });
    const totalHeight = headerHeight + bodyRows.reduce((sum, row) => sum + row.height, 0) + CARD_PAD * 2;
    ensureRoom(Math.min(totalHeight, headerHeight + (bodyRows[0]?.height ?? 8) + CARD_PAD * 2));
    drawCard(totalHeight, [255, 255, 255], accent.border);
    let rowY = y + CARD_PAD;
    // Header band
    doc.setFillColor(...accent.main);
    doc.roundedRect(PAGE_MARGIN + 1.2, rowY, contentWidth - 2.4, headerHeight, 1.4, 1.4, 'F');
    setText('helvetica', 'bold', 8.8, [255, 255, 255]);
    headerLines.forEach((cellLines, col) => {
      doc.text(cellLines, PAGE_MARGIN + CARD_PAD + col * colWidth + 1.2, rowY + 3.4);
    });
    rowY += headerHeight;
    bodyRows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        doc.setFillColor(...accent.tint);
        doc.rect(PAGE_MARGIN + 1.2, rowY, contentWidth - 2.4, row.height, 'F');
      }
      setText('helvetica', 'normal', 8.8, INK);
      row.cells.forEach((cellLines, col) => {
        doc.text(cellLines, PAGE_MARGIN + CARD_PAD + col * colWidth + 1.2, rowY + 3.2);
      });
      rowY += row.height;
    });
    y += totalHeight + CARD_GAP;
  };

  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];
    if (block.kind === 'spacer') {
      y += 1.4;
    } else if (block.kind === 'heading') {
      // A leading H1 duplicates the banner title — skip it.
      if (block.level === 1 && sectionIndex === 0 && blocks.slice(0, index).every(b => b.kind === 'spacer')) {
        // already shown in the page banner
      } else if (block.level <= 2) renderSectionBand(block.text);
      else renderSubHeading(block.text);
    } else if (block.kind === 'list') {
      // Group consecutive list items into one tinted card.
      const group: Extract<Block, { kind: 'list' }>[] = [];
      while (index < blocks.length && blocks[index].kind === 'list') {
        group.push(blocks[index] as Extract<Block, { kind: 'list' }>);
        index += 1;
      }
      renderListGroup(group);
      continue;
    } else if (block.kind === 'code') {
      renderCode(block.lines);
    } else if (block.kind === 'table') {
      renderTable(block.header, block.rows);
    } else if (block.kind === 'tip') {
      renderTip(block.text);
    } else {
      renderParagraph(block.text);
    }
    index += 1;
  }

  // ---------- footers ----------
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, FOOTER_TOP, pageWidth - PAGE_MARGIN, FOOTER_TOP);
    setText('helvetica', 'bold', 8, [100, 116, 139]);
    doc.text('VITRAX AI', PAGE_MARGIN, FOOTER_TOP + 5);
    setText('helvetica', 'normal', 8, [148, 163, 184]);
    doc.text('Revise - Practice - Score!', pageWidth / 2, FOOTER_TOP + 5, { align: 'center' });
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, FOOTER_TOP + 5, { align: 'right' });
  }

  return { doc, filename: `${sanitizeFilename(title)}.pdf`, pageCount };
}

export async function createAndSaveDocumentPdf(
  title: string,
  content: string,
  sourceAttribution?: string,
): Promise<DocumentPdfResult> {
  const { doc, filename, pageCount } = buildDocumentPdf(title, content, sourceAttribution);
  await doc.save(filename, { returnPromise: true });
  return { filename, pageCount };
}

function sanitizeFilename(title: string): string {
  const sanitized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/[.-]{2,}/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 96)
    .replace(/[.-]+$/g, '');
  return sanitized || 'vitrax-ai-document';
}
