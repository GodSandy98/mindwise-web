import client from './client';
import { ReportGenerateResponse, ReportSaveRequest, ReportGetResponse, IndicatorHistoryResponse } from '../types';

export interface BatchJobStatus {
  job_id: number;
  status: 'pending' | 'running' | 'done' | 'failed';
  total: number;
  success: number;
  failed: number;
  errors: { student_id: number; student_name: string; error: string }[];
  updated_at: string | null;
}

export interface BatchJobSummary {
  job_id: number;
  status: 'pending' | 'running' | 'done' | 'failed';
  total: number;
  success: number;
  failed: number;
  created_at: string | null;
}

export const generateReport = (studentId: number, examId: number) =>
  client.post<ReportGenerateResponse>('/reports/generate', { student_id: studentId, exam_id: examId }, { timeout: 120000 }).then(r => r.data);

export const saveReport = (payload: ReportSaveRequest) =>
  client.post('/reports/save', payload).then(r => r.data);

export const getReport = (studentId: number, examId: number) =>
  client.get<ReportGetResponse>(`/reports/student/${studentId}?exam_id=${examId}`).then(r => r.data);

export const getIndicatorHistory = (studentId: number, examId: number) =>
  client.get<IndicatorHistoryResponse>(`/reports/student/${studentId}/indicator-history?exam_id=${examId}`).then(r => r.data);

export interface StudentReportStatus {
  student_id: number;
  student_name: string;
  class_id: number;
  class_name: string;
  has_report: boolean;
}

export const getStudentReportStatus = (examId: number, classId?: number) => {
  const params = new URLSearchParams({ exam_id: String(examId) });
  if (classId) params.append('class_id', String(classId));
  return client.get<StudentReportStatus[]>(`/reports/student-report-status?${params}`).then(r => r.data);
};

export const batchGenerateReports = (examId: number, studentIds: number[], classId?: number) =>
  client.post<{ job_id: number; total: number; status: string }>(
    '/reports/batch-generate',
    { exam_id: examId, student_ids: studentIds, class_id: classId }
  ).then(r => r.data);

export const getBatchJob = (jobId: number) =>
  client.get<BatchJobStatus>(`/reports/batch-jobs/${jobId}`).then(r => r.data);

export const listBatchJobs = (examId: number) =>
  client.get<BatchJobSummary[]>(`/reports/batch-jobs?exam_id=${examId}`).then(r => r.data);

export const exportSingleDocx = (studentId: number, examId: number) =>
  client.get(`/reports/student/${studentId}/export-docx?exam_id=${examId}`, { responseType: 'blob' }).then(r => r.data);

export const batchExportDocx = (examId: number, studentIds: number[]) =>
  client.post('/reports/batch-export-docx', { exam_id: examId, student_ids: studentIds }, { responseType: 'blob', timeout: 300000 }).then(r => r.data);
