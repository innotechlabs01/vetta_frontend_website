// app/sales/page.tsx
"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Bike, Layers, Package, QrCode, ShoppingBag, Utensils } from "lucide-react";
import { useEnvironment } from "@/context/EnvironmentContext";
import { usePrinterContext } from "@/context/PrinterContext";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// ------------------ Types & Helpers ------------------

type ShippingAddressData = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  recipient_name?: string;
  label?: string;
  neighborhood?: string;
  instructions?: string;
};

type DeliveryMetadataData = {
  type?: string;
  fields?: Record<string, string>;
  coverage_zone_id?: string;
  coverage_zone_name?: string;
  estimated_delivery_time_minutes?: number;
  logistics_cost?: number;
  origin_location_id?: string;
  destination_coordinates?: { latitude: number; longitude: number };
};

type SaleRecord = {
  id: string;
  invoice_number: string | null;
  created_at: string | null;
  status: string | null;
  orderType: OrderTypeKey | null;
  payment_method: string | null;
  total: number;
  subtotal: number;
  taxIva: number;
  taxInc: number;
  taxOther: number;
  discount: number;
  tip: number;
  tip_percentage: number;
  customerId: string | null;
  customerName: string;
  displayCode: string;
  orderNumber: string | null;
  shiftId: string | null;
  shipping_address: ShippingAddressData | null;
  delivery_metadata: DeliveryMetadataData | null;
};

type SaleItemRecord = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ivaRate: number | null;
  ivaAmount: number;
  incRate: number | null;
  incAmount: number;
};

type SaleDetail = {
  sale: SaleRecord;
  items: SaleItemRecord[];
};

type OrderTypeKey =
  | "DINE_IN"
  | "SELF_SERVE"
  | "PICKUP"
  | "DELIVERY_LOCAL"
  | "SHIPMENT_NATIONAL"
  | "COUNTER";

type OrderTypeFilterKey = "all" | OrderTypeKey;

type DateRangeKey = "all" | "today" | "week" | "month" | "year";

type IconComponent = typeof Layers;

type OrderTypeFilterOption = {
  key: OrderTypeFilterKey;
  label: string;
  icon: IconComponent;
};

type BoardColumn = {
  id: string;
  label: string;
  statuses: string[];
};

const BASE_STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "NEW", label: "Nuevas" },
  { key: "PREPARING", label: "Preparando" },
  { key: "OUT_FOR_DELIVERY", label: "En reparto" },
  { key: "SCHEDULED_FOR_PICKUP", label: "Pickup programado" },
  { key: "SCHEDULED_FOR_DELIVERY", label: "Entrega programada" },
  { key: "DRAFT", label: "Borradores" },
  { key: "COMPLETED", label: "Completadas" },
  { key: "CANCELED", label: "Canceladas" },
  { key: "RETURNED", label: "Devueltas" },
  { key: "VOIDED", label: "Anuladas" },
];

const STATUS_OPTIONS = BASE_STATUS_FILTERS.filter((filter) => filter.key !== "all").map(
  ({ key, label }) => ({ value: key, label })
);

const ORDER_TYPE_OPTIONS: OrderTypeFilterOption[] = [
  { key: "all", label: "Todas", icon: Layers },
  { key: "DINE_IN", label: "En mesa", icon: Utensils },
  { key: "SELF_SERVE", label: "Autogestión", icon: QrCode },
  { key: "PICKUP", label: "Para recoger", icon: ShoppingBag },
  { key: "DELIVERY_LOCAL", label: "Domicilio", icon: Bike },
  { key: "SHIPMENT_NATIONAL", label: "Envíos", icon: Package },
];

const ORDER_TYPE_ALIASES: Record<string, OrderTypeKey> = {
  DINE_IN: "DINE_IN",
  SELF_SERVE: "SELF_SERVE",
  SELF_SERVICE: "SELF_SERVE",
  PICKUP: "PICKUP",
  TAKEOUT: "PICKUP",
  DELIVERY: "DELIVERY_LOCAL",
  DELIVERY_LOCAL: "DELIVERY_LOCAL",
  SHIPMENT_NATIONAL: "SHIPMENT_NATIONAL",
  NATIONAL_SHIPPING: "SHIPMENT_NATIONAL",
  SHIPMENT: "SHIPMENT_NATIONAL",
  COUNTER: "COUNTER",
  IN_STORE: "DINE_IN",
};

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "all", label: "Todas las fechas" },
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "year", label: "Este año" },
];

const ORDER_TYPE_FILTER_STORAGE_KEY = "sales:order-type-filter";

const ORDER_TYPE_BOARD_COLUMNS: Partial<Record<OrderTypeKey, BoardColumn[]>> = {
  DELIVERY_LOCAL: [
    { id: "NEW", label: "Nuevas", statuses: ["NEW", "SCHEDULED_FOR_DELIVERY"] },
    { id: "PREPARING", label: "En preparación", statuses: ["PREPARING"] },
    { id: "READY_FOR_PICKUP", label: "Listo para recoger", statuses: ["READY_FOR_PICKUP"] },
    { id: "OUT_FOR_DELIVERY", label: "En camino", statuses: ["OUT_FOR_DELIVERY"] },
    { id: "COMPLETED", label: "Entregado", statuses: ["COMPLETED", "DELIVERED"] },
  ],
  SHIPMENT_NATIONAL: [
    { id: "NEW", label: "Nuevas", statuses: ["NEW", "SCHEDULED_FOR_DELIVERY"] },
    { id: "PACKING", label: "En empaque", statuses: ["PREPARING", "PACKING"] },
    { id: "SHIPPED", label: "Enviado", statuses: ["OUT_FOR_DELIVERY", "SHIPPED"] },
    { id: "DELIVERED", label: "Entregado", statuses: ["COMPLETED", "DELIVERED"] },
  ],
  PICKUP: [
    { id: "NEW", label: "Nuevas", statuses: ["NEW"] },
    { id: "PREPARING", label: "En preparación", statuses: ["PREPARING"] },
    {
      id: "READY",
      label: "Listo para recoger",
      statuses: ["SCHEDULED_FOR_PICKUP", "READY_FOR_PICKUP"],
    },
    { id: "COLLECTED", label: "Retirado", statuses: ["COMPLETED", "PICKED_UP"] },
  ],
};

const BOARD_COLUMN_TARGET_STATUS: Partial<Record<OrderTypeKey, Record<string, string>>> = {
  DELIVERY_LOCAL: {
    NEW: "NEW",
    PREPARING: "PREPARING",
    READY_FOR_PICKUP: "READY_FOR_PICKUP",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    COMPLETED: "COMPLETED",
  },
  SHIPMENT_NATIONAL: {
    NEW: "NEW",
    PACKING: "PACKING",
    SHIPPED: "SHIPPED",
    DELIVERED: "DELIVERED",
  },
  PICKUP: {
    NEW: "NEW",
    PREPARING: "PREPARING",
    READY: "READY_FOR_PICKUP",
    COLLECTED: "PICKED_UP",
  },
};

function parseNumeric(value: string | number | null | undefined) {
  if (value == null) return 0;
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num) ? num : 0;
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Sin estado";
  const normalized = status.replace(/_/g, " ").toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeOrderType(raw: unknown): OrderTypeKey | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().replace(/[\s-]+/g, "_").toUpperCase();
  if (!normalized) return null;
  return ORDER_TYPE_ALIASES[normalized] ?? null;
}

function resolveOrderType(row: any): OrderTypeKey | null {
  const direct = normalizeOrderType(row?.order_type ?? row?.orderType ?? row?.type);
  if (direct) return direct;
  const meta = row?.delivery_metadata;
  if (meta && typeof meta === "object" && "type" in meta) {
    return normalizeOrderType((meta as Record<string, unknown>).type);
  }
  return null;
}

function getDateRangeBounds(range: DateRangeKey): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (range === "all") {
    return { start: null, end: null };
  }
  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: now };
  }
  if (range === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    return { start, end: now };
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  return { start, end: now };
}

function isWithinRange(value: string | null | undefined, start: Date | null, end: Date | null) {
  if (!value) return start == null && end == null;
  if (!start && !end) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function getStatusBadgeStyles(status: string | null | undefined) {
  switch (status) {
    case "NEW":
      return "bg-blue-100 text-blue-700";
    case "PREPARING":
      return "bg-amber-100 text-amber-700";
    case "OUT_FOR_DELIVERY":
      return "bg-purple-100 text-purple-700";
    case "SCHEDULED_FOR_PICKUP":
    case "SCHEDULED_FOR_DELIVERY":
      return "bg-teal-100 text-teal-700";
    case "DRAFT":
      return "bg-gray-200 text-gray-700";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "CANCELED":
    case "VOIDED":
      return "bg-red-100 text-red-700";
    case "RETURNED":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-200 text-gray-700";
  }
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2);
}

// ------------------ UI Primitives ------------------

function classNames(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type OrderTypeFilterBarProps = {
  selected: OrderTypeFilterKey;
  counts: Record<OrderTypeFilterKey, number>;
  onSelect: (key: OrderTypeFilterKey) => void;
};

const OrderTypeFilterBar = memo(function OrderTypeFilterBar({
  selected,
  counts,
  onSelect,
}: OrderTypeFilterBarProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex flex-nowrap gap-2 min-w-max justify-start sm:justify-end">
        {ORDER_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = selected === option.key;
          const countValue = counts[option.key] ?? 0;
          return (
            <button
              key={option.key}
              onClick={() => onSelect(option.key)}
              aria-pressed={isActive}
              className={classNames(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition whitespace-nowrap",
                isActive ? "bg-blue-50 text-blue-600 border-blue-200" : "hover:bg-gray-100"
              )}
            >
              <span className="font-medium">{option.label}</span>
              <span
                className={classNames(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                )}
              >
                {countValue}
              </span>
              <Icon className={classNames("h-4 w-4", isActive ? "text-blue-500" : "text-slate-400")} />
            </button>
          );
        })}
      </div>
    </div>
  );
});

type DateRangeSelectProps = {
  value: DateRangeKey;
  onChange: (value: DateRangeKey) => void;
};

const DateRangeSelect = memo(function DateRangeSelect({ value, onChange }: DateRangeSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as DateRangeKey)}
      className="w-full rounded-xl border bg-white px-3 py-2 text-sm sm:w-56"
    >
      {DATE_RANGE_OPTIONS.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

type SalesTableProps = {
  sales: SaleRecord[];
  loading: boolean;
  showLabelColumn: boolean;
  onSelectSale: (saleId: string) => void;
  onPrintSale: (sale: SaleRecord) => void;
  printingSaleId: string | null;
};

const SalesTable = memo(function SalesTable({
  sales,
  loading,
  showLabelColumn,
  onSelectSale,
  onPrintSale,
  printingSaleId,
}: SalesTableProps) {
  return (
    <div className="h-full bg-gray-50 rounded-xl border bg-white overflow-hidden">
      <div className="h-full overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Código</th>
              <th className="text-left p-3 font-medium">Fecha</th>
              <th className="text-left p-3 font-medium">Cliente</th>
              {showLabelColumn && (
                <th className="text-left p-3 font-medium">Etiqueta</th>
              )}
              <th className="text-left p-3 font-medium">Estado</th>
              <th className="text-right p-3 font-medium">Total</th>
              <th className="text-right p-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={showLabelColumn ? 7 : 6} className="p-6 text-center text-muted-foreground">
                  Cargando ventas…
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={showLabelColumn ? 7 : 6} className="p-6 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <SaleRow
                  key={sale.id}
                  sale={sale}
                  showLabelColumn={showLabelColumn}
                  onSelectSale={onSelectSale}
                  onPrintSale={onPrintSale}
                  printingSaleId={printingSaleId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

type SaleRowProps = {
  sale: SaleRecord;
  showLabelColumn: boolean;
  onSelectSale: (saleId: string) => void;
  onPrintSale: (sale: SaleRecord) => void;
  printingSaleId: string | null;
};

const SaleRow = memo(function SaleRow({
  sale,
  showLabelColumn,
  onSelectSale,
  onPrintSale,
  printingSaleId,
}: SaleRowProps) {
  const isPrinting = printingSaleId === sale.id;
  return (
    <tr
      className="border-t hover:bg-gray-100 cursor-pointer"
      onClick={() => onSelectSale(sale.id)}
    >
      <td className="p-3 font-medium">{sale.displayCode}</td>
      <td className="p-3">
        {sale.created_at ? new Date(sale.created_at).toLocaleString() : "—"}
      </td>
      <td className="p-3">{sale.customerName}</td>
      {showLabelColumn && (
        <td className="p-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeStyles(sale.status)}`}
          >
            {formatStatus(sale.status)}
          </span>
        </td>
      )}
      <td className="p-3">{formatStatus(sale.status)}</td>
      <td className="p-3 text-right">${" "}{formatCOP(sale.total)}</td>
      <td className="p-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
            onClick={(event) => {
              event.stopPropagation();
              onSelectSale(sale.id);
            }}
          >
            Ver
          </button>
          <button
            type="button"
            className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-900 hover:brightness-110 disabled:opacity-50"
            onClick={(event) => {
              event.stopPropagation();
              void onPrintSale(sale);
            }}
            disabled={isPrinting}
          >
            {isPrinting ? "Imprim…" : "Imprimir"}
          </button>
        </div>
      </td>
    </tr>
  );
});

type SaleCardProps = {
  sale: SaleRecord;
  onSelectSale: (saleId: string) => void;
  onPrintSale: (sale: SaleRecord) => void;
  printingSaleId: string | null;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    setNodeRef: (element: HTMLElement | null) => void;
    transformStyle: CSSProperties | undefined;
    isDragging: boolean;
  };
};

const SaleCard = memo(function SaleCard({
  sale,
  onSelectSale,
  onPrintSale,
  printingSaleId,
  dragHandleProps,
}: SaleCardProps) {
  const isPrinting = printingSaleId === sale.id;
  return (
    <div
      ref={dragHandleProps?.setNodeRef}
      style={dragHandleProps?.transformStyle}
      {...dragHandleProps?.listeners}
      {...dragHandleProps?.attributes}
      className={classNames(
        "rounded-xl border bg-white p-3 shadow-sm transition hover:bg-slate-50 cursor-pointer touch-none",
        dragHandleProps?.isDragging ? "opacity-60 ring-2 ring-blue-200" : ""
      )}
      onClick={() => onSelectSale(sale.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{sale.displayCode}</div>
          <div className="text-xs text-muted-foreground">{sale.customerName}</div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {sale.created_at ? new Date(sale.created_at).toLocaleString() : "—"}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeStyles(sale.status)}`}
        >
          {formatStatus(sale.status)}
        </span>
        <span className="text-sm font-semibold">${" "}{formatCOP(sale.total)}</span>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-900 hover:brightness-110 disabled:opacity-50"
          onClick={(event) => {
            event.stopPropagation();
            void onPrintSale(sale);
          }}
          disabled={isPrinting}
        >
          {isPrinting ? "Imprim…" : "Imprimir"}
        </button>
      </div>
    </div>
  );
});

type DraggableSaleCardProps = {
  sale: SaleRecord;
  onSelectSale: (saleId: string) => void;
  onPrintSale: (sale: SaleRecord) => void;
  printingSaleId: string | null;
};

const DraggableSaleCard = memo(function DraggableSaleCard({
  sale,
  onSelectSale,
  onPrintSale,
  printingSaleId,
}: DraggableSaleCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sale:${sale.id}`,
  });

  const style = transform
    ? ({ transform: CSS.Translate.toString(transform) } as CSSProperties)
    : undefined;

  return (
    <SaleCard
      sale={sale}
      onSelectSale={onSelectSale}
      onPrintSale={onPrintSale}
      printingSaleId={printingSaleId}
      dragHandleProps={{
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as unknown as Record<string, unknown>,
        setNodeRef,
        transformStyle: style,
        isDragging,
      }}
    />
  );
});

type BoardColumnLaneProps = {
  column: BoardColumn;
  sales: SaleRecord[];
  onSelectSale: (saleId: string) => void;
  onPrintSale: (sale: SaleRecord) => void;
  printingSaleId: string | null;
  movingSaleId: string | null;
};

const BoardColumnLane = memo(function BoardColumnLane({
  column,
  sales,
  onSelectSale,
  onPrintSale,
  printingSaleId,
  movingSaleId,
}: BoardColumnLaneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column:${column.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        "flex bg-gray-50 flex-col min-h-0 rounded-xl border transition w-[380px] shrink-0",
        isOver ? "ring-2 ring-blue-300 bg-blue-50/40" : ""
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200">
        <span className="text-sm font-semibold">{column.label}</span>
        <span className="text-xs text-muted-foreground bg-white px-2 py-1 rounded-full border">{sales.length}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {sales.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            Sin pedidos
          </div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className={movingSaleId === sale.id ? "opacity-60" : ""}>
              <DraggableSaleCard
                sale={sale}
                onSelectSale={onSelectSale}
                onPrintSale={onPrintSale}
                printingSaleId={printingSaleId}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
});

type SalesBoardProps = {
  columns: BoardColumn[];
  sales: SaleRecord[];
  loading: boolean;
  onSelectSale: (saleId: string) => void;
  onPrintSale: (sale: SaleRecord) => void;
  printingSaleId: string | null;
  onMoveSaleToColumn: (saleId: string, targetColumnId: string) => void;
  movingSaleId: string | null;
};

const SalesBoard = memo(function SalesBoard({
  columns,
  sales,
  loading,
  onSelectSale,
  onPrintSale,
  printingSaleId,
  onMoveSaleToColumn,
  movingSaleId,
}: SalesBoardProps) {
  const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const salesByStatus = useMemo(() => {
    const grouped = new Map<string, SaleRecord[]>();
    for (const sale of sales) {
      const statusKey = sale.status ?? "UNKNOWN";
      const list = grouped.get(statusKey);
      if (list) {
        list.push(sale);
      } else {
        grouped.set(statusKey, [sale]);
      }
    }
    return grouped;
  }, [sales]);

  const salesById = useMemo(() => {
    const map = new Map<string, SaleRecord>();
    for (const sale of sales) {
      map.set(sale.id, sale);
    }
    return map;
  }, [sales]);

  const activeSale = activeSaleId ? salesById.get(activeSaleId) ?? null : null;

  const resolveColumnIdFromStatus = useCallback(
    (status: string | null | undefined) => {
      if (!status) return null;
      const match = columns.find((column) => column.statuses.includes(status));
      return match?.id ?? null;
    },
    [columns]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = String(event.active.id ?? "");
    if (!activeId.startsWith("sale:")) return;
    setActiveSaleId(activeId.replace("sale:", ""));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveSaleId(null);
      const activeId = String(event.active.id ?? "");
      const overId = event.over ? String(event.over.id ?? "") : "";
      if (!activeId.startsWith("sale:") || !overId) return;
      const saleId = activeId.replace("sale:", "");
      let targetColumnId: string | null = null;

      if (overId.startsWith("column:")) {
        targetColumnId = overId.replace("column:", "");
      } else if (overId.startsWith("sale:")) {
        const overSaleId = overId.replace("sale:", "");
        const overSale = salesById.get(overSaleId);
        targetColumnId = resolveColumnIdFromStatus(overSale?.status);
      }

      if (!targetColumnId) return;
      onMoveSaleToColumn(saleId, targetColumnId);
    },
    [onMoveSaleToColumn, resolveColumnIdFromStatus, salesById]
  );

  if (loading) {
    return (
      <div className="h-full rounded-xl border bg-white grid place-items-center text-sm text-muted-foreground">
        Cargando pedidos…
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-x-auto no-scrollbar">
        <div className="h-full flex gap-4" style={{ minWidth: "max-content" }}>
          {columns.map((column) => {
            const columnSales = column.statuses.flatMap((status) => salesByStatus.get(status) ?? []);
            return (
              <BoardColumnLane
                key={column.id}
                column={column}
                sales={columnSales}
                onSelectSale={onSelectSale}
                onPrintSale={onPrintSale}
                printingSaleId={printingSaleId}
                movingSaleId={movingSaleId}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay>
        {activeSale ? (
          <SaleCard
            sale={activeSale}
            onSelectSale={onSelectSale}
            onPrintSale={onPrintSale}
            printingSaleId={printingSaleId}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

type FullscreenModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function FullscreenModal({ open, title, onClose, children }: FullscreenModalProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={classNames("fixed inset-0 z-[100000000] top-0", open ? "" : "pointer-events-none")}>
      <div
        className={classNames(
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={classNames(
          "absolute  inset-x-0 bottom-0 top-10 bg-white rounded-t-3xl border-t shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-2 p-4">
          <button onClick={onClose} className="cursor-pointer h-11 w-11 grid place-items-center bg-gray-200 rounded-xl border text-foreground/70 hover:bg-muted/80">✕</button>
          <h3 className="text-base font-semibold text-center flex-1 -ml-9">{title}</h3>
          <div className="w-24" />
        </div>
        <div className="flex-1 overflow-auto  p-4">
          <div className="max-w-6xl mx-auto">

            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SalesPage() {
  const { org } = useEnvironment();
  const organizationId = org?.id;
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { selected: printerSelection } = usePrinterContext();

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilterKey>("all");
  const [orderTypeFilterReady, setOrderTypeFilterReady] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeKey>("all");
  const [q, setQ] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);
  const [saleDetailLoading, setSaleDetailLoading] = useState(false);
  const [voidingSale, setVoidingSale] = useState(false);
  const [deletingSale, setDeletingSale] = useState(false);
  const [updatingSaleStatus, setUpdatingSaleStatus] = useState(false);
  const [statusUpdateValue, setStatusUpdateValue] = useState<string>("");
  const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);
  const [movingSaleId, setMovingSaleId] = useState<string | null>(null);
  const [showingDeleteToast, setShowingDeleteToast] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [activeShiftOpenedAt, setActiveShiftOpenedAt] = useState<string | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(ORDER_TYPE_FILTER_STORAGE_KEY);
      if (stored && ORDER_TYPE_OPTIONS.some((option) => option.key === stored)) {
        setOrderTypeFilter(stored as OrderTypeFilterKey);
      }
    } catch {
      // Ignore storage read errors (e.g., privacy mode).
    } finally {
      setOrderTypeFilterReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!orderTypeFilterReady) return;
    try {
      window.localStorage.setItem(ORDER_TYPE_FILTER_STORAGE_KEY, orderTypeFilter);
    } catch {
      // Ignore storage write errors (e.g., privacy mode).
    }
  }, [orderTypeFilter, orderTypeFilterReady]);

  const saleStatus = saleDetail?.sale.status ?? "";
  const saleIsDraft = saleStatus === "DRAFT";
  const canVoidSale = saleStatus !== "VOIDED" && saleStatus !== "";
  const canDeleteSale = saleStatus !== "";

  useEffect(() => {
    setStatusUpdateValue(saleStatus);
  }, [saleStatus]);

  const buildPrinterPayload = useCallback(
    (overrides: Record<string, unknown> = {}) => {
      const selected = printerSelection as
        | (Record<string, unknown> & { mode?: unknown; host?: unknown })
        | null
        | undefined;

      const base =
        selected && typeof selected === "object"
          ? {
            ...selected,
            mode:
              (selected.mode as string | undefined) ??
              (selected.host ? "tcp" : "winspool"),
          }
          : { mode: "tcp" as const };

      return { ...base, ...overrides };
    },
    [printerSelection]
  );

  const playNotificationSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!notificationAudioRef.current) {
        const audio = new Audio("/sounds/cashier.mp3");
        audio.preload = "auto";
        audio.volume = 0.7;
        notificationAudioRef.current = audio;
      }
      const audio = notificationAudioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      void audio.play();
    } catch (error) {
      console.warn("No se pudo reproducir el sonido de notificación", error);
    }
  }, []);

  const fetchSales = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!organizationId) {
        setSales([]);
        setLoading(false);
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }
        const selectWithOrderType = `
          id,
          invoice_number,
          order_number,
          created_at,
          status,
          shift_id,
          order_type,
          delivery_metadata,
          shipping_address,
          payment_method,
          total_amount,
          grand_total,
          subtotal_amount,
          discount_total_amount,
          tax_iva_amount,
          tax_inc_amount,
          tax_other_amount,
          tip,
          tip_percentage,
          customer:customers (id, name)
        `;
        const selectFallback = `
          id,
          invoice_number,
          order_number,
          created_at,
          status,
          shift_id,
          delivery_metadata,
          shipping_address,
          payment_method,
          total_amount,
          grand_total,
          subtotal_amount,
          discount_total_amount,
          tax_iva_amount,
          tax_inc_amount,
          tax_other_amount,
          tip,
          tip_percentage,
          customer:customers (id, name)
        `;
        const runQuery = (selectFields: string) => {
          // Calcular inicio y fin del día actual
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          let query = supabase
            .from("sales")
            .select(selectFields)
            .eq("organization_id", organizationId)
            .gte("created_at", today.toISOString())
            .lt("created_at", tomorrow.toISOString())
            .order("order_number", { ascending: false })
            .limit(200);

          // Si caja cerrada (no hay turno activo), excluir órdenes DRAFT
          if (!activeShiftId) {
            query = query.neq("status", "DRAFT");
          }

          return query;
        };

        let { data, error } = await runQuery(selectWithOrderType);
        if (error && String(error.message ?? "").includes("order_type")) {
          ({ data, error } = await runQuery(selectFallback));
        }

        if (error) throw error;

        const normalized: SaleRecord[] = (data ?? []).map((row: any) => {
          const total = parseNumeric(row.grand_total ?? row.total_amount);
          const subtotal = parseNumeric(row.subtotal_amount);
          const taxIva = parseNumeric(row.tax_iva_amount);
          const taxInc = parseNumeric(row.tax_inc_amount);
          const taxOther = parseNumeric(row.tax_other_amount);
          const discount = parseNumeric(row.discount_total_amount);
          const tip = parseNumeric(row.tip);
          const tip_percentage = parseNumeric(row.tip_percentage);
          const orderNumber = row.order_number != null ? String(row.order_number) : null;

          // Generar prefijo según tipo de orden
          const orderType = resolveOrderType(row);
          let prefix = "VEN-"; // Por defecto para ventas en local
          if (orderType === "DELIVERY_LOCAL") prefix = "DOM-";
          else if (orderType === "PICKUP") prefix = "REP-";
          else if (orderType === "SHIPMENT_NATIONAL") prefix = "ENV-";

          const displayCode = row.invoice_number?.trim()
            ? row.invoice_number.trim()
            : orderNumber
              ? `${prefix}${String(orderNumber).padStart(4, "0")}`
              : `${prefix}${String(row.id).slice(0, 6).toUpperCase()}`;

          const customerName = row.customer?.name ?? "Consumidor Final";

          return {
            id: row.id,
            invoice_number: row.invoice_number,
            orderNumber,
            created_at: row.created_at,
            status: row.status ? String(row.status).toUpperCase() : null,
            orderType,
            payment_method: row.payment_method,
            total,
            subtotal,
            taxIva,
            taxInc,
            taxOther,
            discount,
            tip,
            tip_percentage,
            customerId: row.customer?.id ?? null,
            customerName,
            displayCode,
            shiftId: row.shift_id ? String(row.shift_id) : null,
            shipping_address: row.shipping_address ?? null,
            delivery_metadata: row.delivery_metadata ?? null,
          };
        });

        setSales(normalized);
      } catch (err: any) {
        console.error("Error cargando ventas", err);
        toast.error(err?.message ?? "No se pudieron cargar las ventas");
        setSales([]);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [organizationId, supabase, activeShiftId]
  );

  const loadSaleDetailFromSupabase = useCallback(
    async (saleId: string): Promise<SaleDetail> => {
      if (!organizationId) {
        throw new Error("No se encontró organización activa");
      }

      const selectWithOrderType = `
        id,
        invoice_number,
        order_number,
        created_at,
        status,
        shift_id,
        order_type,
        delivery_metadata,
        shipping_address,
        payment_method,
        total_amount,
        grand_total,
        subtotal_amount,
        discount_total_amount,
        tax_iva_amount,
        tax_inc_amount,
        tax_other_amount,
        tip,
        tip_percentage,
        customer:customers (id, name)
      `;
      const selectFallback = `
        id,
        invoice_number,
        order_number,
        created_at,
        status,
        shift_id,
        delivery_metadata,
        shipping_address,
        payment_method,
        total_amount,
        grand_total,
        subtotal_amount,
        discount_total_amount,
        tax_iva_amount,
        tax_inc_amount,
        tax_other_amount,
        tip,
        tip_percentage,
        customer:customers (id, name)
      `;
      const runQuery = (selectFields: string) =>
        supabase
          .from("sales")
          .select(selectFields)
          .eq("organization_id", organizationId)
          .eq("id", saleId)
          .single();

      let { data: saleRow, error: saleError }: any = await runQuery(selectWithOrderType);
      if (saleError && String(saleError.message ?? "").includes("order_type")) {
        ({ data: saleRow, error: saleError } = await runQuery(selectFallback));
      }

      if (saleError) throw saleError;

      const orderNumber = saleRow.order_number != null ? String(saleRow.order_number) : null;
      const orderType = resolveOrderType(saleRow);

      // Generar prefijo según tipo de orden
      let prefix = "VEN-";
      if (orderType === "DELIVERY_LOCAL") prefix = "DOM-";
      else if (orderType === "PICKUP") prefix = "REP-";
      else if (orderType === "SHIPMENT_NATIONAL") prefix = "ENV-";

      const displayCode = saleRow.invoice_number?.trim()
        ? saleRow.invoice_number.trim()
        : orderNumber
          ? `${prefix}${String(orderNumber).padStart(4, "0")}`
          : `${prefix}${String(saleRow.id).slice(0, 6).toUpperCase()}`;

      const sale: SaleRecord = {
        id: saleRow.id,
        invoice_number: saleRow.invoice_number,
        orderNumber,
        created_at: saleRow.created_at,
        status: saleRow.status ? String(saleRow.status).toUpperCase() : null,
        orderType,
        payment_method: saleRow.payment_method,
        total: parseNumeric(saleRow.grand_total ?? saleRow.total_amount),
        subtotal: parseNumeric(saleRow.subtotal_amount),
        taxIva: parseNumeric(saleRow.tax_iva_amount),
        taxInc: parseNumeric(saleRow.tax_inc_amount),
        taxOther: parseNumeric(saleRow.tax_other_amount),
        discount: parseNumeric(saleRow.discount_total_amount),
        tip: parseNumeric(saleRow.tip),
        tip_percentage: parseNumeric(saleRow.tip_percentage),
        customerId: saleRow.customer?.id ?? null,
        customerName: saleRow.customer?.name ?? "Consumidor Final",
        displayCode,
        shiftId: saleRow.shift_id ? String(saleRow.shift_id) : null,
        shipping_address: saleRow.shipping_address ?? null,
        delivery_metadata: saleRow.delivery_metadata ?? null,
      };

      const { data: itemsData, error: itemsError } = await supabase
        .from("sale_items")
        .select(
          "id, product_name, quantity, unit_price, total_price, iva_rate, iva_amount, inc_rate, inc_amount"
        )
        .eq("organization_id", organizationId)
        .eq("sale_id", saleId)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      const items: SaleItemRecord[] = (itemsData ?? []).map((row: any) => ({
        id: row.id,
        productName: row.product_name ?? "Producto",
        quantity: Number(row.quantity ?? 0),
        unitPrice: parseNumeric(row.unit_price),
        totalPrice: parseNumeric(row.total_price),
        ivaRate: row.iva_rate != null ? Number(row.iva_rate) : null,
        ivaAmount: parseNumeric(row.iva_amount),
        incRate: row.inc_rate != null ? Number(row.inc_rate) : null,
        incAmount: parseNumeric(row.inc_amount),
      }));

      return { sale, items };
    },
    [organizationId, supabase]
  );

  const fetchSaleDetail = useCallback(
    async (saleId: string) => {
      if (!organizationId) {
        setSaleDetail(null);
        setSaleDetailLoading(false);
        return;
      }

      setSaleDetailLoading(true);
      setSaleDetail(null);

      try {
        const detail = await loadSaleDetailFromSupabase(saleId);
        setSaleDetail(detail);
      } catch (err: any) {
        console.error("Error cargando detalle de venta", err);
        toast.error(err?.message ?? "No se pudo cargar la venta seleccionada");
        setSaleDetail(null);
      } finally {
        setSaleDetailLoading(false);
      }
    },
    [organizationId, loadSaleDetailFromSupabase]
  );

  const handleVoidSale = useCallback(async () => {
    if (!selectedSaleId || !saleDetail?.sale) return;
    if (!organizationId) {
      toast.error("No se encontró organización activa");
      return;
    }
    if (saleStatus === "VOIDED") return;

    const currentStatus = saleDetail.sale.status ?? null;
    const successMessage = currentStatus === "DRAFT" ? "Borrador anulado" : "Venta eliminada";
    const errorMessage = currentStatus === "DRAFT" ? "No se pudo anular la venta" : "No se pudo eliminar la venta";

    try {
      setVoidingSale(true);
      const { error } = await supabase
        .from("sales")
        .update({ status: "VOIDED" })
        .eq("organization_id", organizationId)
        .eq("id", selectedSaleId);

      if (error) throw error;

      toast.success(successMessage);
      setSaleDetail((prev) =>
        prev
          ? {
            ...prev,
            sale: { ...prev.sale, status: "VOIDED" },
          }
          : prev
      );
      setSales((prev) =>
        prev.map((sale) =>
          sale.id === selectedSaleId ? { ...sale, status: "VOIDED" } : sale
        )
      );
      setStatusUpdateValue("VOIDED");
      fetchSales({ silent: true });
    } catch (err: any) {
      console.error("Error anulando venta", err);
      toast.error(err?.message ?? errorMessage);
    } finally {
      setVoidingSale(false);
    }
  }, [selectedSaleId, saleDetail, organizationId, saleStatus, supabase, fetchSales]);

  const handleDeleteSale = useCallback(async () => {
    if (!selectedSaleId || !saleDetail?.sale) {
      throw new Error("No hay una venta seleccionada");
    }
    if (!organizationId) {
      throw new Error("No se encontró organización activa");
    }

    try {
      setDeletingSale(true);

      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("organization_id", organizationId)
        .eq("sale_id", selectedSaleId);
      if (paymentsError) throw paymentsError;

      const { error: itemsError } = await supabase
        .from("sale_items")
        .delete()
        .eq("organization_id", organizationId)
        .eq("sale_id", selectedSaleId);
      if (itemsError) throw itemsError;

      const { error: saleError } = await supabase
        .from("sales")
        .delete()
        .eq("organization_id", organizationId)
        .eq("id", selectedSaleId);
      if (saleError) throw saleError;

      setSales((prev) => prev.filter((sale) => sale.id !== selectedSaleId));
      setSelectedSaleId(null);
      setSaleDetail(null);
      setSaleDetailLoading(false);
      fetchSales({ silent: true });
    } catch (err: any) {
      console.error("Error eliminando venta", err);
      throw err;
    } finally {
      setDeletingSale(false);
    }
  }, [
    selectedSaleId,
    saleDetail,
    organizationId,
    supabase,
    fetchSales,
  ]);

  const promptDeleteSale = useCallback(() => {
    if (!saleDetail?.sale || showingDeleteToast || deletingSale) return;

    const saleLabel =
      saleDetail.sale.displayCode ||
      saleDetail.sale.orderNumber ||
      saleDetail.sale.id;

    setShowingDeleteToast(true);
    toast(
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-base font-medium">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          ¿Eliminar venta?
        </div>
        <p className="text-sm text-muted-foreground">
          La venta <strong>{saleLabel}</strong> y todos sus ítems y pagos se eliminarán permanentemente.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              toast.dismiss();
              setShowingDeleteToast(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={async () => {
              toast.dismiss();
              setShowingDeleteToast(false);
              await toast.promise(handleDeleteSale(), {
                loading: "Eliminando venta...",
                success: "Venta eliminada permanentemente",
                error: (err) =>
                  err?.message ?? "Error eliminando la venta",
              });
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>,
      {
        duration: Infinity,
        onDismiss: () => setShowingDeleteToast(false),
      }
    );
  }, [saleDetail, showingDeleteToast, deletingSale, handleDeleteSale]);

  const handleUpdateSaleStatus = useCallback(async () => {
    if (!selectedSaleId || !saleDetail?.sale) return;
    if (!organizationId) {
      toast.error("No se encontró organización activa");
      return;
    }

    const nextStatus = (statusUpdateValue ?? "").toUpperCase();

    if (!nextStatus) {
      toast.error("Selecciona un estado para la venta");
      return;
    }

    if (nextStatus === saleStatus) {
      toast.info("La venta ya está en ese estado");
      return;
    }

    try {
      setUpdatingSaleStatus(true);
      const { error } = await supabase
        .from("sales")
        .update({ status: nextStatus })
        .eq("organization_id", organizationId)
        .eq("id", selectedSaleId);

      if (error) throw error;

      toast.success("Estado de la venta actualizado");
      setSaleDetail((prev) =>
        prev
          ? {
            ...prev,
            sale: { ...prev.sale, status: nextStatus },
          }
          : prev
      );
      setSales((prev) =>
        prev.map((sale) =>
          sale.id === selectedSaleId ? { ...sale, status: nextStatus } : sale
        )
      );
      fetchSales({ silent: true });
    } catch (err: any) {
      console.error("Error actualizando estado de la venta", err);
      toast.error(err?.message ?? "No se pudo actualizar el estado");
    } finally {
      setUpdatingSaleStatus(false);
    }
  }, [
    selectedSaleId,
    saleDetail,
    organizationId,
    statusUpdateValue,
    saleStatus,
    supabase,
    fetchSales,
  ]);

  const handleMoveSaleToColumn = useCallback(
    async (saleId: string, targetColumnId: string) => {
      if (!organizationId) {
        toast.error("No se encontró organización activa");
        return;
      }
      if (orderTypeFilter === "all") return;

      const sale = sales.find((entry) => entry.id === saleId);
      if (!sale) return;

      const columns = ORDER_TYPE_BOARD_COLUMNS[orderTypeFilter] ?? [];
      const targetStatusMap = BOARD_COLUMN_TARGET_STATUS[orderTypeFilter];
      if (!columns.length || !targetStatusMap) return;

      const sourceColumnIndex = columns.findIndex((column) =>
        column.statuses.includes(sale.status ?? "")
      );
      const targetColumnIndex = columns.findIndex((column) => column.id === targetColumnId);
      if (targetColumnIndex < 0) return;

      const nextStatus = targetStatusMap[targetColumnId];
      if (!nextStatus) return;
      if (nextStatus === sale.status) return;

      if (sourceColumnIndex >= 0 && targetColumnIndex > sourceColumnIndex + 1) {
        toast.error("Avanza el pedido paso a paso para mantener trazabilidad.");
        return;
      }

      const blockedColumnsByFilter: Record<string, string[]> = {
        DELIVERY_LOCAL: ["OUT_FOR_DELIVERY", "COMPLETED"],
        SHIPMENT_NATIONAL: ["SHIPPED", "DELIVERED"],
        PICKUP: ["COLLECTED"],
      };

      const blockedColumns = blockedColumnsByFilter[orderTypeFilter] || [];
      if (blockedColumns.includes(targetColumnId)) {
        toast.error("Para avanzar a este estado usa el detalle del pedido.");
        return;
      }

      if (sourceColumnIndex >= 0 && targetColumnIndex < sourceColumnIndex) {
        toast.error("Para retroceder estados usa el detalle del pedido.");
        return;
      }

      const previousStatus = sale.status;

      setMovingSaleId(saleId);
      setSales((prev) =>
        prev.map((entry) => (entry.id === saleId ? { ...entry, status: nextStatus } : entry))
      );
      setSaleDetail((prev) =>
        prev?.sale.id === saleId ? { ...prev, sale: { ...prev.sale, status: nextStatus } } : prev
      );
      setStatusUpdateValue((prev) =>
        selectedSaleId === saleId ? nextStatus : prev
      );

      try {
        const { error } = await supabase
          .from("sales")
          .update({ status: nextStatus })
          .eq("organization_id", organizationId)
          .eq("id", saleId);
        if (error) throw error;
        toast.success(`Pedido movido a ${formatStatus(nextStatus)}`);
      } catch (err: any) {
        console.error("Error moviendo pedido en tablero", err);
        setSales((prev) =>
          prev.map((entry) => (entry.id === saleId ? { ...entry, status: previousStatus } : entry))
        );
        setSaleDetail((prev) =>
          prev?.sale.id === saleId
            ? { ...prev, sale: { ...prev.sale, status: previousStatus } }
            : prev
        );
        setStatusUpdateValue((prev) =>
          selectedSaleId === saleId ? previousStatus ?? "" : prev
        );
        toast.error(err?.message ?? "No se pudo actualizar el estado del pedido");
      } finally {
        setMovingSaleId(null);
      }
    },
    [organizationId, orderTypeFilter, sales, selectedSaleId, supabase]
  );

  const handlePrintSale = useCallback(
    async (sale: SaleRecord) => {
      if (typeof window === "undefined" || !window.electron?.printDocument) {
        toast.error("Función de impresión no disponible");
        return;
      }

      if (!organizationId) {
        toast.error("No se encontró organización activa");
        return;
      }

      try {
        setPrintingSaleId(sale.id);

        const detail =
          selectedSaleId === sale.id && saleDetail
            ? saleDetail
            : await loadSaleDetailFromSupabase(sale.id);

        if (!detail) {
          toast.error("No se encontró el detalle de la venta");
          return;
        }

        const printerPayload = buildPrinterPayload();
        const detailSale = detail.sale;
        const taxTotal = detailSale.taxIva + detailSale.taxInc + detailSale.taxOther;
        const serviceLabel =
          detailSale.tip > 0
            ? `Servicio ${formatPercentage(detailSale.tip_percentage)}%`
            : "Servicio";

        const breakdown: { label: string; amount: number }[] = [];
        if (detailSale.tip > 0) {
          breakdown.push({ label: serviceLabel, amount: detailSale.tip });
        }
        if (detailSale.taxIva > 0) {
          breakdown.push({ label: "IVA", amount: detailSale.taxIva });
        }
        if (detailSale.taxInc > 0) {
          breakdown.push({ label: "INC", amount: detailSale.taxInc });
        }
        if (detailSale.taxOther > 0) {
          breakdown.push({ label: "Otros", amount: detailSale.taxOther });
        }
        if (detailSale.discount > 0) {
          breakdown.push({ label: "Descuentos", amount: -detailSale.discount });
        }

        const items = detail.items.map((item) => ({
          id: item.id,
          name: item.productName,
          qty: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.totalPrice,
          taxes: {
            iva: item.ivaAmount,
            inc: item.incAmount,
          },
          modifiers: [],
        }));

        const saleData = {
          saleId: detailSale.id,
          invoiceNumber:
            detailSale.displayCode ??
            detailSale.invoice_number ??
            detailSale.orderNumber ??
            detailSale.id,
          createdAt: detailSale.created_at,
          customer: detailSale.customerId
            ? { id: detailSale.customerId, name: detailSale.customerName }
            : { name: detailSale.customerName },
          items,
          totals: {
            subtotal: detailSale.subtotal,
            tax: taxTotal,
            tip: detailSale.tip,
            tipPercentage: detailSale.tip_percentage,
            total: detailSale.total,
            breakdown,
          },
          payment: {
            method: detailSale.payment_method ?? "N/A",
            received: detailSale.total,
            change: 0,
            reference: undefined,
            currency: "COP",
            openCashDrawer: false,
            tip: detailSale.tip,
            tipPercentage: detailSale.tip_percentage,
          },
          store: {
            name: org?.name ?? "Sucursal",
            address: "",
            nit: "",
          },
          cashier: {
            name: "POS",
          },
          printer: printerPayload,
          taxes: breakdown,
          order: {
            type: detailSale.status,
            number: detailSale.orderNumber,
          },
        };

        await window.electron.printDocument({
          type: "invoice",
          data: saleData,
          printer: printerPayload,
          renderOptions: { copies: 1 },
        });

        toast.success("Impresión enviada");
      } catch (err: any) {
        console.error("Error imprimiendo venta", err);
        toast.error(err?.message ?? "No se pudo imprimir la venta");
      } finally {
        setPrintingSaleId(null);
      }
    },
    [
      buildPrinterPayload,
      loadSaleDetailFromSupabase,
      org?.name,
      organizationId,
      saleDetail,
      selectedSaleId,
    ]
  );

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    const pollingAllowed = ["DELIVERY_LOCAL", "SHIPMENT_NATIONAL", "PICKUP"].includes(orderTypeFilter);
    if (!pollingAllowed) return;

    const intervalId = setInterval(() => {
      fetchSales({ silent: true });
    }, 15000);

    return () => clearInterval(intervalId);
  }, [orderTypeFilter, fetchSales]);

  useEffect(() => {
    let cancelled = false;
    const loadActiveShift = async () => {
      if (!organizationId) {
        setActiveShiftId(null);
        setActiveShiftOpenedAt(null);
        return;
      }

      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id ?? null;
        if (!userId) {
          if (!cancelled) {
            setActiveShiftId(null);
            setActiveShiftOpenedAt(null);
          }
          return;
        }

        const { data, error } = await supabase
          .from("cash_shifts")
          .select("id, opened_at")
          .eq("organization_id", organizationId)
          .eq("cashier_id", userId)
          .eq("status", "open")
          .order("opened_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) {
          setActiveShiftId(data?.id ? String(data.id) : null);
          setActiveShiftOpenedAt(data?.opened_at ? String(data.opened_at) : null);
        }
      } catch (error) {
        console.error("No se pudo resolver el turno activo", error);
        if (!cancelled) {
          setActiveShiftId(null);
          setActiveShiftOpenedAt(null);
        }
      }
    };

    void loadActiveShift();
    return () => {
      cancelled = true;
    };
  }, [organizationId, supabase]);

  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`sales-inserts-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const orderType = resolveOrderType(payload.new);
          if (orderType !== "DINE_IN") {
            playNotificationSound();
          }
          fetchSales({ silent: true });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sales",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const previousStatus = String(payload.old?.status ?? "").toUpperCase();
          const nextStatus = String(payload.new?.status ?? "").toUpperCase();
          if (nextStatus && nextStatus !== previousStatus) {
            const orderType = resolveOrderType(payload.new);
            if (orderType !== "DINE_IN" && nextStatus !== "PREPARING") {
              playNotificationSound();
            }
          }
          fetchSales({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, supabase, fetchSales, playNotificationSound]);

  useEffect(() => {
    if (!selectedSaleId) {
      setSaleDetail(null);
      setSaleDetailLoading(false);
      return;
    }
    fetchSaleDetail(selectedSaleId);
  }, [selectedSaleId, fetchSaleDetail]);

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getDateRangeBounds(dateRange),
    [dateRange]
  );

  const salesInRange = useMemo(() => {
    return sales.filter((sale) => isWithinRange(sale.created_at, rangeStart, rangeEnd));
  }, [sales, rangeStart, rangeEnd]);

  const orderTypeCounts = useMemo(() => {
    const counts = ORDER_TYPE_OPTIONS.reduce<Record<OrderTypeFilterKey, number>>(
      (acc, option) => {
        acc[option.key] = 0;
        return acc;
      },
      {} as Record<OrderTypeFilterKey, number>
    );
    counts.all = salesInRange.length;
    for (const sale of salesInRange) {
      if (sale.orderType && counts[sale.orderType] != null) {
        counts[sale.orderType] += 1;
      }
    }
    return counts;
  }, [salesInRange]);

  const filteredSales = useMemo(() => {
    const term = q.trim().toLowerCase();

    return salesInRange.filter((sale) => {
      const typeMatches =
        orderTypeFilter === "all" ? true : sale.orderType === orderTypeFilter;
      if (!typeMatches) return false;

      if (!term) return true;
      return (
        sale.displayCode.toLowerCase().includes(term) ||
        sale.customerName.toLowerCase().includes(term)
      );
    });
  }, [salesInRange, orderTypeFilter, q]);

  const boardColumns = useMemo(
    () =>
      orderTypeFilter === "all"
        ? null
        : ORDER_TYPE_BOARD_COLUMNS[orderTypeFilter] ?? null,
    [orderTypeFilter]
  );

  const showLabelColumn = orderTypeFilter === "all";

  const closeModal = () => {
    setSelectedSaleId(null);
    setSaleDetail(null);
    setSaleDetailLoading(false);
  };

  return (
    <main className="min-h-[var(--app-content-min-height)] h-[var(--app-content-height)] md:min-h-[100svh] md:h-[100svh] w-full px-4 sm:px-6 lg:px-6 pt-4 pb-4 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <div className="flex-1" />
        <Link
          href="/pos/new"
          className="rounded-full bg-blue-600 text-white px-4 py-3 text-sm font-medium hover:brightness-110"
        >
          Crear nuevo
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-80">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código o cliente..."
              autoFocus
              className="w-full bg-gray-100 rounded-full border px-3 py-3 text-sm"
            />
          </div>
        </div>
        <div className="flex-1" />
        <OrderTypeFilterBar
          selected={orderTypeFilter}
          counts={orderTypeCounts}
          onSelect={setOrderTypeFilter}
        />
      </div>

      <div className="flex-1 min-h-0">
        {boardColumns ? (
          <SalesBoard
            columns={boardColumns}
            sales={filteredSales}
            loading={loading}
            onSelectSale={setSelectedSaleId}
            onPrintSale={handlePrintSale}
            printingSaleId={printingSaleId}
            onMoveSaleToColumn={handleMoveSaleToColumn}
            movingSaleId={movingSaleId}
          />
        ) : (
          <SalesTable
            sales={filteredSales}
            loading={loading}
            showLabelColumn={showLabelColumn}
            onSelectSale={setSelectedSaleId}
            onPrintSale={handlePrintSale}
            printingSaleId={printingSaleId}
          />
        )}
      </div>

      <FullscreenModal
        open={!!selectedSaleId}
        title={saleDetail?.sale ? `Venta ${saleDetail.sale.displayCode}` : "Detalles de la venta"}
        onClose={closeModal}
      >
        {saleDetailLoading ? (
          <div className="text-sm text-muted-foreground">Cargando venta…</div>
        ) : !saleDetail ? (
          <div className="text-sm text-muted-foreground">Selecciona una venta para ver el detalle.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ">
            <section className="lg:col-span-2 space-y-3">
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Ítem</th>
                      <th className="text-right p-3 font-medium">Cant.</th>
                      <th className="text-right p-3 font-medium">Unitario</th>
                      <th className="text-right p-3 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleDetail.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">{item.productName}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">${" "}{formatCOP(item.unitPrice)}</td>
                        <td className="p-3 text-right">${" "}{formatCOP(item.totalPrice)}</td>
                      </tr>
                    ))}
                    {saleDetail.items.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={4}>
                          Sin items registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <aside className="space-y-3">
              <div className="rounded-2xl border p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Cliente</div>
                <div className="text-base font-medium">{saleDetail.sale.customerName}</div>
                <div className="text-sm text-muted-foreground">
                  Fecha: {saleDetail.sale.created_at ? new Date(saleDetail.sale.created_at).toLocaleString() : "—"}
                </div>
                {saleDetail.sale.orderNumber && (
                  <div className="text-sm text-muted-foreground">
                    Orden: #{saleDetail.sale.orderNumber}
                  </div>
                )}
                <div className="text-sm">Estado: {formatStatus(saleDetail.sale.status)}</div>
                <div className="text-sm text-muted-foreground">
                  Pago: {saleDetail.sale.payment_method ? saleDetail.sale.payment_method.toUpperCase() : "No registrado"}
                </div>
                {saleDetail.sale.orderType === 'DELIVERY_LOCAL' && saleDetail.sale.shipping_address && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Dirección de entrega
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3 space-y-2 text-sm">
                      {saleDetail.sale.shipping_address.recipient_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Recibe:</span>
                          <span className="font-medium">{saleDetail.sale.shipping_address.recipient_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dirección:</span>
                        <span className="text-right">{saleDetail.sale.shipping_address.line1 || 'No especificada'}</span>
                      </div>
                      {(saleDetail.sale.shipping_address.city || saleDetail.sale.shipping_address.state) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ciudad:</span>
                          <span>{[saleDetail.sale.shipping_address.city, saleDetail.sale.shipping_address.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                      {saleDetail.sale.shipping_address.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Teléfono:</span>
                          <span>{saleDetail.sale.shipping_address.phone}</span>
                        </div>
                      )}
                      {saleDetail.sale.shipping_address.label && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Referencia:</span>
                          <span className="text-right text-xs">{saleDetail.sale.shipping_address.label}</span>
                        </div>
                      )}
                      {saleDetail.sale.delivery_metadata?.logistics_cost !== undefined && saleDetail.sale.delivery_metadata?.logistics_cost > 0 && (
                        <div className="flex justify-between pt-2 border-t mt-2">
                          <span className="text-muted-foreground">Costo envío:</span>
                          <span className="font-medium text-blue-700">${" "}{formatCOP(saleDetail.sale.delivery_metadata.logistics_cost)}</span>
                        </div>
                      )}
                      {saleDetail.sale.delivery_metadata?.estimated_delivery_time_minutes && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tiempo estimado:</span>
                          <span>~{saleDetail.sale.delivery_metadata.estimated_delivery_time_minutes} min</span>
                        </div>
                      )}
                      {saleDetail.sale.delivery_metadata?.coverage_zone_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zona:</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {saleDetail.sale.delivery_metadata.coverage_zone_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {saleDetail.sale.orderType === 'PICKUP' && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Recojo en tienda
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-3 border-t space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${" "}{formatCOP(saleDetail.sale.subtotal)}</span>
                  </div>
                  {saleDetail.sale.tip > 0 && (
                    <div className="flex justify-between">
                      <span>
                        {`Servicio${saleDetail.sale.tip_percentage > 0 ? ` ${formatPercentage(saleDetail.sale.tip_percentage)}%` : ""}`}
                      </span>
                      <span>${" "}{formatCOP(saleDetail.sale.tip)}</span>
                    </div>
                  )}
                  {saleDetail.sale.taxIva > 0 && (
                    <div className="flex justify-between">
                      <span>IVA</span>
                      <span>${" "}{formatCOP(saleDetail.sale.taxIva)}</span>
                    </div>
                  )}
                  {saleDetail.sale.taxInc > 0 && (
                    <div className="flex justify-between">
                      <span>INC</span>
                      <span>${" "}{formatCOP(saleDetail.sale.taxInc)}</span>
                    </div>
                  )}
                  {saleDetail.sale.taxOther > 0 && (
                    <div className="flex justify-between">
                      <span>Otros</span>
                      <span>${" "}{formatCOP(saleDetail.sale.taxOther)}</span>
                    </div>
                  )}
                  {saleDetail.sale.discount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Descuentos</span>
                      <span>- ${" "}{formatCOP(saleDetail.sale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base pt-2">
                    <span>Total</span>
                    <span>${" "}{formatCOP(saleDetail.sale.total)}</span>
                  </div>
                </div>
              </div>
              {/* <div className="rounded-2xl border p-4 space-y-3">
                <div className="text-sm font-medium">Cambiar estado</div>
                <p className="text-xs text-muted-foreground">
                  Selecciona un nuevo estado para la venta.
                </p>
                <select
                  value={statusUpdateValue}
                  onChange={(event) => setStatusUpdateValue(event.target.value)}
                  disabled={updatingSaleStatus}
                  className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                >
                  <option value="" hidden>
                    Selecciona un estado
                  </option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleUpdateSaleStatus}
                  disabled={
                    updatingSaleStatus ||
                    !statusUpdateValue ||
                    statusUpdateValue === saleStatus
                  }
                  className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingSaleStatus ? "Actualizando…" : "Cambiar estado"}
                </button>
              </div> */}
              {canDeleteSale ? (
                <div className="space-y-2">
                  {canVoidSale ? (
                    <button
                      type="button"
                      onClick={handleVoidSale}
                      disabled={voidingSale}
                      className="w-full rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {voidingSale
                        ? "Procesando…"
                        : saleIsDraft
                          ? "Anular borrador"
                          : "Anular venta"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={promptDeleteSale}
                    disabled={deletingSale}
                    className="w-full rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingSale ? "Eliminando…" : "Eliminar venta"}
                  </button>
                </div>
              ) : null}
            </aside>
          </div>
        )}
      </FullscreenModal>
    </main>
  );
}
