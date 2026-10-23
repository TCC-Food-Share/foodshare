import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError, isTooManyRequests } from '@/lib/api';

// Set by AuthProvider; invoked whenever a query/mutation gets a 401.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function handleError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    onUnauthorized?.();
    return;
  }
  if (isTooManyRequests(error)) {
    toast.error('Muitas requisições em pouco tempo. Aguarde um minuto e tente de novo.', {
      id: 'too-many-requests',
    });
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 5_000,
    },
    mutations: {
      retry: false,
    },
  },
});
