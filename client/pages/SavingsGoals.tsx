import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSavingsGoals, useDeleteSavingsGoal } from "@/hooks/useSavingsGoals";
import { SavingsGoalCard } from "@/components/dashboard/SavingsGoalCard";
import { SavingsGoalForm } from "@/components/forms/SavingsGoalForm";
import type { SavingsGoal } from "../../shared/api";

// Card with hover-to-reveal + auto-hide action buttons
function GoalCardWrapper({
  goal,
  onEdit,
  onDelete,
  isDeleting,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show buttons briefly on mount, then hide after 2s
  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(false), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function handleMouseEnter() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
  }

  function handleMouseLeave() {
    timerRef.current = setTimeout(() => setVisible(false), 1200);
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SavingsGoalCard goal={goal} />
      <div
        className={`absolute bottom-3 right-3 flex gap-1 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
          onClick={onEdit}
          title="Edit goal"
        >
          <Pencil className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-red-50 hover:border-red-200"
          onClick={onDelete}
          title="Delete goal"
          disabled={isDeleting}
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>
    </div>
  );
}

export default function SavingsGoals() {
  const { data: goals = [], isLoading } = useSavingsGoals();
  const deleteGoal = useDeleteSavingsGoal();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | undefined>();

  function handleDelete(goal: SavingsGoal) {
    if (!confirm(`Delete "${goal.name}"?`)) return;
    deleteGoal.mutate(goal.id, {
      onSuccess: () => toast.success("Goal deleted"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
        <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Goal
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-10">Loading…</p>
      ) : goals.length === 0 ? (
        <p className="text-gray-400 text-center py-10">
          No savings goals yet. Create one to start tracking progress.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCardWrapper
              key={goal.id}
              goal={goal}
              onEdit={() => { setEditing(goal); setFormOpen(true); }}
              onDelete={() => handleDelete(goal)}
              isDeleting={deleteGoal.isPending}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <SavingsGoalForm
          existing={editing}
          onClose={() => { setFormOpen(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
