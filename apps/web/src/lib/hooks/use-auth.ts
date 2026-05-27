'use client';

import { useQuery } from '@tanstack/react-query';

import { authApi } from '../api-client';
import { queryKeys } from '../query-keys';

export function useMe(token?: string) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.me(token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
