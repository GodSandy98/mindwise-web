export interface Teacher {
  id: number;
  phone: string;
  name: string;
  role: 'super_admin' | 'admin_teacher' | 'class_teacher';
  class_id: number | null;
  is_active: boolean;
}

export interface Student {
  id: number;
  name: string;
  class_id: number;
  class_name: string;
}

export interface Exam {
  id: number;
  name: string;
  date: string;
}

export interface Class {
  id: number;
  name: string;
}

export interface Indicator {
  id: number;
  name: string;
  system: string | null;
}

export interface IndicatorScore {
  indicator_id: number;
  score_raw: number;
  score_standardized: number | null;
}

export interface StudentScoreResult {
  student_id: number;
  exam_id: number;
  indicator_scores: IndicatorScore[];
}

export interface ScoreComputeResponse {
  results: StudentScoreResult[];
}

export interface AnswerItem {
  question_id: number;
  answer: number;
}

export interface AnswerSubmitRequest {
  student_id: number;
  exam_id: number;
  answers: AnswerItem[];
}

export interface AnswerSubmitResponse {
  student_id: number;
  exam_id: number;
  count: number;
}

export interface IndicatorAnalysis {
  indicator_name: string;
  score_standardized: number;
  level: 'H' | 'M' | 'L';
  analysis: string;
}

export interface ImprovementSuggestion {
  indicator_name: string;
  suggestion: string;
}

export interface ReportGenerateResponse {
  student_id: number;
  exam_id: number;
  strengths_analysis: IndicatorAnalysis[];
  weaknesses_analysis: IndicatorAnalysis[];
  improvement_suggestions: ImprovementSuggestion[];
}

export interface SavedIndicatorAnalysis {
  indicator_id: number;
  indicator_name: string;
  analysis: string;
  suggestion: string | null;
  is_positive: boolean;
}

export interface ReportGetResponse {
  report_id: number;
  student_id: number;
  exam_id: number;
  indicators: SavedIndicatorAnalysis[];
}
