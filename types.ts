
export interface CorrectionPoint {
  original: string;
  correction: string;
  explanation: string;
  isCorrect: boolean;
  x?: number; // 0-100
  y?: number; // 0-100
  pageIndex?: number; // Index of the image (0-based)
}

export interface GradingResult {
  score: number;
  letterGrade: string;
  summary: string;
  className?: string; // Tên lớp phát hiện được (VD: 5A, 9B)
  detectedGradeLevel?: string; // Trình độ (Tiểu học, THCS, THPT)
  detectedSubject?: string; // Môn học phát hiện được (VD: Toán, Văn...)
  details: CorrectionPoint[];
}

export interface Annotation {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  type: 'correct' | 'incorrect' | 'text';
  text?: string; // Nội dung text (nếu type là 'text')
  pageIndex: number; // Index of the image
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  score: number;
  letterGrade: string;
  className: string; // Tên lớp dùng để group
  images: string[]; // List of Base64 strings (pages)
  image?: string; // Deprecated: legacy support
  result: GradingResult;
}

export enum AppStep {
  SETUP = 'SETUP',
  CAMERA = 'CAMERA',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
}