"use client";

import { cn } from "@/lib/utils";

interface StatsHeaderProps {
  stats: {
    label: string;
    value: number | string;
    color?: "default" | "green" | "red" | "blue" | "purple";
  }[];
  className?: string;
}

export function StatsHeader({ stats, className }: StatsHeaderProps) {
  const colorClasses = {
    default: "bg-muted/50",
    green: "bg-green-50 border border-green-100",
    red: "bg-red-50 border border-red-100",
    blue: "bg-blue-50 border border-blue-100",
    purple: "bg-purple-50 border border-purple-100",
  };

  const valueClasses = {
    default: "",
    green: "text-green-600",
    red: "text-red-500",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };

  const labelClasses = {
    default: "text-muted-foreground",
    green: "text-green-600",
    red: "text-red-500",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };

  return (
    <div className={cn("grid gap-3 mb-6", `grid-cols-${stats.length}`, className)} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn("rounded-lg p-3 text-center", colorClasses[stat.color || "default"])}
        >
          <div className={cn("text-2xl font-bold", valueClasses[stat.color || "default"])}>
            {stat.value}
          </div>
          <div className={cn("text-xs", labelClasses[stat.color || "default"])}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}