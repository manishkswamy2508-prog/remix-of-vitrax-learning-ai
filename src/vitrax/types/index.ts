// @ts-nocheck
export type ResponseDepth = 'auto' | 'quick' | 'balanced' | 'deep';

export type MainView = 'chat' | 'code' | 'library' | 'projects' | 'flashcards' | 'quiz' | 'research' | 'deep_analysis' | 'model_hub';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  depth?: ResponseDepth;
  toolUsed?: string;
  attachments?: {
    name: string;
    type: string;
    size: number;
    url?: string;
  }[];
  durationMs?: number;
  model?: string;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  model: string;
}

export interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

export interface CodeProject {
  id: string;
  name: string;
  description: string;
  activeFile: string;
  files: Record<string, string>;
  updatedAt: number;
}

export interface Flashcard {
  id: string;
  topic: string;
  front: string;
  back: string;
  hint?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  state?: 'new' | 'known' | 'uncertain' | 'review';
  lastReviewed?: number;
  sourceRef?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
  selectedOption?: number;
  isFlagged?: boolean;
  sourceRef?: string;
}

export interface KeyFormula {
  name: string;
  formula: string;
  meaning: string;
}

export interface QuizProgress {
  currentQuestionIndex: number;
  answers: Record<string, number>;
  flaggedQuestions: Record<string, boolean>;
  revealedHints: Record<string, boolean>;
  examMode: 'immediate' | 'exam';
  isTimed: boolean;
  isSubmitted: boolean;
  updatedAt: number;
}

export interface QuizAttempt {
  id: string;
  completedAt: number;
  score: number;
  total: number;
  answers: Record<string, number>;
}

export interface StudyPack {
  id: string;
  title: string;
  summary: string;
  createdAt: number;
  keyFormulas: KeyFormula[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  sourceTitle?: string;
  model?: string;
  quizProgress?: QuizProgress;
  quizAttempts?: QuizAttempt[];
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities?: Record<string, unknown>;
}

export interface OrchestrationStage {
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  content?: string;
  durationMs?: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'pdf' | 'docx' | 'txt' | 'markdown' | 'csv' | 'notes' | 'exam' | 'code';
  size: string;
  content: string;
  contentType?: 'pdf' | 'docx' | 'txt' | 'markdown' | 'csv';
  pages?: { pageNumber: number; content: string }[];
  mimeType?: string;
  questionsDetected?: number;
  uploadedAt: number;
}
