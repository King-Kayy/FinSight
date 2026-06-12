import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { BudgetRecord, CreateBudgetRequest } from '../../shared/api';

export function useBudgets(month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month !== undefined) params.set('month', String(month));
  if (year !== undefined) params.set('year', String(year));
  const query = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => api.get<BudgetRecord[]>(`/api/budgets${query}`),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetRequest) => api.post<BudgetRecord>('/api/budgets', data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['budgets'], exact: false });
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false });
      qc.invalidateQueries({ queryKey: ['reports'], exact: false });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { amount: number } }) =>
      api.put<BudgetRecord>(`/api/budgets/${id}`, data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['budgets'], exact: false });
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false });
      qc.invalidateQueries({ queryKey: ['reports'], exact: false });
    },
  });
}
