export type ProductItemType =
  | 'prepared_food'
  | 'medication'
  | 'physical'
  | 'digital'
  | 'foreign_exchange_asset'
  | 'other';

export type TaxIvaCategory = 'GRAVADO' | 'EXENTO' | 'EXCLUIDO' | 'NO_CAUSA';

export type FxAssetKind = 'currency' | 'precious_metal' | 'commodity';
export type FxPricingMode =
  | 'manual'
  | 'market_plus_margin'
  | 'market_minus_margin'
  | 'fixed_spread';
export type FxOperationSide = 'buy' | 'sell';

export type MiniCategory = { id: string; name: string };

export type MiniModifierSet = {
  id: string;
  name: string;
  display_name: string | null;
  require_selection: boolean;
  min_selections: number;
  max_selections: number | null;
  is_active: boolean;
};

export type ProductImage = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  organization_id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number | null;
  created_at?: string | null;
};

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_available: boolean | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  item_type: ProductItemType;
  principal_bar_code: string | null;
  price_includes_taxes: boolean;
  iva_category: TaxIvaCategory;
  iva_rate: number | null;
  inc_type: string | null;
  inc_rate: number | null;
  unspsc_code: string | null;
  dian_tariff_code: string | null;
  unit_code: string | null;
  tax_observation: string | null;
  preparation_time_minutes: number | null;

  // Nuevos campos generales
  minimum_unit?: string | null;
  packaging_unit?: string | null;
  content_unit?: string | null;
  measurement_unit?: string | null;

  // Campos específicos de medicamentos
  ium_code?: string | null;
  cum_code?: string | null;
  invima_record?: string | null;
  lab_name?: string | null;
  active_principle?: string | null;
  concentration?: string | null;
  manufacturer_name?: string | null;
  manufacturer_nit?: string | null;
  storage_temp_min?: number | null;
  storage_temp_max?: number | null;

  // Campos para activos de cambio y materias primas
  fx_asset_kind?: FxAssetKind | null;
  fx_base_currency?: string | null;
  fx_quote_currency?: string | null;
  fx_reference_code?: string | null;
  fx_pricing_mode?: FxPricingMode | null;
  fx_reference_price?: number | null;
  fx_buy_price?: number | null;
  fx_sell_price?: number | null;
  fx_buy_margin_bps?: number | null;
  fx_sell_margin_bps?: number | null;
  fx_last_rate_source?: string | null;
  fx_last_rate_at?: string | null;
  fx_price_metadata?: Record<string, unknown> | null;
  fx_market_feed_payload?: Record<string, unknown> | null;
  fx_quantity_precision?: number | null;
  fx_auto_pricing?: boolean | null;
  fx_quote_unit?: number | null;

  variants?: ProductVariant[];
  default_variant?: ProductVariant | null;
};

export type ProductBatch = {
  id: string;
  organization_id: string;
  product_id: string;
  batch_code: string;
  expiration_date: string | null;
  quantity_units: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductBatchDraft = {
  id: string;
  batch_code: string;
  expiration_date: string | null;
  quantity_units: string;
  isNew?: boolean;
  markedForDeletion?: boolean;
  variant_id?: string;
};

export type VariantInventoryDraft = {
  id: string;
  variant_id: string;
  warehouse_id: string | null;
  batch_code: string;
  expiration_date: string | null;
  quantity_units: string;
  unit_cost: string;
  isNew?: boolean;
};

export type ProductVariant = {
  id: string;
  organization_id: string;
  product_id: string;
  sku: string | null;
  gtin: string | null;
  name: string | null;
  image_url: string | null;
  weight_grams: number | null;
  price: number | null;
  is_active: boolean;
  is_default: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProductVariantDraft = {
  id: string;
  name: string;
  sku: string;
  gtin: string;
  price: string;
  weight_grams: string;
  isActive: boolean;
  isDefault: boolean;
  isNew?: boolean;
  markedForDeletion?: boolean;
  options: Record<string, string | null>;
};
