import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useCreateSavingsGoal, useUpdateSavingsGoal } from "@/hooks/useSavingsGoals";
import type { SavingsGoal, CreateSavingsGoalRequest } from "../../../shared/api";

interface SavingsGoalFormProps {
  onClose: () => void;
  existing?: SavingsGoal;
}

export function SavingsGoalForm({ onClose, existing }: SavingsGoalFormProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(existing?.target_amount ?? "");
  const [targetDate, setTargetDate] = useState(existing?.target_date ?? "");
  const [error, setError] = useState<string | null>(null);

  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const isLoading = createGoal.isPending || updateGoal.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (existing) {
        await updateGoal.mutateAsync({
          id: existing.id,
          data: { name, target_amount: parseFloat(targetAmount as string), target_date: targetDate },
        });
        toast.success("Savings goal updated");
      } else {
        const data: CreateSavingsGoalRequest = {
          name,
          target_amount: parseFloat(targetAmount as string),
          target_date: targetDate,
        };
        await createGoal.mutateAsync(data);
        toast.success("Savings goal created");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  // Min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Goal" : "New Savings Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="sg-name">Goal Name</Label>
            <Input
              id="sg-name"
              placeholder="e.g. Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sg-amount">Target Amount (GHS)</Label>
            <Input
              id="sg-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sg-date">Target Date</Label>
            <Input
              id="sg-date"
              type="date"
              min={minDate}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {existing ? "Save Changes" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
