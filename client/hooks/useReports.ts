import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { MonthlyReport } from "../../shared/api";

export function useMonthlyReport(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year !== undefined) params.set("year", String(year));
  if (month !== undefined) params.set("month", String(month));
  const query = params.toString() ? `?${params.toString()}` : "";

  return useQuery({
    queryKey: ["reports", year, month],
    queryFn: () => api.get<MonthlyReport>(`/api/reports/monthly${query}`),
    staleTime: 0,
    refetchOnMount: true,
  });
}
