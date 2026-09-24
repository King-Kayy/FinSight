import { TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useMonthlyReport } from "@/hooks/useReports";
import { useBudgets } from "@/hooks/useBudgets";
import { useExpenses } from "@/hooks/useExpenses";
import { useIncome } from "@/hooks/useIncome";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useAuth } from "@/hooks/useAuth";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { BudgetAlert } from "@/components/dashboard/BudgetAlert";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarChart } from "@/components/charts/BarChart";
import { formatGHS } from "../../shared/formatCurrency";
import { Progress } from "@/components/ui/progress";

// ---------------------------------------------------------------------------
// Motivational tips — shown in the banner
// ---------------------------------------------------------------------------
const TIPS = [
  "Small daily savings compound into significant wealth over time.",
  "Track every cedi — awareness is the first step to financial freedom.",
  "Pay yourself first: save before you spend.",
  "An emergency fund of 3–6 months expenses protects you from surprises.",
  "Avoid lifestyle inflation — increase savings when income grows.",
];

function getTip(): string {
  return TIPS[new Date().getDate() % TIPS.length];
}

// ---------------------------------------------------------------------------
// Category icon colors for recent transactions
// ---------------------------------------------------------------------------
const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-100 text-orange-600",
  Transport: "bg-blue-100 text-blue-600",
  Utilities: "bg-yellow-100 text-yellow-600",
  Shopping: "bg-pink-100 text-pink-600",
  Health: "bg-red-100 text-red-600",
  Education: "bg-purple-100 text-purple-600",
  Entertainment: "bg-indigo-100 text-indigo-600",
  Rent: "bg-gray-100 text-gray-600",
  Salary: "bg-emerald-100 text-emerald-600",
  Business: "bg-teal-100 text-teal-600",
  Gifts: "bg-rose-100 text-rose-600",
};

function categoryStyle(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-500";
}

function categoryInitial(category: string): string {
  return (category ?? "?").charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const { data: report, isLoading: reportLoading } = useMonthlyReport(currentYear, currentMonth);
  const { data: prevReport } = useMonthlyReport(prevYear, prevMonth);
  const { data: budgets = [] } = useBudgets(currentMonth, currentYear);
  const { data: allExpenses = [] } = useExpenses();
  const { data: allIncome = [] } = useIncome();
  const { data: savingsGoals = [] } = useSavingsGoals();

  const currentMonthExpenses = allExpenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = parseFloat(report?.total_income ?? "0");
  const totalExpenses = parseFloat(report?.total_expenses ?? "0");
  const savings = parseFloat(report?.savings ?? "0");

  const prevIncome = parseFloat(prevReport?.total_income ?? "0");
  const prevExpenses = parseFloat(prevReport?.total_expenses ?? "0");
  const prevSavings = parseFloat(prevReport?.savings ?? "0");

  function pctChange(current: number, prev: number): number | null {
    if (prev === 0) return null;
    return ((current - prev) / prev) * 100;
  }

  const incomeTrend = pctChange(totalIncome, prevIncome);
  const expenseTrend = pctChange(totalExpenses, prevExpenses);
  const savingsTrend = pctChange(savings, prevSavings);

  // Savings rate
  const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  // Recent transactions — last 5 merged income + expenses sorted by date desc
  const recentTransactions = [
    ...allIncome.map((r) => ({ ...r, txType: "income" as const })),
    ...allExpenses.map((r) => ({ ...r, txType: "expense" as const })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── Header banner ── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">
              Welcome back, {user?.name?.split(" ")[0] ?? "there"}
            </h1>
            {savingsRate > 0 ? (
              <p className="text-emerald-100 text-sm mt-0.5">
                You've saved {savingsRate}% of your income this month
              </p>
            ) : (
              <p className="text-emerald-100 text-sm mt-0.5 italic">{getTip()}</p>
            )}
          </div>
          <span className="self-start sm:self-center text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full shrink-0">
            {now.toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
        </div>
        {savingsRate > 0 && (
          <p className="text-emerald-100 text-xs mt-2 italic">{getTip()}</p>
        )}
      </div>

      {/* ── Budget alerts ── */}
      {budgets.length > 0 && <BudgetAlert budgets={budgets} />}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Income"
          value={formatGHS(totalIncome)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          accentColor="green"
          trend={incomeTrend !== null ? { value: incomeTrend, label: "from last month" } : undefined}
          description="This month"
        />
        <SummaryCard
          label="Total Expenses"
          value={formatGHS(totalExpenses)}
          icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          accentColor="red"
          trend={expenseTrend !== null ? { value: expenseTrend, label: "from last month" } : undefined}
          description="This month"
        />
        <SummaryCard
          label="Savings"
          value={formatGHS(savings)}
          variant={savings < 0 ? "negative" : "default"}
          icon={<PiggyBank className="w-5 h-5 text-blue-600" />}
          accentColor="blue"
          trend={savingsTrend !== null ? { value: savingsTrend, label: "from last month" } : undefined}
          description="Income minus expenses"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Expense Breakdown</h2>
          <DonutChart data={currentMonthExpenses} total={totalExpenses} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Comparison</h2>
          <BarChart data={report ? [report] : []} />
        </div>
      </div>

      {/* ── Recent transactions + Savings goals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No transactions yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentTransactions.map((tx) => (
                <li key={`${tx.txType}-${tx.id}`} className="flex items-center gap-3">
                  {/* Category avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${categoryStyle(tx.category)}`}>
                    {categoryInitial(tx.category)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {tx.description ?? tx.category}
                    </p>
                    <p className="text-xs text-gray-400">{tx.date}</p>
                  </div>

                  {/* Amount */}
                  <div className={`flex items-center gap-0.5 text-sm font-semibold shrink-0 ${tx.txType === "income" ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.txType === "income"
                      ? <ArrowUpRight className="w-3.5 h-3.5" />
                      : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {formatGHS(parseFloat(tx.amount))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Savings goals */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Savings Goals</h2>
          {savingsGoals.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No savings goals set.</p>
          ) : (
            <ul className="space-y-4">
              {savingsGoals.slice(0, 4).map((goal) => {
                const progress = Math.min(goal.progress_percentage, 100);
                const isAchieved = goal.status === "achieved";
                return (
                  <li key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">
                        {goal.name}
                      </span>
                      <span className={`text-xs font-semibold ${isAchieved ? "text-emerald-600" : "text-gray-500"}`}>
                        {isAchieved ? "Achieved" : `${progress.toFixed(0)}%`}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{formatGHS(parseFloat(goal.current_savings))}</span>
                      <span>{formatGHS(parseFloat(goal.target_amount))}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
