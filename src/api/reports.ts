import client from './client';
import { ReportGenerateResponse, ReportGetResponse } from '../types';

export const generateReport = (studentId: number, examId: number) =>
  client.post<ReportGenerateResponse>('/reports/generate', { student_id: studentId, exam_id: examId }).then(r => r.data);

export const saveReport = (payload: ReportGenerateResponse) =>
  client.post('/reports/save', payload).then(r => r.data);

export const getReport = (studentId: number, examId: number) =>
  client.get<ReportGetResponse>(`/reports/student/${studentId}?exam_id=${examId}`).then(r => r.data);
