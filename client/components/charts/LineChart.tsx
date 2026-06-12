import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { TransactionRecord } from "../../../shared/api";
import { toLineChartData } from "../../lib/chartTransformers";
import { EmptyChartMessage } from "./EmptyChartMessage";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LineChartProps {
  data: TransactionRecord[];
  month: number;
  year: number;
}

export function LineChart({ data, month, year }: LineChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChartMessage title="No spending data for this period" />;
  }

  const chartData = toLineChartData(data, month, year);

  return (
    <div className="relative h-64">
      <Line
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
