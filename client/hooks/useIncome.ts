import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TransactionRecord, CreateTransactionRequest } from '../../shared/api';

export function useIncome() {
  return useQuery({
    queryKey: ['income'],
    queryFn: () => api.get<TransactionRecord[]>('/api/income'),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => api.post<TransactionRecord>('/api/income', data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['income'], exact: false });
      await qc.refetchQueries({ queryKey: ['reports'], exact: false });
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false });
      qc.invalidateQueries({ queryKey: ['budgets'], exact: false });
    },
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateTransactionRequest }) =>
      api.put<TransactionRecord>(`/api/income/${id}`, data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['income'], exact: false });
      await qc.refetchQueries({ queryKey: ['reports'], exact: false });
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false });
      qc.invalidateQueries({ queryKey: ['budgets'], exact: false });
    },
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/income/${id}`),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['income'], exact: false });
      await qc.refetchQueries({ queryKey: ['reports'], exact: false });
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false });
      qc.invalidateQueries({ queryKey: ['budgets'], exact: false });
    },
  });
}
