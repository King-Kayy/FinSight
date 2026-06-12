import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { MonthlyReport } from "../../../shared/api";
import { toBarChartData } from "../../lib/chartTransformers";
import { EmptyChartMessage } from "./EmptyChartMessage";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  data: MonthlyReport[];
}

export function BarChart({ data }: BarChartProps) {
  const allZero =
    !data ||
    data.every(
      (r) =>
        parseFloat(r.total_income) === 0 &&
        parseFloat(r.total_expenses) === 0
    );

  if (allZero) {
    return (
      <EmptyChartMessage title="No monthly comparison data available" />
    );
  }

  const chartData = toBarChartData(data);

  return (
    <div className="relative h-64">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top" },
          },
          scales: {
            y: { beginAtZero: true },
          },
        }}
      />
    </div>
  );
}
