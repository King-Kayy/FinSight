import { TrendingUp, TrendingDown, PiggyBank, Loader2 } from "lucide-react";
import { useMonthlyReport } from "@/hooks/useReports";
import { useBudgets } from "@/hooks/useBudgets";
import { useExpenses } from "@/hooks/useExpenses";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { BudgetAlert } from "@/components/dashboard/BudgetAlert";
import { SavingsGoalCard } from "@/components/dashboard/SavingsGoalCard";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { formatGHS } from "../../shared/formatCurrency";

export default function Dashboard() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: report, isLoading: reportLoading } = useMonthlyReport(
    currentYear,
    currentMonth
  );
  const { data: budgets = [] } = useBudgets(currentMonth, currentYear);
  const { data: allExpenses = [] } = useExpenses();
  const { data: savingsGoals = [] } = useSavingsGoals();

  // Filter expenses for current month (for pie and line charts)
  const currentMonthExpenses = allExpenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = parseFloat(report?.total_income ?? "0");
  const totalExpenses = parseFloat(report?.total_expenses ?? "0");
  const savings = parseFloat(report?.savings ?? "0");

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {now.toLocaleString("default", { month: "long", year: "numeric" })} overview
        </p>
      </div>

      {/* Budget alerts */}
      {budgets.length > 0 && <BudgetAlert budgets={budgets} />}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Income"
          value={formatGHS(totalIncome)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          description="This month"
        />
        <SummaryCard
          label="Total Expenses"
          value={formatGHS(totalExpenses)}
          icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          description="This month"
        />
        <SummaryCard
          label="Savings"
          value={formatGHS(savings)}
          variant={savings < 0 ? "negative" : "default"}
          icon={<PiggyBank className="w-5 h-5 text-blue-600" />}
          description="Income minus expenses"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Expense Breakdown
          </h2>
          <PieChart data={currentMonthExpenses} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Monthly Comparison (12 months)
          </h2>
          <BarChart data={report ? [report] : []} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          Spending Trend — {now.toLocaleString("default", { month: "long" })}
        </h2>
        <LineChart
          data={currentMonthExpenses}
          month={currentMonth}
          year={currentYear}
        />
      </div>

      {/* Savings goals */}
      {savingsGoals.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            Savings Goals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savingsGoals.map((goal) => (
              <SavingsGoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
