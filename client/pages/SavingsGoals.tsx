import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { SavingsGoalCard } from "@/components/dashboard/SavingsGoalCard";
import { SavingsGoalForm } from "@/components/forms/SavingsGoalForm";
import type { SavingsGoal } from "../../shared/api";

export default function SavingsGoals() {
  const { data: goals = [], isLoading } = useSavingsGoals();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | undefined>();

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
            <div key={goal.id} className="relative group">
              <SavingsGoalCard goal={goal} />
              <button
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md
                 bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                onClick={() => { setEditing(goal); setFormOpen(true); }}
                title="Edit goal"
              >
                ✎
              </button>
            </div>
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
