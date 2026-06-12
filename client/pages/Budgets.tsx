import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { BudgetForm } from "@/components/forms/BudgetForm";
import type { BudgetRecord } from "../../shared/api";
import { formatGHS } from "../../shared/formatCurrency";

const MONTHS = [
  "","Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function Budgets() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get<BudgetRecord[]>("/api/budgets")
      .then(setBudgets)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetRecord | undefined>();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
        <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Set Budget
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-10">Loading…</p>
      ) : budgets.length === 0 ? (
        <p className="text-gray-400 text-center py-10">No budgets set. Create one to get started.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgets.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {MONTHS[b.month]} {b.year}
                  </td>
                  <td className="px-4 py-3 text-right">{formatGHS(parseFloat(b.amount))}</td>
                  <td className="px-4 py-3 text-right">{formatGHS(parseFloat(b.total_expenses))}</td>
                  <td className="px-4 py-3">
                    {b.alert ? (
                      <Badge variant="destructive" className="text-xs">
                        Exceeded by {formatGHS(parseFloat(b.total_expenses) - parseFloat(b.amount))}
                      </Badge>
                    ) : (
                      <span className="text-emerald-600 text-xs font-medium">
                        {formatGHS(parseFloat(b.remaining))} remaining
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditing(b); setFormOpen(true); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <BudgetForm
          existing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(undefined);
            refresh();
          }}
        />
      )}
    </div>
  );
}
