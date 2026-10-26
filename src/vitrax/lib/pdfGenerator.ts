// @ts-nocheck
import { jsPDF } from 'jspdf';
import { StudyPack, Flashcard, QuizQuestion, KeyFormula } from '../types';

export function generateStudyPackPDF(pack: StudyPack, docType: 'full_book' | 'formula_sheet' | 'mcq_bank' | 'flashcard_sheet' = 'full_book') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addHeader = (title: string, subheader: string) => {
    // Primary header bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 24, 'F');

    // Accent line
    doc.setFillColor(20, 184, 166); // teal-500
    doc.rect(0, 24, pageWidth, 1.5, 'F');

    // Brand text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(241, 245, 249);
    doc.text('VITRAX AI', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Frontier Intelligence & Multi-Model Learning Studio', margin + 30, 12);

    // Title / Subject
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(45, 212, 191); // teal-400
    doc.text(subheader, pageWidth - margin, 12, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 18, { align: 'right' });

    y = 34;
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text('VITRAX AI Learning Studio | Verified Computational Output', margin, pageHeight - 7);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      addHeader(pack.title, pack.summary.slice(0, 40));
    }
  };

  // Start Page 1
  addHeader(pack.title, 'EXAM MASTER COMPENDIUM');

  // Document Title Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(pack.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 4;

  // Summary box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(`Overview: ${pack.summary}`, contentWidth - 8);
  doc.text(summaryLines, margin + 4, y + 6);
  y += 26;

  // 1. Key Formulas Section (if applicable)
  if ((docType === 'full_book' || docType === 'formula_sheet') && pack.keyFormulas && pack.keyFormulas.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Master Formula Sheet & Theoretical Constants', margin, y);
    y += 8;

    pack.keyFormulas.forEach((item: KeyFormula, idx: number) => {
      checkPageBreak(22);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 118, 110); // teal-700
      doc.text(`${idx + 1}. ${item.name}`, margin + 4, y + 6);

      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Formula: ${item.formula}`, margin + 4, y + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(item.meaning, margin + 4, y + 16);

      y += 22;
    });
    y += 6;
  }

  // 2. Solved MCQs Section (if applicable)
  if ((docType === 'full_book' || docType === 'mcq_bank') && pack.quiz && pack.quiz.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Exam Practice Questions & Verified Solutions', margin, y);
    y += 8;

    pack.quiz.forEach((q: QuizQuestion, idx: number) => {
      checkPageBreak(45);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 40, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const qLines = doc.splitTextToSize(`Q${idx + 1}: ${q.question}`, contentWidth - 8);
      doc.text(qLines, margin + 4, y + 6);

      let optionY = y + 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      q.options.forEach((opt, optIdx) => {
        const isCorrect = optIdx === q.correctIndex;
        if (isCorrect) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 118, 110);
          doc.text(`[✓] ${String.fromCharCode(65 + optIdx)}. ${opt}`, margin + 6, optionY);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(`[ ] ${String.fromCharCode(65 + optIdx)}. ${opt}`, margin + 6, optionY);
        }
        optionY += 5;
      });

      // Explanation box
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const expLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, contentWidth - 12);
      doc.text(expLines, margin + 6, optionY + 2);

      y += 46;
    });
    y += 6;
  }

  // 3. Flashcards Section (if applicable)
  if ((docType === 'full_book' || docType === 'flashcard_sheet') && pack.flashcards && pack.flashcards.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('3. High-Yield Flashcard Revision Grid', margin, y);
    y += 8;

    pack.flashcards.forEach((card: Flashcard, idx: number) => {
      checkPageBreak(28);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text(`Card #${idx + 1} | Topic: ${card.topic} [${card.difficulty}]`, margin + 4, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const frontLines = doc.splitTextToSize(`FRONT: ${card.front}`, contentWidth - 8);
      doc.text(frontLines, margin + 4, y + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const backLines = doc.splitTextToSize(`BACK: ${card.back}`, contentWidth - 8);
      doc.text(backLines, margin + 4, y + 16);

      y += 28;
    });
  }

  // Add footers across all generated pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(p, totalPages);
  }

  // Save the real generated PDF
  const filename = `${pack.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'vitrax_study_guide'}.pdf`;
  doc.save(filename);
  return filename;
}
