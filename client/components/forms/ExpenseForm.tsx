import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { TransactionRecord } from "../../../shared/api";

interface OcrPrefill {
  amount?: string | null;
  date?: string | null;
  vendor?: string | null;
}

interface ExpenseFormProps {
  onClose: () => void;
  existing?: TransactionRecord;
  prefill?: OcrPrefill;
}

export function ExpenseForm({ onClose, existing, prefill }: ExpenseFormProps) {
  const [amount, setAmount] = useState(existing?.amount ?? prefill?.amount ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [date, setDate] = useState(
    existing?.date ?? prefill?.date ?? new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState(
    existing?.description ?? prefill?.vendor ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply prefill when it changes (e.g. after OCR returns)
  useEffect(() => {
    if (prefill) {
      if (prefill.amount) setAmount(prefill.amount);
      if (prefill.date) setDate(prefill.date);
      if (prefill.vendor) setDescription(prefill.vendor);
    }
  }, [prefill]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const data = {
      amount: parseFloat(amount as string),
      category,
      date,
      description: description || undefined,
    };
    try {
      if (existing) {
        await api.put(`/api/expenses/${existing.id}`, data);
        toast.success("Expense updated");
      } else {
        await api.post("/api/expenses", data);
        toast.success("Expense added");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="exp-amount">Amount (GHS)</Label>
            <Input
              id="exp-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-category">Category</Label>
            <Input
              id="exp-category"
              placeholder="e.g. Food, Transport, Rent"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-date">Date</Label>
            <Input
              id="exp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Description / Vendor (optional)</Label>
            <Input
              id="exp-desc"
              placeholder="e.g. Shoprite Ghana"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
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
              {existing ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
