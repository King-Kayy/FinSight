import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TransactionRecord, CreateTransactionRequest } from '../../shared/api';

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get<TransactionRecord[]>('/api/expenses'),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => api.post<TransactionRecord>('/api/expenses', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'], exact: false });
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false });
      qc.invalidateQueries({ queryKey: ['budgets'], exact: false });
      qc.invalidateQueries({ queryKey: ['reports'], exact: false });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateTransactionRequest }) =>
      api.put<TransactionRecord>(`/api/expenses/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'], exact: false });
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false });
      qc.invalidateQueries({ queryKey: ['budgets'], exact: false });
      qc.invalidateQueries({ queryKey: ['reports'], exact: false });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'], exact: false });
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false });
      qc.invalidateQueries({ queryKey: ['budgets'], exact: false });
      qc.invalidateQueries({ queryKey: ['reports'], exact: false });
    },
  });
}
