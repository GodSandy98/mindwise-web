import client from './client';
import { Teacher } from '../types';

export const getTeachers = () =>
  client.get<Teacher[]>('/teachers').then(r => r.data);

export const createTeacher = (data: { name: string; phone: string; password: string; role: string; class_id?: number }) =>
  client.post<Teacher>('/teachers', data).then(r => r.data);

export const updateTeacher = (id: number, data: { role?: string; class_id?: number | null; is_active?: boolean; name?: string }) =>
  client.patch<Teacher>(`/teachers/${id}`, data).then(r => r.data);

export const deleteTeacher = (id: number) =>
  client.delete(`/teachers/${id}`);
