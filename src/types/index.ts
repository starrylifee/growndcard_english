export interface Word {
  id: number;
  english: string;
  korean: string;
}

export interface GradeWords {
  grade: string;
  gradeLabel: string;
  words: Word[];
}

export interface QuizRecord {
  round: number;
  date: string;
  score: number;
  total: number;
  passed: boolean;
  pointsAwarded: number;
  answers: { wordId: number; correct: boolean; userAnswer: string }[];
}

export interface PracticeLog {
  date: string;
  mode: PracticeMode;
  wordsStudied: number;
  correctCount: number;
  totalCount: number;
  pointsAwarded: number;
}

export type PracticeMode = 'meaning-typing' | 'listen-typing' | 'meaning-writing' | 'listen-writing';
export type QuizFormat = 'typing' | 'ocr' | 'multipleChoice';

export interface StudentProgress {
  studentCode: number;
  studentName: string;
  currentRound: number;
  quizHistory: QuizRecord[];
  practiceLog: PracticeLog[];
  wrongWords: number[];
  assignedGrade?: string;
  assignedQuizFormat?: QuizFormat;
}

export interface BonusTier {
  score: number;
  bonusPoints: number;
}

export interface PointConfig {
  practice: {
    completionPoints: number;
  };
  quiz: {
    passThreshold: number;
    totalQuestions: number;
    basePoints: number;
    bonusTiers: BonusTier[];
    roundMultiplier: number;
  };
  quizFormat: QuizFormat;
}

export interface AppConfig {
  growndApiKey: string;
  growndClassId: string;
  geminiApiKey: string;
  studentCodeRange: { start: number; end: number };
  selectedGrade: string;
  pointConfig: PointConfig;
}

export interface StudentInfo {
  studentCode: number;
  studentName: string;
  avatar?: string;
  totalPoints?: number;
  currentLevel?: number;
  levelName?: string;
}

export interface CustomWordSet {
  id: string;
  name: string;
  description?: string;
  words: Word[];
  createdAt: string;
  updatedAt: string;
}

export interface PointQueueItem {
  id: string;
  studentCode: number;
  points: number;
  type: 'reward' | 'penalty';
  description: string;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed' | 'sent';
}
