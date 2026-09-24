import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import type { TransactionRecord } from "../../../shared/api";
import { toPieChartData } from "../../lib/chartTransformers";
import { EmptyChartMessage } from "./EmptyChartMessage";
import { formatGHS } from "../../../shared/formatCurrency";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  data: TransactionRecord[];
  total: number;
}

export function DonutChart({ data, total }: DonutChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChartMessage title="No expense data for this period" />;
  }

  const chartData = toPieChartData(data);

  // Center text plugin
  const centerTextPlugin = {
    id: "centerText",
    afterDraw(chart: any) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;

      // Fill center circle white
      const innerRadius = chart.getDatasetMeta(0)?.data[0]?.innerRadius ?? 60;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      // Draw text on white background
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px sans-serif";
      ctx.fillText("Total", cx, cy - 10);
      ctx.fillStyle = "#111827";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(formatGHS(total), cx, cy + 8);
      ctx.restore();
    },
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-48 h-48 shrink-0">
        <Doughnut
          data={chartData}
          plugins={[centerTextPlugin]}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "55%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` GHS ${(ctx.parsed as number).toFixed(2)}`,
                },
              },
            },
          }}
        />
      </div>

      {/* Legend */}
      <ul className="flex flex-col gap-1.5 w-full">
        {chartData.labels.map((label, i) => (
          <li key={label as string} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: chartData.datasets[0].backgroundColor[i] as string }}
              />
              <span className="text-gray-600 truncate max-w-[120px]">{label as string}</span>
            </span>
            <span className="text-gray-400 font-medium ml-2">
              {formatGHS(chartData.datasets[0].data[i] as number)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
