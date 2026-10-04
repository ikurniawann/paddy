"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/providers/toast-provider";

interface UseDataFetchingOptions<T> {
  fetchFn: () => Promise<T>;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface UseDataFetchingReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDataFetching<T>({
  fetchFn,
  initialData,
  onSuccess,
  onError,
  enabled = true,
}: UseDataFetchingOptions<T>): UseDataFetchingReturn<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { error: showError } = useToast();

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Terjadi kesalahan");
      setError(error);
      onError?.(error);
      showError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, onSuccess, onError, showError]);

  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [enabled, refetch]);

  return { data, isLoading, error, refetch };
}

// Hook for mutations with loading state and toast notifications
interface UseMutationOptions<T, V> {
  mutationFn: (variables: V) => Promise<T>;
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: Error, variables: V) => void;
  successMessage?: string;
}

interface UseMutationReturn<T, V> {
  mutate: (variables: V) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useMutation<T, V>({
  mutationFn,
  onSuccess,
  onError,
  successMessage,
}: UseMutationOptions<T, V>): UseMutationReturn<T, V> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  const mutate = useCallback(async (variables: V) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await mutationFn(variables);
      if (successMessage) {
        showSuccess(successMessage);
      }
      onSuccess?.(result, variables);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Terjadi kesalahan");
      setError(error);
      showError(error.message);
      onError?.(error, variables);
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, onSuccess, onError, successMessage, showSuccess, showError]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return { mutate, isLoading, error, reset };
}
