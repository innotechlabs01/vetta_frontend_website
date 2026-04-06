"use client";

import { useShiftClosureNotification, getShiftClosureNotificationStyles } from "@/hooks/useShiftClosureNotification";
import type { CashShift } from "@/hooks/useShiftClosureNotification";

interface ShiftClosureNotificationBadgeProps {
  shift: CashShift | null;
}

export function ShiftClosureNotificationBadge({ shift }: ShiftClosureNotificationBadgeProps) {
  const { timeRemainingLabel, isUrgent, isWarning } = useShiftClosureNotification(shift);

  if (!timeRemainingLabel) return null;

  const { containerClass, icon } = getShiftClosureNotificationStyles(isUrgent, isWarning);

  return (
    <div className={containerClass}>
      <div className={`w-2 h-2 rounded-full ${isUrgent ? "bg-red-500 animate-pulse" : "bg-yellow-500"}`} />
      {icon} {timeRemainingLabel}
    </div>
  );
}
