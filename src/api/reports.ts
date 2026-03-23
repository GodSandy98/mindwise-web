import client from './client';
import { ReportGenerateResponse } from '../types';

export const generateReport = (studentId: number, examId: number) =>
  client.post<ReportGenerateResponse>('/reports/generate', { student_id: studentId, exam_id: examId }).then(r => r.data);

export const saveReport = (payload: ReportGenerateResponse) =>
  client.post('/reports/save', payload).then(r => r.data);
