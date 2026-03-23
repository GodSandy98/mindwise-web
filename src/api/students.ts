import client from './client';
import { Student } from '../types';

export const getStudents = () => client.get<Student[]>('/students/students').then(r => r.data);
export const getStudent = (id: number) => client.get<Student>(`/students/${id}`).then(r => r.data);
