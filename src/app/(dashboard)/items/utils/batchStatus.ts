'use client';

export type BatchStatus =
  | "expired"
  | "withinThreeMonths"
  | "withinSixMonths"
  | "longTerm"
  | "unknown";

export type BatchStatusSegment = {
  key: BatchStatus;
  className: string;
  disabledClassName: string;
  label: string;
  shortLabel: string;
  description: string;
};

export const BATCH_STATUS_SEGMENTS: BatchStatusSegment[] = [
  {
    key: "expired",
    className: "bg-neutral-500",
    disabledClassName: "bg-neutral-100",
    label: "Vencido",
    shortLabel: "Vencido",
    description: "Vencido o con fecha de vencimiento hoy.",
  },
  {
    key: "withinThreeMonths",
    className: "bg-red-500",
    disabledClassName: "bg-red-50",
    label: "≤ 3 meses",
    shortLabel: "≤3m",
    description: "Vence en los próximos 3 meses.",
  },
  {
    key: "withinSixMonths",
    className: "bg-yellow-400",
    disabledClassName: "bg-yellow-100",
    label: "≤ 6 meses",
    shortLabel: "≤6m",
    description: "Vence entre 3 y 6 meses.",
  },
  {
    key: "longTerm",
    className: "bg-emerald-500",
    disabledClassName: "bg-emerald-100",
    label: "> 6 meses",
    shortLabel: ">6m",
    description: "Vence en más de 6 meses.",
  }
];

export function getBatchStatus(
  expiration: string | null,
  referenceDate: Date = new Date()
): BatchStatus {
  if (!expiration) return "unknown";

  const expirationDate = new Date(expiration);
  if (Number.isNaN(expirationDate.getTime())) return "unknown";

  const normalizedReference = new Date(referenceDate);
  normalizedReference.setHours(0, 0, 0, 0);

  const normalizedExpiration = new Date(expirationDate);
  normalizedExpiration.setHours(0, 0, 0, 0);

  const diffMs = normalizedExpiration.getTime() - normalizedReference.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 0) return "expired";
  if (diffDays <= 90) return "withinThreeMonths";
  if (diffDays <= 180) return "withinSixMonths";
  return "longTerm";
}

export function getBatchStatusMetadata(status: BatchStatus) {
  return (
    BATCH_STATUS_SEGMENTS.find((segment) => segment.key === status) ??
    BATCH_STATUS_SEGMENTS[BATCH_STATUS_SEGMENTS.length - 1]
  );
}

export function compareExpirationDates(
  a: string | null,
  b: string | null
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const dateA = new Date(a).getTime();
  const dateB = new Date(b).getTime();

  if (Number.isNaN(dateA) && Number.isNaN(dateB)) return 0;
  if (Number.isNaN(dateA)) return 1;
  if (Number.isNaN(dateB)) return -1;

  return dateA - dateB;
}
