// app/ventas/nueva/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useEnvironment } from "@/context/EnvironmentContext";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useSidebar } from "@/context/SidebarContext";
import type { DBCustomer } from "@/types/customers";
import CustomerRow from "./Customer";
import { HorizontalCardList } from "./Drafts";
import { Plus, ClipboardCheck, ArrowDownUp, ShoppingCart, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePrinterContext } from "@/context/PrinterContext";
import OrderTypeSelector, {
  type FieldConfig as OTFieldConfig,
  type FieldType as OTFieldType,
} from "./DeliveryMethod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCashShift } from "./hooks/useCashShift";
import { createPortal } from "react-dom";
import SaleConfirmModal from "./SaleConfirmModal";
import KycModal, { createEmptyKycForm, type KycFormState } from "./KycModal";
import { LocationStatusIndicator } from "@/components/LocationStatusIndicator";
import DeliveryBadge from "./components/DeliveryBadge";
import DeliveryChannelsControl from "./components/DeliveryChannelsControl";
import DeliveryListModal from "./components/DeliveryListModal";

const ORDER_META_PREFIX = "__ORDER_META__:";

type OrderMeta = {
  type: string | null;
  fields: Record<string, string>;
};

type OrderTypeDefinition = {
  id: string;
  genericLabel: string;
  businessLabels?: Record<string, string>;
  icon: string;
  requires:
  | string[]
  | {
    general?: string[];
    [key: string]: string[] | undefined;
  };
};

type BusinessConfig = {
  enabledTypes: string[];
  customFields?: Record<string, string>;
  additionalType?: {
    id: string;
    label: string;
    icon: string;
    requires?: string[];
  };
};

type OrderTypeOption = {
  id: string;
  label: string;
  icon: string;
  requires: string[];
  definition: OrderTypeDefinition;
};

type FieldInputType = "text" | "tel" | "select" | "datetime-local" | "email";

type OrderFieldConfig = {
  label: string;
  placeholder?: string;
  type?: FieldInputType;
  options?: { value: string; label: string }[];
};

type PaymentMethod =
  | "cash"
  | "card"
  | "bold"
  | "transfer"
  | "nequi"
  | "daviplata"
  | "wompi"
  | "qr"
  | "voucher"
  | "gift_card"
  | "store_credit"
  | "other";

type PrimaryPaymentOption = "cash" | "card" | "transfer" | "combined" | "bold" | "nequi";

type PaymentDraft = {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference?: string;
  received?: string;
};

type ServiceChannelConfig = {
  pickup: boolean;
  delivery: boolean;
  national_shipping: boolean;
};

type CoverageValidationResult = {
  eligible: boolean;
  reasonCode: "ok" | "service_disabled" | "location_missing" | "out_of_coverage" | "location_closed";
  reason: string | null;
};

type LocationServiceFlags = {
  isActive: boolean;
  pickup: boolean;
  delivery: boolean;
  national_shipping: boolean;
};

const RESTAURANT_BUSINESS_IDS = new Set([
  "restaurant",
  "restaurante",
  "cafe",
  "coffee_shop",
  "fast_food",
]);

const EXCHANGE_BUSINESS_IDS = new Set([
  "exchange",
  "currency_exchange",
]);

const ORDER_TYPE_ICON_ALIASES: Record<string, string> = {
  car: "🚗",
  bell: "🔔",
};

const TIP_CHOICES = [0, 10, 15] as const;
const FALLBACK_TIP_PERCENTAGE = 10;
const PRINT_TICKET_STORAGE_KEY = "pos:printTicketPreference";
const MOBILE_HEADER_HEIGHT = 56;
const DEFAULT_MOBILE_DRAFTS_BAR_HEIGHT = 76;

function resolveOrderTypeIcon(
  option: OrderTypeOption | null | undefined,
  businessCategory: string | null | undefined
): string | undefined {
  if (!option) return undefined;
  const normalizedCategory = (businessCategory ?? "").toLowerCase();

  if (option.id === "in_store") {
    if (RESTAURANT_BUSINESS_IDS.has(normalizedCategory)) {
      return "🪑";
    }
    if (normalizedCategory === "hotel") {
      return "🛎️";
    }
  }

  if (option.id === "habitacion") {
    return "🛎️";
  }

  const rawIcon = option.icon ?? option.definition?.icon ?? "";
  if (!rawIcon) return undefined;
  if (rawIcon.length <= 2) {
    return rawIcon;
  }
  return ORDER_TYPE_ICON_ALIASES[rawIcon] ?? rawIcon;
}

const ORDER_TYPES: OrderTypeDefinition[] = [
  {
    id: "in_store",
    genericLabel: "En el local",
    businessLabels: {
      restaurant: "En la mesa",
      coffee_shop: "En la mesa",
      fast_food: "En la mesa",
      hotel: "En el hotel",
      retail: "En la tienda",
      pharmacy: "En la farmacia",
      supermarket: "En la caja",
    },
    icon: "🏪",
    requires: {
      general: [],
      restaurant: ["numero_mesa"],
      hotel: ["numero_mesa"],
    },
  },
  {
    id: "takeout",
    genericLabel: "Para llevar",
    businessLabels: {
      restaurant: "Para llevar",
      cafe: "Para llevar",
      coffee_shop: "Para llevar",
      fast_food: "Para llevar",
      retail: "Para llevar",
      pharmacy: "Para llevar",
      supermarket: "Para llevar",
    },
    icon: "🛍️",
    requires: ["nombre_cliente", "telefono"],
  },
  {
    id: "pickup",
    genericLabel: "Recoger mas tarde",
    businessLabels: {
      restaurant: "Recoger mas tarde",
      online_store: "Recoger en tienda",
      retail: "Recoger en tienda",
      supermarket: "Recoger en tienda",
      pharmacy: "Recoger mas tarde",
    },
    icon: "🕒",
    requires: ["nombre_cliente", "telefono", "fecha_hora_recogida"],
  },
  {
    id: "delivery",
    genericLabel: "Entrega a domicilio",
    businessLabels: {
      restaurant: "Entrega a domicilio",
      pharmacy: "Entrega a domicilio",
      retail: "Entrega a domicilio",
      supermarket: "Entrega a domicilio",
      online_store: "Entrega local",
    },
    icon: "🛵",
    requires: ["nombre_cliente", "telefono", "direccion"],
  },
  {
    id: "national_shipping",
    genericLabel: "Envios nacionales",
    businessLabels: {
      online_store: "Envios nacionales",
      retail: "Envio por paqueteria",
      pharmacy: "Envios nacionales",
    },
    icon: "🚚",
    requires: ["nombre_cliente", "telefono", "direccion_completa", "email"],
  },
];

const restaurantConfig: BusinessConfig = {
  enabledTypes: ["in_store", "takeout", "delivery"],
  customFields: {
    local: "numero_mesa",
  },
};

const cafeConfig: BusinessConfig = {
  enabledTypes: ["in_store", "takeout", "delivery"],
  customFields: {
    local: "numero_orden",
  },
};

const retailConfig: BusinessConfig = {
  enabledTypes: ["in_store", "takeout", "delivery", "national_shipping"],
};

const pharmacyConfig: BusinessConfig = {
  enabledTypes: ["in_store", "takeout", "pickup", "delivery", "national_shipping"],
};

const supermarketConfig: BusinessConfig = {
  enabledTypes: ["in_store", "pickup", "delivery"],
};

const fastFoodConfig: BusinessConfig = {
  enabledTypes: ["in_store", "takeout", "delivery"],
  customFields: {
    local: "numero_orden",
  },
  additionalType: {
    id: "auto",
    label: "Drive-thru",
    icon: "car",
  },
};

const hotelConfig: BusinessConfig = {
  enabledTypes: ["in_store", "takeout"],
  customFields: {
    local: "numero_mesa",
  },
  additionalType: {
    id: "habitacion",
    label: "Room service",
    icon: "bell",
    requires: ["numero_habitacion"],
  },
};

const BUSINESS_CONFIG: Record<string, BusinessConfig> = {
  restaurant: restaurantConfig,
  restaurante: restaurantConfig,
  cafe: cafeConfig,
  coffee_shop: cafeConfig,
  retail: retailConfig,
  tienda: retailConfig,
  online_store: {
    enabledTypes: ["pickup", "delivery", "national_shipping"],
  },
  tienda_online: {
    enabledTypes: ["pickup", "delivery", "national_shipping"],
  },
  pharmacy: pharmacyConfig,
  farmacia: pharmacyConfig,
  supermarket: supermarketConfig,
  supermercado: supermarketConfig,
  fast_food: fastFoodConfig,
  comida_rapida: fastFoodConfig,
  hotel: hotelConfig,
};
const MESA_OPTIONS = Array.from({ length: 50 }, (_, index) => {
  const value = String(index + 1);
  return { value, label: `Table #${value}` };
});

const ORDER_FIELD_CONFIG: Record<string, OrderFieldConfig> = {
  numero_mesa: {
    label: "Mesa",
    type: "select",
    options: MESA_OPTIONS,
  },
  numero_orden: {
    label: "Número de orden",
    placeholder: "Ej: 24",
  },
  nombre_cliente: {
    label: "Nombre del cliente",
    placeholder: "Ej: Juan Pérez",
  },
  telefono: {
    label: "Teléfono",
    type: "tel",
    placeholder: "Ej: 3001234567",
  },
  direccion: {
    label: "Dirección",
    placeholder: "Ej: Calle 123 #45-67",
  },
  direccion_completa: {
    label: "Dirección completa",
    placeholder: "Ej: Calle 123 #45-67, Ciudad",
  },
  fecha_hora_recogida: {
    label: "Fecha y hora de recogida",
    type: "datetime-local",
  },
  email: {
    label: "Correo electrónico",
    type: "email",
    placeholder: "cliente@email.com",
  },
  numero_habitacion: {
    label: "Número de habitación",
    placeholder: "Ej: 408",
  },
};

const OPTIONAL_ORDER_FIELDS: Record<string, string[]> = {
  takeout: ["telefono"],
};

const ORDER_FIELD_DEFAULTS: Record<string, string> = {
  numero_mesa: MESA_OPTIONS[0]?.value ?? "",
};

const ORDER_TYPE_MAP = new Map<string, OrderTypeDefinition>(
  ORDER_TYPES.map((def) => [def.id, def])
);

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  bold: "Bold",
  transfer: "Transferencia",
  nequi: "Nequi",
  daviplata: "Daviplata",
  wompi: "Wompi",
  qr: "QR",
  voucher: "Voucher",
  gift_card: "Gift card",
  store_credit: "Crédito tienda",
  other: "Otro",
};

const PAYMENT_METHOD_SELECT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: PAYMENT_METHOD_LABELS.cash },
  { value: "card", label: PAYMENT_METHOD_LABELS.card },
  { value: "bold", label: PAYMENT_METHOD_LABELS.bold },
  { value: "transfer", label: PAYMENT_METHOD_LABELS.transfer },
  { value: "qr", label: PAYMENT_METHOD_LABELS.qr },
  { value: "nequi", label: PAYMENT_METHOD_LABELS.nequi },
  { value: "daviplata", label: PAYMENT_METHOD_LABELS.daviplata },
  { value: "wompi", label: PAYMENT_METHOD_LABELS.wompi },
  { value: "voucher", label: PAYMENT_METHOD_LABELS.voucher },
  { value: "gift_card", label: PAYMENT_METHOD_LABELS.gift_card },
  { value: "store_credit", label: PAYMENT_METHOD_LABELS.store_credit },
  { value: "other", label: PAYMENT_METHOD_LABELS.other },
];

const PRIMARY_PAYMENT_OPTIONS: {
  value: PrimaryPaymentOption;
  label: string;
  icon: string;
}[] = [
    { value: "cash", label: PAYMENT_METHOD_LABELS.cash, icon: "💵" },
    { value: "transfer", label: PAYMENT_METHOD_LABELS.transfer, icon: "🔁" },
    { value: "card", label: PAYMENT_METHOD_LABELS.card, icon: "💳" },
    { value: "bold", label: PAYMENT_METHOD_LABELS.bold, icon: "🅱️" },
    { value: "nequi", label: PAYMENT_METHOD_LABELS.nequi, icon: "N" },
    { value: "combined", label: "Combinado", icon: "➕" },
  ];

function mergeRequires(def: OrderTypeDefinition, businessCategory: string | null | undefined): string[] {
  if (Array.isArray(def.requires)) {
    return def.requires;
  }

  const general = def.requires.general ?? [];
  const specific = businessCategory ? def.requires[businessCategory] ?? [] : [];
  const merged = new Set<string>([...general, ...specific]);
  const config = businessCategory ? BUSINESS_CONFIG[businessCategory] : undefined;
  const customField = config?.customFields?.[def.id];
  if (customField) {
    merged.add(customField);
  }
  return Array.from(merged);
}

function buildOrderTypeOption(
  def: OrderTypeDefinition,
  businessCategory: string | null | undefined
): OrderTypeOption {
  const label = def.businessLabels?.[businessCategory ?? ""] ?? def.genericLabel;
  return {
    id: def.id,
    label,
    icon: def.icon,
    requires: mergeRequires(def, businessCategory),
    definition: def,
  };
}

function isOptionalOrderField(orderTypeId: string | null | undefined, fieldId: string): boolean {
  if (!orderTypeId) return false;
  return OPTIONAL_ORDER_FIELDS[orderTypeId]?.includes(fieldId) ?? false;
}

function getEnforcedOrderFields(orderTypeId: string | null | undefined, fields: string[]): string[] {
  if (!orderTypeId) return fields;
  return fields.filter((field) => !isOptionalOrderField(orderTypeId, field));
}

function getAvailableOrderTypeOptions(
  businessCategory: string | null | undefined
): OrderTypeOption[] {
  const config = businessCategory ? BUSINESS_CONFIG[businessCategory] : undefined;
  const enabledIds = config?.enabledTypes ?? ORDER_TYPES.map((def) => def.id);
  const options = new Map<string, OrderTypeOption>();

  enabledIds.forEach((id) => {
    const def = ORDER_TYPE_MAP.get(id);
    if (def) {
      options.set(def.id, buildOrderTypeOption(def, businessCategory));
    }
  });

  if (config?.additionalType) {
    const extraDef: OrderTypeDefinition = {
      id: config.additionalType.id,
      genericLabel: config.additionalType.label,
      businessLabels: {
        [businessCategory ?? ""]: config.additionalType.label,
      },
      icon: config.additionalType.icon,
      requires: config.additionalType.requires ?? [],
    };
    options.set(extraDef.id, buildOrderTypeOption(extraDef, businessCategory));
  }

  return Array.from(options.values());
}

function getDefaultFieldValue(fieldId: string): string {
  return ORDER_FIELD_DEFAULTS[fieldId] ?? "";
}

function ensureOrderFields(
  required: string[],
  current: Record<string, string>
): Record<string, string> {
  const next: Record<string, string> = {};
  required.forEach((field) => {
    next[field] = current[field] ?? getDefaultFieldValue(field);
  });
  return next;
}

function getDefaultOrderMeta(
  businessCategory: string | null | undefined,
  options?: OrderTypeOption[]
): OrderMeta {
  const available = options ?? getAvailableOrderTypeOptions(businessCategory);
  const first = available[0];
  if (!first) return { type: null, fields: {} };
  const fields = ensureOrderFields(first.requires, {});
  return { type: first.id, fields };
}

function serializeOrderMeta(meta: OrderMeta): string {
  return `${ORDER_META_PREFIX}${JSON.stringify(meta)}`;
}

function generateVerificationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function resolveInitialOperationalSaleStatus(
  type: string | null | undefined,
  fields: Record<string, string>
): string {
  const normalizedType = String(type ?? "").toLowerCase();
  if (normalizedType === "pickup") {
    const hasScheduledAt = Boolean((fields.fecha_hora_recogida ?? "").trim());
    return hasScheduledAt ? "SCHEDULED_FOR_PICKUP" : "NEW";
  }
  if (normalizedType === "delivery" || normalizedType === "delivery_local") {
    return "NEW";
  }
  if (normalizedType === "national_shipping") {
    return "NEW";
  }
  return "COMPLETED";
}

function normalizeOrderTypeId(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function mapOrderTypeToChannel(type: string | null | undefined): keyof ServiceChannelConfig | null {
  const normalized = normalizeOrderTypeId(type);
  if (normalized === "pickup") return "pickup";
  if (normalized === "delivery") return "delivery";
  if (normalized === "national_shipping") return "national_shipping";
  return null;
}

function parseOrderMeta(notes: string | null): OrderMeta {
  if (!notes) return { type: null, fields: {} };
  if (notes.startsWith(ORDER_META_PREFIX)) {
    try {
      const parsed = JSON.parse(notes.slice(ORDER_META_PREFIX.length));
      return {
        type: typeof parsed?.type === "string" ? parsed.type : null,
        fields: typeof parsed?.fields === "object" && parsed?.fields
          ? Object.fromEntries(
            Object.entries(parsed.fields).map(([key, value]) => [key, String(value ?? "")])
          )
          : {},
      };
    } catch (error) {
      console.warn("No se pudo parsear order meta", error);
    }
  }

  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === "object" && "type" in parsed && "fields" in parsed) {
      return {
        type: typeof parsed.type === "string" ? parsed.type : null,
        fields:
          typeof parsed.fields === "object" && parsed.fields
            ? Object.fromEntries(
              Object.entries(parsed.fields).map(([key, value]) => [key, String(value ?? "")])
            )
            : {},
      };
    }
  } catch (error) {
    // ignorar
  }

  return { type: null, fields: {} };
}

function getFieldConfig(fieldId: string): OrderFieldConfig {
  return ORDER_FIELD_CONFIG[fieldId] ?? { label: fieldId };
}

// ------------------ Tipos ------------------

type NumericValue = string | number | null;

type DBModifier = {
  id: string;
  modifier_set_id: string;
  name: string;
  display_name: string | null;
  price_delta: number;
  is_active: boolean;
  hide_online: boolean;
  preselect: boolean;
  sort_order: number | null;
  image_url: string | null;
};

type ProductModifierSet = {
  id: string;
  product_id: string;
  modifier_set_id: string;
  require_selection: boolean | null;
  min_selections: number | null;
  max_selections: number | null;
  sort_order: number | null;
  modifier_set:
  | {
    id: string;
    name: string;
    display_name: string | null;
    require_selection: boolean;
    min_selections: number;
    max_selections: number | null;
    is_active: boolean;
    hide_online: boolean;
    modifiers: DBModifier[];
  }
  | null;
};

type ResolvedProductModifierSet = {
  relationId: string;
  setId: string;
  name: string;
  displayName: string | null;
  requireSelection: boolean;
  minSelections: number;
  maxSelections: number | null;
  items: DBModifier[];
  sortOrder: number | null;
};

type DBProduct = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: NumericValue;
  image_url: string | null;
  is_available: boolean | null;
  principal_bar_code: string | null;
  price_includes_taxes: boolean;
  item_type: string;
  iva_category: "GRAVADO" | "EXENTO" | "EXCLUIDO" | "NO_CAUSA" | string;
  iva_rate: NumericValue;
  inc_type: string | null;
  inc_rate: NumericValue;
  unspsc_code: string | null;
  dian_tariff_code: string | null;
  unit_code: string | null;
  tax_observation: string | null;
  fx_asset_kind?: string | null;
  fx_base_currency?: string | null;
  fx_quote_currency?: string | null;
  fx_reference_code?: string | null;
  fx_pricing_mode?: string | null;
  fx_reference_price?: NumericValue;
  fx_buy_price?: NumericValue;
  fx_sell_price?: NumericValue;
  fx_buy_margin_bps?: number | null;
  fx_sell_margin_bps?: number | null;
  fx_last_rate_source?: string | null;
  fx_last_rate_at?: string | null;
  fx_price_metadata?: Record<string, unknown> | null;
  fx_quantity_precision?: number | null;
  fx_auto_pricing?: boolean | null;
  fx_quote_unit?: NumericValue;
  fx_market_feed_payload?: Record<string, unknown> | null;
  modifierSets?: ProductModifierSet[];
};

type Category = {
  id: string;
  organization_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  position: number;
};

type SelectedLineModifier = {
  modifierId: string;
  modifierSetId: string;
  modifierName: string;
  modifierDisplayName: string | null;
  modifierPriceDelta: number;
  modifierSetName: string;
  modifierSetDisplayName: string | null;
};

type CartLine = {
  id: string;
  product: DBProduct;
  qty: number;
  modifiers: SelectedLineModifier[];
  comment: string | null;
  selectionKey: string;
};

type DraftSummary = {
  id: string;
  orderNumber: string;
  subtotal: number;
  total: number;
  tipPercentage: number;
  status: string | null;
  orderType: string | null;
  orderFields: Record<string, string>;
  customerId: string | null;
  notes: string | null;
};

type SaleItemDraftRow = {
  id?: string;
  product_id: string;
  quantity: number;
  modifiers?: SelectedLineModifier[];
  comments?: string | null;
};

// NUEVO: tipo cliente (ajusta a tu schema si difiere)
// ------------------ Electron bridge typing ------------------
declare global {
  interface Window {
    electron?: {
      printTicket?: (saleData: unknown) => Promise<unknown> | unknown;
      printHTML?: (saleData: unknown, printer: unknown) => Promise<unknown> | unknown;

      printDocument?: (payload: {
        type?: string;
        data?: unknown;
        printer?: unknown;
        renderOptions?: Record<string, unknown>;
      }) => Promise<unknown>;
      listPrinters?: () => Promise<unknown[]>;
      getSelectedPrinter?: () => Promise<unknown>;
      setSelectedPrinter?: (config: unknown) => Promise<unknown>;
      openDrawer?: (payload?: { printer?: unknown }) => Promise<unknown>;
    };
  }
}

// ------------- Util ---------------
function currency(n: number) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function parseNumeric(value: NumericValue): number {
  if (value == null || !value) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function parsePositiveRate(value: NumericValue | undefined): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

type PortalModalProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
};

function PortalModal({ open, onClose, children }: PortalModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !open) return null;

  const handleBackdropClick = () => {
    if (onClose) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      <div
        className="relative z-[1201] w-full max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clampTipPercentage(value: number): number {
  if (!Number.isFinite(value)) return FALLBACK_TIP_PERCENTAGE;
  const clamped = Math.min(Math.max(value, 0), 100);
  return round2(clamped);
}

function resolveDefaultTipPercentage(raw: NumericValue | null | undefined): number {
  if (raw == null) return FALLBACK_TIP_PERCENTAGE;
  const num = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(num)) return FALLBACK_TIP_PERCENTAGE;
  return clampTipPercentage(num);
}

function formatAmountForInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value === 0 ? "0" : value.toFixed(2);
}

function parseAmountInput(raw: string | null | undefined): number {
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

function formatIncTypeLabel(raw: string | null | undefined) {
  if (!raw) return "INC";
  const normalized = raw.replace(/_/g, " ").toLowerCase();
  const titled = normalized.replace(/\b\w/g, (c) => c.toUpperCase());
  return `INC ${titled}`.trim();
}

function formatRate(rate: number) {
  const value = round2(rate);
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}

function mapSaleRowToDraft(row: any): DraftSummary {
  const deliveryMetaRaw = row.delivery_metadata ?? null;
  let meta: OrderMeta;
  if (deliveryMetaRaw && typeof deliveryMetaRaw === "object") {
    const rawType = (deliveryMetaRaw as Record<string, unknown>).type;
    const rawFields = (deliveryMetaRaw as Record<string, unknown>).fields;
    const normalizedFields: Record<string, string> =
      rawFields && typeof rawFields === "object"
        ? Object.entries(rawFields as Record<string, unknown>).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            if (value == null) return acc;
            acc[key] = String(value);
            return acc;
          },
          {}
        )
        : {};
    meta = {
      type: typeof rawType === "string" || rawType === null ? (rawType as string | null) : null,
      fields: normalizedFields,
    };
  } else {
    meta = parseOrderMeta(row.notes ?? null);
  }
  const subtotal = parseNumeric(row.subtotal_amount);
  const total = parseNumeric(row.grand_total ?? row.total_amount);
  const tipPercentage = parseNumeric(row.tip_percentage);
  const orderNumberSource = row.order_number ?? row.invoice_number;
  const orderNumber = orderNumberSource
    ? String(orderNumberSource)
    : `BOR-${String(row.id ?? "").slice(0, 6).toUpperCase()}`;

  return {
    id: row.id,
    orderNumber,
    subtotal,
    total,
    tipPercentage,
    status: row.status ?? null,
    orderType: meta.type,
    orderFields: meta.fields,
    customerId: row.customer_id ?? row.customer?.id ?? null,
    notes: row.notes ?? null,
  };
}

function buildDraftSignaturePayload(
  lines: { productId: string; qty: number; modifiers: string[]; comment?: string | null }[],
  orderTypeValue: string | null,
  fieldsValue: Record<string, string>,
  customerIdValue: string | null,
  tipPercentageValue: number
) {
  return JSON.stringify({
    lines: lines.map((line) => ({
      id: line.productId,
      qty: line.qty,
      modifiers: [...line.modifiers].sort(),
      comment: (line.comment ?? "").trim(),
    })),
    orderType: orderTypeValue,
    fields: fieldsValue,
    customerId: customerIdValue,
    tipPercentage: tipPercentageValue,
  });
}

function makeTempId() {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildSelectionKey(
  productId: string,
  modifiers: SelectedLineModifier[],
  comment: string | null | undefined
): string {
  const modIds = [...modifiers].map((mod) => mod.modifierId).sort();
  const modsKey = modIds.length ? modIds.join("|") : "base";
  const commentKey = (comment ?? "").trim();
  return JSON.stringify({ productId, mods: modsKey, comment: commentKey });
}


function composeComment(raw: string, modifiers: SelectedLineModifier[]): string {
  void modifiers;
  return raw.trim();
}

function customerDisplayName(customer?: Partial<DBCustomer> | null): string {
  if (!customer) return "Consumidor Final";
  const name = customer.name?.trim();
  return name && name.length > 0 ? name : "Cliente";
}

function normalizePhoneValue(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

function phonesMatch(a?: string | null, b?: string | null): boolean {
  const left = normalizePhoneValue(a);
  const right = normalizePhoneValue(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.endsWith(right) || right.endsWith(left);
}

type ModifierSelectionDialogProps = {
  open: boolean;
  product: DBProduct | null;
  sets: ResolvedProductModifierSet[];
  initialModifiers?: SelectedLineModifier[];
  initialComment?: string | null;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (payload: { modifiers: SelectedLineModifier[]; comment: string }) => void;
};

function ModifierSelectionDialog({
  open,
  product,
  sets,
  initialModifiers = [],
  initialComment = "",
  confirmLabel,
  onCancel,
  onConfirm,
}: ModifierSelectionDialogProps) {
  const commentRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedBySet, setSelectedBySet] = useState<Record<string, string[]>>({});
  const [comment, setComment] = useState("");

  const buildSelectedModifiers = useCallback(
    (selection: Record<string, string[]>) => {
      const result: SelectedLineModifier[] = [];
      sets.forEach((setConfig) => {
        const selected = new Set(selection[setConfig.setId] ?? []);
        if (!selected.size) return;
        setConfig.items.forEach((modifier) => {
          if (selected.has(modifier.id)) {
            result.push({
              modifierId: modifier.id,
              modifierSetId: setConfig.setId,
              modifierName: modifier.name,
              modifierDisplayName: modifier.display_name,
              modifierPriceDelta: modifier.price_delta,
              modifierSetName: setConfig.name,
              modifierSetDisplayName: setConfig.displayName,
            });
          }
        });
      });
      return result;
    },
    [sets],
  );

  const scrollToModifierSet = useCallback((setId: string) => {
    const container = listRef.current;
    const target = setRefs.current[setId];
    if (!container || !target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = targetRect.top - containerRect.top + container.scrollTop;
    container.scrollTo({ top, behavior: "smooth" });
  }, []);

  const handleAdvance = useCallback(
    (setConfig: ResolvedProductModifierSet, selectionCount: number) => {
      const minBase = setConfig.minSelections ?? 0;
      const min = Math.max(minBase, setConfig.requireSelection ? 1 : 0);
      const max = setConfig.maxSelections;
      const shouldAdvance =
        (max != null && selectionCount >= max) || (min > 0 && selectionCount >= min);

      if (!shouldAdvance) return;

      const currentIndex = sets.findIndex((set) => set.setId === setConfig.setId);
      if (currentIndex === -1) return;

      if (currentIndex === sets.length - 1) {
        requestAnimationFrame(() => commentRef.current?.focus());
        return;
      }

      if (sets.length <= 2) return;

      const nextSet = sets[currentIndex + 1];
      if (!nextSet) return;
      requestAnimationFrame(() => scrollToModifierSet(nextSet.setId));
    },
    [sets, scrollToModifierSet],
  );

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string[]> = {};
    sets.forEach((set) => {
      const defaults = set.items
        .filter((modifier) => modifier.preselect)
        .map((modifier) => modifier.id);
      initial[set.setId] = defaults;
    });

    if (initialModifiers.length) {
      const grouped: Record<string, string[]> = {};
      initialModifiers.forEach((mod) => {
        if (!grouped[mod.modifierSetId]) {
          grouped[mod.modifierSetId] = [];
        }
        if (!grouped[mod.modifierSetId].includes(mod.modifierId)) {
          grouped[mod.modifierSetId].push(mod.modifierId);
        }
      });
      Object.entries(grouped).forEach(([setId, values]) => {
        initial[setId] = values;
      });
    }

    setSelectedBySet(initial);

    const cleanedInitialComment = (initialComment ?? "").trim();
    setComment(cleanedInitialComment);
  }, [open, sets, initialModifiers, initialComment, buildSelectedModifiers]);

  const handleToggle = (setConfig: ResolvedProductModifierSet, modifier: DBModifier) => {
    const current = new Set(selectedBySet[setConfig.setId] ?? []);
    if (current.has(modifier.id)) {
      current.delete(modifier.id);
      setSelectedBySet((prev) => ({ ...prev, [setConfig.setId]: Array.from(current) }));
      return;
    }
    if (setConfig.maxSelections === 1) {
      current.clear();
    } else if (setConfig.maxSelections != null && current.size >= setConfig.maxSelections) {
      toast.error(
        `Máximo ${setConfig.maxSelections} opción(es) en ${setConfig.displayName ?? setConfig.name}`,
      );
      return;
    }
    current.add(modifier.id);
    const nextValues = Array.from(current);
    setSelectedBySet((prev) => ({ ...prev, [setConfig.setId]: nextValues }));
    handleAdvance(setConfig, nextValues.length);
  };

  const handleConfirm = () => {
    for (const setConfig of sets) {
      const selected = selectedBySet[setConfig.setId] ?? [];
      const count = selected.length;
      const min = setConfig.minSelections ?? 0;
      const max = setConfig.maxSelections;

      if (setConfig.requireSelection && count === 0) {
        toast.error(`Selecciona al menos una opción en ${setConfig.displayName ?? setConfig.name}`);
        return;
      }
      if (count < min) {
        toast.error(
          `Selecciona mínimo ${min} opción(es) en ${setConfig.displayName ?? setConfig.name}`,
        );
        return;
      }
      if (max != null && count > max) {
        toast.error(
          `Selecciona máximo ${max} opción(es) en ${setConfig.displayName ?? setConfig.name}`,
        );
        return;
      }
    }

    const selectedModifiers = buildSelectedModifiers(selectedBySet);
    const finalComment = composeComment(comment, selectedModifiers);

    onConfirm({
      modifiers: selectedModifiers,
      comment: finalComment,
    });
  };

  const commentId = product ? `line-comments-${product.id}` : "line-comments";

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onCancel() : undefined)}>
      <DialogContent
        className="max-w-3xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          queueMicrotask(() => commentRef.current?.focus());
        }}
      >
        <DialogHeader className="px-4">
          <DialogTitle>Personalizar {product?.name ?? "producto"}</DialogTitle>
        </DialogHeader>

        <div className="px-4">
          {sets.length === 0 ? (
            <div className="text-sm text-gray-500">
              No hay modificadores configurados para este producto.
            </div>
          ) : (
            <div
              ref={listRef}
              className={`space-y-4 max-h-[60svh] overflow-y-auto pr-1 ${sets.length > 2 ? "pb-[500px]" : ""
                }`}
            >
              {sets.map((setConfig) => {
                const selected = new Set(selectedBySet[setConfig.setId] ?? []);
                const minText =
                  setConfig.minSelections && setConfig.minSelections > 0
                    ? `Mínimo ${setConfig.minSelections}`
                    : null;
                const maxText =
                  setConfig.maxSelections != null
                    ? `Máximo ${setConfig.maxSelections}`
                    : null;

                return (
                  <div
                    key={setConfig.setId}
                    ref={(el) => {
                      setRefs.current[setConfig.setId] = el;
                    }}
                    className="bg-gray-50 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-lg">
                          {setConfig.displayName ?? setConfig.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {setConfig.requireSelection ? "Obligatorio" : "Opcional"}
                          {minText || maxText ? (
                            <>
                              {" · "}
                              {[minText, maxText].filter(Boolean).join(" · ")}
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Seleccionadas: {selected.size}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {setConfig.items.map((modifier) => {
                        const isSelected = selected.has(modifier.id);
                        return (
                          <button
                            key={modifier.id}
                            type="button"
                            onClick={() => handleToggle(setConfig, modifier)}
                            className={`rounded-full border bg-white px-3 py-2 text-left transition ${isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:bg-gray-50"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-10 w-10 shrink-0 rounded-full border overflow-hidden ${modifier.image_url ? "bg-white" : "bg-gray-100"
                                  }`}
                              >
                                {modifier.image_url ? (
                                  <img
                                    src={modifier.image_url}
                                    alt={modifier.display_name ?? modifier.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-xs font-semibold text-gray-500">
                                    {(modifier.display_name ?? modifier.name ?? "??")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-sm truncate">
                                    {modifier.display_name ?? modifier.name}
                                  </span>
                                  {modifier.price_delta !== 0 ? (
                                    <span className="text-xs text-gray-600 whitespace-nowrap">
                                      {modifier.price_delta > 0 ? "+" : "-"}${" "}
                                      {currency(Math.abs(modifier.price_delta))}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-500">Incluido</span>
                                  )}
                                </div>
                                {modifier.display_name ? (
                                  <div className="text-[11px] text-gray-500 truncate">
                                    {modifier.name}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <label htmlFor={commentId} className="text-xs font-medium text-gray-600">
              Comentarios
            </label>
            <textarea
              id={commentId}
              rows={3}
              ref={commentRef}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Instrucciones adicionales para cocina"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="px-4 pb-4">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>{confirmLabel ?? "Agregar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatKitchenTimestamp(date: Date): string {
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const suffix = hours >= 12 ? "pm" : "am";
  return `${day} ${month}, ${hour12}:${minutes} ${suffix}`;
}

type LineComputation = {
  baseUnit: number;
  unitIva: number;
  unitInc: number;
  unitTotal: number;
  base: number;
  ivaAmount: number;
  incAmount: number;
  total: number;
  ivaRate: number;
  incRate: number;
  priceIncludesTaxes: boolean;
};

function computeLineTotals(
  product: DBProduct,
  qty: number,
  modifiers: SelectedLineModifier[] = []
): LineComputation {
  const modifiersDelta = modifiers.reduce(
    (acc, mod) => acc + parseNumeric(mod.modifierPriceDelta),
    0
  );
  const rawUnitPrice = parseNumeric(product.price) + modifiersDelta;
  const priceIncludes = Boolean(product.price_includes_taxes);

  const ivaRate = product.iva_category === "GRAVADO" ? parseNumeric(product.iva_rate) : 0;
  const incRate = product.inc_type && product.inc_type !== "NINGUNO" ? parseNumeric(product.inc_rate) : 0;

  const totalPercent = (ivaRate + incRate) / 100;

  let baseUnit = rawUnitPrice;
  let unitTotal = rawUnitPrice;

  if (priceIncludes && totalPercent > 0) {
    const divisor = 1 + totalPercent;
    baseUnit = divisor > 0 ? rawUnitPrice / divisor : rawUnitPrice;
  }

  if (!priceIncludes) {
    unitTotal = rawUnitPrice * (1 + totalPercent);
    baseUnit = rawUnitPrice;
  }

  const unitIva = baseUnit * (ivaRate / 100);
  const unitInc = baseUnit * (incRate / 100);

  const base = baseUnit * qty;
  const ivaAmount = unitIva * qty;
  const incAmount = unitInc * qty;
  const total = unitTotal * qty;

  return {
    baseUnit: round2(baseUnit),
    unitIva: round2(unitIva),
    unitInc: round2(unitInc),
    unitTotal: round2(unitTotal),
    base: round2(base),
    ivaAmount: round2(ivaAmount),
    incAmount: round2(incAmount),
    total: round2(total),
    ivaRate,
    incRate,
    priceIncludesTaxes: priceIncludes,
  };
}

// ---- Skeletons ----
const SkeletonChip = () => (
  <div className="flex items-center gap-2 rounded-full bg-gray-100 pl-2 pr-3 py-2 text-sm shrink-0 animate-pulse">
    <div className="w-6 h-6 rounded-full bg-gray-300" />
    <div className="h-3 w-20 bg-gray-300 rounded" />
  </div>
);

const SkeletonProductCard = () => (
  <div className="rounded-xl text-left">
    <div className="h-[140px] rounded-xl bg-gray-100 border px-2 py-2 mb-2 animate-pulse" />
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
  </div>
);

// ------------------ Página ------------------

export default function NuevaVentaPage() {
  const { org, user, profile } = useEnvironment();
  const organizationId = org?.id ?? null;
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { toggle } = useSidebar();
  const { selected: printerSelection } = usePrinterContext();



  const buildPrinterPayload = useCallback(
    (overrides: Record<string, unknown> = {}) => {
      const base =
        printerSelection && printerSelection.name
          ? {
            ...printerSelection,
            mode:
              printerSelection.mode ??
              (printerSelection.host ? "tcp" : "winspool"),
          }
          : { mode: "tcp" as const };
      return { ...base, ...overrides };
    },
    [printerSelection],
  );

  const {
    activeShift,
    shiftSummary,
    shiftAmountLabel,
    shiftLoading,
    organizationChannels,
    shiftChannels,
    shiftChannelStatuses,
    handleUpdateChannelStatus,
    handleOpenCashMovementModal,
    handleShiftSummaryButton,
    refreshShiftSummary,
    modals: cashShiftModals,
  } = useCashShift({
    organizationId,
    supabase,
    userId: user?.id,
    userEmail: user?.email ?? null,
    profileName: profile?.full_name ?? null,
    orgName: org?.name ?? null,
    buildPrinterPayload,
  });
  // Location ID del turno activo
  const currentLocationId = activeShift?.location_id ?? null;

  // Modo de operación
  const [tradeMode, setTradeMode] = useState<"sale" | "purchase">("sale");
  const isPurchaseMode = tradeMode === "purchase";

  // Carrito
  const [cart, setCart] = useState<CartLine[]>([]);
  const [modifierDialog, setModifierDialog] = useState<{
    product: DBProduct;
    sets: ResolvedProductModifierSet[];
    mode: "add" | "edit";
    lineId?: string;
    initialModifiers?: SelectedLineModifier[];
    initialComment?: string | null;
  } | null>(null);
  const cartListRef = useRef<HTMLDivElement | null>(null);
  const prevCartLengthRef = useRef(0);
  const pendingCartScrollRef = useRef(false);
  const lastCartDraftIdRef = useRef<string | null>(null);

  // UI de categorías (sticky + scroll)
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const draftsBarRef = useRef<HTMLDivElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
  const [draftsBarHeight, setDraftsBarHeight] = useState(DEFAULT_MOBILE_DRAFTS_BAR_HEIGHT);
  const [listTopOffset, setListTopOffset] = useState(189);
  const categoriesBarRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const headerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const isProgrammaticChipScrollRef = useRef(false);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const chipScrollIdleTimerRef = useRef<number | null>(null);
  const ACTIVATE_MARGIN = 12;

  // Buscador / lector
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncMobileState = () => {
      setIsMobileViewport(mediaQuery.matches);
    };
    syncMobileState();
    mediaQuery.addEventListener("change", syncMobileState);
    return () => {
      mediaQuery.removeEventListener("change", syncMobileState);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMobileSummaryOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateListTopOffset = () => {
      const top = listContainerRef.current?.getBoundingClientRect().top;
      if (typeof top === "number" && Number.isFinite(top)) {
        setListTopOffset(Math.max(Math.round(top), 96));
      }
    };

    updateListTopOffset();
    const rafId = window.requestAnimationFrame(updateListTopOffset);
    window.addEventListener("resize", updateListTopOffset);
    window.addEventListener("orientationchange", updateListTopOffset);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateListTopOffset);
      window.removeEventListener("orientationchange", updateListTopOffset);
    };
  }, []);

  // Datos
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [byCat, setByCat] = useState<Record<string, string[]>>({}); // category_id -> product_ids

  // Modal de pago
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [printingKitchen, setPrintingKitchen] = useState(false);
  const [printingPrebill, setPrintingPrebill] = useState(false);
  const [openingDrawer, setOpeningDrawer] = useState(false);
  const [drawerAvailable, setDrawerAvailable] = useState(false);
  const [paymentStage, setPaymentStage] = useState<"method" | "details">("method");
  const [primaryPaymentOption, setPrimaryPaymentOption] = useState<PrimaryPaymentOption | null>(null);
  const [paymentDrafts, setPaymentDrafts] = useState<PaymentDraft[]>([]);
  const [openCashDrawer, setOpenCashDrawer] = useState(true);
  const [printReceipt, setPrintReceipt] = useState(true);
  const defaultTipPercentage = useMemo(
    () => resolveDefaultTipPercentage(org?.default_tip_percentage),
    [org?.default_tip_percentage],
  );
  const [tipPercentage, setTipPercentage] = useState<number>(defaultTipPercentage);
  const combinedFirstAmountRef = useRef<HTMLInputElement | null>(null);
  const singleCashReceivedRef = useRef<HTMLInputElement | null>(null);
  const singleReferenceRef = useRef<HTMLInputElement | null>(null);
  const printPreferenceHydratedRef = useRef(false);
  const shouldFocusPaymentRef = useRef(false);
  const saleTipRef = useRef(defaultTipPercentage);
  const previousModeRef = useRef(isPurchaseMode);
  const [isKycOpen, setIsKycOpen] = useState(false);
  const [kycForm, setKycForm] = useState<KycFormState>(() => createEmptyKycForm());
  const [selectedCustomerDailyUsedUsd, setSelectedCustomerDailyUsedUsd] = useState(0);
  const [customerDailyUsageLoading, setCustomerDailyUsageLoading] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDrawerAvailable(Boolean(window.electron?.openDrawer));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const node = draftsBarRef.current;
    if (!node) return;

    const updateDraftsHeight = () => {
      const nextHeight = Math.ceil(node.getBoundingClientRect().height);
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setDraftsBarHeight(nextHeight);
      }
    };

    updateDraftsHeight();
    const rafId = window.requestAnimationFrame(updateDraftsHeight);
    window.addEventListener("resize", updateDraftsHeight);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateDraftsHeight();
      });
      observer.observe(node);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateDraftsHeight);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(PRINT_TICKET_STORAGE_KEY);
      if (stored !== null) {
        setPrintReceipt(stored === "true");
      }
    } catch (error) {
      console.error("No se pudo leer preferencia de impresión", error);
    } finally {
      printPreferenceHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!printPreferenceHydratedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PRINT_TICKET_STORAGE_KEY, printReceipt ? "true" : "false");
    } catch (error) {
      console.error("No se pudo guardar preferencia de impresión", error);
    }
  }, [printReceipt]);

  useEffect(() => {
    saleTipRef.current = defaultTipPercentage;
    if (!isPurchaseMode) {
      setTipPercentage(defaultTipPercentage);
    }
  }, [defaultTipPercentage, isPurchaseMode]);

  const resetPaymentFlow = useCallback(() => {
    setPaymentStage("method");
    setPrimaryPaymentOption(null);
    setPaymentDrafts([]);
    setOpenCashDrawer(true);
    shouldFocusPaymentRef.current = false;
  }, []);

  useEffect(() => {
    if (!isPayOpen) return;
    resetPaymentFlow();
  }, [isPayOpen, resetPaymentFlow]);

  useEffect(() => {
    const wasPurchase = previousModeRef.current;
    if (wasPurchase === isPurchaseMode) return;

    if (isPurchaseMode) {
      saleTipRef.current = tipPercentage;
      if (tipPercentage !== 0) {
        setTipPercentage(0);
      }
    } else {
      const restored = saleTipRef.current ?? defaultTipPercentage;
      saleTipRef.current = restored;
      setTipPercentage(restored);
    }

    previousModeRef.current = isPurchaseMode;
  }, [defaultTipPercentage, isPurchaseMode, tipPercentage]);

  // NUEVO: clientes (selector + crear)
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );
  const staffDisplayName = useMemo(() => {
    const rawName = profile?.full_name ?? null;
    if (rawName) {
      const trimmed = rawName.trim();
      if (trimmed) return trimmed;
    }
    const rawEmail = user?.email ?? null;
    if (rawEmail) {
      const trimmed = rawEmail.trim();
      if (trimmed) return trimmed;
    }
    return undefined;
  }, [profile?.full_name, user?.email]);
  const businessCategory = (org?.business_category ?? "").toLowerCase() || null;
  const isRestaurantBusiness = businessCategory ? RESTAURANT_BUSINESS_IDS.has(businessCategory) : false;
  const isExchangeBusiness = businessCategory
    ? EXCHANGE_BUSINESS_IDS.has(businessCategory)
    : false;
  const orgFxDailyLimitRaw = (org as { fx_daily_limit_per_customer_usd?: number | null } | null)
    ?.fx_daily_limit_per_customer_usd;
  const orgFxDailyLimitUsd = useMemo(() => {
    const raw = Number(orgFxDailyLimitRaw ?? 1000);
    if (!Number.isFinite(raw) || raw < 0) return 1000;
    return raw;
  }, [orgFxDailyLimitRaw]);
  const selectedCustomerDailyLimitUsd = useMemo(() => {
    const raw = selectedCustomer?.daily_limit_usd;
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      return raw;
    }
    return orgFxDailyLimitUsd;
  }, [selectedCustomer?.daily_limit_usd, orgFxDailyLimitUsd]);
  const [locationServiceFlags, setLocationServiceFlags] = useState<LocationServiceFlags>({
    isActive: true,
    pickup: true,
    delivery: true,
    national_shipping: true,
  });

  useEffect(() => {
    let cancelled = false;
    const locationId = activeShift?.location_id ?? null;
    if (!organizationId || !locationId) {
      setLocationServiceFlags({
        isActive: true,
        pickup: true,
        delivery: true,
        national_shipping: true,
      });
      return;
    }

    const loadLocationFlags = async () => {
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("is_active, pickup_enabled, local_delivery_enabled, shipping_enabled")
          .eq("organization_id", organizationId)
          .eq("id", locationId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        setLocationServiceFlags({
          isActive: data?.is_active ?? true,
          pickup: data?.pickup_enabled ?? true,
          delivery: data?.local_delivery_enabled ?? true,
          national_shipping: data?.shipping_enabled ?? true,
        });
      } catch (error) {
        console.error("Error cargando servicios de la sede", error);
      }
    };

    void loadLocationFlags();
    return () => {
      cancelled = true;
    };
  }, [organizationId, activeShift?.location_id, supabase]);

  const effectiveChannels = useMemo<ServiceChannelConfig>(
    () => ({
      pickup: organizationChannels.pickup && shiftChannels.pickup && locationServiceFlags.pickup,
      delivery:
        organizationChannels.delivery &&
        shiftChannels.delivery &&
        locationServiceFlags.delivery,
      national_shipping:
        organizationChannels.national_shipping &&
        shiftChannels.national_shipping &&
        locationServiceFlags.national_shipping,
    }),
    [organizationChannels, shiftChannels, locationServiceFlags],
  );

  const availableOrderTypes = useMemo(
    () =>
      getAvailableOrderTypeOptions(businessCategory).filter((option) => {
        const channel = mapOrderTypeToChannel(option.id);
        if (!channel) return true;
        return effectiveChannels[channel];
      }),
    [businessCategory, effectiveChannels]
  );
  const orderTypeOptionMap = useMemo(() => {
    const map = new Map<string, OrderTypeOption>();
    availableOrderTypes.forEach((opt) => {
      map.set(opt.id, opt);
    });
    return map;
  }, [availableOrderTypes]);
  const defaultOrderMeta = useMemo(
    () => getDefaultOrderMeta(businessCategory, availableOrderTypes),
    [businessCategory, availableOrderTypes]
  );
  const [orderType, setOrderType] = useState<string | null>(() => defaultOrderMeta.type);
  const [orderFields, setOrderFields] = useState<Record<string, string>>(
    () => defaultOrderMeta.fields
  );
  const [orderFieldErrors, setOrderFieldErrors] = useState<string[]>([]);
  const currentOrderOption = useMemo(
    () =>
      orderType
        ? availableOrderTypes.find((option) => option.id === orderType) ?? null
        : null,
    [availableOrderTypes, orderType]
  );

  // Verificar si el turno es de un día anterior
  const shiftIsExpired = useMemo(() => {
    if (!activeShift) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(activeShift.opened_at);
    shiftDate.setHours(0, 0, 0, 0);
    return shiftDate.getTime() < today.getTime();
  }, [activeShift]);

  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const draftItemsCache = useRef<Record<string, SaleItemDraftRow[]>>({});
  const lastPersistSignature = useRef<string>("");
  const skipDraftPersistRef = useRef(false);
  const [isPersistingDraft, setIsPersistingDraft] = useState(false);
  const previousDraftIdRef = useRef<string | null>(null);
  const isLoadingDraftsRef = useRef(false);
  const isCreatingDraftRef = useRef(false);

  const resolveTradePrice = useCallback(
    (product: DBProduct): number | null => {
      if (product.item_type === "foreign_exchange_asset") {
        const buyRate = parsePositiveRate(product.fx_buy_price);
        const sellRate = parsePositiveRate(product.fx_sell_price);
        if (isPurchaseMode) {
          if (buyRate != null) return buyRate;
          if (sellRate != null) return sellRate;
        } else {
          if (sellRate != null) return sellRate;
          if (buyRate != null) return buyRate;
        }
      }
      const basePrice = parsePositiveRate(product.price);
      return basePrice;
    },
    [isPurchaseMode]
  );

  const withTradePrice = useCallback(
    (product: DBProduct): DBProduct => {
      const resolved = resolveTradePrice(product);
      if (resolved == null || resolved === product.price) {
        return product;
      }
      return { ...product, price: resolved };
    },
    [resolveTradePrice]
  );

  const computeTradeTotals = useCallback(
    (product: DBProduct, qty: number, modifiers: SelectedLineModifier[] = []) =>
      computeLineTotals(withTradePrice(product), qty, modifiers),
    [withTradePrice]
  );

  const handleTradeModeChange = useCallback(
    (mode: "sale" | "purchase") => {
      if (!isExchangeBusiness && mode === "purchase") return;
      if (mode === tradeMode) return;
      setTradeMode(mode);
      setCart([]);
      setIsPayOpen(false);
      resetPaymentFlow();
    },
    [tradeMode, resetPaymentFlow, isExchangeBusiness]
  );



  // …dentro del componente de página:

  // Adapter de tipos para el selector (ya lo tenías)
  const selectorGetFieldConfig = useCallback(
    (fieldId: string): OTFieldConfig => {
      const c = getFieldConfig(fieldId); // tu ORDER_FIELD_CONFIG
      const t = (c.type ?? "text") as OTFieldType;
      return {
        id: fieldId,
        label: c.label ?? fieldId,
        placeholder: c.placeholder,
        type: t,
        options: t === "select" ? (c.options ?? []) : undefined,
      };
    },
    []
  );

  // Mapear tus OrderTypeOption -> OrderType (ya lo tenías)
  const selectorOrderTypes = useMemo(
    () =>
      availableOrderTypes.map((t) => ({
        id: t.id,
        label: t.label,
        icon: t.icon,
        requires: t.requires,
      })),
    [availableOrderTypes]
  );
  const getDraftSummaryLabel = useCallback(
    (draft: DraftSummary) => {
      const rawOrderNumber = String(draft.orderNumber ?? "").trim();
      const orderNumberDisplay = rawOrderNumber.startsWith("#")
        ? rawOrderNumber
        : `#${rawOrderNumber || "—"}`;

      let option: OrderTypeOption | null = draft.orderType
        ? orderTypeOptionMap.get(draft.orderType) ?? null
        : null;
      if (!option && draft.orderType) {
        const definition = ORDER_TYPE_MAP.get(draft.orderType);
        if (definition) {
          option = buildOrderTypeOption(definition, businessCategory);
        }
      }

      const orderFields = draft.orderFields ?? {};
      const requiredIds = option?.requires ?? [];
      const candidateFieldIds =
        requiredIds.length > 0 ? requiredIds : Object.keys(orderFields);

      let chosenFieldId: string | null = null;
      let chosenRawValue: string | null = null;

      for (const fieldId of candidateFieldIds) {
        if (!chosenFieldId) {
          chosenFieldId = fieldId;
        }
        const raw = (orderFields[fieldId] ?? "").trim();
        if (raw) {
          chosenFieldId = fieldId;
          chosenRawValue = raw;
          break;
        }
      }

      let displayValue: string | null = null;
      if (chosenFieldId) {
        const valueSource = chosenRawValue ?? (orderFields[chosenFieldId] ?? "").trim();
        if (valueSource) {
          const cfg = getFieldConfig(chosenFieldId);
          if (chosenFieldId === "numero_mesa") {
            const numeric = valueSource.replace(/[^\d]/g, "");
            displayValue = numeric ? `#${numeric}` : valueSource;
          } else if (cfg.type === "select" && cfg.options) {
            const match = cfg.options.find((opt) => opt.value === valueSource);
            displayValue = match?.label ?? valueSource;
          } else {
            displayValue = valueSource;
          }
        }
      }

      const icon = resolveOrderTypeIcon(option, businessCategory);
      let detail: string | null = null;

      if (icon && displayValue) {
        detail = `${icon}${displayValue}`;
      } else if (icon) {
        detail = icon;
      } else if (displayValue && chosenFieldId) {
        const cfg = getFieldConfig(chosenFieldId);
        const prefixSource = cfg.label ?? chosenFieldId;
        const prefix = prefixSource.slice(0, 3);
        detail = `${prefix} ${displayValue}`.trim();
      } else if (chosenFieldId) {
        const cfg = getFieldConfig(chosenFieldId);
        const prefixSource = cfg.label ?? chosenFieldId;
        detail = prefixSource.slice(0, 3);
      }

      if (!detail) return orderNumberDisplay;
      return `${orderNumberDisplay} • ${detail}`;
    },
    [orderTypeOptionMap, businessCategory]
  );

  // callback final
  const handleOrderTypeChange = useCallback(
    ({ orderTypeId, orderFields, addressId }: { orderTypeId: string | null; orderFields: Record<string, string>; addressId?: string | null }) => {
      setOrderType(orderTypeId);
      setOrderFields(orderFields);
      // si retorna dirección, la guardas como campo también (si tu schema lo espera)
      if (addressId != null) {
        setOrderFields((prev) => ({ ...prev, direccion: addressId })); // o guarda addressId aparte si prefieres
      }
    },
    []
  );

  // Handler para recibir dirección estructurada desde DeliveryMethodSelector
  const handleAddressChange = useCallback((address: {
    label: string;
    line1: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
    phone?: string;
    recipient_name?: string;
    neighborhood?: string;
  } | null) => {
    if (!address) return;

    setOrderFields((prev) => ({
      ...prev,
      direccion: address.label,
      direccion_completa: address.label,
      ciudad: address.city || "",
      estado: address.state || "",
      pais: address.country || "",
      codigo_postal: address.postal_code || "",
      latitud: address.lat ? address.lat.toString() : "",
      longitud: address.lng ? address.lng.toString() : "",
      telefono: address.phone || "",
      nombre_cliente: address.recipient_name || "",
      barrio: address.neighborhood || "",
      // Mantener instrucciones si ya existen
      instrucciones: prev.instrucciones || "",
    }));
  }, []);

  useEffect(() => {
    if (!availableOrderTypes.length) {
      setOrderType(null);
      setOrderFields({});
      return;
    }

    if (!orderType || !availableOrderTypes.some((opt) => opt.id === orderType)) {
      const meta = getDefaultOrderMeta(businessCategory, availableOrderTypes);
      setOrderType(meta.type);
      setOrderFields(meta.fields);
    }
  }, [availableOrderTypes, orderType, businessCategory]);

  useEffect(() => {
    if (!orderType) {
      setOrderFields({});
      setOrderFieldErrors([]);
      return;
    }
    const option = availableOrderTypes.find((opt) => opt.id === orderType);
    if (!option) return;

    setOrderFields((prev) => {
      const next = ensureOrderFields(option.requires, prev);
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const changedLength = prevKeys.length !== nextKeys.length;
      const changedValue = nextKeys.some((key) => next[key] !== prev[key]);
      return changedLength || changedValue ? next : prev;
    });

    const enforced = getEnforcedOrderFields(option.id, option.requires);
    setOrderFieldErrors((prev) => prev.filter((field) => enforced.includes(field)));
  }, [orderType, availableOrderTypes]);

  useEffect(() => {
    if (orderType !== "takeout" || !selectedCustomer) return;
    const nextName = (selectedCustomer.name ?? "").trim();
    const nextPhone = (selectedCustomer.phone ?? "").trim();
    if (!nextName && !nextPhone) return;
    setOrderFields((prev) => {
      let changed = false;
      const next = { ...prev };
      if (nextName && nextName !== prev.nombre_cliente) {
        next.nombre_cliente = nextName;
        changed = true;
      }
      if (nextPhone && nextPhone !== prev.telefono) {
        next.telefono = nextPhone;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [orderType, selectedCustomer]);

  function normalizeBarcode(s: string) {
    return s.replace(/[^\dA-Za-z]/g, "");
  }

  const barcodeIndex = useMemo(() => {
    const m = new Map<string, DBProduct>();
    for (const p of products) {
      const bc = p.principal_bar_code?.trim();
      if (bc) m.set(normalizeBarcode(bc), p);
    }
    return m;
  }, [products]);

  // ------- Fetch desde Supabase --------
  const fetchAll = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const supabaseAny = supabase as any;

      // 1) Categorías
      const { data: catRows, error: catErr } = await supabase
        .from("product_categories")
        .select("id, organization_id, name, image_url, sort_order, position")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("position", { ascending: true })
        .order("name", { ascending: true });
      if (catErr) throw catErr;

      // 2) Productos
      const { data: prodRows, error: prodErr } = await supabase
        .from("products")
        .select(
          `
            id,
            organization_id,
            name,
            description,
            price,
            image_url,
            is_available,
            principal_bar_code,
            price_includes_taxes,
            item_type,
            iva_category,
            iva_rate,
            inc_type,
            inc_rate,
            unspsc_code,
            dian_tariff_code,
            unit_code,
            tax_observation
          `
        )
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (prodErr) throw prodErr;

      // 3) Conjuntos de modificadores asociados
      const { data: productSetRows, error: productSetErr } = await supabaseAny
        .from("product_modifier_sets")
        .select(
          `
            id,
            product_id,
            modifier_set_id,
            require_selection,
            min_selections,
            max_selections,
            sort_order,
            modifier_set:modifier_sets (
              id,
              name,
              display_name,
              require_selection,
              min_selections,
              max_selections,
              is_active,
              hide_online
            )
          `
        )
        .eq("organization_id", organizationId);
      if (productSetErr) throw productSetErr;

      const { data: modifierRows, error: modifierErr } = await supabase
        .from("modifiers")
        .select(
          `
            id,
            modifier_set_id,
            name,
            display_name,
            price_delta,
            is_active,
            hide_online,
            preselect,
            sort_order,
            image_url
          `
        )
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (modifierErr) throw modifierErr;

      // 4) Mapeo categoría-producto
      const { data: links, error: linkErr } = await supabase
        .from("product_category_products")
        .select("category_id, product_id")
        .eq("organization_id", organizationId);
      if (linkErr) throw linkErr;

      const map: Record<string, string[]> = {};
      for (const c of catRows || []) map[c.id] = [];
      for (const row of links || []) {
        if (!map[row.category_id]) map[row.category_id] = [];
        map[row.category_id].push(row.product_id);
      }

      const normalizedModifiers: DBModifier[] = (modifierRows || []).map((row: any) => ({
        id: row.id,
        modifier_set_id: row.modifier_set_id,
        name: row.name,
        display_name: row.display_name,
        price_delta: parseNumeric(row.price_delta),
        is_active: Boolean(row.is_active),
        hide_online: Boolean(row.hide_online),
        preselect: Boolean(row.preselect),
        sort_order: row.sort_order != null ? Number(row.sort_order) : null,
        image_url: row.image_url ?? null,
      }));

      const modifiersBySet = new Map<string, DBModifier[]>();
      normalizedModifiers.forEach((modifier) => {
        const list = modifiersBySet.get(modifier.modifier_set_id);
        if (list) {
          list.push(modifier);
        } else {
          modifiersBySet.set(modifier.modifier_set_id, [modifier]);
        }
      });
      modifiersBySet.forEach((list) => {
        list.sort((a, b) => {
          const orderA = a.sort_order ?? 0;
          const orderB = b.sort_order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
      });

      const setsByProduct = new Map<string, ProductModifierSet[]>();
      (productSetRows || []).forEach((row: any) => {
        const base = row.modifier_set;
        if (!base) return;

        const relation: ProductModifierSet = {
          id: row.id,
          product_id: row.product_id,
          modifier_set_id: row.modifier_set_id,
          require_selection: row.require_selection,
          min_selections: row.min_selections != null ? Number(row.min_selections) : null,
          max_selections: row.max_selections != null ? Number(row.max_selections) : null,
          sort_order: row.sort_order != null ? Number(row.sort_order) : null,
          modifier_set: {
            id: base.id,
            name: base.name,
            display_name: base.display_name,
            require_selection: Boolean(base.require_selection),
            min_selections: base.min_selections != null ? Number(base.min_selections) : 0,
            max_selections: base.max_selections != null ? Number(base.max_selections) : null,
            is_active: Boolean(base.is_active),
            hide_online: Boolean(base.hide_online),
            modifiers: modifiersBySet.get(row.modifier_set_id) ?? [],
          },
        };

        const list = setsByProduct.get(row.product_id);
        if (list) {
          list.push(relation);
        } else {
          setsByProduct.set(row.product_id, [relation]);
        }
      });
      setsByProduct.forEach((list) => {
        list.sort((a, b) => {
          const orderA = a.sort_order ?? 0;
          const orderB = b.sort_order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          const nameA = a.modifier_set?.name ?? "";
          const nameB = b.modifier_set?.name ?? "";
          return nameA.localeCompare(nameB);
        });
      });

      setCategories((catRows || []) as Category[]);
      const normalizedProducts = (prodRows || []).map((row: any) => ({
        ...row,
        price_includes_taxes: Boolean(row.price_includes_taxes),
        iva_category: row.iva_category ?? "GRAVADO",
        modifierSets: setsByProduct.get(row.id) ?? [],
      }));
      setProducts(normalizedProducts as DBProduct[]);
      setByCat(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // NUEVO: fetch customers
  const fetchCustomers = async () => {
    if (!organizationId) return;
    try {
      setCustomersLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, organization_id, name, email, phone, address, id_type, id_number, is_loyal, created_at, updated_at, created_by, notes, loyalty_points, loyalty_level_id, last_purchase_date, daily_limit_usd, kyc_id_document_url, kyc_signature_url"
        )
        .eq("organization_id", organizationId)
        .order("name", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setCustomers((data || []) as DBCustomer[]);
    } catch (e) {
      console.error("Error cargando clientes:", e);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (!isExchangeBusiness || !organizationId || !selectedCustomerId) {
      setSelectedCustomerDailyUsedUsd(0);
      setCustomerDailyUsageLoading(false);
      return;
    }

    let cancelled = false;

    const loadDailyUsage = async () => {
      setCustomerDailyUsageLoading(true);
      try {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const [salesResult, purchasesResult] = await Promise.all([
          supabase
            .from("sales")
            .select("grand_total, status")
            .eq("organization_id", organizationId)
            .eq("customer_id", selectedCustomerId)
            .gte("created_at", dayStart.toISOString())
            .lt("created_at", dayEnd.toISOString()),
          supabase
            .from("purchases")
            .select("grand_total, status")
            .eq("organization_id", organizationId)
            .eq("counterparty_id", selectedCustomerId)
            .gte("created_at", dayStart.toISOString())
            .lt("created_at", dayEnd.toISOString()),
        ]);

        if (salesResult.error) throw salesResult.error;
        if (purchasesResult.error) throw purchasesResult.error;

        const salesTotal = (salesResult.data ?? []).reduce((sum: number, row: any) => {
          const status = String(row?.status ?? "").toUpperCase();
          if (status && status !== "COMPLETED") return sum;
          const amount = Number(row?.grand_total ?? 0);
          return Number.isFinite(amount) ? sum + amount : sum;
        }, 0);
        const purchasesTotal = (purchasesResult.data ?? []).reduce((sum: number, row: any) => {
          const status = String(row?.status ?? "").toUpperCase();
          if (status && status !== "COMPLETED") return sum;
          const amount = Number(row?.grand_total ?? 0);
          return Number.isFinite(amount) ? sum + amount : sum;
        }, 0);

        if (!cancelled) {
          setSelectedCustomerDailyUsedUsd(round2(salesTotal + purchasesTotal));
        }
      } catch (error) {
        console.error("Error cargando consumo diario del cliente", error);
        if (!cancelled) {
          setSelectedCustomerDailyUsedUsd(0);
        }
      } finally {
        if (!cancelled) {
          setCustomerDailyUsageLoading(false);
        }
      }
    };

    void loadDailyUsage();
    return () => {
      cancelled = true;
    };
  }, [isExchangeBusiness, organizationId, selectedCustomerId, supabase]);

  const ensureTakeoutCustomer = useCallback(async () => {
    if (orderType !== "takeout") return selectedCustomer ?? null;
    if (selectedCustomer) return selectedCustomer;

    const nameRaw = (orderFields.nombre_cliente ?? "").trim();
    const phoneRaw = (orderFields.telefono ?? "").trim();
    if (!phoneRaw) return null;

    const existing = customers.find((customer) => phonesMatch(customer.phone, phoneRaw));
    if (existing) {
      setSelectedCustomerId(existing.id);
      return existing;
    }

    if (!organizationId) return null;

    const payload = {
      organization_id: organizationId,
      name: nameRaw || phoneRaw,
      email: null,
      phone: phoneRaw,
      address: null,
      notes: null,
      id_type: null,
      id_number: null,
      is_loyal: false,
      loyalty_points: 0,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("customers")
        .insert(payload)
        .select(
          "id, organization_id, name, email, phone, address, id_type, id_number, is_loyal, created_at, updated_at, created_by, notes, loyalty_points, loyalty_level_id, last_purchase_date, daily_limit_usd, kyc_id_document_url, kyc_signature_url"
        )
        .single();
      if (error) throw error;
      const created = data as DBCustomer;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomerId(created.id);
      return created;
    } catch (err) {
      console.error("Error creando cliente desde para llevar:", err);
      toast.error("No se pudo crear el cliente.");
      return null;
    }
  }, [customers, orderFields, orderType, organizationId, selectedCustomer, supabase]);

  const validateChannelAndCoverage = useCallback(async (): Promise<CoverageValidationResult> => {
    const channel = mapOrderTypeToChannel(orderType);
    if (!channel) {
      return { eligible: true, reasonCode: "ok", reason: null };
    }

    if (!organizationChannels[channel]) {
      return {
        eligible: false,
        reasonCode: "service_disabled",
        reason: "Este servicio está deshabilitado para el comercio.",
      };
    }

    const locationId = activeShift?.location_id ?? null;
    if (locationId) {
      try {
        const { checkLocationSchedule } = await import("@/utils/schedule-validation");
        const scheduleCheck = await checkLocationSchedule(locationId, supabase);
        if (!scheduleCheck.isOpen) {
          return {
            eligible: false,
            reasonCode: "location_closed",
            reason: scheduleCheck.reason || "La sucursal está cerrada en este momento.",
          };
        }
      } catch (scheduleError) {
        console.warn("No se pudo validar el horario:", scheduleError);
      }
    }

    if (!shiftChannels[channel]) {
      return {
        eligible: false,
        reasonCode: "service_disabled",
        reason: "Este servicio no está activo en el turno actual.",
      };
    }

    if (channel === "pickup") {
      return { eligible: true, reasonCode: "ok", reason: null };
    }

    if (!locationId) {
      return {
        eligible: false,
        reasonCode: "location_missing",
        reason: "El turno no tiene sede asignada para validar cobertura.",
      };
    }

    if (!locationServiceFlags.isActive) {
      return {
        eligible: false,
        reasonCode: "service_disabled",
        reason: "La sede está inactiva.",
      };
    }

    if (!locationServiceFlags[channel]) {
      return {
        eligible: false,
        reasonCode: "service_disabled",
        reason: "La sede no tiene activo este servicio.",
      };
    }

    const rawAddress =
      channel === "delivery"
        ? (orderFields.direccion ?? "").trim()
        : (orderFields.direccion_completa ?? orderFields.direccion ?? "").trim();

    if (!rawAddress) {
      return {
        eligible: false,
        reasonCode: "out_of_coverage",
        reason: "Ingresa una dirección para validar cobertura.",
      };
    }

    const normalizedAddress = rawAddress.toLowerCase();
    const { data: zones, error } = await supabase
      .from("location_service_zones")
      .select("id, service_channel, enabled, city, postal_prefix, text_pattern")
      .eq("organization_id", organizationId)
      .eq("location_id", locationId)
      .eq("enabled", true)
      .eq("service_channel", channel);

    if (error) throw error;

    const activeZones = zones ?? [];
    if (!activeZones.length) {
      return {
        eligible: false,
        reasonCode: "out_of_coverage",
        reason: "La sede no tiene zonas de cobertura configuradas para este servicio.",
      };
    }

    const isCovered = activeZones.some((zone: any) => {
      const city = String(zone?.city ?? "").trim().toLowerCase();
      const postalPrefix = String(zone?.postal_prefix ?? "").trim().toLowerCase();
      const textPattern = String(zone?.text_pattern ?? "").trim().toLowerCase();

      if (city && !normalizedAddress.includes(city)) return false;
      if (postalPrefix && !normalizedAddress.includes(postalPrefix)) return false;
      if (textPattern && !normalizedAddress.includes(textPattern)) return false;
      return true;
    });

    return isCovered
      ? { eligible: true, reasonCode: "ok", reason: null }
      : {
        eligible: false,
        reasonCode: "out_of_coverage",
        reason: "La dirección está fuera de la cobertura de la sede.",
      };
  }, [
    orderType,
    organizationChannels,
    shiftChannels,
    locationServiceFlags,
    activeShift?.location_id,
    orderFields,
    supabase,
    organizationId,
  ]);

  const createDraft = useCallback(async () => {
    if (!organizationId) throw new Error("Falta organización");
    if (!activeShift) throw new Error("No hay turno activo");
    if (isCreatingDraftRef.current) return null;
    isCreatingDraftRef.current = true;

    try {
      const meta = getDefaultOrderMeta(businessCategory, availableOrderTypes);
      const notes = serializeOrderMeta(meta);

    const { data, error } = await supabase
      .from("sales")
      .insert([
        {
          organization_id: organizationId,
          status: "DRAFT",
          total_amount: 0,
          subtotal_amount: 0,
          discount_total_amount: 0,
          tax_iva_amount: 0,
          tax_inc_amount: 0,
          tax_other_amount: 0,
          grand_total: 0,
          payment_method: null,
          created_by: user?.id ?? null,
          price_includes_taxes: false,
          notes,
          delivery_metadata: meta,
          currency_code: "COP",
          customer_id: null,
          tip: 0,
          tip_percentage: isExchangeBusiness ? 0 : defaultTipPercentage,
          shift_id: activeShift.id,
        },
      ])
      .select(
        `
          id,
          order_number,
          invoice_number,
          status,
          notes,
          delivery_metadata,
          subtotal_amount,
          total_amount,
          grand_total,
          customer_id,
          tip_percentage
        `
      )
      .single();

    if (error) throw error;

    const draft = mapSaleRowToDraft(data);

    skipDraftPersistRef.current = true;
    setDrafts((prev) => [...prev, draft]);
    setActiveDraftId(draft.id);
    draftItemsCache.current[draft.id] = [];
    setCart([]);

    const nextType = draft.orderType ?? meta.type ?? availableOrderTypes[0]?.id ?? null;
    const optionRequires = nextType
      ? availableOrderTypes.find((opt) => opt.id === nextType)?.requires ?? []
      : [];
    const sanitizedFields = ensureOrderFields(optionRequires, draft.orderFields ?? meta.fields ?? {});

    setOrderType(nextType);
    setOrderFields(sanitizedFields);
    setOrderFieldErrors([]);
    setSelectedCustomerId(null);
    const initialTipPercentage = isExchangeBusiness
      ? 0
      : Number.isFinite(draft.tipPercentage)
        ? draft.tipPercentage
        : defaultTipPercentage;
    setTipPercentage(initialTipPercentage);
    saleTipRef.current = initialTipPercentage;

    lastPersistSignature.current = buildDraftSignaturePayload(
      [],
      nextType,
      sanitizedFields,
      null,
      initialTipPercentage
    );

      setTimeout(() => {
        skipDraftPersistRef.current = false;
      }, 0);

      return draft;
    } finally {
      isCreatingDraftRef.current = false;
    }
  }, [
    organizationId,
    businessCategory,
    availableOrderTypes,
    supabase,
    user?.id,
    defaultTipPercentage,
    isExchangeBusiness,
    activeShift,
  ]);

  const loadDrafts = useCallback(async () => {
    // Si no hay turno activo, limpiar y salir
    if (!organizationId || !activeShift) {
      setDrafts([]);
      setActiveDraftId(null);
      return;
    }

    if (isLoadingDraftsRef.current) return;
    isLoadingDraftsRef.current = true;

    try {
      const { data, error } = await supabase
        .from("sales")
        .select(
          `
            id,
            order_number,
            invoice_number,
            created_at,
            status,
            notes,
            delivery_metadata,
            subtotal_amount,
            total_amount,
            grand_total,
            tip_percentage,
            customer_id,
            customer:customers (id)
          `
        )
        .eq("organization_id", organizationId)
        .eq("shift_id", activeShift.id)  // FILTRO POR TURNO ACTUAL
        .in("status", ["DRAFT"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        await createDraft();
        return;
      }

      const mapped = data.map(mapSaleRowToDraft);
      setDrafts(mapped);
      setActiveDraftId((prev) => {
        if (prev && mapped.some((draft) => draft.id === prev)) {
          return prev;
        }
        return mapped[0]?.id ?? null;
      });
    } catch (err: any) {
      console.error("Error cargando borradores", err);
      toast.error(err?.message ?? "No se pudieron cargar los borradores");
    } finally {
      isLoadingDraftsRef.current = false;
    }
  }, [organizationId, supabase, createDraft, activeShift]);

  useEffect(() => {
    fetchAll();
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // Manejar cambios en el estado del turno (abrir/cerrar caja)
  useEffect(() => {
    if (!activeShift) {
      // Caja cerrada: limpiar drafts y carrito
      setDrafts([]);
      setActiveDraftId(null);
      setCart([]);
    } else {
      // Caja abierta: recargar drafts
      loadDrafts();
    }
  }, [activeShift?.id, activeShift?.status, loadDrafts]);

  // Lista de ítems filtrados por nombre (para tocar/click o ENTER)
  const filteredQuick = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    const norm = normalizeBarcode(s);
    return products.filter((i) => {
      const byName = i.name.toLowerCase().includes(s);
      const byBarcode = i.principal_bar_code
        ? normalizeBarcode(i.principal_bar_code).toLowerCase().includes(norm)
        : false;
      return byName || byBarcode;
    });
  }, [q, products]);

  const activeDraft = useMemo(
    () => drafts.find((draft) => draft.id === activeDraftId) ?? null,
    [drafts, activeDraftId]
  );

  const currentOrderTypeOption = useMemo(
    () => (orderType ? availableOrderTypes.find((opt) => opt.id === orderType) ?? null : null),
    [orderType, availableOrderTypes]
  );

  const requiredOrderFields = currentOrderTypeOption?.requires ?? [];

  const handleOrderFieldChange = useCallback((fieldId: string, value: string) => {
    setOrderFields((prev) => ({ ...prev, [fieldId]: value }));
    setOrderFieldErrors((prev) => prev.filter((field) => field !== fieldId));
  }, []);

  const resolveModifierSets = useCallback((product: DBProduct): ResolvedProductModifierSet[] => {
    const relations = product.modifierSets ?? [];
    const resolved = relations
      .map<ResolvedProductModifierSet | null>((relation) => {
        const base = relation.modifier_set;
        if (!base || !base.is_active) return null;
        const items = (base.modifiers ?? []).filter(
          (modifier) => modifier.is_active && !modifier.hide_online
        );
        if (!items.length) return null;
        const requireFlag =
          relation.require_selection != null ? relation.require_selection : base.require_selection;
        let minSelections =
          relation.min_selections != null ? Number(relation.min_selections) : base.min_selections ?? 0;
        if (requireFlag && minSelections === 0) minSelections = 1;
        const maxSelections =
          relation.max_selections != null
            ? Number(relation.max_selections)
            : base.max_selections != null
              ? Number(base.max_selections)
              : null;
        return {
          relationId: relation.id,
          setId: base.id,
          name: base.name,
          displayName: base.display_name,
          requireSelection: Boolean(requireFlag),
          minSelections,
          maxSelections,
          items,
          sortOrder: relation.sort_order != null ? Number(relation.sort_order) : null,
        };
      })
      .filter((set): set is ResolvedProductModifierSet => Boolean(set));

    resolved.sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    return resolved;
  }, []);

  const addProductWithModifiers = useCallback(
    (product: DBProduct, modifiers: SelectedLineModifier[], commentValue: string) => {
      const normalizedModifiers = modifiers.map((mod) => ({ ...mod }));
      const trimmedComment = commentValue.trim();
      const selectionKey = buildSelectionKey(product.id, normalizedModifiers, trimmedComment);
      setCart((prev) => {
        const existingIndex = prev.findIndex((line) => line.selectionKey === selectionKey);
        if (existingIndex >= 0) {
          return prev.map((line, idx) =>
            idx === existingIndex ? { ...line, qty: line.qty + 1 } : line
          );
        }
        const newLine: CartLine = {
          id: makeTempId(),
          product,
          qty: 1,
          modifiers: normalizedModifiers,
          comment: trimmedComment || null,
          selectionKey,
        };
        return [...prev, newLine];
      });
    },
    []
  );

  const updateCartLine = useCallback(
    (lineId: string, product: DBProduct, modifiers: SelectedLineModifier[], commentValue: string) => {
      const normalizedModifiers = modifiers.map((mod) => ({ ...mod }));
      const trimmedComment = commentValue.trim();
      const selectionKey = buildSelectionKey(product.id, normalizedModifiers, trimmedComment);

      setCart((prev) => {
        const updated = prev.map((line) =>
          line.id === lineId
            ? {
              ...line,
              modifiers: normalizedModifiers,
              comment: trimmedComment || null,
              selectionKey,
            }
            : line
        );

        const merged = new Map<string, CartLine>();
        updated.forEach((line) => {
          const existing = merged.get(line.selectionKey);
          if (!existing) {
            merged.set(line.selectionKey, line);
            return;
          }
          const base =
            line.id === lineId
              ? line
              : existing.id === lineId
                ? existing
                : existing;
          merged.set(line.selectionKey, { ...base, qty: existing.qty + line.qty });
        });

        return Array.from(merged.values());
      });
    },
    []
  );

  const handleOpenLineComments = useCallback(
    (line: CartLine) => {
      const sets = resolveModifierSets(line.product);
      setModifierDialog({
        product: line.product,
        sets,
        mode: "edit",
        lineId: line.id,
        initialModifiers: line.modifiers.map((mod) => ({ ...mod })),
        initialComment: line.comment ?? "",
      });
    },
    [resolveModifierSets]
  );

  function addToCartByItem(product: DBProduct) {
    if (isPurchaseMode && product.item_type !== "foreign_exchange_asset") {
      toast.error("En modo compra solo puedes usar productos de divisas o commodities.");
      return;
    }
    if (
      isPurchaseMode &&
      cart.length > 0 &&
      cart.some((line) => line.product.id !== product.id)
    ) {
      toast.error("Completa o limpia la compra actual antes de agregar otro activo.");
      return;
    }
    const sets = resolveModifierSets(product);
    if (sets.length === 0) {
      addProductWithModifiers(product, [], "");
      return;
    }
    setModifierDialog({
      product,
      sets,
      mode: "add",
      initialModifiers: [],
      initialComment: "",
    });
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const raw = q.trim();
    const norm = normalizeBarcode(raw);
    let target = norm ? barcodeIndex.get(norm) : undefined;
    if (!target) target = filteredQuick[0];
    if (target) {
      addToCartByItem(target);
      setQ("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }
  function inc(id: string) {
    setCart((prev) =>
      prev.map((line) => (line.id === id ? { ...line, qty: line.qty + 1 } : line))
    );
  }
  function updateLineQty(id: string, nextRaw: string) {
    const normalized = nextRaw.replace(",", ".");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return;
    setCart((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const isFxLine = line.product.item_type === "foreign_exchange_asset";
        const nextQty = isFxLine
          ? Math.max(0.01, round2(parsed))
          : Math.max(1, Math.round(parsed));
        return { ...line, qty: nextQty };
      })
    );
  }
  function updateLineTradeRate(id: string, side: "buy" | "sell", nextRaw: string) {
    const normalized = nextRaw.replace(",", ".").trim();
    if (normalized === "") {
      setCart((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          if (line.product.item_type !== "foreign_exchange_asset") return line;
          return {
            ...line,
            product: {
              ...line.product,
              fx_buy_price: side === "buy" ? null : line.product.fx_buy_price ?? null,
              fx_sell_price: side === "sell" ? null : line.product.fx_sell_price ?? null,
            },
          };
        })
      );
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setCart((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        if (line.product.item_type !== "foreign_exchange_asset") return line;
        return {
          ...line,
          product: {
            ...line.product,
            fx_buy_price: side === "buy" ? parsed : line.product.fx_buy_price ?? null,
            fx_sell_price: side === "sell" ? parsed : line.product.fx_sell_price ?? null,
          },
        };
      })
    );
  }
  function dec(id: string) {
    setCart((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
            ...line,
            qty:
              line.product.item_type === "foreign_exchange_asset"
                ? Math.max(0.01, round2(line.qty - 1))
                : Math.max(1, line.qty - 1),
          }
          : line
      )
    );
  }
  function removeLine(id: string) {
    setCart((prev) => {
      const next = prev.filter((line) => line.id !== id);
      if (activeDraftId) {
        draftItemsCache.current[activeDraftId] = next.map((line) => ({
          id: line.id,
          product_id: line.product.id,
          quantity: line.qty,
          modifiers: line.modifiers.map((mod) => ({ ...mod })),
          comments: line.comment ?? null,
        }));
      }
      return next;
    });
  }

  const cartSummary = useMemo(() => {
    if (cart.length === 0) {
      return {
        subtotal: 0,
        ivaTotal: 0,
        incTotal: 0,
        taxTotal: 0,
        total: 0,
        breakdown: [] as { label: string; amount: number }[],
      };
    }

    let subtotal = 0;
    let ivaTotal = 0;
    let incTotal = 0;
    const breakdownMap = new Map<string, number>();

    cart.forEach(({ product, qty, modifiers }) => {
      const totals = computeTradeTotals(product, qty, modifiers);
      subtotal += totals.base;
      ivaTotal += totals.ivaAmount;
      incTotal += totals.incAmount;

      if (totals.ivaAmount > 0) {
        const label = `IVA ${formatRate(totals.ivaRate)}%`;
        const current = breakdownMap.get(label) ?? 0;
        breakdownMap.set(label, round2(current + totals.ivaAmount));
      }

      if (totals.incAmount > 0) {
        const labelBase = formatIncTypeLabel(product.inc_type);
        const label = `${labelBase} ${formatRate(totals.incRate)}%`.trim();
        const current = breakdownMap.get(label) ?? 0;
        breakdownMap.set(label, round2(current + totals.incAmount));
      }
    });

    const taxTotal = round2(ivaTotal + incTotal);
    const total = round2(subtotal + taxTotal);

    const breakdown = Array.from(breakdownMap.entries()).map(([label, amount]) => ({
      label,
      amount: round2(amount),
    }));

    return {
      subtotal: round2(subtotal),
      ivaTotal: round2(ivaTotal),
      incTotal: round2(incTotal),
      taxTotal,
      total,
      breakdown,
    };
  }, [cart, computeTradeTotals]);

  const effectiveTipPercentage = useMemo(
    () => (isExchangeBusiness ? 0 : tipPercentage),
    [isExchangeBusiness, tipPercentage]
  );

  const tipAmount = useMemo(() => {
    if (effectiveTipPercentage <= 0 || cartSummary.subtotal <= 0) return 0;
    return round2(cartSummary.subtotal * (effectiveTipPercentage / 100));
  }, [cartSummary.subtotal, effectiveTipPercentage]);

  const totalDue = useMemo(
    () => round2(cartSummary.total + tipAmount),
    [cartSummary.total, tipAmount]
  );
  const kycThresholdUsd = 100;
  const exceedsKycThreshold = isExchangeBusiness && totalDue >= kycThresholdUsd;
  const projectedCustomerDailyTotalUsd = useMemo(
    () => round2(selectedCustomerDailyUsedUsd + totalDue),
    [selectedCustomerDailyUsedUsd, totalDue]
  );
  const exceedsCustomerDailyLimit =
    isExchangeBusiness &&
    Boolean(selectedCustomer?.id) &&
    selectedCustomerDailyLimitUsd > 0 &&
    projectedCustomerDailyTotalUsd > selectedCustomerDailyLimitUsd;
  const cartItemsCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.qty, 0),
    [cart]
  );
  const productsListMaxHeight = useMemo(() => {
    const safeTopOffset = Math.max(listTopOffset, 96);
    if (isMobileViewport) {
      return `calc(100svh - ${safeTopOffset}px - ${draftsBarHeight}px - env(safe-area-inset-bottom))`;
    }
    return `calc(100svh - ${safeTopOffset}px)`;
  }, [draftsBarHeight, isMobileViewport, listTopOffset]);
  const mobileSummaryHeight = useMemo(
    () =>
      `calc(100svh - ${MOBILE_HEADER_HEIGHT}px - ${draftsBarHeight}px - env(safe-area-inset-bottom))`,
    [draftsBarHeight]
  );
  const lastTotalDueRef = useRef(totalDue);

  const initializePaymentDrafts = useCallback(
    (option: PrimaryPaymentOption): PaymentDraft[] => {
      const baseAmount = totalDue > 0 ? totalDue : 0;
      const amountStr = formatAmountForInput(baseAmount);
      if (option === "combined") {
        const cashShare = round2(baseAmount / 2);
        const transferShare = round2(baseAmount - cashShare);
        const cashAmountStr = formatAmountForInput(cashShare);
        const transferAmountStr = formatAmountForInput(transferShare);
        return [
          {
            id: makeTempId(),
            method: "cash",
            amount: cashAmountStr,
            received: cashAmountStr,
            reference: "",
          },
          {
            id: makeTempId(),
            method: "transfer",
            amount: transferAmountStr,
            reference: "",
          },
        ];
      }
      const methodMap: Record<PrimaryPaymentOption, PaymentMethod> = {
        cash: "cash",
        card: "card",
        transfer: "transfer",
        combined: "cash",
        nequi: "nequi",
        bold: "bold",

      };
      const mapped = methodMap[option];
      return [
        {
          id: makeTempId(),
          method: mapped,
          amount: amountStr,
          received: mapped === "cash" ? amountStr : undefined,
          reference: "",
        },
      ];
    },
    [totalDue],
  );

  const breakdownWithTip = useMemo(() => {
    const entries = cartSummary.breakdown.map((entry) => ({
      label: entry.label,
      amount: entry.amount,
    }));
    if (tipAmount > 0) {
      entries.unshift({
        label: `Servicio ${formatRate(effectiveTipPercentage)}%`,
        amount: tipAmount,
      });
    }
    return entries;
  }, [cartSummary.breakdown, tipAmount, effectiveTipPercentage]);

  // -------- Lógica de pago / impresión --------

  const getMissingRequiredFields = useCallback(() => {
    if (isPurchaseMode) return [];
    const requiredFields = currentOrderOption
      ? getEnforcedOrderFields(currentOrderOption.id, currentOrderOption.requires)
      : [];
    return requiredFields.filter((field) => {
      const value = orderFields[field];
      return !value || !String(value).trim();
    });
  }, [currentOrderOption, orderFields, isPurchaseMode]);

  const handleOpenDrawer = useCallback(
    async (options?: { silentSuccess?: boolean }) => {
      if (openingDrawer) return;
      if (!drawerAvailable || typeof window === "undefined" || !window.electron?.openDrawer) {
        toast.error("Función de cajón no disponible");
        return;
      }
      const silentSuccess = options?.silentSuccess ?? false;

      setOpeningDrawer(true);
      try {
        const printerPayload = buildPrinterPayload({ openCashDrawer: true });
        await window.electron.openDrawer({
          printer: printerPayload,
        });
        if (!silentSuccess) {
          toast.success("Cajón abierto");
        }
      } catch (error: any) {
        console.error("Error al abrir el cajón", error);
        toast.error(error?.message ?? "No se pudo abrir el cajón");
      } finally {
        setOpeningDrawer(false);
      }
    },
    [buildPrinterPayload, drawerAvailable, openingDrawer]
  );

  const paymentAnalysis = useMemo(() => {
    if (!paymentDrafts.length) {
      return {
        entries: [] as {
          draft: PaymentDraft;
          amount: number;
          received: number;
          change: number;
        }[],
        totalAssigned: 0,
        totalReceived: 0,
        totalChange: 0,
        missingAmount: totalDue,
        hasInvalidAmount: totalDue > 0,
        cashShortage: false,
      };
    }

    let assigned = 0;
    let receivedTotal = 0;
    let changeTotal = 0;
    let hasInvalid = false;
    let cashShortage = false;

    const entries = paymentDrafts.map((draft) => {
      const amount = round2(parseAmountInput(draft.amount));
      const received =
        draft.method === "cash"
          ? round2(parseAmountInput(draft.received))
          : amount;
      const change = draft.method === "cash" ? round2(Math.max(0, received - amount)) : 0;

      if (!Number.isFinite(amount) || amount < 0 || (totalDue > 0 && amount === 0)) {
        hasInvalid = true;
      }
      if (draft.method === "cash" && amount > 0 && received + 1e-6 < amount) {
        cashShortage = true;
      }

      assigned += amount;
      receivedTotal += received;
      changeTotal += change;

      return {
        draft,
        amount,
        received,
        change,
      };
    });

    const totalAssigned = round2(assigned);
    const missingAmount = round2(totalDue - totalAssigned);

    return {
      entries,
      totalAssigned,
      totalReceived: round2(receivedTotal),
      totalChange: round2(changeTotal),
      missingAmount,
      hasInvalidAmount: hasInvalid,
      cashShortage,
    };
  }, [paymentDrafts, totalDue]);

  const hasCashEntry = paymentAnalysis.entries.some((entry) => entry.draft.method === "cash");
  const paymentBalanceOk = Math.abs(paymentAnalysis.missingAmount) <= 0.01;
  const canFinalizePayment =
    paymentStage === "details" &&
    paymentAnalysis.entries.length > 0 &&
    !paymentAnalysis.hasInvalidAmount &&
    !paymentAnalysis.cashShortage &&
    paymentBalanceOk;
  const paymentMissingAbs = Math.abs(paymentAnalysis.missingAmount);
  const paymentIsShort = paymentAnalysis.missingAmount > 0.01;
  const paymentIsOver = paymentAnalysis.missingAmount < -0.01;

  const paymentEntryInfo = useMemo(() => {
    const map = new Map<string, (typeof paymentAnalysis.entries)[number]>();
    paymentAnalysis.entries.forEach((entry) => {
      map.set(entry.draft.id, entry);
    });
    return map;
  }, [paymentAnalysis]);

  const proceedToPaymentDetails = useCallback(
    (option: PrimaryPaymentOption) => {
      setPaymentDrafts(initializePaymentDrafts(option));
      setPaymentStage("details");
    },
    [initializePaymentDrafts],
  );

  const handleSelectPrimaryPayment = useCallback(
    (option: PrimaryPaymentOption) => {
      shouldFocusPaymentRef.current = true;
      setPrimaryPaymentOption(option);
      proceedToPaymentDetails(option);
    },
    [proceedToPaymentDetails],
  );

  const updatePaymentDraft = useCallback((id: string, updates: Partial<PaymentDraft>) => {
    setPaymentDrafts((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        const next: PaymentDraft = { ...entry, ...updates };

        if (updates.method) {
          if (updates.method === "cash") {
            const normalized = parseAmountInput(next.amount);
            next.received = next.received ?? (normalized > 0 ? formatAmountForInput(normalized) : "");
          } else {
            next.received = undefined;
          }
        }

        if (next.method === "cash" && updates.amount != null) {
          const normalized = parseAmountInput(updates.amount);
          if (!next.received || parseAmountInput(next.received) === 0) {
            next.received = normalized > 0 ? formatAmountForInput(normalized) : next.received;
          }
        }

        return next;
      }),
    );
  }, []);

  const removePaymentDraft = useCallback((id: string) => {
    setPaymentDrafts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((entry) => entry.id !== id);
    });
  }, []);

  const addCombinedPaymentDraft = useCallback(() => {
    setPaymentDrafts((prev) => {
      const assigned = prev.reduce((sum, entry) => {
        const parsed = parseAmountInput(entry.amount);
        return sum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
      }, 0);
      const remaining = Math.max(0, round2(totalDue - assigned));
      return [
        ...prev,
        {
          id: makeTempId(),
          method: "card",
          amount: remaining > 0 ? formatAmountForInput(remaining) : "",
          reference: "",
        },
      ];
    });
  }, [totalDue]);

  const handleTipPercentageChange = useCallback((value: number) => {
    const next = clampTipPercentage(value);
    saleTipRef.current = next;
    setTipPercentage(next);
  }, [setTipPercentage]);

  const handlePrintPreferenceChange = useCallback((value: boolean) => {
    setPrintReceipt(value);
  }, []);

  function openPayModal() {
    if (cart.length === 0) return;
    setIsPayOpen(true);
  }

  useEffect(() => {
    if (!isPayOpen || paymentStage !== "details") return;
    if (!shouldFocusPaymentRef.current) return;
    const focusTarget = () => {
      if (primaryPaymentOption === "combined") {
        combinedFirstAmountRef.current?.focus();
        combinedFirstAmountRef.current?.select?.();
        return;
      }
      const firstDraft = paymentDrafts[0];
      if (!firstDraft) return;
      if (firstDraft.method === "cash") {
        singleCashReceivedRef.current?.focus();
        singleCashReceivedRef.current?.select?.();
      } else {
        singleReferenceRef.current?.focus();
        singleReferenceRef.current?.select?.();
      }
    };
    shouldFocusPaymentRef.current = false;
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(focusTarget);
    } else {
      focusTarget();
    }
  }, [isPayOpen, paymentStage, primaryPaymentOption, paymentDrafts]);

  useEffect(() => {
    const previousTotal = lastTotalDueRef.current;
    if (Math.abs(previousTotal - totalDue) <= 0.009) {
      lastTotalDueRef.current = totalDue;
      return;
    }

    lastTotalDueRef.current = totalDue;

    if (!isPayOpen || paymentStage !== "details") {
      return;
    }

    setPaymentDrafts((prev) => {
      if (!prev.length) return prev;

      const normalizedAmounts = prev.map((entry) => {
        const parsed = parseAmountInput(entry.amount);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      });

      const currentTotal = round2(
        normalizedAmounts.reduce((sum, value) => sum + value, 0),
      );

      if (currentTotal <= 0) {
        return prev.map((entry, index) => {
          const nextAmount = index === 0 ? Math.max(0, totalDue) : 0;
          const amountStr = formatAmountForInput(nextAmount);
          const updated: PaymentDraft = { ...entry, amount: amountStr };
          if (entry.method === "cash") {
            updated.received = formatAmountForInput(nextAmount);
          }
          return updated;
        });
      }

      const ratio = totalDue > 0 ? totalDue / currentTotal : 0;
      let accumulated = 0;

      return prev.map((entry, index) => {
        const parsedAmount = parseAmountInput(entry.amount);
        const baseAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
        let nextAmount = 0;

        if (totalDue > 0 && ratio > 0) {
          if (index === prev.length - 1) {
            nextAmount = Math.max(0, round2(totalDue - accumulated));
          } else {
            nextAmount = Math.max(0, round2(baseAmount * ratio));
            accumulated += nextAmount;
          }
        }

        const amountStr = formatAmountForInput(nextAmount);
        const updated: PaymentDraft = { ...entry, amount: amountStr };

        if (entry.method === "cash") {
          const parsedReceived = parseAmountInput(entry.received);
          const receivedValue = Number.isFinite(parsedReceived) && parsedReceived >= 0 ? parsedReceived : 0;
          const receivedMatchesBase = Math.abs(receivedValue - baseAmount) <= 0.01;
          if (receivedMatchesBase || receivedValue < nextAmount) {
            updated.received = formatAmountForInput(nextAmount);
          }
        }

        return updated;
      });
    });
  }, [isPayOpen, paymentStage, totalDue]);

  useEffect(() => {
    if (!isPayOpen || paymentStage !== "details") return;
    if (!hasCashEntry) {
      setOpenCashDrawer(false);
    }
  }, [hasCashEntry, isPayOpen, paymentStage]);

  async function printKitchenTicket() {
    if (isPurchaseMode) {
      toast.error("La impresión de comanda solo aplica para ventas.");
      return;
    }
    if (printingKitchen) return;
    if (!activeDraftId || !activeDraft) {
      toast.error("No hay borrador activo");
      return;
    }
    if (cart.length === 0) {
      toast.error("Agrega productos al carrito antes de imprimir la comanda");
      return;
    }

    const missingFields = getMissingRequiredFields();
    if (missingFields.length) {
      setOrderFieldErrors(missingFields);
      const labels = missingFields
        .map((field) => getFieldConfig(field).label || field)
        .join(", ");
      toast.error(`Completa los campos requeridos: ${labels}`);
      return;
    }

    setOrderFieldErrors([]);
    setPrintingKitchen(true);

    try {
      const ensuredCustomer = await ensureTakeoutCustomer();
      const activeCustomer = ensuredCustomer ?? selectedCustomer;

      const kitchenItems = cart.map((line) => {
        const modifiersPayload = line.modifiers.map((mod) => ({
          id: mod.modifierId,
          name: mod.modifierDisplayName ?? mod.modifierName,
          displayName: mod.modifierDisplayName ?? mod.modifierName,
          setId: mod.modifierSetId,
          setName: mod.modifierSetName,
          setDisplayName: mod.modifierSetDisplayName ?? mod.modifierSetName,
          priceDelta: mod.modifierPriceDelta,
        }));
        const commentText = (line.comment ?? "").trim();
        return {
          id: line.id,
          name: line.product.name,
          qty: line.qty,
          modifiers: modifiersPayload,
          comment: commentText || null,
        };
      });

      const customerInfo = activeCustomer
        ? {
          id: activeCustomer.id,
          name: activeCustomer.name,
          email: activeCustomer.email,
          phone: activeCustomer.phone,
          id_type: activeCustomer.id_type,
          id_number: activeCustomer.id_number,
        }
        : null;

      const now = new Date();
      const friendlyTimestamp = formatKitchenTimestamp(now);

      const kitchenOrder: Record<string, unknown> = {
        id: activeDraftId,
        orderNumber: activeDraft.orderNumber,
        title: activeDraft.orderNumber,
        createdAt: now.toISOString(),
        createdAtFriendly: friendlyTimestamp,
        storeName: org?.name ?? undefined,
        type: orderType,
        typeLabel: currentOrderOption?.label,
        fields: { ...orderFields },
        items: kitchenItems,
      };

      if (orderFields.numero_mesa) {
        kitchenOrder.table = orderFields.numero_mesa;
      }
      if (orderFields.zona) {
        kitchenOrder.area = orderFields.zona;
      }
      if (staffDisplayName) {
        kitchenOrder.waiter = staffDisplayName;
      }
      if (activeDraft.notes) {
        kitchenOrder.notes = activeDraft.notes;
      }
      if (customerInfo && activeCustomer) {
        kitchenOrder.customer = customerInfo;
        kitchenOrder.customerName = customerDisplayName(activeCustomer);
      }

      const kitchenPayload = {
        order: kitchenOrder,
        customer: customerInfo ?? undefined,
        notes: activeDraft.notes ?? undefined,
        header: {
          orderNumber: activeDraft.orderNumber,
          timestamp: friendlyTimestamp,
        },
      };

      const printerPayload = buildPrinterPayload({ openCashDrawer: false });

      await window.electron?.printDocument?.({
        type: "kitchen",
        data: kitchenPayload,
        printer: printerPayload,
        renderOptions: {
          cut: false,
          openCashDrawer: false,
        },
      });

      toast.success("Comanda enviada a cocina");
    } catch (error: any) {
      console.error("Error al imprimir comanda", error);
      toast.error(error?.message ?? "No se pudo imprimir la comanda");
    } finally {
      setPrintingKitchen(false);
    }
  }

  async function printPrebill() {
    if (isPurchaseMode) {
      toast.error("Las compras no generan precuenta.");
      return;
    }
    if (printingPrebill) return;
    if (!activeDraftId || !activeDraft) {
      toast.error("No hay borrador activo");
      return;
    }
    if (cart.length === 0) {
      toast.error("Agrega productos al carrito antes de imprimir la precuenta");
      return;
    }

    const missingFields = getMissingRequiredFields();
    if (missingFields.length) {
      setOrderFieldErrors(missingFields);
      const labels = missingFields
        .map((field) => getFieldConfig(field).label || field)
        .join(", ");
      toast.error(`Completa los campos requeridos: ${labels}`);
      return;
    }

    setOrderFieldErrors([]);
    setPrintingPrebill(true);

    try {
      const ensuredCustomer = await ensureTakeoutCustomer();
      const activeCustomer = ensuredCustomer ?? selectedCustomer;
      const isOperationalOrder = ["pickup", "delivery", "national_shipping", "DELIVERY_LOCAL"].includes(orderType ?? "");
      const verificationCode = isOperationalOrder ? generateVerificationCode() : null;

      const items = cart.map(({ product, qty, modifiers, id }) => {
        const totals = computeTradeTotals(product, qty, modifiers);
        return {
          id,
          name: product.name,
          qty,
          unitPrice: totals.unitTotal,
          lineTotal: totals.total,
          taxes: {
            iva: totals.ivaAmount,
            inc: totals.incAmount,
          },
          modifiers: modifiers.map((mod) => ({
            id: mod.modifierId,
            name: mod.modifierDisplayName ?? mod.modifierName,
            displayName: mod.modifierDisplayName ?? mod.modifierName,
            priceDelta: mod.modifierPriceDelta,
            setId: mod.modifierSetId,
            setName: mod.modifierSetName,
            setDisplayName: mod.modifierSetDisplayName ?? mod.modifierSetName,
          })),
        };
      });

      const customerPayload = activeCustomer
        ? {
          id: activeCustomer.id,
          name: activeCustomer.name,
          email: activeCustomer.email,
          phone: activeCustomer.phone,
          id_type: activeCustomer.id_type,
          id_number: activeCustomer.id_number,
        }
        : { name: "Consumidor Final" };

      const printerPayload = buildPrinterPayload({ openCashDrawer: false });
      const orderNumber = activeDraft.orderNumber ?? activeDraftId;

      const prebillData = {
        saleId: activeDraftId,
        invoiceNumber: orderNumber,
        createdAt: new Date().toISOString(),
        customer: customerPayload,
        items,
        totals: {
          subtotal: cartSummary.subtotal,
          tax: cartSummary.taxTotal,
          tip: tipAmount,
          tipPercentage: effectiveTipPercentage,
          total: totalDue,
          breakdown: breakdownWithTip,
        },
        payment: {
          method: "Pendiente",
          received: 0,
          change: 0,
          reference: undefined,
          currency: "COP",
          openCashDrawer: false,
          tip: tipAmount,
          tipPercentage: effectiveTipPercentage,
          breakdown: [],
          status: "pending" as const,
        },
        store: {
          name: org?.name ?? "Sucursal",
          address: "",
          nit: "",
        },
        cashier: { name: staffDisplayName ?? user?.email ?? "Cajero" },
        printer: printerPayload,
        taxes: breakdownWithTip,
        order: {
          type: orderType,
          typeLabel: currentOrderOption?.label,
          fields: orderFields,
          number: orderNumber,
          verificationCode: isOperationalOrder ? generateVerificationCode() : null,
        },
        notes: activeDraft.notes ?? undefined,
        documentTitle: "Precuenta",
        isPrebill: true,
        status: activeDraft.status ?? "DRAFT",
      };

      if (!window.electron?.printDocument) {
        toast.error("Función de impresión no disponible");
        return;
      }

      await window.electron.printDocument({
        type: "invoice",
        data: prebillData,
        printer: printerPayload,
        renderOptions: {
          openCashDrawer: false,
        },
      });

      toast.success("Precuenta enviada a impresión");
    } catch (error: any) {
      console.error("Error al imprimir precuenta", error);
      toast.error(error?.message ?? "No se pudo imprimir la precuenta");
    } finally {
      setPrintingPrebill(false);
    }
  }

  async function finalizeAndPrint() {
    if (savingSale) return;
    if (cart.length === 0) {
      toast.error("Agrega productos al carrito antes de finalizar");
      return;
    }

    const missingFields = getMissingRequiredFields();

    if (missingFields.length) {
      setOrderFieldErrors(missingFields);
      const labels = missingFields
        .map((field) => getFieldConfig(field).label || field)
        .join(", ");
      toast.error(`Completa los campos requeridos: ${labels}`);
      return;
    }

    if (!canFinalizePayment) {
      toast.error("Completa el detalle del pago antes de finalizar.");
      return;
    }
    if (!organizationId) {
      toast.error("No se encontró organización activa");
      return;
    }

    if (isPurchaseMode) {
      await finalizePurchase();
      return;
    }

    if (!activeDraftId || !activeDraft) {
      toast.error("No hay borrador activo");
      return;
    }

    try {
      const coverageCheck = await validateChannelAndCoverage();
      if (!coverageCheck.eligible) {
        toast.error(coverageCheck.reason ?? "Este pedido no cumple las reglas del canal.");
        return;
      }
    } catch (error: any) {
      console.error("Error validando canal/cobertura", error);
      toast.error(error?.message ?? "No se pudo validar la cobertura del pedido.");
      return;
    }

    const shouldOpenDrawer = openCashDrawer && hasCashEntry;
    const shouldPrintReceipt = printReceipt;
    if (shouldOpenDrawer) {
      void handleOpenDrawer({ silentSuccess: true });
    }

    setOrderFieldErrors([]);
    setSavingSale(true);
    skipDraftPersistRef.current = true;

    try {
      const ensuredCustomer = await ensureTakeoutCustomer();
      const activeCustomer = ensuredCustomer ?? selectedCustomer;

      await supabase.from("sale_items").delete().eq("sale_id", activeDraftId);

      const itemsPayload = cart.length ? buildSaleItemsPayload(activeDraftId) : [];
      if (itemsPayload.length) {
        await supabase.from("sale_items").insert(itemsPayload);
      }

      draftItemsCache.current[activeDraftId] = cart.map((line) => ({
        id: line.id,
        product_id: line.product.id,
        quantity: line.qty,
        modifiers: line.modifiers.map((mod) => ({ ...mod })),
        comments: line.comment ?? null,
      }));

      const orderMeta: OrderMeta = { type: orderType, fields: orderFields };
      const notes = serializeOrderMeta(orderMeta);
      const initialSaleStatus = resolveInitialOperationalSaleStatus(orderType, orderFields);

      const isOperationalOrder = ["pickup", "delivery", "national_shipping", "DELIVERY_LOCAL"].includes(orderType ?? "");
      const verificationCode = isOperationalOrder ? generateVerificationCode() : null;

      const priceIncludes = cart.every((line) => line.product.price_includes_taxes);
      const fallbackPaymentMethod: PaymentMethod =
        primaryPaymentOption === "combined"
          ? "cash"
          : paymentAnalysis.entries[0]?.draft.method ?? "cash";
      const paymentsPayload = buildPaymentRows({ kind: "sale", id: activeDraftId });

      // Build shipping_address from orderFields
      // Attempt to parse address if structured fields exist, otherwise use raw text
      const rawAddress = orderFields.direccion_completa || orderFields.direccion || "";

      const shippingAddress = {
        line1: rawAddress,
        city: orderFields.ciudad,
        state: orderFields.estado,
        country: orderFields.pais,
        postal_code: orderFields.codigo_postal,
        lat: orderFields.latitud ? parseFloat(orderFields.latitud) : undefined,
        lng: orderFields.longitud ? parseFloat(orderFields.longitud) : undefined,
        phone: orderFields.telefono,
        recipient_name: orderFields.nombre_cliente,
        label: rawAddress,
        neighborhood: orderFields.barrio,
        instructions: orderFields.instrucciones,
      };

      const { data: saleRow, error: saleError } = await supabase
        .from("sales")
        .update({
          subtotal_amount: cartSummary.subtotal,
          tax_iva_amount: cartSummary.ivaTotal,
          tax_inc_amount: cartSummary.incTotal,
          tax_other_amount: 0,
          tip: tipAmount,
          total_amount: totalDue,
          grand_total: totalDue,
          price_includes_taxes: priceIncludes,
          notes,
          shipping_address: shippingAddress,
          delivery_metadata: {
            ...orderMeta,
            verificationCode,
            kyc: isExchangeBusiness ? kycForm : null,
            kyc_threshold_exceeded: exceedsKycThreshold,
            kyc_daily_limit_exceeded: exceedsCustomerDailyLimit,
            kyc_threshold_usd: kycThresholdUsd,
          },
          status: initialSaleStatus,
          payment_method: fallbackPaymentMethod,
          customer_id: activeCustomer?.id ?? null,
          tip_percentage: effectiveTipPercentage,
          verification_code: verificationCode,
        })
        .eq("id", activeDraftId)
        .select("id, order_number, created_at")
        .single();

      if (saleError) throw saleError;

      const saleCreatedAt = saleRow?.created_at ?? new Date().toISOString();
      const saleOrderNumber = saleRow?.order_number ?? activeDraft.orderNumber;

      await supabase.from("payments").delete().eq("sale_id", activeDraftId);
      if (paymentsPayload.length) {
        await supabase.from("payments").insert(paymentsPayload);
      }

      const paymentBreakdownForReceipt = paymentAnalysis.entries.map((entry) => ({
        method: entry.draft.method,
        label: PAYMENT_METHOD_LABELS[entry.draft.method],
        amount: entry.amount,
        received: entry.received,
        change: entry.change,
        reference: entry.draft.reference?.trim() || undefined,
      }));

      const printerPayload = buildPrinterPayload({ openCashDrawer: false });

      const saleData = {
        saleId: activeDraftId,
        invoiceNumber: saleOrderNumber,
        createdAt: saleCreatedAt,
        customer: activeCustomer
          ? {
            id: activeCustomer.id,
            name: activeCustomer.name,
            email: activeCustomer.email,
            phone: activeCustomer.phone,
            id_type: activeCustomer.id_type,
            id_number: activeCustomer.id_number,
          }
          : { name: "Consumidor Final" },
        items: cart.map(({ product, qty, modifiers, id }) => {
          const totals = computeTradeTotals(product, qty, modifiers);
          return {
            id,
            name: product.name,
            qty,
            unitPrice: totals.unitTotal,
            lineTotal: totals.total,
            taxes: {
              iva: totals.ivaAmount,
              inc: totals.incAmount,
            },
            modifiers: modifiers.map((mod) => ({
              id: mod.modifierId,
              name: mod.modifierDisplayName ?? mod.modifierName,
              displayName: mod.modifierDisplayName ?? mod.modifierName,
              priceDelta: mod.modifierPriceDelta,
              setId: mod.modifierSetId,
              setName: mod.modifierSetName,
              setDisplayName: mod.modifierSetDisplayName ?? mod.modifierSetName,
            })),
          };
        }),
        totals: {
          subtotal: cartSummary.subtotal,
          tax: cartSummary.taxTotal,
          tip: tipAmount,
          tipPercentage: effectiveTipPercentage,
          total: totalDue,
          breakdown: breakdownWithTip,
        },
        payment: {
          method: fallbackPaymentMethod,
          received: paymentAnalysis.totalReceived,
          change: paymentAnalysis.totalChange,
          reference:
            paymentBreakdownForReceipt.length === 1
              ? paymentBreakdownForReceipt[0]?.reference
              : undefined,
          currency: "COP",
          openCashDrawer: shouldOpenDrawer,
          tip: tipAmount,
          tipPercentage: effectiveTipPercentage,
          breakdown: paymentBreakdownForReceipt,
        },
        store: {
          name: org?.name ?? "Sucursal",
          address: "",
          nit: "",
        },
        cashier: { name: user?.email ?? "Cajero" },
        printer: printerPayload,
        taxes: breakdownWithTip,
        order: {
          type: orderType,
          typeLabel: currentOrderOption?.label,
          fields: orderFields,
          number: saleOrderNumber,
          verificationCode: verificationCode,
        },
      };

      if (shouldPrintReceipt) {
        await window.electron?.printDocument?.({
          type: "invoice",
          data: { ...saleData, printer: printerPayload },
          printer: printerPayload,
          renderOptions: {
            openCashDrawer: false,
            drawerCommandTiming: "after",
          },
        });
      }

      toast.success("Venta registrada");
      await refreshShiftSummary();

      setIsPayOpen(false);
      setCart([]);
      resetPaymentFlow();
      setSelectedCustomerId(null);
      setTipPercentage(defaultTipPercentage);
      saleTipRef.current = defaultTipPercentage;
      draftItemsCache.current[activeDraftId] = [];
      lastPersistSignature.current = "";

      let nextDraftId: string | null = null;
      setDrafts((prev) => {
        const remaining = prev.filter((draft) => draft.id !== activeDraftId);
        nextDraftId = remaining[0]?.id ?? null;
        return remaining;
      });

      setTimeout(async () => {
        if (nextDraftId) {
          previousDraftIdRef.current = null;
          setActiveDraftId(nextDraftId);
        } else {
          await createDraft();
        }
      }, 100);
    } catch (err: any) {
      console.error("Error al finalizar venta", err);
      toast.error(err?.message ?? "No se pudo completar la venta");
    } finally {
      setSavingSale(false);
      skipDraftPersistRef.current = false;
    }
  }

  async function finalizePurchase() {
    if (!organizationId) {
      toast.error("No se encontró organización activa");
      return;
    }
    if (cart.some((line) => line.product.item_type !== "foreign_exchange_asset")) {
      toast.error("Las compras FX requieren productos de divisas o commodities.");
      return;
    }
    const firstProduct = cart[0]?.product;
    if (!firstProduct) {
      toast.error("Selecciona un activo para la compra.");
      return;
    }

    const shouldOpenDrawer = openCashDrawer && hasCashEntry;
    const shouldPrintReceipt = printReceipt;
    if (shouldOpenDrawer) {
      void handleOpenDrawer({ silentSuccess: true });
    }

    setOrderFieldErrors([]);
    setSavingSale(true);
    skipDraftPersistRef.current = true;

    const fallbackPaymentMethod: PaymentMethod =
      primaryPaymentOption === "combined"
        ? "cash"
        : paymentAnalysis.entries[0]?.draft.method ?? "cash";

    try {
      const counterpartySnapshot = selectedCustomer
        ? {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          id_type: selectedCustomer.id_type,
          id_number: selectedCustomer.id_number,
          phone: selectedCustomer.phone,
        }
        : { name: "Consumidor Final" };
      const quantityTotal = cart.reduce((sum, line) => sum + line.qty, 0);
      const averageRate = quantityTotal > 0 ? round2(totalDue / quantityTotal) : null;

      const createdBy = profile?.id ?? user?.id ?? null;

      const { data: purchaseRow, error: purchaseError } = await supabase
        .from("purchases")
        .insert([
          {
            organization_id: organizationId,
            status: "COMPLETED",
            operation_side: "buy",
            currency_code: firstProduct.fx_quote_currency ?? "COP",
            fx_counter_currency: firstProduct.fx_quote_currency ?? "COP",
            fx_average_rate: averageRate,
            fx_reference_rate: firstProduct.fx_reference_price ?? null,
            fx_buy_rate: resolveTradePrice(firstProduct),
            fx_sell_rate: firstProduct.fx_sell_price ?? null,
            price_includes_taxes: false,
            subtotal_amount: cartSummary.subtotal,
            tax_iva_amount: cartSummary.ivaTotal,
            tax_inc_amount: cartSummary.incTotal,
            tax_other_amount: 0,
            total_amount: totalDue,
            grand_total: totalDue,
            tip: 0,
            tip_percentage: 0,
            payment_method: fallbackPaymentMethod,
            counterparty_id: selectedCustomer?.id ?? null,
            counterparty_snapshot: counterpartySnapshot,
            delivery_metadata: {
              type: "fx_purchase",
              fields: {},
              kyc: isExchangeBusiness ? kycForm : null,
              kyc_threshold_exceeded: exceedsKycThreshold,
              kyc_daily_limit_exceeded: exceedsCustomerDailyLimit,
              kyc_threshold_usd: kycThresholdUsd,
            },
            metadata: {
              source: "pos",
              fx_product_id: firstProduct.id,
              fx_base_currency: firstProduct.fx_base_currency,
              fx_quote_currency: firstProduct.fx_quote_currency,
              kyc: isExchangeBusiness ? kycForm : null,
              kyc_threshold_exceeded: exceedsKycThreshold,
              kyc_daily_limit_exceeded: exceedsCustomerDailyLimit,
              kyc_threshold_usd: kycThresholdUsd,
            },
            notes: null,
            created_by: createdBy,
            location_id: activeShift?.location_id ?? null,
            pos_id: activeShift?.pos_id ?? null,
            shift_id: activeShift?.id ?? null,
            fx_market_rate_id: null,
          },
        ])
        .select("id, order_number, created_at")
        .single();

      if (purchaseError) throw purchaseError;

      const purchaseId = purchaseRow.id;
      const itemsPayload = buildPurchaseItemsPayload(purchaseId);
      if (itemsPayload.length) {
        await supabase.from("purchase_items").insert(itemsPayload);
      }

      const paymentsPayload = buildPaymentRows({ kind: "purchase", id: purchaseId });
      if (paymentsPayload.length) {
        await supabase.from("payments").insert(paymentsPayload);
      }

      const paymentBreakdownForReceipt = paymentAnalysis.entries.map((entry) => ({
        method: entry.draft.method,
        label: PAYMENT_METHOD_LABELS[entry.draft.method],
        amount: entry.amount,
        received: entry.received,
        change: entry.change,
        reference: entry.draft.reference?.trim() || undefined,
      }));

      const printerPayload = buildPrinterPayload({ openCashDrawer: false });
      if (shouldPrintReceipt && window.electron?.printDocument) {
        const purchaseData = {
          saleId: purchaseId,
          invoiceNumber: purchaseRow.order_number ?? purchaseId,
          createdAt: purchaseRow.created_at ?? new Date().toISOString(),
          customer: selectedCustomer
            ? {
              id: selectedCustomer.id,
              name: selectedCustomer.name,
              email: selectedCustomer.email,
              phone: selectedCustomer.phone,
              id_type: selectedCustomer.id_type,
              id_number: selectedCustomer.id_number,
            }
            : { name: "Consumidor Final" },
          items: cart.map(({ product, qty, modifiers, id }) => {
            const totals = computeTradeTotals(product, qty, modifiers);
            return {
              id,
              name: product.name,
              qty,
              unitPrice: totals.unitTotal,
              lineTotal: totals.total,
              taxes: {
                iva: totals.ivaAmount,
                inc: totals.incAmount,
              },
              modifiers: modifiers.map((mod) => ({
                id: mod.modifierId,
                name: mod.modifierDisplayName ?? mod.modifierName,
                displayName: mod.modifierDisplayName ?? mod.modifierName,
                priceDelta: mod.modifierPriceDelta,
                setId: mod.modifierSetId,
                setName: mod.modifierSetName,
                setDisplayName: mod.modifierSetDisplayName ?? mod.modifierSetName,
              })),
            };
          }),
          totals: {
            subtotal: cartSummary.subtotal,
            tax: cartSummary.taxTotal,
            tip: 0,
            tipPercentage: 0,
            total: totalDue,
            breakdown: cartSummary.breakdown,
          },
          payment: {
            method: fallbackPaymentMethod,
            received: paymentAnalysis.totalReceived,
            change: paymentAnalysis.totalChange,
            reference:
              paymentBreakdownForReceipt.length === 1
                ? paymentBreakdownForReceipt[0]?.reference
                : undefined,
            currency: "COP",
            openCashDrawer: shouldOpenDrawer,
            tip: 0,
            tipPercentage: 0,
            breakdown: paymentBreakdownForReceipt,
          },
          store: {
            name: org?.name ?? "Sucursal",
            address: "",
            nit: "",
          },
          cashier: { name: user?.email ?? "Cajero" },
          printer: printerPayload,
          taxes: cartSummary.breakdown,
          order: {
            type: "fx_purchase",
            typeLabel: "Compra de divisas",
            fields: {},
            number: purchaseRow.order_number ?? purchaseId,
          },
          documentTitle: "Comprobante de compra",
        };

        await window.electron.printDocument({
          type: "invoice",
          data: purchaseData,
          printer: printerPayload,
          renderOptions: {
            openCashDrawer: false,
          },
        });
      }

      toast.success("Compra registrada");
      setCart([]);
      setPaymentDrafts([]);
      setSelectedCustomerId(null);
      resetPaymentFlow();
      setIsPayOpen(false);
    } catch (error: any) {
      console.error("Error al registrar compra FX", error);
      toast.error(error?.message ?? "No se pudo finalizar la compra");
    } finally {
      setSavingSale(false);
      skipDraftPersistRef.current = false;
    }
  }

  const handleCancelDraft = useCallback(async () => {
    if (!activeDraftId || !activeDraft) return;
    if (!organizationId) {
      toast.error("No se encontró organización activa");
      return;
    }

    skipDraftPersistRef.current = true;

    try {
      await supabase
        .from("sales")
        .update({ status: "VOIDED" })
        .eq("id", activeDraftId);

      await supabase.from("sale_items").delete().eq("sale_id", activeDraftId);
      draftItemsCache.current[activeDraftId] = [];

      let pickedNext = false;
      setDrafts((prev) => {
        const remaining = prev.filter((draft) => draft.id !== activeDraftId);
        const firstId = remaining[0]?.id ?? null;
        if (firstId) {
          previousDraftIdRef.current = null;
          setActiveDraftId(firstId);
          pickedNext = true;
        }
        return remaining;
      });

      setCart([]);
      setSelectedCustomerId(null);
      setTipPercentage(defaultTipPercentage);
      saleTipRef.current = defaultTipPercentage;
      setOrderFieldErrors([]);
      lastPersistSignature.current = "";

      setTimeout(async () => {
        if (!pickedNext) { await createDraft(); }
      }, 100);

      toast.success("Borrador anulado");
    } catch (err: any) {
      console.error("Error anulando borrador", err);
      toast.error(err?.message ?? "No se pudo anular el borrador");
    } finally {
      skipDraftPersistRef.current = false;
    }
  }, [activeDraft, activeDraftId, organizationId, supabase, createDraft, defaultTipPercentage]);

  const clearPurchaseDraft = useCallback(() => {
    setCart([]);
    setPaymentDrafts([]);
    setIsPayOpen(false);
    resetPaymentFlow();
  }, [resetPaymentFlow]);

  const handleSelectDraft = useCallback(
    (draftId: string) => {
      if (draftId === activeDraftId) return;
      previousDraftIdRef.current = null;
      setActiveDraftId(draftId);
    },
    [activeDraftId]
  );

  const handleCreateDraftClick = useCallback(async () => {
    try {
      await createDraft();
    } catch (err: any) {
      console.error("Error creando borrador", err);
      toast.error(err?.message ?? "No se pudo crear un nuevo borrador");
    }
  }, [createDraft]);

  // ---- Agrupación por categoría + sin categoría ----
  const productById = useMemo(() => {
    const m = new Map<string, DBProduct>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const loadDraftItems = useCallback(
    async (saleId: string) => {
      if (!organizationId) return;
      try {
        const { data, error } = await supabase
          .from("sale_items")
          .select("id, product_id, quantity, modifiers, comments")
          .eq("organization_id", organizationId)
          .eq("sale_id", saleId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        draftItemsCache.current[saleId] = (data ?? []) as SaleItemDraftRow[];
      } catch (err: any) {
        console.error("Error cargando items del borrador", err);
        toast.error(err?.message ?? "No se pudieron cargar los ítems del borrador");
        draftItemsCache.current[saleId] = [];
      }
    },
    [organizationId, supabase]
  );

  const syncCartWithDraft = useCallback(
    (saleId: string) => {
      const items = draftItemsCache.current[saleId] ?? [];
      if (!items.length) {
        setCart([]);
        return;
      }

      const lines: CartLine[] = [];
      items.forEach((item) => {
        const product = productById.get(item.product_id);
        if (product) {
          const modifiers = (item.modifiers ?? []).map((mod) => ({ ...mod }));
          const lineId = item.id ?? makeTempId();
          const rawComment = typeof item.comments === "string" ? item.comments : null;
          const trimmedComment = rawComment ? rawComment.trim() : "";
          lines.push({
            id: lineId,
            product,
            qty: item.quantity ?? 1,
            modifiers,
            comment: trimmedComment || null,
            selectionKey: buildSelectionKey(product.id, modifiers, trimmedComment),
          });
        } else {
          console.warn("Producto no encontrado para el borrador", item.product_id);
        }
      });

      setCart(lines);
    },
    [productById]
  );

  useEffect(() => {
    if (activeDraftId !== lastCartDraftIdRef.current) {
      pendingCartScrollRef.current = true;
      lastCartDraftIdRef.current = activeDraftId;
    }
  }, [activeDraftId]);

  useEffect(() => {
    const cartGrew = cart.length > prevCartLengthRef.current;
    const shouldScroll = cartGrew || pendingCartScrollRef.current;

    if (shouldScroll) {
      requestAnimationFrame(() => {
        if (cartListRef.current) {
          cartListRef.current.scrollTop = cartListRef.current.scrollHeight;
        }
      });
      pendingCartScrollRef.current = false;
    }

    prevCartLengthRef.current = cart.length;
  }, [cart]);

  useEffect(() => {
    if (isPurchaseMode) return;
    if (!activeDraft) {
      previousDraftIdRef.current = null;
      if (cart.length > 0) {
        setCart([]);
      }
      return;
    }

    const cachedItems = draftItemsCache.current[activeDraft.id] ?? [];
    const needsHydration =
      cachedItems.length > 0 &&
      (cart.length === 0 ||
        cachedItems.some((item) => !productById.has(item.product_id)));

    if (previousDraftIdRef.current === activeDraft.id && !needsHydration) {
      return;
    }

    previousDraftIdRef.current = activeDraft.id;
    skipDraftPersistRef.current = true;

    const nextType = activeDraft.orderType ?? orderType ?? availableOrderTypes[0]?.id ?? null;
    const optionRequires = nextType
      ? availableOrderTypes.find((opt) => opt.id === nextType)?.requires ?? []
      : [];
    const sanitizedFields = ensureOrderFields(optionRequires, activeDraft.orderFields);
    const nextTipPercentage = isExchangeBusiness
      ? 0
      : Number.isFinite(activeDraft.tipPercentage)
        ? activeDraft.tipPercentage
        : defaultTipPercentage;

    setOrderType(nextType);
    setOrderFields(sanitizedFields);
    const enforced = getEnforcedOrderFields(nextType, optionRequires);
    setOrderFieldErrors((prev) => prev.filter((field) => enforced.includes(field)));
    setSelectedCustomerId(activeDraft.customerId ?? null);
    setTipPercentage(nextTipPercentage);
    saleTipRef.current = nextTipPercentage;

    const applyItems = async () => {
      await loadDraftItems(activeDraft.id);
      syncCartWithDraft(activeDraft.id);
      const cachedItems = draftItemsCache.current[activeDraft.id] ?? [];
      const signature = buildDraftSignaturePayload(
        cachedItems.map((item) => ({
          productId: item.product_id,
          qty: item.quantity ?? 1,
          modifiers: (item.modifiers ?? []).map((mod) => mod.modifierId),
          comment: typeof item.comments === "string" ? item.comments.trim() : "",
        })),
        nextType,
        sanitizedFields,
        activeDraft.customerId ?? null,
        nextTipPercentage
      );
      lastPersistSignature.current = signature;
      skipDraftPersistRef.current = false;
    };

    applyItems().catch((err) => {
      console.error("Error preparando borrador", err);
      skipDraftPersistRef.current = false;
    });
  }, [
    activeDraft,
    availableOrderTypes,
    loadDraftItems,
    syncCartWithDraft,
    orderType,
    cart,
    productById,
    isPurchaseMode,
    defaultTipPercentage,
    isExchangeBusiness,
  ]);

  const buildSaleItemsPayload = useCallback(
    (saleId: string) =>
      cart.map(({ product, qty, modifiers, comment }) => {
        const totals = computeTradeTotals(product, qty, modifiers);
        return {
          sale_id: saleId,
          product_id: product.id,
          quantity: qty,
          unit_price: totals.unitTotal,
          discount_amount: 0,
          total_price: totals.total,
          organization_id: organizationId,
          product_name: product.name,
          product_bar_code: product.principal_bar_code,
          unit_code: product.unit_code,
          unspsc_code: product.unspsc_code,
          taxable_base: totals.base,
          iva_rate: totals.ivaRate,
          iva_amount: totals.ivaAmount,
          inc_rate: totals.incRate > 0 ? totals.incRate : null,
          inc_amount: totals.incAmount,
          is_tax_exempt_item: product.iva_category !== "GRAVADO",
          line_total_before_taxes: totals.base,
          line_total_after_taxes: totals.total,
          modifiers: modifiers.map((mod) => ({ ...mod })),
          comments: comment ?? null,
        };
      }),
    [cart, organizationId, computeTradeTotals]
  );

  const buildPurchaseItemsPayload = useCallback(
    (purchaseId: string) =>
      cart.map(({ product, qty, modifiers, comment }) => {
        const totals = computeTradeTotals(product, qty, modifiers);
        return {
          purchase_id: purchaseId,
          organization_id: organizationId,
          product_id: product.id,
          product_name: product.name,
          product_bar_code: product.principal_bar_code,
          quantity: qty,
          unit_price: totals.unitTotal,
          discount_amount: 0,
          total_price: totals.total,
          taxable_base: totals.base,
          iva_rate: totals.ivaRate,
          iva_amount: totals.ivaAmount,
          inc_rate: totals.incRate > 0 ? totals.incRate : null,
          inc_amount: totals.incAmount,
          is_tax_exempt_item: product.iva_category !== "GRAVADO",
          line_total_before_taxes: totals.base,
          line_total_after_taxes: totals.total,
          modifiers: modifiers.map((mod) => ({ ...mod })),
          comments: comment ?? null,
          fx_reference_price: product.fx_reference_price ?? null,
          fx_trade_price: resolveTradePrice(product),
          fx_trade_side: "buy",
          fx_quote_currency: product.fx_quote_currency ?? "COP",
          fx_source: product.fx_last_rate_source ?? null,
        };
      }),
    [cart, organizationId, computeTradeTotals, resolveTradePrice]
  );

  const buildPaymentRows = useCallback(
    (target: { kind: "sale"; id: string } | { kind: "purchase"; id: string }) => {
      if (!organizationId) return [];
      const timestamp = new Date().toISOString();
      return paymentAnalysis.entries.map((entry) => {
        const reference = entry.draft.reference?.trim();
        return {
          organization_id: organizationId,
          sale_id: target.kind === "sale" ? target.id : null,
          purchase_id: target.kind === "purchase" ? target.id : null,
          method: entry.draft.method,
          status: "settled" as const,
          amount: entry.amount,
          currency_code: "COP",
          exchange_rate: null,
          paid_at: timestamp,
          captured_at: null,
          expires_at: null,
          surcharge_amount: 0,
          fee_amount: 0,
          fee_tax_amount: 0,
          change_amount: entry.change,
          tip_amount: 0,
          tax_withheld_amount: 0,
          is_refund: false,
          refunded_payment_id: null,
          provider: null,
          provider_tx_id: null,
          authorization_code: null,
          reference: reference && reference.length ? reference : null,
          pos_id: activeShift?.pos_id ?? null,
          store_id: null,
          cashier_id: user?.id ?? null,
          shift_id: activeShift?.id ?? null,
          created_by: user?.id ?? null,
          metadata:
            entry.draft.method === "cash"
              ? { received: entry.received, change: entry.change }
              : reference
                ? { reference }
                : {},
          location_id: activeShift?.location_id ?? null,
          direction: target.kind === "purchase" ? "outflow" : "inflow",
        };
      });
    },
    [organizationId, paymentAnalysis.entries, activeShift, user?.id]
  );

  const persistDraft = useCallback(
    async (saleId: string, signature: string) => {
      if (!organizationId) return;
      try {
        setIsPersistingDraft(true);

        await supabase.from("sale_items").delete().eq("sale_id", saleId);

        if (cart.length) {
          const itemsPayload = buildSaleItemsPayload(saleId);

          await supabase.from("sale_items").insert(itemsPayload);

          draftItemsCache.current[saleId] = cart.map((line) => ({
            id: line.id,
            product_id: line.product.id,
            quantity: line.qty,
            modifiers: line.modifiers.map((mod) => ({ ...mod })),
            comments: line.comment ?? null,
          }));
        } else {
          draftItemsCache.current[saleId] = [];
        }

        const salePriceIncludes = cart.length > 0
          ? cart.every((line) => line.product.price_includes_taxes)
          : false;

        const notes = serializeOrderMeta({ type: orderType, fields: orderFields });

        await supabase
          .from("sales")
          .update({
            subtotal_amount: cartSummary.subtotal,
            tax_iva_amount: cartSummary.ivaTotal,
            tax_inc_amount: cartSummary.incTotal,
            tax_other_amount: 0,
            tip: tipAmount,
            total_amount: totalDue,
            grand_total: totalDue,
            price_includes_taxes: salePriceIncludes,
            notes,
            delivery_metadata: {
              type: orderType,
              fields: orderFields,
              kyc: isExchangeBusiness ? kycForm : null,
              kyc_threshold_exceeded: exceedsKycThreshold,
              kyc_daily_limit_exceeded: exceedsCustomerDailyLimit,
              kyc_threshold_usd: kycThresholdUsd,
            },
            customer_id: selectedCustomerId,
            tip_percentage: effectiveTipPercentage,
          })
          .eq("id", saleId);

        setDrafts((prev) =>
          prev.map((draft) =>
            draft.id === saleId
              ? {
                ...draft,
                subtotal: cartSummary.subtotal,
                total: totalDue,
                tipPercentage: effectiveTipPercentage,
                orderType,
                orderFields: { ...orderFields },
                customerId: selectedCustomerId,
                notes,
              }
              : draft
          )
        );

        lastPersistSignature.current = signature;
      } catch (err: any) {
        console.error("Error guardando borrador", err);
        toast.error(err?.message ?? "No se pudo guardar el borrador");
      } finally {
        setIsPersistingDraft(false);
      }
    },
    [
      organizationId,
      supabase,
      cart,
      cartSummary,
      totalDue,
      orderType,
      orderFields,
      selectedCustomerId,
      effectiveTipPercentage,
      tipAmount,
      buildSaleItemsPayload,
      isExchangeBusiness,
      kycForm,
      exceedsKycThreshold,
      exceedsCustomerDailyLimit,
      kycThresholdUsd,
    ]
  );

  useEffect(() => {
    if (isPurchaseMode) return;
    if (!organizationId || !activeDraftId) return;
    if (!activeDraft || activeDraft.status !== "DRAFT") return;
    if (savingSale || skipDraftPersistRef.current || isPersistingDraft) return;

    const signature = buildDraftSignaturePayload(
      cart.map((line) => ({
        productId: line.product.id,
        qty: line.qty,
        modifiers: line.modifiers.map((mod) => mod.modifierId),
        comment: line.comment ?? "",
      })),
      orderType,
      orderFields,
      selectedCustomerId,
      effectiveTipPercentage
    );

    if (signature === lastPersistSignature.current) return;

    const timeoutId = window.setTimeout(() => {
      persistDraft(activeDraftId, signature);
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    organizationId,
    activeDraftId,
    activeDraft,
    cart,
    orderType,
    orderFields,
    selectedCustomerId,
    savingSale,
    persistDraft,
    isPersistingDraft,
    effectiveTipPercentage,
    isPurchaseMode,
  ]);

  const productsInCategories = useMemo(() => {
    return categories.map((c) => {
      const ids = byCat[c.id] || [];
      const list = ids
        .map((id) => productById.get(id))
        .filter((p): p is DBProduct => Boolean(p))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { category: c, products: list };
    });
  }, [categories, byCat, productById]);

  const categorizedIds = useMemo(() => new Set(Object.values(byCat).flat()), [byCat]);
  const withoutCategory = useMemo(() => {
    const list = products.filter((p) => !categorizedIds.has(p.id));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, categorizedIds]);

  // ---- Scroll helpers ----
  useEffect(() => {
    const root = listContainerRef.current;
    if (!root) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) {
        if (scrollIdleTimerRef.current !== null) {
          window.clearTimeout(scrollIdleTimerRef.current);
          scrollIdleTimerRef.current = null;
        }
        scrollIdleTimerRef.current = window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
          scrollIdleTimerRef.current = null;
        }, 150);
        return;
      }

      const rootRect = root.getBoundingClientRect();

      if (root.scrollTop <= ACTIVATE_MARGIN) {
        if (categories.length && activeCatId !== categories[0].id) {
          setActiveCatId(categories[0].id);
        }
        return;
      }

      let bestId: string | null = null;
      let bestTop = Infinity;

      const ids = [
        ...categories.map((c) => c.id),
        ...(withoutCategory.length > 0 ? (["__uncat"] as const) : []),
      ];

      for (const id of ids) {
        const hdr = headerRefs.current[id];
        if (!hdr) continue;
        const top = hdr.getBoundingClientRect().top - rootRect.top;
        if (top >= 0 && top <= ACTIVATE_MARGIN && top < bestTop) {
          bestTop = top;
          bestId = id;
        }
      }

      if (bestId && bestId !== activeCatId) {
        setActiveCatId(bestId);
      }
    };

    root.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      root.removeEventListener("scroll", handleScroll);
      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = null;
      }
    };
  }, [categories, withoutCategory.length, ACTIVATE_MARGIN, activeCatId]);

  useEffect(() => {
    return () => {
      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = null;
      }
      if (chipScrollIdleTimerRef.current !== null) {
        window.clearTimeout(chipScrollIdleTimerRef.current);
        chipScrollIdleTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!activeCatId) return;
    const bar = categoriesBarRef.current;
    const chip = chipRefs.current[activeCatId];
    if (!bar || !chip) return;
    if (isProgrammaticChipScrollRef.current) return;

    const barRect = bar.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();

    const chipLeft = chipRect.left - barRect.left + bar.scrollLeft;
    const chipRight = chipLeft + chipRect.width;

    const viewLeft = bar.scrollLeft;
    const viewRight = viewLeft + bar.clientWidth;

    if (chipLeft < viewLeft + 8 || chipRight > viewRight - 8) {
      chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCatId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rafId = window.requestAnimationFrame(() => {
      const top = listContainerRef.current?.getBoundingClientRect().top;
      if (typeof top === "number" && Number.isFinite(top)) {
        setListTopOffset(Math.max(Math.round(top), 96));
      }
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isMobileViewport, drawerAvailable, shiftAmountLabel, categories.length, loading]);

  const scrollToCategory = (catId: string) => {
    const container = listContainerRef.current;
    const node = sectionRefs.current[catId];
    const bar = categoriesBarRef.current;
    const chip = chipRefs.current[catId];

    if (bar && chip) {
      const barRect = bar.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();

      const chipLeft = chipRect.left - barRect.left + bar.scrollLeft;
      const chipRight = chipLeft + chipRect.width;

      const viewLeft = bar.scrollLeft;
      const viewRight = viewLeft + bar.clientWidth;

      if (chipLeft < viewLeft + 8 || chipRight > viewRight - 8) {
        if (chipScrollIdleTimerRef.current) {
          window.clearTimeout(chipScrollIdleTimerRef.current);
          chipScrollIdleTimerRef.current = null;
        }
        isProgrammaticChipScrollRef.current = true;
        chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        chipScrollIdleTimerRef.current = window.setTimeout(() => {
          isProgrammaticChipScrollRef.current = false;
          chipScrollIdleTimerRef.current = null;
        }, 200);
      }
    }

    setActiveCatId(catId);

    if (!node) return;

    if (!container) {
      isProgrammaticScrollRef.current = true;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const targetTop = nodeRect.top - containerRect.top + container.scrollTop;

      isProgrammaticScrollRef.current = true;
      container.scrollTo({
        top: Math.max(targetTop - 8, 0),
        behavior: "smooth",
      });
    });
  };

  // -------- Render --------
  return (
    <main className="relative min-h-[var(--app-content-min-height)] md:min-h-screen w-full overflow-hidden px-4 sm:px-6 lg:px-5 pb-28 md:pb-0">
      <div className="relative flex gap-6">
        {/* Columna izquierda */}
        <div className="w-full min-w-0 md:w-[calc(100%-450px)] md:min-w-[300px]">
          {/* Fila 1: encabezado */}
          <div className="mt-3 md:mt-5 flex flex-col gap-3">
            {/* Barra superior: título + controles de caja */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-xl text-slate-700 tracking-tight">
                  POS
                </span>

                <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-full">

                  <button
                    type="button"
                    onClick={handleOpenCashMovementModal}
                    className="flex items-center justify-center rounded-full h-9 w-9 bg-white border hover:bg-slate-50 transition"
                    title="Registrar movimiento de caja"
                  >
                    <ArrowDownUp className="h-5 text-gray-500 font-light" />
                  </button>

                  <button
                    type="button"
                    onClick={handleShiftSummaryButton}
                    className="flex items-center gap-1 rounded-full bg-white border px-3 h-9 hover:bg-slate-50"
                    disabled={shiftLoading}
                    title={activeShift || shiftSummary ? "Ver resumen del turno" : "Abrir turno"}
                  >
                    <ClipboardCheck className="h-5 text-gray-500 font-light" />
                    <span className="ml-2 text-sm font-semibold text-slate-700">
                      {shiftAmountLabel}
                    </span>
                  </button>
                  {shiftIsExpired && (
                    <div className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 h-7">
                      <AlertTriangle className="h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">Turno vencido</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fila 2: canales de entrega */}
              {activeShift && (
                <div className="flex flex-wrap items-center gap-3">
                  <DeliveryChannelsControl
                    channelStatuses={shiftChannelStatuses}
                    onStatusChange={handleUpdateChannelStatus}
                    disabled={!activeShift}
                  />
                  {organizationId && activeShift.location_id && (
                    <DeliveryBadge
                      organizationId={organizationId}
                      locationId={activeShift.location_id}
                      onClick={() => setShowDeliveryModal(true)}
                    />
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {activeShift && (
                  <LocationStatusIndicator
                    locationId={activeShift.location_id}
                    organizationChannels={organizationChannels}
                    supabase={supabase}
                  />
                )}
              </div>

            </div>


            {/* Fila 3: buscador */}
            <div className="flex items-center gap-5">
              <div className="flex-1 max-w-[1060px]">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Busca o Ingresa un Código…"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  const first = filteredQuick[0];
                  if (first) addToCartByItem(first);
                  setQ("");
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-blue-700 transition"
              >
                Agregar
              </button>
              {drawerAvailable && (
                <button
                  onClick={() => handleOpenDrawer()}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50 transition"
                  disabled={openingDrawer}
                >
                  {openingDrawer ? "Abriendo…" : "Abrir cajón"}
                </button>
              )}
            </div>
          </div>

          {/* Barra sticky de categorías */}
          <div className="sticky top-0 z-10 mt-3 -mx-4 px-4 py-2 bg-white/85 backdrop-blur">
            <div ref={categoriesBarRef} className="overflow-x-auto no-scrollbar">
              {loading ? (
                <div className="inline-flex flex-col gap-2 pr-2">
                  {[0, 1].map((row) => (
                    <div key={row} className="flex gap-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonChip key={`${row}-${i}`} />
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const rows =
                    categories.length > 7
                      ? [categories.slice(0, 7), categories.slice(7)]
                      : [categories];

                  const Chip = ({ c }: { c: Category }) => {
                    const active = activeCatId === c.id;
                    return (
                      <button
                        key={c.id}
                        ref={(el) => { chipRefs.current[c.id] = el; }}
                        onClick={() => scrollToCategory(c.id)}
                        className={`flex items-center gap-2 rounded-full pl-2 pr-3 py-2 text-sm shrink-0 ${active ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-gray-200 bg-gray-100"}`}
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                          {c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" /> : null}
                        </div>
                        <span className="whitespace-nowrap">{c.name}</span>
                      </button>
                    );
                  };

                  return (
                    <div className="inline-flex flex-col gap-2 pr-2">
                      {rows.map((row, idx) => (
                        <div key={idx} className="flex gap-2">
                          {row.map((c) => (
                            <Chip key={c.id} c={c as any} />
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Secciones por categoría + productos sin categoría */}
          <div
            ref={listContainerRef}
            className="space-y-8 overflow-auto pb-4"
            style={{ maxHeight: productsListMaxHeight }}
          >
            {loading && (
              <div className="grid grid-cols-2 mt-3 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonProductCard key={i} />
                ))}
              </div>
            )}

            {!loading && productsInCategories.map(({ category, products }) => (
              <div
                key={category.id}
                data-catid={category.id}
                ref={(el) => { sectionRefs.current[category.id] = el; }}
              >
                <div
                  ref={(el) => { headerRefs.current[category.id] = el; }}
                  className="sticky top-[-1px] bg-white pt-2 pb-2"
                >
                  <h3 className="text-lg font-medium text-gray-500">{category.name}</h3>
                </div>
                {products.length ? (
                  <div className="grid grid-cols-2 mt-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addToCartByItem(p)}
                        className="text-sm rounded-xl text-left hover:bg-gray-100"
                      >
                        <div className="mb-2 aspect-square w-full max-w-full hover:outline-2 hover:outline-blue-600 rounded-xl border bg-white overflow-hidden flex items-center justify-center">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                          ) :
                            <img src="/defaults/products/eat.png" alt={p.name} className="h-full w-full object-contain" />
                          }
                        </div>
                        <div className="font-semibold leading-tight text-[16px]" title={p.name}>
                          {p.name.length > 50 ? p.name.slice(0, 50) + '...' : p.name}
                        </div>
                        <div className="text-gray-600 mt-1">
                          ${" "}
                          {currency(
                            resolveTradePrice(p) ?? Number(p.price ?? 0)
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-3">Sin productos en esta categoría</div>
                )}
              </div>
            ))}

            {!loading && withoutCategory.length > 0 && (
              <div data-catid="__uncat" ref={(el) => { sectionRefs.current["__uncat"] = el }}>
                <div
                  ref={(el) => { headerRefs.current["__uncat"] = el; }}
                  className="sticky top-0 bg-white/85 backdrop-blur pt-4 pb-2"
                >
                  <h3 className="text-lg font-semibold">Otros</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {withoutCategory.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCartByItem(p)}
                      className="rounded-2xl border p-3 text-left hover:bg-gray-100"
                    >
                      <div className="mb-2 aspect-square w-full rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                        ) : null}
                      </div>
                      <div className="font-medium leading-tight truncate" title={p.name}>{p.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        ${" "}
                        {currency(
                          resolveTradePrice(p) ?? Number(p.price ?? 0)
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height: 1000 }} />
          </div>

        </div>

        {/* Columna derecha: Resumen */}
        {isMobileViewport && isMobileSummaryOpen && (
          <button
            type="button"
            aria-label="Cerrar resumen"
            className="fixed md:hidden left-0 right-0 z-[64] bg-black/30"
            style={{
              top: `${MOBILE_HEADER_HEIGHT}px`,
              bottom: `${draftsBarHeight}px`,
            }}
            onClick={() => setIsMobileSummaryOpen(false)}
          />
        )}
        <aside
          id="pos-mobile-summary"
          className={`flex flex-col bg-gray-100 p-4 space-y-3 ${isMobileViewport
            ? `fixed right-0 z-[65] w-screen rounded-none transition-transform duration-300 ${isMobileSummaryOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
            }`
            : "h-[calc(100svh-24px)] mt-3 min-w-[450px] w-[450px] xl:max-w-[450px] rounded-2xl border sticky top-6"
            }`}
          style={
            isMobileViewport
              ? {
                top: `${MOBILE_HEADER_HEIGHT}px`,
                height: mobileSummaryHeight,
                paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
              }
              : undefined
          }
        >
          <div className="flex items-start gap-4">

            <div className="flex-1 space-y-3">
              <CustomerRow
                customers={customers}
                customersLoading={customersLoading}
                selectedCustomer={selectedCustomer ?? undefined}
                setSelectedCustomerId={(id) => setSelectedCustomerId(id)}
                customerDisplayName={customerDisplayName}
                fetchCustomers={fetchCustomers}
                organizationId={organizationId ?? undefined}
                supabase={supabase}
              />
              {isExchangeBusiness ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex rounded-full border bg-white p-1">
                      <button
                        type="button"
                        onClick={() => handleTradeModeChange("sale")}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${isPurchaseMode
                          ? "text-gray-500"
                          : "bg-blue-600 text-white shadow-sm"
                          }`}
                      >
                        Venta
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTradeModeChange("purchase")}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${isPurchaseMode
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-500"
                          }`}
                      >
                        Compra
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsKycOpen(true)}
                      className="rounded-full border border-blue-600 bg-white px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Abrir formulario KYC
                    </button>
                  </div>
                  {exceedsKycThreshold ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Umbral KYC activo: transaccion mayor a USD {currency(kycThresholdUsd)}.
                    </div>
                  ) : null}
                  {selectedCustomer ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                      <div>
                        Consumo diario cliente: USD {currency(selectedCustomerDailyUsedUsd)}
                        {customerDailyUsageLoading ? " (cargando...)" : ""}
                      </div>
                      <div>
                        Limite diario cliente: USD {currency(selectedCustomerDailyLimitUsd)}
                      </div>
                      {exceedsCustomerDailyLimit ? (
                        <div className="mt-1 font-semibold text-red-600">
                          Alerta: la transaccion proyecta exceder el limite diario.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {!isPurchaseMode && (
            <OrderTypeSelector
              availableOrderTypes={selectorOrderTypes}
              getFieldConfig={selectorGetFieldConfig}
              onAddAddress={() => {
              }}
              onAddressChange={handleAddressChange}
              defaultOrderTypeId={orderType}           // opcional: precargar
              defaultFields={orderFields}              // opcional
              optionalFieldsByType={OPTIONAL_ORDER_FIELDS}
              onChange={handleOrderTypeChange}
              organizationId={organizationId ?? undefined}
              locationId={currentLocationId ?? undefined}
            />
          )}
          {/* Lista del carrito */}
          <div ref={cartListRef} className="flex-1 group overflow-y-auto">
            <ul className="divide-y  rounded-xl bg-white ">
              {cart.length === 0 && (
                <li className="p-3 text-sm text-gray-500 text-center">Agrega productos.</li>
              )}
              {cart.map((line) => {
                const totals = computeTradeTotals(line.product, line.qty, line.modifiers);
                const isFxLine = line.product.item_type === "foreign_exchange_asset";
                const lineRate = resolveTradePrice(line.product) ?? 0;
                const editableRateSide: "buy" | "sell" = isPurchaseMode ? "buy" : "sell";
                const editableRateLabel = isPurchaseMode ? "Buy rate" : "Sale rate";
                const editableRateValue =
                  editableRateSide === "buy"
                    ? line.product.fx_buy_price ?? ""
                    : line.product.fx_sell_price ?? "";
                return (
                  <li key={line.id} className="px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium leading-tight truncate" title={line.product.name}>
                          {line.product.name}
                        </div>
                        {isExchangeBusiness && isFxLine ? (
                          <div className="mt-1 space-y-1">
                            <label className="block text-[11px] text-gray-500">
                              {editableRateLabel}
                              <input
                                type="number"
                                min={0}
                                step="0.000001"
                                className="mt-0.5 h-7 w-full rounded-lg border px-2 text-right text-xs"
                                value={editableRateValue}
                                onChange={(event) =>
                                  updateLineTradeRate(line.id, editableRateSide, event.target.value)
                                }
                              />
                            </label>
                            <div className="text-[11px] text-gray-500">
                              Tasa aplicada ({isPurchaseMode ? "buy" : "sale"}): {currency(lineRate)}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenLineComments(line)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Personalizar
                        </button>
                        <button
                          onClick={() => removeLine(line.id)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    {line.modifiers.length ? (
                      <div className="pl-1 text-xs text-gray-500 space-y-0.5">
                        {line.modifiers.map((mod) => (
                          <div key={`${line.id}-${mod.modifierId}`} className="flex items-center justify-between gap-2">
                            <span className="truncate">
                              <span className="font-medium">
                                {mod.modifierSetDisplayName ?? mod.modifierSetName}
                              </span>
                              {": "}
                              {mod.modifierDisplayName ?? mod.modifierName}
                            </span>
                            {mod.modifierPriceDelta !== 0 ? (
                              <span className="whitespace-nowrap">
                                {mod.modifierPriceDelta > 0 ? "+" : "-"}${" "}
                                {currency(Math.abs(mod.modifierPriceDelta))}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {line.comment ? (
                      <div className="pl-1 text-xs text-gray-600 whitespace-pre-line">
                        {line.comment}
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      {isExchangeBusiness && isFxLine ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => dec(line.id)}
                            className="h-7 w-7 grid place-items-center rounded-lg border"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0.01}
                            step="0.01"
                            className="h-7 w-28 rounded-lg border px-2 text-right text-xs"
                            value={line.qty}
                            onChange={(event) => updateLineQty(line.id, event.target.value)}
                          />
                          <button
                            onClick={() => inc(line.id)}
                            className="h-7 w-7 grid place-items-center rounded-lg border"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => dec(line.id)}
                            className="h-7 w-7 grid place-items-center rounded-lg border"
                          >
                            -
                          </button>
                          <span className="min-w-[1.5rem] text-center">{line.qty}</span>
                          <button
                            onClick={() => inc(line.id)}
                            className="h-7 w-7 grid place-items-center rounded-lg border"
                          >
                            +
                          </button>
                        </div>
                      )}
                      <div className="font-medium">${" "}{currency(totals.total)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Totales */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${" "}{currency(cartSummary.subtotal)}</span>
            </div>
            {!isPurchaseMode && tipAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>{`Servicio ${formatRate(effectiveTipPercentage)}%`}</span>
                <span>${" "}{currency(tipAmount)}</span>
              </div>
            )}
            {cartSummary.breakdown.map((entry) => (
              <div key={entry.label} className="flex justify-between text-gray-600">
                <span>{entry.label}</span>
                <span>${" "}{currency(entry.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-lg pt-2">
              <span>Total</span>
              <span>${" "}{currency(totalDue)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <button
                className="bg-gray-200 px-4 py-3 text-sm rounded-full disabled:opacity-50"
                onClick={isPurchaseMode ? clearPurchaseDraft : handleCancelDraft}
                disabled={
                  isPurchaseMode
                    ? cart.length === 0
                    : !activeDraft || activeDraft.status !== "DRAFT" || savingSale
                }
              >
                {isPurchaseMode ? "Limpiar compra" : "Anular Borrador"}
              </button>
              <button
                className="flex-1 rounded-full bg-blue-600 text-white px-4 py-3 text-sm font-medium hover:brightness-110 disabled:opacity-50"
                disabled={
                  cart.length === 0 || savingSale || (!isPurchaseMode && !activeDraft)
                }
                onClick={openPayModal}
              >
                {isPurchaseMode ? "Registrar compra" : "Confirmar venta"}
              </button>
            </div>
            {isRestaurantBusiness && !isPurchaseMode && (
              <div className="flex flex-col gap-2">

                <div className="flex justify-between gap-2">
                  {TIP_CHOICES.map((value) => {
                    const isSelected = tipPercentage === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleTipPercentageChange(value)}
                        className={`h-8 w-full rounded-full border px-3 text-[12px] font-semibold transition ${isSelected
                          ? "border-gray-500 bg-gray-300 text-gray-900"
                          : "border-gray-200 bg-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-300"
                          }`}
                        aria-pressed={isSelected}
                      >
                        {value === 0 ? "Sin servicio" : `Servicio ${formatRate(value)}%`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {isRestaurantBusiness && !isPurchaseMode && (
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 min-w-0 inline-flex items-center justify-center truncate rounded-full border border-blue-600 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                  disabled={cart.length === 0 || !activeDraft || savingSale || printingKitchen}
                  onClick={printKitchenTicket}
                >
                  {printingKitchen ? "Enviando comanda..." : "Imprimir comanda"}
                </button>
                <button
                  type="button"
                  className="flex-1 min-w-0 inline-flex items-center justify-center truncate rounded-full border border-blue-600 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                  disabled={cart.length === 0 || !activeDraft || savingSale || printingPrebill}
                  onClick={printPrebill}
                >
                  {printingPrebill ? "Imprimiendo precuenta..." : "Imprimir precuenta"}
                </button>
              </div>
            )}
          </div>
        </aside>

      </div>

      <KycModal
        open={isKycOpen}
        onOpenChange={setIsKycOpen}
        value={kycForm}
        onSave={setKycForm}
      />

      {/* -------- Modal de Pago -------- */}
      <SaleConfirmModal
        mode={tradeMode}
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        paymentStage={paymentStage}
        cartSummary={cartSummary}
        tipAmount={tipAmount}
        tipPercentage={effectiveTipPercentage}
        setTipPercentage={handleTipPercentageChange}
        tipChoices={TIP_CHOICES}
        formatRate={formatRate}
        currency={currency}
        totalDue={totalDue}
        primaryPaymentOptions={PRIMARY_PAYMENT_OPTIONS}
        primaryPaymentOption={primaryPaymentOption}
        onSelectPrimaryPayment={handleSelectPrimaryPayment}
        paymentDrafts={paymentDrafts}
        paymentEntryInfo={paymentEntryInfo}
        updatePaymentDraft={updatePaymentDraft}
        paymentMethodOptions={PAYMENT_METHOD_SELECT_OPTIONS}
        combinedFirstAmountRef={combinedFirstAmountRef}
        singleCashReceivedRef={singleCashReceivedRef}
        singleReferenceRef={singleReferenceRef}
        addCombinedPaymentDraft={addCombinedPaymentDraft}
        removePaymentDraft={removePaymentDraft}
        paymentMethodLabels={PAYMENT_METHOD_LABELS}
        round2={round2}
        hasCashEntry={hasCashEntry}
        paymentAnalysis={paymentAnalysis}
        paymentBalanceOk={paymentBalanceOk}
        paymentMissingAbs={paymentMissingAbs}
        paymentIsShort={paymentIsShort}
        paymentIsOver={paymentIsOver}
        openCashDrawer={openCashDrawer}
        printReceipt={printReceipt}
        setOpenCashDrawer={setOpenCashDrawer}
        onTogglePrintReceipt={handlePrintPreferenceChange}
        resetPaymentFlow={resetPaymentFlow}
        savingSale={savingSale}
        finalizeAndPrint={finalizeAndPrint}
        canFinalizePayment={canFinalizePayment}
      />

      {activeShift && (
        <HorizontalCardList ref={draftsBarRef} className="pr-3">
          {drafts.map((draft) => {
            const isActive = activeDraftId === draft.id;
            const summary = getDraftSummaryLabel(draft);
            return (
              <button
                key={draft.id}
                type="button"
                onClick={() => handleSelectDraft(draft.id)}
                aria-pressed={isActive}
                title={summary}
                className={`w-[140px] max-w-[140px] min-w-[140px] mr-3 rounded-xl px-3 py-2 text-left transition-colors ${isActive
                  ? "bg-blue-100 text-blue-600 border border-blue-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <div className="text-sm font-semibold truncate">{summary}</div>
                <div className="text-xs text-gray-500">${" "}{currency(draft.total)}</div>
              </button>
            );
          })}

          <button
            type="button"
            className="hidden md:flex ml-0 h-[50px] w-[50px] min-w-[50px] items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
            onClick={handleCreateDraftClick}
          >
            <Plus className="h-5 w-5" />
          </button>
        </HorizontalCardList>
      )}

      {isMobileViewport && (
        <div
          className="fixed z-[70] flex items-center gap-3 md:hidden"
          style={{ bottom: 14, right: 22 }}
        >
          <button
            type="button"
            onClick={() => {
              void handleCreateDraftClick();
            }}
            className="h-12 w-12 rounded-full bg-white text-gray-700 border border-gray-200 shadow-lg grid place-items-center active:scale-95 transition"
            aria-label="Nueva venta en proceso"
          >
            <Plus className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsMobileSummaryOpen((prev) => !prev)}
            aria-expanded={isMobileSummaryOpen}
            aria-controls="pos-mobile-summary"
            aria-label={isMobileSummaryOpen ? "Cerrar resumen" : "Abrir resumen"}
            className={`relative h-12 w-12 rounded-full text-white shadow-lg inline-flex items-center justify-center active:scale-95 transition ${isMobileSummaryOpen ? "bg-gray-900" : "bg-blue-600"
              }`}
          >
            {isMobileSummaryOpen ? <X className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            {!isMobileSummaryOpen && cartItemsCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex min-w-[22px] h-[22px] items-center justify-center rounded-full bg-blue-500 px-1 text-xs font-semibold text-white">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      )}

      <ModifierSelectionDialog
        open={Boolean(modifierDialog)}
        product={modifierDialog?.product ?? null}
        sets={modifierDialog?.sets ?? []}
        initialModifiers={modifierDialog?.initialModifiers ?? []}
        initialComment={modifierDialog?.initialComment ?? ""}
        confirmLabel={modifierDialog?.mode === "edit" ? "Guardar" : "Agregar"}
        onCancel={() => setModifierDialog(null)}
        onConfirm={({ modifiers, comment }) => {
          if (!modifierDialog?.product) return;
          if (modifierDialog.mode === "edit" && modifierDialog.lineId) {
            updateCartLine(modifierDialog.lineId, modifierDialog.product, modifiers, comment);
          } else {
            addProductWithModifiers(modifierDialog.product, modifiers, comment);
          }
          setModifierDialog(null);
        }}
      />

      {cashShiftModals}

      <DeliveryListModal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        organizationId={organizationId ?? ""}
        locationId={activeShift?.location_id ?? ""}
      />

    </main>
  );
}
