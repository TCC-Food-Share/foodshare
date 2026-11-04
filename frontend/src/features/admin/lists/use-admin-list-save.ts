import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminListApi, type AdminListResource } from '@/features/admin/lists/list-api';
import { ApiError } from '@/lib/api';

export function adminErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const body = error.body;
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
    ? body.code
    : undefined;
}

export function useAdminListInvalidate(resource: AdminListResource) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', resource] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
    ]);
}

export function useAdminListSave<T, Payload>(resource: AdminListResource) {
  const invalidate = useAdminListInvalidate(resource);
  const listApi = adminListApi<T, Payload>(resource);
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Payload }) =>
      id === undefined ? listApi.create(payload) : listApi.update(id, payload),
    onSuccess: invalidate,
  });
}
