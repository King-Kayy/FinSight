import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMonthlyReport } from "@/hooks/useReports";
import { useExpenses } from "@/hooks/useExpenses";
import { useExportPDF, useExportExcel } from "@/hooks/useExport";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { formatGHS } from "../../shared/formatCurrency";

const MONTHS = [
  "","January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function Reports() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: report, isLoading } = useMonthlyReport(selectedYear, selectedMonth);
  const { data: allExpenses = [] } = useExpenses();
  const exportPDF = useExportPDF();
  const exportExcel = useExportExcel();

  const periodExpenses = allExpenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  async function handleExport(type: "pdf" | "excel") {
    try {
      if (type === "pdf") await exportPDF(selectedYear, selectedMonth);
      else await exportExcel(selectedYear, selectedMonth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month selector */}
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {MONTHS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>

          {/* Year selector */}
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin mr-2" />
          <span>Loading report…</span>
        </div>
      ) : !report ? (
        <p className="text-gray-400 text-center py-10">No data for this period.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Total Income" value={formatGHS(parseFloat(report.total_income))} description={`${MONTHS[selectedMonth]} ${selectedYear}`} />
            <SummaryCard label="Total Expenses" value={formatGHS(parseFloat(report.total_expenses))} description={`${MONTHS[selectedMonth]} ${selectedYear}`} />
            <SummaryCard
              label="Savings"
              value={formatGHS(parseFloat(report.savings))}
              variant={parseFloat(report.savings) < 0 ? "negative" : "default"}
              description="Income minus expenses"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Expense Breakdown</h2>
              <PieChart data={periodExpenses} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Monthly Comparison</h2>
              <BarChart data={[report]} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-700 mb-4">
              Spending Trend — {MONTHS[selectedMonth]} {selectedYear}
            </h2>
            <LineChart data={periodExpenses} month={selectedMonth} year={selectedYear} />
          </div>

          {/* Category breakdown table */}
          {report.expense_by_category.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-700">Expenses by Category</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.expense_by_category.map((cat) => (
                    <tr key={cat.category} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{cat.category}</td>
                      <td className="px-4 py-3 text-right">{formatGHS(parseFloat(cat.total))}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{cat.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
