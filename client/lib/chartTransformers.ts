import type { TransactionRecord, MonthlyReport } from "../../shared/api";


// Pie chart — expense breakdown by category


export function toPieChartData(expenses: TransactionRecord[]) {
  const categoryMap = new Map<string, number>();
  for (const e of expenses) {
    const cat = e.category ?? "Other";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + parseFloat(e.amount));
  }
  const labels = Array.from(categoryMap.keys());
  const data = Array.from(categoryMap.values());
  const COLORS = [
    "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
    "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
    "#f97316", "#a78bfa",
  ];
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: 1,
      },
    ],
  };
}


// Bar chart — 12-month income vs expenses comparison


export function toBarChartData(reports: MonthlyReport[]) {
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
    });
  }

  const reportMap = new Map<string, MonthlyReport>();
  for (const r of reports) {
    reportMap.set(`${r.year}-${r.month}`, r);
  }

  const incomeData = months.map(
    (m) => parseFloat(reportMap.get(`${m.year}-${m.month}`)?.total_income ?? "0")
  );
  const expenseData = months.map(
    (m) => parseFloat(reportMap.get(`${m.year}-${m.month}`)?.total_expenses ?? "0")
  );

  return {
    labels: months.map((m) => m.label),
    datasets: [
      {
        label: "Income (GHS)",
        data: incomeData,
        backgroundColor: "rgba(16, 185, 129, 0.7)",
        borderColor: "#10b981",
        borderWidth: 1,
      },
      {
        label: "Expenses (GHS)",
        data: expenseData,
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderColor: "#ef4444",
        borderWidth: 1,
      },
    ],
  };
}


// Line chart — cumulative daily spending for selected month


export function toLineChartData(
  expenses: TransactionRecord[],
  month: number,
  year: number
) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyTotals = new Array<number>(daysInMonth).fill(0);

  for (const e of expenses) {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      dailyTotals[d.getDate() - 1] += parseFloat(e.amount);
    }
  }

  // Build cumulative sum (monotonically non-decreasing)
  const cumulative = dailyTotals.reduce<number[]>((acc, val) => {
    acc.push((acc[acc.length - 1] ?? 0) + val);
    return acc;
  }, []);

  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  return {
    labels,
    datasets: [
      {
        label: "Cumulative Spending (GHS)",
        data: cumulative,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };
}
