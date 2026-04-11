export interface Teacher {
  id: number;
  phone: string;
  name: string;
  role: 'super_admin' | 'admin_teacher' | 'psych_teacher' | 'class_teacher';
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
  is_active: boolean;
  graduated_at: string | null;
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
  indicator_id: number;
  indicator_name: string;
  score_raw: number;
  score_standardized: number;
  level: 'H' | 'M' | 'L';
  system: string;
  analysis: string;            // student-facing (LLM-generated)
  analysis_teacher: string;    // teacher-facing (LLM-generated)
  suggestion?: string | null;  // only present for weaknesses
}

export interface SystemLevelResult {
  system: string;
  avg_z: number;
  level: 'H' | 'M' | 'L';
}

export interface PersonaResult {
  code: string;
  teacher_label: string;
  teacher_description: string;
  student_label: string;
  student_description: string;
}

export interface ReportGenerateResponse {
  student_id: number;
  exam_id: number;
  persona: PersonaResult;
  system_levels: SystemLevelResult[];
  summary: string;                  // LLM综合概述，学生口吻
  strengths: IndicatorAnalysis[];   // top 3
  weaknesses: IndicatorAnalysis[];  // bottom 3 (with suggestions)
}

export interface ReportSaveRequest {
  student_id: number;
  exam_id: number;
  persona_code: string;
  motivation_level: string;
  regulation_level: string;
  execution_level: string;
  summary: string;
  strengths: IndicatorAnalysis[];
  weaknesses: IndicatorAnalysis[];
}

export interface SavedIndicatorAnalysis {
  indicator_id: number;
  indicator_name: string;
  analysis: string | null;
  suggestion: string | null;
  is_positive: boolean;
}

export interface ReportGetResponse {
  report_id: number;
  student_id: number;
  exam_id: number;
  persona: PersonaResult | null;
  motivation_level: string | null;
  regulation_level: string | null;
  execution_level: string | null;
  summary: string | null;
  indicators: SavedIndicatorAnalysis[];
}

export interface IndicatorVersion {
  version: number;
  analysis: string | null;
  suggestion: string | null;
  is_current: boolean;
  created_at: string; // ISO datetime string
}

export interface IndicatorHistory {
  indicator_id: number;
  indicator_name: string;
  is_positive: boolean;
  versions: IndicatorVersion[];
}

export interface IndicatorHistoryResponse {
  report_id: number;
  student_id: number;
  exam_id: number;
  indicators: IndicatorHistory[];
}
