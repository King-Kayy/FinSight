import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { BudgetRecord } from "../../../shared/api";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface BudgetFormProps {
  onClose: () => void;
  existing?: BudgetRecord;
}

export function BudgetForm({ onClose, existing }: BudgetFormProps) {
  const now = new Date();
  const [amount, setAmount] = useState(existing ? existing.amount : "");
  const [month, setMonth] = useState(existing?.month ?? now.getMonth() + 1);
  const [year, setYear] = useState(existing?.year ?? now.getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (existing) {
        await api.put(`/api/budgets/${existing.id}`, { amount: parseFloat(amount as string) });
        toast.success("Budget updated");
      } else {
        await api.post("/api/budgets", { amount: parseFloat(amount as string), month, year });
        toast.success("Budget created");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Budget" : "Set Budget"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="bgt-amount">Budget Amount (GHS)</Label>
            <Input
              id="bgt-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isSubmitting || !!existing}
            />
          </div>
          {!existing && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bgt-month">Month</Label>
                <select
                  id="bgt-month"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  disabled={isSubmitting}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bgt-year">Year</Label>
                <Input
                  id="bgt-year"
                  type="number"
                  min="2000"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {existing ? "Update" : "Create Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
