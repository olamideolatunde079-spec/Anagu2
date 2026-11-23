'use client';

/**
 * useApplications — fetches the current user's applications from the NestJS backend.
 * Uses TanStack Query for caching and background refetch.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Application } from '@/types';

export function useApplications() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn:  async () => {
      // The backend endpoint returns the authenticated user's applications
      // (JWT from localStorage is attached by the api interceptor).
      const response = await api.get<Application[]>('/applications');
      return response.data;
    },
    staleTime:    30_000,   // consider fresh for 30 s
    refetchOnWindowFocus: true,
  });

  return {
    applications: data ?? [],
    isLoading,
    error:   error as Error | null,
    refetch,
  };
}
