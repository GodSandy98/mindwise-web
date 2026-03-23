import client from './client';
import { Exam } from '../types';

export const getExams = () => client.get<Exam[]>('/exams').then(r => r.data);
export const getExam = (id: number) => client.get<Exam>(`/exams/${id}`).then(r => r.data);
