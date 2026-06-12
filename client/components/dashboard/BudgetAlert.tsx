import { AlertTriangle } from "lucide-react";
import type { BudgetRecord } from "../../../shared/api";

interface BudgetAlertProps {
  budgets: BudgetRecord[];
}

export function BudgetAlert({ budgets }: BudgetAlertProps) {
  const alerts = budgets.filter((b) => b.alert);
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((b) => {
        const overage = (
          parseFloat(b.total_expenses) - parseFloat(b.amount)
        ).toFixed(2);
        return (
          <div
            key={b.id}
            className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {b.month}/{b.year} Budget Alert
              </p>
              <p className="text-sm text-red-700">
                Exceeded budget by GHS {overage}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
