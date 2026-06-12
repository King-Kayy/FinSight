import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import type { TransactionRecord } from "../../../shared/api";
import { toPieChartData } from "../../lib/chartTransformers";
import { EmptyChartMessage } from "./EmptyChartMessage";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  data: TransactionRecord[];
}

export function PieChart({ data }: PieChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChartMessage title="No expense data for this period" />;
  }

  const chartData = toPieChartData(data);

  return (
    <div className="relative h-64">
      <Pie
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right" },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed as number;
                  return ` GHS ${val.toFixed(2)}`;
                },
              },
            },
          },
        }}
      />
    </div>
  );
}
