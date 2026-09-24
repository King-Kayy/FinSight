import React from "react";

interface SummaryCardProps {
  label: string;
  value: string;
  variant?: "default" | "negative";
  icon?: React.ReactNode;
  description?: string;
  trend?: { value: number; label: string }; // e.g. { value: 12, label: "from last month" }
  accentColor?: "green" | "red" | "blue";
}

export function SummaryCard({
  label,
  value,
  variant = "default",
  icon,
  description,
  trend,
  accentColor = "green",
}: SummaryCardProps) {
  const borderColor = {
    green: "border-l-emerald-500",
    red: "border-l-red-500",
    blue: "border-l-blue-500",
  }[accentColor];

  const trendColor = trend && trend.value >= 0 ? "text-emerald-600" : "text-red-500";
  const trendSign = trend && trend.value >= 0 ? "+" : "";

  return (
    <div
      className={`rounded-xl p-5 border border-white/10 border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}
      style={{ backgroundColor: "#1a1a1a" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          <p
            className={`text-2xl font-bold mt-1 truncate ${
              variant === "negative" ? "text-red-400" : "text-white"
            }`}
          >
            {value}
          </p>
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trendColor}`}>
              {trendSign}{trend.value.toFixed(1)}% {trend.label}
            </p>
          )}
          {!trend && description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0 ml-3">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
