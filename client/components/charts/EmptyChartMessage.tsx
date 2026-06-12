interface EmptyChartMessageProps {
  title?: string;
}

export function EmptyChartMessage({
  title = "No data available",
}: EmptyChartMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
      <p className="text-sm">{title}</p>
    </div>
  );
}
