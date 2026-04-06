"use client";

import type { FxAssetKind, FxPricingMode } from "../../items/types";

export type OrderMeta = {
  type: string | null;
  fields: Record<string, string>;
};

export type OrderTypeDefinition = {
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

export type BusinessConfig = {
  enabledTypes: string[];
  customFields?: Record<string, string>;
  additionalType?: {
    id: string;
    label: string;
    icon: string;
    requires?: string[];
  };
};

export type OrderTypeOption = {
  id: string;
  label: string;
  icon: string;
  requires: string[];
  definition: OrderTypeDefinition;
};

export type FieldInputType = "text" | "tel" | "select" | "datetime-local" | "email";

export type OrderFieldConfig = {
  label: string;
  placeholder?: string;
  type?: FieldInputType;
  options?: { value: string; label: string }[];
};

export type CashShiftStatus = "open" | "closed" | "archived";

export type CashMovementReason =
  | "opening_float"
  | "cash_sale"
  | "cash_refund"
  | "petty_cash"
  | "supplier_payout"
  | "cash_pickup"
  | "bank_deposit"
  | "closing_adjustment"
  | "other";

export type CashShift = {
  id: string;
  organization_id: string;
  location_id: string | null;
  pos_id: string | null;
  cashier_id: string | null;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  status: CashShiftStatus;
  opening_amount: number;
  expected_closing_amount: number;
  counted_closing_amount: number;
  difference_amount: number;
  total_cash: number;
  total_card: number;
  total_bold: number;
  total_nequi: number;
  total_transfer: number;
  total_others: number;
  notes: string | null;
};

export type CashShiftSummary = {
  shiftId: string;
  organizationId: string | null;
  locationId: string | null;
  posId: string | null;
  status: CashShiftStatus;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  expectedClosingCash: number;
  countedClosingAmount: number;
  differenceAmount: number;
  totalCash: number;
  totalCard: number;
  totalBold: number;
  totalNequi: number;
  totalTransfer: number;
  totalOthers: number;
  totalPayments: number;
  cashIn: number;
  cashOut: number;
  cashMovementsNet: number;
  notes: string | null;
  movementAggregates: CashMovementAggregate[];
  movements: CashMovementDetail[];
};

export type CashMovementAggregate = {
  reason: CashMovementReason | null;
  reasonLabel: string | null;
  cashIn: number;
  cashOut: number;
  net: number;
  notes: string[];
};

export type CashMovementDetail = {
  id: string;
  direction: "in" | "out";
  reason: CashMovementReason | null;
  reasonLabel: string | null;
  amount: number;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
};

export type PaymentMethod =
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

export type PrimaryPaymentOption = "cash" | "card" | "transfer" | "combined" | "bold" | "nequi";

export type PaymentDraft = {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference?: string;
  received?: string;
};

export type PosOption = {
  id: string;
  name: string;
  code: string | null;
  locationId: string | null;
  locationName: string | null;
};

export type RemoteOrderChannel = "pickup" | "delivery" | "national_shipping";

export type ServiceChannelStatus = "active" | "waiting" | "inactive";

export type ServiceChannelConfig = {
  pickup: boolean;
  delivery: boolean;
  national_shipping: boolean;
};

export type ServiceChannelStatusConfig = {
  pickup: ServiceChannelStatus;
  delivery: ServiceChannelStatus;
  national_shipping: ServiceChannelStatus;
};

export type CoverageValidationResult = {
  eligible: boolean;
  reasonCode: "ok" | "service_disabled" | "location_missing" | "out_of_coverage" | "location_closed";
  reason: string | null;
};

export type NumericValue = string | number | null;

export type DBModifier = {
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

export type ProductModifierSet = {
  id: string;
  product_id: string;
  modifier_set_id: string;
  modifier_set?: {
    id: string;
    name: string;
    display_name: string | null;
    description: string | null;
    is_active: boolean;
    require_selection: boolean | null;
    min_selections: number | null;
    max_selections: number | null;
    modifiers?: DBModifier[];
  } | null;
  sort_order: number | null;
  require_selection: boolean | null;
  min_selections: number | null;
  max_selections: number | null;
};

export type ResolvedProductModifierSet = {
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

export type DBProduct = {
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
  fx_asset_kind?: FxAssetKind | null;
  fx_base_currency?: string | null;
  fx_quote_currency?: string | null;
  fx_reference_code?: string | null;
  fx_pricing_mode?: FxPricingMode | null;
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
  modifierSets?: ProductModifierSet[];
};

export type Category = {
  id: string;
  organization_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  position: number;
};

export type SelectedLineModifier = {
  modifierId: string;
  modifierSetId: string;
  modifierName: string;
  modifierDisplayName: string | null;
  modifierPriceDelta: number;
  modifierSetName: string;
  modifierSetDisplayName: string | null;
};

export type CartLine = {
  id: string;
  product: DBProduct;
  qty: number;
  modifiers: SelectedLineModifier[];
  comment: string | null;
  selectionKey: string;
};

export type DraftSummary = {
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
  createdAt: string | null;
};

export type SaleItemDraftRow = {
  id?: string;
  product_id: string;
  quantity: number;
  modifiers?: SelectedLineModifier[];
  comments?: string | null;
};

export type LineComputation = {
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
