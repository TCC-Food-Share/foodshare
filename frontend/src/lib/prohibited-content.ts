import { ApiError } from '@/lib/api';

export const PROHIBITED_CONTENT_MESSAGE =
  'Este texto contém palavras não permitidas ou links. Revise o texto.';

export function prohibitedContentFields(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.status !== 400) return [];
  const body = error.body;
  if (!body || typeof body !== 'object') return [];
  if (!('code' in body) || body.code !== 'PROHIBITED_CONTENT') return [];
  if (!('fields' in body) || !Array.isArray(body.fields)) return [];
  return body.fields.filter((field): field is string => typeof field === 'string');
}
