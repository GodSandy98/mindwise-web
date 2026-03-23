import client from './client';
import { Class, Student } from '../types';

export const getClasses = () => client.get<Class[]>('/classes').then(r => r.data);
export const getClassStudents = (classId: number) => client.get<Student[]>(`/classes/${classId}/students`).then(r => r.data);
