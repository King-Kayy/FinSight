import React from "react";

interface SummaryCardProps {
  label: string;
  value: string;
  variant?: "default" | "negative";
  icon?: React.ReactNode;
  description?: string;
}

export function SummaryCard({
  label,
  value,
  variant = "default",
  icon,
  description,
}: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              variant === "negative" ? "text-red-600" : "text-gray-900"
            }`}
          >
            {value}
          </p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
