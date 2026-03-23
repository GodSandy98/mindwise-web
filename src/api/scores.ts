import client from './client';
import { StudentScoreResult, ScoreComputeResponse } from '../types';

export const getStudentScores = (studentId: number, examId: number) =>
  client.get<StudentScoreResult>(`/scores/student/${studentId}`, { params: { exam_id: examId } }).then(r => r.data);

export const getExamScores = (examId: number) =>
  client.get<ScoreComputeResponse>(`/scores/exam/${examId}`).then(r => r.data);

export const computeScores = (examId: number) =>
  client.post<ScoreComputeResponse>('/scores/compute', { exam_id: examId }).then(r => r.data);
