import { useQueryClient } from '@tanstack/react-query';

import type { AdminListParams, Paginated } from '@/features/admin/lists/list-api';
import type { SuggestionStatus, SuggestionType } from '@/features/suggestions/suggestion-labels';
import { api } from '@/lib/api';

export interface AdminSuggestion {
  id: number;
  type: SuggestionType;
  text: string;
  status: SuggestionStatus;
  requesterName: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface ApproveSuggestionPayload {
  text: string;
  categoryId?: number;
  abbreviation?: string;
  allowsFraction?: boolean;
}

export const listAdminSuggestions = (params: AdminListParams) =>
  api.get<Paginated<AdminSuggestion>>('/admin/suggestions', { query: params });

export const approveSuggestion = (id: number, payload: ApproveSuggestionPayload) =>
  api.patch<AdminSuggestion>(`/admin/suggestions/${id}/approve`, payload);

export const rejectSuggestion = (id: number) =>
  api.patch<AdminSuggestion>(`/admin/suggestions/${id}/reject`, {});

export const ALREADY_REVIEWED_MESSAGE = 'Esta sugestão já foi avaliada por outro administrador.';

export function useSuggestionsInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
    ]);
}
