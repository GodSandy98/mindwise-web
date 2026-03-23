import client from './client';
import { AnswerSubmitRequest, AnswerSubmitResponse } from '../types';

export const submitAnswers = (payload: AnswerSubmitRequest) =>
  client.post<AnswerSubmitResponse>('/answers/submit', payload).then(r => r.data);
