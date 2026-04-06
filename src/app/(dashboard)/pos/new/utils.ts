"use client";

import type { CashMovementReason, NumericValue } from "./types";

export function currency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatShiftTimestamp(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatKitchenTimestamp(date: Date): string {
  return date.toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function formatRate(rate: number): string {
  const value = round2(rate);
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}

export function formatIncTypeLabel(raw: string | null | undefined): string {
  if (!raw) return "INC";
  const normalized = raw.replace(/_/g, " ").toLowerCase();
  const titled = normalized.replace(/\b\w/g, (c) => c.toUpperCase());
  return `INC ${titled}`.trim();
}

const CASH_MOVEMENT_REASON_LABELS: Record<CashMovementReason, string> = {
  opening_float: "Apertura de turno",
  cash_sale: "Ventas en efectivo",
  cash_refund: "Devoluciones en efectivo",
  petty_cash: "Caja menor",
  supplier_payout: "Pago a proveedor",
  cash_pickup: "Retiro programado",
  bank_deposit: "Deposito bancario",
  closing_adjustment: "Ajuste de cierre",
  other: "Otros movimientos",
};

export function formatCashMovementReason(
  reason: CashMovementReason | string | null | undefined,
): string {
  if (!reason) return "Sin motivo";
  const key = String(reason).toLowerCase().trim() as CashMovementReason;
  if (
    key &&
    Object.prototype.hasOwnProperty.call(CASH_MOVEMENT_REASON_LABELS, key)
  ) {
    return CASH_MOVEMENT_REASON_LABELS[key];
  }
  const fallback = String(reason).replace(/_/g, " ").toLowerCase();
  return fallback.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatAmountForInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value === 0 ? "0" : value.toFixed(2);
}

export function parseAmountInput(raw: string | null | undefined): number {
  if (!raw) return 0;
  let value = raw.trim();
  if (!value) return 0;
  const hasComma = value.includes(",");
  const hasDot = value.includes(".");
  if (hasComma && hasDot) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    value = value.replace(",", ".");
  } else {
    value = value.replace(/,/g, "");
  }
  value = value.replace(/[^\d.-]/g, "");
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseNumeric(value: NumericValue): number {
  if (value == null || value === "") return 0;
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : 0;
}

