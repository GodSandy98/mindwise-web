import client from './client';
import { Class, Student } from '../types';

export const getClasses = (includeArchived = false) =>
  client.get<Class[]>('/classes', { params: { include_archived: includeArchived } }).then(r => r.data);

export const getClassStudents = (classId: number) =>
  client.get<Student[]>(`/classes/${classId}/students`).then(r => r.data);

export const renameClass = (classId: number, name: string) =>
  client.patch<Class>(`/classes/${classId}`, { name }).then(r => r.data);

export const archiveClass = (classId: number) =>
  client.post<Class>(`/classes/${classId}/archive`).then(r => r.data);

export const restoreClass = (classId: number) =>
  client.post<Class>(`/classes/${classId}/restore`).then(r => r.data);

export const batchPromoteClasses = (classIds: number[], find: string, replace: string) =>
  client.post<Class[]>('/classes/batch-promote', { class_ids: classIds, find, replace }).then(r => r.data);
