// @ts-nocheck
import { StudyTopBar } from './StudyTopBar';
import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  Award, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Lightbulb, 
  Printer, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudyPack, QuizQuestion, QuizProgress, QuizAttempt } from '../types';

interface QuizLabViewProps {
  studyPacks: StudyPack[];
  onToggleSidebar?: () => void;
  onOpenLibrary?: () => void;
  onUpdatePacks: (packs: StudyPack[]) => void;
}

export const QuizLabView: React.FC<QuizLabViewProps> = ({ studyPacks, onUpdatePacks, onToggleSidebar, onOpenLibrary }) => {
  const initialProgress = studyPacks[0]?.quizProgress;
  const [selectedPackId, setSelectedPackId] = useState<string>(studyPacks[0]?.id || '');
  const [examMode, setExamMode] = useState<'immediate' | 'exam'>(initialProgress?.examMode || 'immediate');
  const [isTimed, setIsTimed] = useState(initialProgress?.isTimed ?? false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(initialProgress?.currentQuestionIndex || 0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>(initialProgress?.answers || {});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>(initialProgress?.flaggedQuestions || {});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>(initialProgress?.revealedHints || {});
  const [isExamSubmitted, setIsExamSubmitted] = useState(initialProgress?.isSubmitted || false);
  const [pdfError, setPdfError] = useState('');

  const currentPack = studyPacks.find((p) => p.id === selectedPackId) || studyPacks[0];
  const questions: QuizQuestion[] = currentPack?.quiz || [];
  const currentQ: QuizQuestion | undefined = questions[currentQuestionIdx];

  const persistProgress = (changes: Partial<QuizProgress>) => {
    if (!currentPack) return;
    const progress: QuizProgress = {
      currentQuestionIndex: currentQuestionIdx,
      answers: userAnswers,
      flaggedQuestions,
      revealedHints,
      examMode,
      isTimed,
      isSubmitted: isExamSubmitted,
      updatedAt: Date.now(),
      ...changes,
    };
    onUpdatePacks(studyPacks.map(pack => pack.id === currentPack.id ? { ...pack, quizProgress: progress } : pack));
  };

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isTimed && isTimerRunning && timeLeft > 0 && !isExamSubmitted) {
      interval = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(interval);
            handleFinishExam();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimed, isTimerRunning, timeLeft, isExamSubmitted]);

  // Restore each deck's last saved answers and question position when switching packs.
  useEffect(() => {
    const progress = studyPacks.find(pack => pack.id === selectedPackId)?.quizProgress;
    const total = studyPacks.find(pack => pack.id === selectedPackId)?.quiz.length || 0;
    setCurrentQuestionIdx(Math.min(progress?.currentQuestionIndex || 0, Math.max(0, total - 1)));
    setUserAnswers(progress?.answers || {});
    setFlaggedQuestions(progress?.flaggedQuestions || {});
    setRevealedHints(progress?.revealedHints || {});
    setExamMode(progress?.examMode || 'immediate');
    setIsTimed(progress?.isTimed ?? false);
    setIsExamSubmitted(progress?.isSubmitted || false);
    setTimeLeft(total * 60 || 300);
    setIsTimerRunning(Boolean(progress?.isTimed && progress?.examMode === 'exam' && !progress?.isSubmitted));
  }, [selectedPackId]);

  const handleSelectOption = (qId: string, optIdx: number) => {
    if (isExamSubmitted) return;
    const answers = { ...userAnswers, [qId]: optIdx };
    setUserAnswers(answers);
    persistProgress({ answers });
  };

  const handleToggleFlag = (qId: string) => {
    const flags = { ...flaggedQuestions, [qId]: !flaggedQuestions[qId] };
    setFlaggedQuestions(flags);
    persistProgress({ flaggedQuestions: flags });
  };

  const handleToggleHint = (qId: string) => {
    const hints = { ...revealedHints, [qId]: !revealedHints[qId] };
    setRevealedHints(hints);
    persistProgress({ revealedHints: hints });
  };

  const handleQuestionNavigation = (index: number) => {
    const nextIndex = Math.max(0, Math.min(questions.length - 1, index));
    setCurrentQuestionIdx(nextIndex);
    persistProgress({ currentQuestionIndex: nextIndex });
  };

  const handleFinishExam = () => {
    if (isExamSubmitted || !currentPack) return;
    setIsExamSubmitted(true);
    setIsTimerRunning(false);

    // Compute score
    let correct = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    });

    const percent = Math.round((correct / Math.max(1, questions.length)) * 100);
    const completedAt = Date.now();
    const attempt: QuizAttempt = { id: `attempt-${completedAt}`, completedAt, score: correct, total: questions.length, answers: { ...userAnswers } };
    const progress: QuizProgress = { currentQuestionIndex: currentQuestionIdx, answers: { ...userAnswers }, flaggedQuestions: { ...flaggedQuestions }, revealedHints: { ...revealedHints }, examMode, isTimed, isSubmitted: true, updatedAt: completedAt };
    onUpdatePacks(studyPacks.map(pack => pack.id === currentPack.id
      ? { ...pack, quizProgress: progress, quizAttempts: [attempt, ...(pack.quizAttempts || [])].slice(0, 20) }
      : pack));
    if (percent >= 70) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#14b8a6', '#06b6d4', '#6366f1', '#f59e0b'],
      });
    }
  };

  const handleRetake = () => {
    setUserAnswers({});
    setFlaggedQuestions({});
    setRevealedHints({});
    setIsExamSubmitted(false);
    setCurrentQuestionIdx(0);
    setTimeLeft(questions.length * 60 || 300);
    setIsTimerRunning(isTimed && examMode === 'exam');
    persistProgress({ currentQuestionIndex: 0, answers: {}, flaggedQuestions: {}, revealedHints: {}, isSubmitted: false });
  };

  const handleSetExamMode = (mode: 'immediate' | 'exam') => {
    setExamMode(mode);
    setIsTimerRunning(isTimed && mode === 'exam' && !isExamSubmitted);
    persistProgress({ examMode: mode });
  };

  const handleToggleTimer = () => {
    const next = !isTimed;
    setIsTimed(next);
    setIsTimerRunning(next && examMode === 'exam' && !isExamSubmitted);
    persistProgress({ isTimed: next });
  };

  const handleExportQuizPdf = async () => {
    if (!currentPack) return;
    setPdfError('');
    try {
      const { createAndSaveDocumentPdf } = await import('../lib/pdf/documentPdf');
      const content = `# ${currentPack.title} — Quiz\n\n${currentPack.summary}\n\n${questions.map((question, index) => `## Question ${index + 1}\n${question.question}\n\n${question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join('\n')}\n\n**Answer:** ${question.options[question.correctIndex]}\n\n**Explanation:** ${question.explanation}${question.sourceRef ? `\n\nSource: ${question.sourceRef}` : ''}`).join('\n\n')}`;
      await createAndSaveDocumentPdf(`${currentPack.title}-Quiz`, content, currentPack.sourceTitle ? `Generated from ${currentPack.sourceTitle}` : undefined);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : 'The quiz PDF could not be created.');
    }
  };

  // Calculate score
  const answeredCount = Object.keys(userAnswers).length;
  let correctCount = 0;
  questions.forEach((q) => {
    if (userAnswers[q.id] === q.correctIndex) correctCount++;
  });
  const scorePercent = Math.round((correctCount / Math.max(1, questions.length)) * 100);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const lastAttempt = currentPack?.quizAttempts?.[0];

  const quizTotal = currentPack?.quiz?.length || 0;
  const quizAnswered = Object.keys(userAnswers || {}).length;
  return (
    <div className="h-full overflow-y-auto">
    <StudyTopBar
      title="Quiz Lab"
      onToggleSidebar={onToggleSidebar}
      sourceTitle={currentPack?.sourceTitle || currentPack?.title}
      onOpenLibrary={onOpenLibrary}
      progressLabel={quizTotal ? `${quizAnswered} of ${quizTotal} answered · Question ${Math.min(currentQuestionIdx + 1, quizTotal)}` : 'No questions yet'}
      progress={quizTotal ? quizAnswered / quizTotal : 0}
    />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <HelpCircle className="w-4 h-4" />
              <span>Source-based Assessment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              VITRAX Quiz Lab & Exam Simulator
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Practice against questions generated from your selected study pack, with immediate or end-of-test explanations and saved progress.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => void handleExportQuizPdf()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Export Solved Paper PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exam Controls Row: Pack selector, Exam Mode, Timer */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        {/* Pack Selector */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Exam Topic:</span>
          <select
            value={selectedPackId}
            onChange={(e) => setSelectedPackId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-teal-300 font-semibold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400"
          >
            {studyPacks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.quiz?.length || 0} Questions)
              </option>
            ))}
          </select>
        </div>

        {/* Feedback Mode */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Feedback:</span>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => handleSetExamMode('immediate')}
              className={`px-3 py-1 rounded-md transition-colors ${
                examMode === 'immediate'
                  ? 'bg-teal-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Immediate Tutor
            </button>
            <button
              onClick={() => handleSetExamMode('exam')}
              className={`px-3 py-1 rounded-md transition-colors ${
                examMode === 'exam'
                  ? 'bg-teal-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Timed Test
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex items-center space-x-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Timer className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">Time:</span>
          <span className="font-mono text-amber-300 font-bold text-sm">
            {isTimed ? formatTimer(timeLeft) : 'Off'}
          </span>
          <button onClick={handleToggleTimer} className="ml-1 rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-500">{isTimed ? 'Disable' : 'Enable'}</button>
        </div>
      </div>

      {pdfError && <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200" role="alert">{pdfError}</div>}
      {lastAttempt && <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400"><Award className="h-4 w-4 text-violet-300" /><span>Last saved attempt: <strong className="text-slate-200">{lastAttempt.score}/{lastAttempt.total}</strong> · {new Date(lastAttempt.completedAt).toLocaleString()} · {currentPack?.quizAttempts?.length || 1} saved attempt{(currentPack?.quizAttempts?.length || 1) === 1 ? '' : 's'}</span></div>}

      {/* Main Question Interface */}
      {questions.length > 0 && currentQ ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Active Question */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              {/* Question Header & Flag button */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="font-mono text-xs text-teal-400 font-semibold uppercase tracking-wider">
                  Question {currentQuestionIdx + 1} of {questions.length}
                </span>

                <div className="flex items-center space-x-3">
                  {currentQ.hint && (
                    <button
                      onClick={() => handleToggleHint(currentQ.id)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>{revealedHints[currentQ.id] ? 'Hide Hint' : 'Hint'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleFlag(currentQ.id)}
                    className={`text-xs flex items-center gap-1 font-medium transition-colors ${
                      flaggedQuestions[currentQ.id]
                        ? 'text-rose-400 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentQ.id] ? 'fill-current' : ''}`} />
                    <span>{flaggedQuestions[currentQ.id] ? 'Flagged' : 'Flag'}</span>
                  </button>
                </div>
              </div>

              {/* Hint Box if revealed */}
              {revealedHints[currentQ.id] && currentQ.hint && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 italic">
                  💡 Socratic Hint: {currentQ.hint}
                </div>
              )}

              {/* Question Text */}
              <h3 className="font-display font-semibold text-lg sm:text-xl text-white leading-relaxed">
                {currentQ.question}
              </h3>

              {/* Options List */}
              <div className="space-y-3">
                {currentQ.options.map((option, optIdx) => {
                  const isSelected = userAnswers[currentQ.id] === optIdx;
                  const isSubmitted = isExamSubmitted || (examMode === 'immediate' && userAnswers[currentQ.id] !== undefined);
                  const isCorrect = optIdx === currentQ.correctIndex;

                  let borderStyle = 'border-slate-800 hover:border-slate-700 bg-slate-950/80';
                  let badge = (
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                  );

                  if (isSubmitted) {
                    if (isCorrect) {
                      borderStyle = 'border-emerald-500/80 bg-emerald-500/10 text-emerald-200';
                      badge = (
                        <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                          ✓
                        </span>
                      );
                    } else if (isSelected && !isCorrect) {
                      borderStyle = 'border-rose-500/80 bg-rose-500/10 text-rose-200';
                      badge = (
                        <span className="w-6 h-6 rounded-lg bg-rose-500 text-slate-950 flex items-center justify-center font-bold">
                          ✗
                        </span>
                      );
                    }
                  } else if (isSelected) {
                    borderStyle = 'border-teal-500 bg-teal-500/10 text-teal-200 font-semibold shadow-sm';
                    badge = (
                      <span className="w-6 h-6 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-bold">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      disabled={isSubmitted && examMode === 'immediate'}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start space-x-3 text-sm ${borderStyle}`}
                    >
                      {badge}
                      <span className="flex-1 mt-0.5">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Immediate Feedback Explanation Drawer */}
              {(isExamSubmitted || (examMode === 'immediate' && userAnswers[currentQ.id] !== undefined)) && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-teal-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Answer explanation:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    {currentQ.explanation}
                  </p>
                  {currentQ.sourceRef && <p className="border-t border-slate-800 pt-2 text-cyan-200/80">Source: {currentQ.sourceRef}</p>}
                </div>
              )}

              {/* Question Navigation Buttons */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <button
                  onClick={() => handleQuestionNavigation(currentQuestionIdx - 1)}
                  disabled={currentQuestionIdx === 0}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentQuestionIdx === questions.length - 1 ? (
                  <button
                    onClick={handleFinishExam}
                    disabled={isExamSubmitted}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 hover:from-teal-400 hover:to-cyan-400 active:scale-95 transition-all"
                  >
                    Submit Test & Grade
                  </button>
                ) : (
                  <button
                    onClick={() => handleQuestionNavigation(currentQuestionIdx + 1)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Question Navigator & Score Card */}
          <div className="lg:col-span-1 space-y-4">
            {/* Score Summary Box if Submitted */}
            {isExamSubmitted && (
              <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-5 text-center space-y-3 glow-teal">
                <div className="w-12 h-12 mx-auto rounded-full bg-teal-500/20 border border-teal-500 flex items-center justify-center">
                  <Award className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-white text-base">
                    Score: {scorePercent}%
                  </h4>
                  <p className="text-xs text-slate-400">
                    {correctCount} correct out of {questions.length} questions
                  </p>
                </div>
                <button
                  onClick={handleRetake}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Test</span>
                </button>
              </div>
            )}

            {/* Question Navigator Grid */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Question Matrix</span>
                <span>{answeredCount} / {questions.length} Answered</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = currentQuestionIdx === idx;
                  const isAnswered = userAnswers[q.id] !== undefined;
                  const isFlagged = flaggedQuestions[q.id];
                  const isCorrect = userAnswers[q.id] === q.correctIndex;

                  let bgClass = 'bg-slate-950 border-slate-800 text-slate-400';
                  if (isExamSubmitted) {
                    bgClass = isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-rose-500/20 border-rose-500 text-rose-300';
                  } else if (isCurrent) {
                    bgClass = 'bg-teal-500 text-slate-950 font-bold border-teal-400';
                  } else if (isAnswered) {
                    bgClass = 'bg-slate-800 border-slate-700 text-slate-100 font-medium';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleQuestionNavigation(idx)}
                      className={`relative h-10 rounded-xl border text-xs font-mono transition-all flex items-center justify-center ${bgClass}`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          No quiz questions loaded for this topic. Use Document Studio or AI Chat to generate one.
        </div>
      )}
    </div>
    </div>
  );
};
