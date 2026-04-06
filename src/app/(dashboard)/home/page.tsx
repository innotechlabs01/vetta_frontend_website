"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  Activity,
  AlertCircle,
  CalendarIcon,
  Coins,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEnvironment } from "@/context/EnvironmentContext";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import type { DBCustomer } from "@/types/customers";

type TimeRange = "today" | "this_week" | "this_month" | "this_semester";

type SaleRecord = {
  id: string;
  createdAt: Date | null;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  taxes: number;
  tipAmount: number;
  tipPercentage: number;
  customerId: string | null;
  customerName: string;
};

type DashboardCustomer = Pick<DBCustomer, "id" | "name" | "created_at" | "is_loyal">;

type ChartPoint = {
  isoDate: string;
  label: string;
  value: number;
  orders: number;
};

type TopCustomer = {
  id: string;
  name: string;
  total: number;
  orders: number;
};

type TimeRangeOption = {
  key: TimeRange;
  label: string;
  helper: string;
};

type RangeMetadata = {
  start: Date;
  end: Date;
  spanDays: number;
  calendarLabel: string;
};

const TIME_RANGES: TimeRangeOption[] = [
  { key: "today", label: "Hoy", helper: "Desde medianoche" },
  { key: "this_week", label: "Esta semana", helper: "Lunes a hoy" },
  { key: "this_month", label: "Este mes", helper: "1 al día actual" },
  { key: "this_semester", label: "Este semestre", helper: "Acumulado del semestre" },
];

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("es-CO");

const compactNumberFormatter = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dayLabelFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  NEW: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-700",
  SCHEDULED_FOR_PICKUP: "bg-teal-100 text-teal-700",
  SCHEDULED_FOR_DELIVERY: "bg-teal-100 text-teal-700",
  DRAFT: "bg-slate-200 text-slate-700",
  CANCELED: "bg-rose-100 text-rose-700",
  RETURNED: "bg-orange-100 text-orange-700",
  VOIDED: "bg-rose-100 text-rose-700",
  "SIN ESTADO": "bg-slate-200 text-slate-700",
};

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const normalized = Math.max(0, value);
  if (normalized >= 10) return `${normalized.toFixed(0)}%`;
  if (normalized >= 1) return `${normalized.toFixed(1)}%`;
  return `${normalized.toFixed(2)}%`;
}

function getTimeRangeDates(range: TimeRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "this_week": {
      const day = start.getDay();
      const diff = (day + 6) % 7; // lunes como inicio
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "this_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "this_semester": {
      const month = start.getMonth();
      const semesterStartMonth = month < 6 ? 0 : 6;
      start.setMonth(semesterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    default:
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function describeDateSpan(start: Date, end: Date): RangeMetadata {
  const startDay = new Date(start);
  const endDay = new Date(end);
  startDay.setHours(0, 0, 0, 0);
  endDay.setHours(0, 0, 0, 0);
  const millisPerDay = 1000 * 60 * 60 * 24;
  const spanDays = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / millisPerDay) + 1);
  const startLabel = dayLabelFormatter.format(startDay);
  const endLabel = dayLabelFormatter.format(endDay);
  const calendarLabel = startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;

  return { start, end, spanDays, calendarLabel };
}

function describeRange(range: TimeRange): RangeMetadata {
  const { start, end } = getTimeRangeDates(range);
  return describeDateSpan(start, end);
}

function formatDayLabel(isoDate: string): string {
  const safeIso = isoDate.includes("T") ? isoDate : `${isoDate}T00:00:00`;
  const date = new Date(safeIso);
  return dayLabelFormatter.format(date);
}

type SummaryCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  accent: string;
};

function SummaryCard({ label, value, helper, icon, accent }: SummaryCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-slate-200 bg-white p-4 md:rounded-3xl md:p-5">
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 opacity-80",
          "bg-gradient-to-br",
          accent,
        )}
        aria-hidden
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900/5 text-slate-900 md:h-10 md:w-10 md:rounded-2xl">
            {icon}
          </div>
          <span className="text-sm font-medium text-slate-500 md:text-base">{label}</span>
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl">{value}</span>
        <span className="text-[11px] font-medium uppercase leading-tight tracking-wide text-slate-500 md:text-xs">
          {helper}
        </span>
      </div>
    </div>
  );
}

type TimeRangeSelectorProps = {
  value: TimeRange | null;
  onChange: (value: TimeRange) => void;
  disabled?: boolean;
};

function TimeRangeSelector({ value, onChange, disabled }: TimeRangeSelectorProps) {
  return (
    <>
      <div className="w-full md:hidden">
        <select
          value={value ?? ""}
          onChange={(event) => {
            const next = event.target.value as TimeRange;
            if (!disabled && next) onChange(next);
          }}
          disabled={disabled}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
        >
          <option value="" disabled>
            Selecciona periodo
          </option>
          {TIME_RANGES.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
        {TIME_RANGES.map((option) => {
          const isActive = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => !disabled && onChange(option.key)}
              className={clsx(
                "group rounded-xl px-4 py-2 text-sm font-medium transition hover:bg-blue-50",
                "backdrop-blur",
                isActive
                  ? "border-blue-200 bg-blue-100 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-slate-900",
                disabled && !isActive ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              )}
              disabled={disabled}
            >
              <div className="flex flex-col items-start leading-tight">
                <span>{option.label}</span>
                <span className="text-[10px] font-normal tracking-wide text-slate-500 group-hover:text-slate-600">
                  {option.helper}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

type CustomRangeDropdownProps = {
  value: DateRange | undefined;
  onApply: (range: DateRange) => void;
  onClear: () => void;
  isActive: boolean;
  disabled?: boolean;
};

function CustomRangeDropdown({ value, onApply, onClear, isActive, disabled }: CustomRangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(value);

  useEffect(() => {
    if (open) {
      setDraftRange(value);
    } else {
      setDraftRange(value);
    }
  }, [open, value]);

  const displayRange = open ? draftRange : value;

  const buttonLabel = useMemo(() => {
    if (displayRange?.from && displayRange?.to) {
      return `${fullDateFormatter.format(displayRange.from)} - ${fullDateFormatter.format(displayRange.to)}`;
    }
    if (displayRange?.from) {
      return `${fullDateFormatter.format(displayRange.from)}…`;
    }
    return "Rango personalizado";
  }, [displayRange]);

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      setDraftRange(range);
    },
    [],
  );

  const handleClear = useCallback(() => {
    setDraftRange(undefined);
    onClear();
    setOpen(false);
  }, [onClear]);

  const handleApply = useCallback(() => {
    if (!draftRange?.from || !draftRange?.to) return;
    onApply({
      from: draftRange.from,
      to: draftRange.to,
    });
    setOpen(false);
  }, [draftRange, onApply]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={clsx(
            "inline-flex w-[54%] items-center justify-start gap-2 rounded-xl border-slate-200 bg-white px-3 py-2 text-sm font-medium md:w-auto md:px-4",
            isActive ? "bg-slate-900 text-white hover:bg-slate-900/90" : "text-slate-600 hover:text-slate-900",
          )}
          disabled={disabled}
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="whitespace-nowrap">{buttonLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-lg shadow-slate-200/40"
      >
        <Calendar
          initialFocus
          mode="range"
          numberOfMonths={2}
          selected={draftRange}
          onSelect={handleSelect}
          showOutsideDays
          defaultMonth={draftRange?.from ?? value?.from}
          disabled={disabled}
        />
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2">
          <p className="text-xs text-slate-500">
            {draftRange?.from && draftRange?.to
              ? `${fullDateFormatter.format(draftRange.from)} · ${fullDateFormatter.format(draftRange.to)}`
              : "Selecciona un rango de fechas"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled || (!draftRange?.from && !draftRange?.to && !value?.from && !value?.to)}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={disabled || !draftRange?.from || !draftRange?.to}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type SalesAreaChartProps = {
  data: ChartPoint[];
};

function SalesAreaChart({ data }: SalesAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-2xl border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        <Activity className="h-5 w-5" />
        Sin ventas registradas en este periodo.
      </div>
    );
  }

  const width = 720;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const maxValue = Math.max(...data.map((point) => point.value));
  const safeMax = maxValue > 0 ? maxValue : 1;
  const points = data.map((point, index) => {
    const x =
      paddingX + (index * (width - paddingX * 2)) / Math.max(1, data.length - 1);
    const ratio = point.value / safeMax;
    const y = height - paddingY - ratio * (height - paddingY * 2);
    return { x, y };
  });

  const horizontalSteps = [0, 0.25, 0.5, 0.75, 1];
  const linePath = points
    .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ");

  let areaPath: string;
  if (points.length === 1) {
    const [{ x, y }] = points;
    areaPath = `M ${x} ${height - paddingY} L ${x} ${y} L ${x + 0.01} ${y} L ${x + 0.01} ${height - paddingY} Z`;
  } else {
    const last = points[points.length - 1];
    const first = points[0];
    areaPath = `${linePath} L ${last.x} ${height - paddingY} L ${first.x} ${height - paddingY} Z`;
  }

  const sampleForLegend = data.length > 6 ? data.slice(-6) : data;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        <defs>
          <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(15, 118, 110, 0.35)" />
            <stop offset="100%" stopColor="rgba(15, 118, 110, 0)" />
          </linearGradient>
        </defs>
        {horizontalSteps.map((step) => {
          const y = paddingY + step * (height - paddingY * 2);
          return (
            <line
              key={step}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 6"
              strokeWidth={1}
            />
          );
        })}
        <path d={areaPath} fill="url(#revenueGradient)" />
        <path d={linePath} fill="none" stroke="#0f766e" strokeWidth={3} strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 5 : 4}
            fill="#0f766e"
            stroke="#ffffff"
            strokeWidth={2}
          />
        ))}
      </svg>
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-3 text-xs">
        {sampleForLegend.map((point) => (
          <div
            key={point.isoDate}
            className="rounded-2xl border-slate-200 bg-white/80 px-3 py-2"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {point.label}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {formatCompactCurrency(point.value)}
            </p>
            <p className="text-[11px] text-slate-500">{point.orders} pedidos</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type CustomerStackedBarProps = {
  returning: number;
  newcomer: number;
};

function CustomerStackedBar({ returning, newcomer }: CustomerStackedBarProps) {
  const total = returning + newcomer;
  if (total === 0) {
    return (
      <div className="mt-4 rounded-2xl border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Aún sin clientes activos en este periodo.
      </div>
    );
  }

  const rawReturningPercent = (returning / total) * 100;
  const rawNewcomerPercent = 100 - rawReturningPercent;

  let returningPercent = rawReturningPercent;
  let newcomerPercent = rawNewcomerPercent;

  if (returningPercent === 0 && newcomerPercent > 0) {
    returningPercent = 4;
    newcomerPercent = 96;
  } else if (newcomerPercent === 0 && returningPercent > 0) {
    newcomerPercent = 4;
    returningPercent = 96;
  }

  const sum = returningPercent + newcomerPercent;
  if (sum > 0 && sum !== 100) {
    const scale = 100 / sum;
    returningPercent *= scale;
    newcomerPercent *= scale;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="bg-blue-500"
          style={{ width: `${returningPercent}%` }}
        />
        <div
          className="bg-emerald-500"
          style={{ width: `${newcomerPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium text-blue-600">
          ● {formatPercent(rawReturningPercent)} Recurrentes
        </span>
        <span className="flex items-center gap-1 font-medium text-emerald-600">
          ● {formatPercent(rawNewcomerPercent)} Nuevos
        </span>
      </div>
    </div>
  );
}

type StatusBreakdownProps = {
  items: { status: string; count: number }[];
};

function StatusBreakdown({ items }: StatusBreakdownProps) {
  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const normalized = item.status?.toUpperCase?.() ?? "SIN ESTADO";
        const baseClass = STATUS_COLORS[normalized] ?? STATUS_COLORS["SIN ESTADO"];
        return (
          <span
            key={normalized}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              baseClass,
            )}
          >
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {normalized.replace(/_/g, " ")} · {item.count}
          </span>
        );
      })}
    </div>
  );
}

type TopCustomersListProps = {
  items: TopCustomer[];
};

function TopCustomersList({ items }: TopCustomersListProps) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No hay clientes con ventas en el periodo.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((customer, index) => (
        <li
          key={customer.id}
          className="flex items-center justify-between gap-3 rounded-2xl border-slate-200 bg-white/80 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900/5 text-sm font-semibold text-slate-500">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{customer.name}</p>
              <p className="text-xs text-slate-500">
                {customer.orders} pedidos · {formatCompactCurrency(customer.total)}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardHomePage() {
  const { org } = useEnvironment();
  const organizationId = org?.id ?? null;
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [timeRange, setTimeRange] = useState<TimeRange>("this_month");
  const [rangeMode, setRangeMode] = useState<"preset" | "custom">("preset");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [customers, setCustomers] = useState<DashboardCustomer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const activeRange = useMemo(() => {
    if (rangeMode === "custom" && customRange?.from && customRange?.to) {
      const start = startOfDay(customRange.from);
      const end = endOfDay(customRange.to);
      return { start, end, mode: "custom" as const };
    }
    const preset = getTimeRangeDates(timeRange);
    return { ...preset, mode: "preset" as const };
  }, [customRange, rangeMode, timeRange]);

  const fetchDashboard = useCallback(async () => {
    if (!organizationId) {
      setSales([]);
      setCustomers([]);
      setTotalCustomers(null);
      setLoading(false);
      return;
    }

    const startIso = activeRange.start.toISOString();
    const endIso = activeRange.end.toISOString();

    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const [salesResponse, customersResponse, totalCustomersResponse] = await Promise.all([
        supabase
          .from("sales")
          .select(
            `
            id,
            created_at,
            status,
            grand_total,
            subtotal_amount,
            discount_total_amount,
            tax_iva_amount,
            tax_inc_amount,
            tax_other_amount,
            tip,
            tip_percentage,
            customer_id,
            customer:customers ( id, name, created_at )
          `,
          )
          .eq("organization_id", organizationId)
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: true })
          .limit(1000),
        supabase
          .from("customers")
          .select("id, name, created_at, is_loyal")
          .eq("organization_id", organizationId)
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: true }),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId),
      ]);

      if (requestRef.current !== requestId) return;

      if (salesResponse.error) throw salesResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (totalCustomersResponse.error) throw totalCustomersResponse.error;

      const normalizedSales: SaleRecord[] = (salesResponse.data ?? []).map((row: any) => {
        const createdAt = row.created_at ? new Date(row.created_at) : null;
        return {
          id: row.id,
          createdAt,
          status: row.status ? String(row.status).toUpperCase() : "SIN ESTADO",
          total: parseAmount(row.grand_total ?? row.total_amount),
          subtotal: parseAmount(row.subtotal_amount),
          discount: parseAmount(row.discount_total_amount),
          taxes:
            parseAmount(row.tax_iva_amount) +
            parseAmount(row.tax_inc_amount) +
            parseAmount(row.tax_other_amount),
          tipAmount: parseAmount(row.tip),
          tipPercentage: parseAmount(row.tip_percentage),
          customerId: row.customer?.id ?? row.customer_id ?? null,
          customerName: row.customer?.name ?? "Consumidor Final",
        };
      });

      const normalizedCustomers: DashboardCustomer[] = (customersResponse.data ?? []).map(
        (row: any) => ({
          id: row.id,
          name: row.name ?? "Cliente",
          created_at: row.created_at ?? null,
          is_loyal: row.is_loyal ?? null,
        }),
      );

      setSales(normalizedSales);
      setCustomers(normalizedCustomers);
      setTotalCustomers(totalCustomersResponse.count ?? null);
    } catch (err: any) {
      console.error("Error cargando dashboard", err);
      if (requestRef.current === requestId) {
        setSales([]);
        setCustomers([]);
        setError(err?.message ?? "No fue posible cargar el dashboard.");
      }
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [activeRange, organizationId, supabase]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleTimeRangeChange = useCallback((value: TimeRange) => {
    setTimeRange(value);
    setRangeMode("preset");
  }, []);

  const handleApplyCustomRange = useCallback((range: DateRange) => {
    setCustomRange(range);
    setRangeMode("custom");
  }, []);

  const handleClearCustomRange = useCallback(() => {
    setCustomRange(undefined);
    setRangeMode("preset");
  }, []);

  const rangeMetadata = useMemo(
    () => describeDateSpan(activeRange.start, activeRange.end),
    [activeRange.end, activeRange.start],
  );
  const completedSales = useMemo(
    () =>
      sales.filter(
        (sale) => (sale.status ?? "").toUpperCase() === "COMPLETED",
      ),
    [sales],
  );

  const summary = useMemo(() => {
    const spanDays = Math.max(1, rangeMetadata.spanDays);
    const totalRevenue = completedSales.reduce((acc, sale) => acc + sale.total, 0);
    const totalOrders = completedSales.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const revenuePerDay = totalRevenue / spanDays;
    const ordersPerDay = totalOrders / spanDays;
    const discountTotal = completedSales.reduce((acc, sale) => acc + sale.discount, 0);
    const taxesTotal = completedSales.reduce((acc, sale) => acc + sale.taxes, 0);
    const serviceTotal = completedSales.reduce((acc, sale) => acc + sale.tipAmount, 0);
    const servicePerDay = serviceTotal / spanDays;

    const uniqueCustomers = new Set<string>();
    sales.forEach((sale) => {
      if (sale.customerId) {
        uniqueCustomers.add(sale.customerId);
      }
    });

    const newCustomerIds = new Set(customers.map((customer) => customer.id));
    let newActiveCustomers = 0;
    uniqueCustomers.forEach((id) => {
      if (newCustomerIds.has(id)) newActiveCustomers += 1;
    });
    const returningActiveCustomers = uniqueCustomers.size - newActiveCustomers;
    const loyaltyCustomers = customers.filter((customer) => Boolean(customer.is_loyal)).length;

    return {
      totalRevenue,
      totalOrders,
      averageTicket,
      revenuePerDay,
      ordersPerDay,
      discountTotal,
      taxesTotal,
      serviceTotal,
      servicePerDay,
      activeCustomers: uniqueCustomers.size,
      newActiveCustomers,
      returningActiveCustomers,
      newCustomers: customers.length,
      loyaltyCustomers,
    };
  }, [completedSales, customers, rangeMetadata.spanDays, sales]);

  const revenueTrend = useMemo<ChartPoint[]>(() => {
    const byDay = new Map<string, { total: number; orders: number }>();

    completedSales.forEach((sale) => {
      if (!sale.createdAt) return;
      const dayKey = getLocalDateKey(sale.createdAt);
      const current = byDay.get(dayKey) ?? { total: 0, orders: 0 };
      current.total += sale.total;
      current.orders += 1;
      byDay.set(dayKey, current);
    });

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([iso, info]) => ({
        isoDate: iso,
        label: formatDayLabel(iso),
        value: info.total,
        orders: info.orders,
      }));
  }, [completedSales]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((sale) => {
      const status = sale.status ?? "SIN ESTADO";
      map.set(status, (map.get(status) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [sales]);

  const topCustomers = useMemo<TopCustomer[]>(() => {
    const totals = new Map<string, TopCustomer>();

    completedSales.forEach((sale) => {
      const key = sale.customerId ?? `anon-${sale.customerName}`;
      const current = totals.get(key) ?? {
        id: key,
        name: sale.customerName,
        total: 0,
        orders: 0,
      };
      current.total += sale.total;
      current.orders += 1;
      current.name = sale.customerName;
      totals.set(key, current);
    });

    return Array.from(totals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [completedSales]);

  const showEmptyState = !organizationId;

  return (
    <main className="min-h-screen w-full bg-slate-50 px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Hola 👋
            </h1>
            <p className="text-sm text-slate-600">
              Vista general de ventas y clientes · {rangeMetadata.calendarLabel}
            </p>
          </div>
        </header>

        <div className="flex items-center justify-between gap-2 md:flex-row md:flex-wrap md:gap-3">
          <CustomRangeDropdown
            value={customRange}
            onApply={handleApplyCustomRange}
            onClear={handleClearCustomRange}
            isActive={rangeMode === "custom" && Boolean(customRange?.from && customRange?.to)}
            disabled={loading}
          />
          <div className="w-[46%] md:w-auto">
            <TimeRangeSelector
              value={rangeMode === "preset" ? timeRange : null}
              onChange={handleTimeRangeChange}
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-3xl border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {showEmptyState ? (
          <div className="rounded-3xl border-dashed border-slate-200 bg-white/80 p-10 text-center text-sm text-slate-500">
            Conéctate a una organización para ver las métricas de ventas.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
              <SummaryCard
                label="Ingresos"
                value={formatCurrency(summary.totalRevenue)}
                helper={`${formatCompactCurrency(summary.revenuePerDay)} promedio diario`}
                icon={<TrendingUp className="h-5 w-5" />}
                accent="from-emerald-100 via-emerald-50 to-transparent"
              />
              <SummaryCard
                label="Pedidos"
                value={formatNumber(summary.totalOrders)}
                helper={`${formatCompactNumber(summary.ordersPerDay)} por día`}
                icon={<ShoppingBag className="h-5 w-5" />}
                accent="from-blue-100 via-sky-50 to-transparent"
              />
              <SummaryCard
                label="Ticket promedio"
                value={formatCurrency(summary.averageTicket)}
                helper={`${formatCompactCurrency(summary.discountTotal)} en descuentos`}
                icon={<Coins className="h-5 w-5" />}
                accent="from-purple-100 via-fuchsia-50 to-transparent"
              />
              <SummaryCard
                label="Clientes activos"
                value={formatNumber(summary.activeCustomers)}
                helper={`${summary.newActiveCustomers} nuevos · ${summary.returningActiveCustomers} recurrentes`}
                icon={<Users className="h-5 w-5" />}
                accent="from-amber-100 via-orange-50 to-transparent"
              />
            </section>

            <section className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between rounded-3xl border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100/40">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ingresos por servicio
                  </span>
                  <p className="text-[11px] text-slate-400">{rangeMetadata.calendarLabel}</p>
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-semibold text-slate-900">
                    {formatCurrency(summary.serviceTotal)}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Promedio diario {formatCompactCurrency(summary.servicePerDay)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="rounded-3xl border-slate-200 bg-white p-6 ">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Ingresos del periodo</h2>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {rangeMetadata.calendarLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      {formatCurrency(summary.totalRevenue)} totales
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      {formatCurrency(summary.averageTicket)} ticket promedio
                    </span>
                  </div>
                </div>
                <div className="mt-6">
                  <SalesAreaChart data={revenueTrend} />
                </div>
              </div>

              <div className="flex h-full flex-col gap-4 rounded-3xl border-slate-200 bg-white p-6 ">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Clientes</h2>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Nuevos: {formatNumber(summary.newCustomers)} · Fidelizados: {formatNumber(summary.loyaltyCustomers)}
                  </p>
                </div>
                <CustomerStackedBar
                  returning={summary.returningActiveCustomers}
                  newcomer={summary.newActiveCustomers}
                />
                <div className="mt-auto grid grid-cols-1 gap-3 text-sm text-slate-500">
                  <div className="rounded-2xl border-slate-100 bg-slate-50 px-3 py-2">
                    Base total de clientes
                    <span className="block text-lg font-semibold text-slate-900">
                      {totalCustomers != null ? formatNumber(totalCustomers) : "—"}
                    </span>
                  </div>
                  <div className="rounded-2xl border-slate-100 bg-slate-50 px-3 py-2">
                    Impuestos acumulados
                    <span className="block text-lg font-semibold text-slate-900">
                      {formatCurrency(summary.taxesTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="rounded-3xl border-slate-200 bg-white p-6 ">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Distribución por estado</h2>
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    {formatNumber(sales.length)} pedidos
                  </span>
                </div>
                <div className="mt-4">
                  <StatusBreakdown items={statusBreakdown} />
                </div>
              </div>
              <div className="rounded-3xl border-slate-200 bg-white p-6 ">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Clientes top</h2>
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Según ingresos del periodo
                  </span>
                </div>
                <div className="mt-4">
                  <TopCustomersList items={topCustomers} />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
