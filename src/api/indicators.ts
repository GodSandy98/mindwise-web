import client from './client';
import { Indicator } from '../types';

export const getIndicators = () => client.get<Indicator[]>('/indicators').then(r => r.data);
