import client from './client';
import { Teacher } from '../types';

export const login = (phone: string, password: string) =>
  client.post<{ access_token: string; token_type: string }>('/auth/login', { phone, password }).then(r => r.data);

export const register = (name: string, phone: string, password: string) =>
  client.post<Teacher>('/auth/register', { name, phone, password }).then(r => r.data);

export const getMe = () =>
  client.get<Teacher>('/auth/me').then(r => r.data);
