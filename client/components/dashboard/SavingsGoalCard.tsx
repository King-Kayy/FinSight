import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { SavingsGoal } from "../../../shared/api";
import { formatGHS } from "../../../shared/formatCurrency";

interface SavingsGoalCardProps {
  goal: SavingsGoal;
}

export function SavingsGoalCard({ goal }: SavingsGoalCardProps) {
  const progress = Math.min(goal.progress_percentage, 100);
  const isAchieved = goal.status === "achieved";

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-800">{goal.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Target: {new Date(goal.target_date).toLocaleDateString()}
          </p>
        </div>
        {isAchieved ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            Achieved
          </Badge>
        ) : (
          <span className="text-sm font-semibold text-gray-700">
            {progress.toFixed(0)}%
          </span>
        )}
      </div>

      <Progress value={progress} className="h-2 mb-2" />

      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatGHS(parseFloat(goal.current_savings))}</span>
        <span>{formatGHS(parseFloat(goal.target_amount))}</span>
      </div>
    </div>
  );
}
