export interface CorrectionPoint {
  original: string;
  correction: string;
  explanation: string;
  isCorrect: boolean;
}

export interface GradingResult {
  score: number;
  letterGrade: string;
  summary: string;
  details: CorrectionPoint[];
}

export enum AppStep {
  SETUP = 'SETUP',
  CAMERA = 'CAMERA',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
}
