import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { RecurringExpense, CreateRecurringExpenseRequest } from "../../shared/api";

export function useRecurring() {
  return useQuery({
    queryKey: ["recurring"],
    queryFn: () => api.get<RecurringExpense[]>("/api/recurring-expenses"),
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRecurringExpenseRequest) =>
      api.post<RecurringExpense>("/api/recurring-expenses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] });
    },
  });
}

export function useDeactivateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.put<RecurringExpense>(`/api/recurring-expenses/${id}/deactivate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
