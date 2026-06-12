import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { SavingsGoal, CreateSavingsGoalRequest } from "../../shared/api";

export function useSavingsGoals() {
  return useQuery({
    queryKey: ["savings-goals"],
    queryFn: () => api.get<SavingsGoal[]>("/api/savings-goals"),
  });
}

export function useCreateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSavingsGoalRequest) =>
      api.post<SavingsGoal>("/api/savings-goals", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings-goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateSavingsGoalRequest>;
    }) => api.put<SavingsGoal>(`/api/savings-goals/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings-goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
