"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronDown,
  Check,
  Coins,
  FileDigit,
  Loader2,
  MoreHorizontal,
  MapPin,
  Package,
  Pencil,
  Pill,
  Plus,
  Star,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { validateProduct } from "@/utils/product-validation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import type {
  FxAssetKind,
  FxPricingMode,
  MiniCategory,
  MiniModifierSet,
  Product,
  ProductImage,
  ProductItemType,
  ProductVariantDraft,
  TaxIvaCategory,
  VariantInventoryDraft,
} from "../types";
import { ItemTypeDialog } from "./itemTypeDialog";
import { CategoryPickerDialog } from "./categoryPickerDialog";
import { ModifierSetPickerDialog } from "./modifierSetPickerDialog";
import { VariantList } from "./variants/VariantList";
import { VariantEditorDialog } from "./variants/VariantEditorDialog";
import {
  VariantInventoryModal,
  type WarehouseOption,
} from "./variants/VariantInventoryModal";
import {
  VariantAvailabilityModal,
  type AvailabilityConfig,
} from "./variants/VariantAvailabilityModal";
import { AddVariationsDialog } from "./variants/AddVariationsDialog";
import type {
  OptionSetWithValues,
  VariationSetDraft,
  OptionValue,
} from "./variants/types";
import { useEnvironment } from "@/context/EnvironmentContext";

type SupabaseClient = ReturnType<typeof getSupabaseBrowser>;

const ITEM_TYPES: {
  key: ProductItemType;
  title: string;
  subtitle: string;
  icon: ReactNode;
}[] = [
  {
    key: "prepared_food",
    title: "Comida/Bebida preparada",
    subtitle: "Para restaurantes u ofertas listas para consumir.",
    icon: <UtensilsCrossed className="h-5 w-5" />,
  },
  {
    key: "medication",
    title: "Medicamento (físico)",
    subtitle: "Para farmacias y productos farmacéuticos.",
    icon: <Pill className="h-5 w-5" />,
  },
  {
    key: "physical",
    title: "Bien físico",
    subtitle: "Ropa, accesorios, electrónicos, etc.",
    icon: <Package className="h-5 w-5" />,
  },
  {
    key: "digital",
    title: "Digital",
    subtitle: "Archivos descargables, licencias, cursos.",
    icon: <FileDigit className="h-5 w-5" />,
  },
  {
    key: "foreign_exchange_asset",
    title: "Foreign Exchange & Commodities",
    subtitle:
      "Monedas extranjeras, oro u otros activos con precios de compra y venta dinámicos.",
    icon: <Coins className="h-5 w-5" />,
  },
  {
    key: "other",
    title: "Otro",
    subtitle: "Cumple con casos manuales o especiales.",
    icon: <MoreHorizontal className="h-5 w-5" />,
  },
];

const IVA_OPTIONS: { value: TaxIvaCategory; label: string }[] = [
  { value: "GRAVADO", label: "Gravado" },
  { value: "EXENTO", label: "Exento" },
  { value: "EXCLUIDO", label: "Excluido" },
  { value: "NO_CAUSA", label: "No causa" },
];

const IMAGE_ACCEPT = "image/*";
const MAX_IMAGE_KB = 500;
const MAX_IMAGE_BYTES = MAX_IMAGE_KB * 1024;
const IMAGE_MIME_PREFIX = "image/";
const IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-icon": "ico",
};
const ALLOWED_IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
  "avif",
  "bmp",
  "tif",
  "tiff",
  "ico",
]);

function getExt(fileName: string) {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : "";
}

function isAllowedImageFile(file: File) {
  if (file.type?.startsWith(IMAGE_MIME_PREFIX)) return true;
  const ext = getExt(file.name);
  return ext ? ALLOWED_IMAGE_EXTS.has(ext) : false;
}

function getImageExt(file: File) {
  return getExt(file.name) || IMAGE_EXT_BY_MIME[file.type] || "img";
}

function getImageValidationError(file: File) {
  if (!isAllowedImageFile(file)) {
    return "Solo se permiten imagenes (jpg, png, webp, etc.).";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Cada imagen debe pesar maximo ${MAX_IMAGE_KB} KB.`;
  }
  return null;
}

const FX_ASSET_KIND_OPTIONS: { value: FxAssetKind; label: string }[] = [
  { value: "currency", label: "Moneda" },
  { value: "precious_metal", label: "Metal precioso" },
  { value: "commodity", label: "Commodity" },
];

const FX_PRICING_MODE_OPTIONS: { value: FxPricingMode; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "market_plus_margin", label: "Mercado + margen" },
  { value: "market_minus_margin", label: "Mercado - margen" },
  { value: "fixed_spread", label: "Spread fijo" },
];

type PersistableVariantInventory = {
  id: string;
  variant_id: string;
  warehouse_id: string | null;
  batch_code: string;
  expiration_date: string | null;
  quantity_units: number | null;
  unit_cost: number | null;
};

type PersistableVariant = {
  id: string;
  name: string | null;
  sku: string | null;
  gtin: string | null;
  price: number | null;
  weight_grams: number | null;
  is_active: boolean;
  is_default: boolean;
};

type PersistableVariantOption = {
  variant_id: string;
  option_set_id: string;
  option_value_id: string;
};

const EMPTY_INVENTORY_ROW: VariantInventoryDraft = {
  id: "",
  variant_id: "",
  warehouse_id: null,
  batch_code: "",
  expiration_date: null,
  quantity_units: "",
  unit_cost: "",
};

type Location = {
  id: string;
  name: string;
};

type VariantLocationConfig = {
  allLocations: boolean;
  selectedLocationIds: Set<string>;
  lowStockThresholds: Record<string, string>;
};

const PRODUCT_IMAGE_SCOPE = "__product__";

function uuid() {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function sortInventoryDrafts(drafts: VariantInventoryDraft[]) {
  return [...drafts].sort((a, b) => {
    if (a.expiration_date && b.expiration_date) {
      return (
        new Date(a.expiration_date).getTime() -
        new Date(b.expiration_date).getTime()
      );
    }
    if (a.expiration_date) return -1;
    if (b.expiration_date) return 1;
    return a.batch_code.localeCompare(b.batch_code);
  });
}

function buildVariantOptionsMap(
  optionSetIds: string[],
  base?: Record<string, string | null>
) {
  const uniqueIds = Array.from(new Set(optionSetIds));
  const map: Record<string, string | null> = {};
  uniqueIds.forEach((id) => {
    map[id] = base?.[id] ?? null;
  });
  return map;
}

function buildVariantKey(
  optionSetIds: string[],
  options?: Record<string, string | null>
) {
  if (!optionSetIds.length || !options) return null;
  const values = optionSetIds.map((id) => options[id]);
  if (values.some((value) => !value)) return null;
  return values.join("::");
}

function buildCombinations(
  sets: { optionSetId: string; optionIds: string[] }[],
  optionSetLookup: Map<string, OptionSetWithValues>
) {
  const results: {
    key: string;
    mapping: Record<string, string>;
    labels: string[];
  }[] = [];

  if (!sets.length) return results;

  const walk = (
    index: number,
    accMapping: Record<string, string>,
    accLabels: string[]
  ) => {
    if (index === sets.length) {
      const key = sets.map((set) => accMapping[set.optionSetId]).join("::");
      results.push({
        key,
        mapping: { ...accMapping },
        labels: [...accLabels],
      });
      return;
    }

    const current = sets[index];
    const optionSet = optionSetLookup.get(current.optionSetId);
    current.optionIds.forEach((optionId) => {
      const option = optionSet?.options.find((item) => item.id === optionId);
      accMapping[current.optionSetId] = optionId;
      accLabels[index] = option?.display_name || option?.name || optionId;
      walk(index + 1, accMapping, accLabels);
    });
  };

  walk(0, {}, Array(sets.length).fill(""));

  return results;
}

function cloneVariantLocationConfig(
  config?: VariantLocationConfig
): VariantLocationConfig {
  return {
    allLocations: config?.allLocations ?? true,
    selectedLocationIds: new Set(config?.selectedLocationIds ?? []),
    lowStockThresholds: { ...(config?.lowStockThresholds ?? {}) },
  };
}

function prepareInventoryForPersistence({
  variantDrafts,
  inventoryByVariant,
}: {
  variantDrafts: ProductVariantDraft[];
  inventoryByVariant: Record<string, VariantInventoryDraft[]>;
}): PersistableVariantInventory[] {
  const activeVariantIds = new Set(
    variantDrafts.filter((variant) => !variant.markedForDeletion).map((v) => v.id)
  );

  const rows: PersistableVariantInventory[] = [];

  Object.entries(inventoryByVariant).forEach(([variantId, drafts]) => {
    if (!activeVariantIds.has(variantId)) return;
    drafts.forEach((draft) => {
      const code = draft.batch_code.trim();
      const expiration = draft.expiration_date?.trim() || null;
      const quantityInput = draft.quantity_units.trim();
      const quantity =
        draft.quantity_units.trim() === ""
          ? null
          : Number(quantityInput);
      const unitCostInput = draft.unit_cost.trim();
      const unitCost =
        unitCostInput === "" ? null : Number(unitCostInput.replace(",", "."));

      if (!code && !expiration && quantity == null && unitCost == null) {
        return;
      }

      if (!code) {
        throw new Error("Cada registro de inventario requiere un código o lote.");
      }

      if (!draft.warehouse_id) {
        throw new Error(
          `Selecciona una bodega para el lote ${code || "sin código"}.`
        );
      }

      if (
        quantity != null &&
        (Number.isNaN(quantity) || quantity < 0 || !Number.isFinite(quantity))
      ) {
        throw new Error(
          `La cantidad del lote ${code} debe ser un número válido mayor o igual a 0.`
        );
      }

      if (
        unitCost != null &&
        (Number.isNaN(unitCost) || unitCost < 0 || !Number.isFinite(unitCost))
      ) {
        throw new Error(
          `El costo unitario del lote ${code} debe ser un número válido mayor o igual a 0.`
        );
      }

      rows.push({
        id: draft.id,
        variant_id: variantId,
        warehouse_id: draft.warehouse_id,
        batch_code: code,
        expiration_date: expiration,
        quantity_units: quantity,
        unit_cost: unitCost,
      });
    });
  });

  return rows;
}

function prepareVariantOptions({
  variantDrafts,
  optionSetIds,
}: {
  variantDrafts: ProductVariantDraft[];
  optionSetIds: string[];
}): PersistableVariantOption[] {
  const activeVariants = variantDrafts.filter(
    (variant) => !variant.markedForDeletion
  );
  const uniqueSetIds = Array.from(new Set(optionSetIds));
  const rows: PersistableVariantOption[] = [];

  activeVariants.forEach((variant) => {
    uniqueSetIds.forEach((setId) => {
      const valueId = variant.options?.[setId];
      if (valueId) {
        rows.push({
          variant_id: variant.id,
          option_set_id: setId,
          option_value_id: valueId,
        });
      }
    });
  });

  return rows;
}

function createVariantDraft(
  overrides: Partial<ProductVariantDraft> = {}
): ProductVariantDraft {
  return {
    id: overrides.id ?? uuid(),
    name: overrides.name ?? "",
    sku: overrides.sku ?? "",
    gtin: overrides.gtin ?? "",
    price: overrides.price ?? "",
    weight_grams: overrides.weight_grams ?? "",
    isActive: overrides.isActive ?? true,
    isDefault: overrides.isDefault ?? false,
    isNew: overrides.isNew ?? true,
    markedForDeletion: overrides.markedForDeletion ?? false,
    options: overrides.options ?? {},
  };
}

function ensureDefaultVariant(
  drafts: ProductVariantDraft[],
  forcedDefaultId?: string
) {
  let defaultAssigned = false;

  const next = drafts.map((variant) => {
    if (variant.markedForDeletion) {
      return { ...variant, isDefault: false };
    }

    if (forcedDefaultId && variant.id === forcedDefaultId) {
      defaultAssigned = true;
      return { ...variant, isDefault: true };
    }

    if (!forcedDefaultId && variant.isDefault && !defaultAssigned) {
      defaultAssigned = true;
      return { ...variant, isDefault: true };
    }

    return { ...variant, isDefault: false };
  });

  if (!defaultAssigned) {
    const firstActiveIndex = next.findIndex(
      (variant) => !variant.markedForDeletion
    );
    if (firstActiveIndex >= 0) {
      next[firstActiveIndex] = { ...next[firstActiveIndex], isDefault: true };
    }
  }

  return next;
}

function prepareVariantsForPersistence(
  drafts: ProductVariantDraft[]
): {
  persistable: PersistableVariant[];
  deletedIds: string[];
  defaultVariant?: PersistableVariant;
} {
  const normalized = ensureDefaultVariant(drafts);
  const active = normalized.filter((variant) => !variant.markedForDeletion);

  if (!active.length) {
    throw new Error("Debes conservar al menos una variante activa.");
  }

  const persistable = active.map((variant) => {
    const parsedPrice =
      variant.price.trim() === "" ? null : Number(variant.price.trim());
    const parsedWeight =
      variant.weight_grams.trim() === ""
        ? null
        : Number(variant.weight_grams.trim());

    if (
      parsedPrice != null &&
      (Number.isNaN(parsedPrice) || parsedPrice < 0 || !Number.isFinite(parsedPrice))
    ) {
      throw new Error(
        `El precio de la variante ${variant.name || "sin nombre"} no es válido.`
      );
    }

    if (
      parsedWeight != null &&
      (Number.isNaN(parsedWeight) || parsedWeight < 0 || !Number.isFinite(parsedWeight))
    ) {
      throw new Error(
        `El peso de la variante ${variant.name || "sin nombre"} no es válido.`
      );
    }

    return {
      id: variant.id,
      name: variant.name.trim() || null,
      sku: variant.sku.trim() || null,
      gtin: variant.gtin.trim() || null,
      price: parsedPrice,
      weight_grams: parsedWeight,
      is_active: variant.isActive,
      is_default: variant.isDefault,
    };
  });

  const defaultVariant =
    persistable.find((variant) => variant.is_default) ?? persistable[0];

  const deletedIds = drafts
    .filter((variant) => variant.id && variant.markedForDeletion && !variant.isNew)
    .map((variant) => variant.id);

  return { persistable, deletedIds, defaultVariant };
}

async function syncProductCategories({
  supabase,
  organizationId,
  productId,
  nextIds,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  productId: string;
  nextIds: string[];
}) {
  const { data: currentRows, error } = await supabase
    .from("product_category_products")
    .select("category_id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId);
  if (error) throw error;

  const current = new Set((currentRows ?? []).map((row: any) => row.category_id));
  const next = new Set(nextIds);

  const toInsert = nextIds.filter((id) => !current.has(id));
  const toDelete = Array.from(current).filter((id) => !next.has(id));

  if (toInsert.length) {
    const rows = toInsert.map((categoryId) => ({
      organization_id: organizationId,
      category_id: categoryId,
      product_id: productId,
    }));
    const { error: insertError } = await supabase
      .from("product_category_products")
      .insert(rows);
    if (insertError) throw insertError;
  }

  if (toDelete.length) {
    const { error: deleteError } = await supabase
      .from("product_category_products")
      .delete()
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .in("category_id", toDelete);
    if (deleteError) throw deleteError;
  }
}

async function syncProductModifierSets({
  supabase,
  organizationId,
  productId,
  nextIds,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  productId: string;
  nextIds: string[];
}) {
  const supabaseAny = supabase as any;

  const uniqueIds = Array.from(new Set(nextIds));

  const { data: currentRows, error } = await supabaseAny
    .from("product_modifier_sets")
    .select("modifier_set_id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId);
  if (error) throw error;

  const current = new Set<string>(
    (currentRows ?? []).map(
      (row: { modifier_set_id: string }) => row.modifier_set_id
    )
  );
  const next = new Set<string>(uniqueIds);

  const toInsert = uniqueIds.filter((id) => !current.has(id));
  const toDelete = Array.from(current).filter((id) => !next.has(id));

  if (toInsert.length) {
    const rows = toInsert.map((modifierSetId) => ({
      organization_id: organizationId,
      product_id: productId,
      modifier_set_id: modifierSetId,
      sort_order: uniqueIds.indexOf(modifierSetId) + 1,
    }));
    const { error: insertError } = await supabaseAny
      .from("product_modifier_sets")
      .insert(rows);
    if (insertError) throw insertError;
  }

  if (toDelete.length) {
    const { error: deleteError } = await supabaseAny
      .from("product_modifier_sets")
      .delete()
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .in("modifier_set_id", toDelete);
    if (deleteError) throw deleteError;
  }

  await Promise.all(
    uniqueIds.map((modifierSetId, index) =>
      supabaseAny
        .from("product_modifier_sets")
        .update({ sort_order: index + 1 })
        .eq("organization_id", organizationId)
        .eq("product_id", productId)
        .eq("modifier_set_id", modifierSetId)
    )
  );
}

async function syncProductLocationSettings({
  supabase,
  organizationId,
  productId,
  allLocations,
  selectedLocationIds,
  productLowStockThresholds,
  variantLocations,
  activeVariantIds,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  productId: string;
  allLocations: boolean;
  selectedLocationIds: Set<string>;
  productLowStockThresholds: Record<string, string>;
  variantLocations: Record<string, VariantLocationConfig>;
  activeVariantIds: string[];
}) {
  const { error: deleteError } = await supabase
    .from("product_location_settings")
    .delete()
    .eq("organization_id", organizationId)
    .eq("product_id", productId);
  if (deleteError) throw deleteError;

  const rows: {
    organization_id: string;
    product_id: string;
    variant_id: string | null;
    location_id: string;
    is_available: boolean;
    low_stock_threshold: number | null;
  }[] = [];

  const parseThreshold = (value?: string) => {
    const raw = value?.trim() ?? "";
    if (!raw) return null;
    const normalized = Number(raw.replace(",", "."));
    if (!Number.isFinite(normalized) || normalized < 0) {
      throw new Error(
        "Los umbrales de bajo stock deben ser números positivos."
      );
    }
    return normalized;
  };

  const pushRow = (
    variantId: string | null,
    locationId: string,
    thresholdValue?: string
  ) => {
    rows.push({
      organization_id: organizationId,
      product_id: productId,
      variant_id: variantId,
      location_id: locationId,
      is_available: true,
      low_stock_threshold: parseThreshold(thresholdValue),
    });
  };

  if (!allLocations) {
    Array.from(selectedLocationIds).forEach((locationId) => {
      pushRow(null, locationId, productLowStockThresholds[locationId]);
    });
  } else {
    Object.entries(productLowStockThresholds).forEach(
      ([locationId, threshold]) => {
        if (!threshold?.trim()) return;
        pushRow(null, locationId, threshold);
      }
    );
  }

  activeVariantIds.forEach((variantId) => {
    const config = variantLocations[variantId];
    if (!config || config.allLocations) return;
    config.selectedLocationIds.forEach((locationId) => {
      pushRow(
        variantId,
        locationId,
        config.lowStockThresholds?.[locationId]
      );
    });
  });

  if (!rows.length) return;

  const { error: insertError } = await supabase
    .from("product_location_settings")
    .insert(rows);
  if (insertError) throw insertError;
}

async function syncProductOptionSetLinks({
  supabase,
  organizationId,
  productId,
  optionSetIds,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  productId: string;
  optionSetIds: string[];
}) {
  const supabaseAny = supabase as any;
  const uniqueIds = Array.from(new Set(optionSetIds));

  const { data: currentRows, error: currentError } = await supabase
    .from("product_option_set_links")
    .select("option_set_id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId);
  if (currentError) throw currentError;

  const current = new Set(
    (currentRows ?? []).map((row: any) => row.option_set_id)
  );
  const next = new Set(uniqueIds);

  const toInsert = uniqueIds.filter((id) => !current.has(id));
  const toDelete = Array.from(current).filter((id) => !next.has(id));

  if (toInsert.length) {
    const rows = toInsert.map((optionSetId) => ({
      organization_id: organizationId,
      product_id: productId,
      option_set_id: optionSetId,
      sort_order: uniqueIds.indexOf(optionSetId) + 1,
    }));
    const { error } = await supabaseAny
      .from("product_option_set_links")
      .insert(rows);
    if (error) throw error;
  }

  if (toDelete.length) {
    const { error } = await supabase
      .from("product_option_set_links")
      .delete()
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .in("option_set_id", toDelete);
    if (error) throw error;
  }

  await Promise.all(
    uniqueIds.map((optionSetId, index) =>
      supabaseAny
        .from("product_option_set_links")
        .update({ sort_order: index + 1 })
        .eq("organization_id", organizationId)
        .eq("product_id", productId)
        .eq("option_set_id", optionSetId)
    )
  );
}

async function syncVariantOptions({
  supabase,
  organizationId,
  productId,
  rows,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  productId: string;
  rows: PersistableVariantOption[];
}) {
  const supabaseAny = supabase as any;

  const { data: currentRows, error: currentError } = await supabase
    .from("product_variant_options")
    .select("id, variant_id, option_set_id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId);
  if (currentError) throw currentError;

  if (rows.length) {
    const payload = rows.map((row) => ({
      organization_id: organizationId,
      product_id: productId,
      variant_id: row.variant_id,
      option_set_id: row.option_set_id,
      option_value_id: row.option_value_id,
    }));
    const { error } = await supabaseAny
      .from("product_variant_options")
      .upsert(payload, { onConflict: "variant_id,option_set_id" });
    if (error) throw error;
  }

  const nextKeys = new Set(
    rows.map((row) => `${row.variant_id}:${row.option_set_id}`)
  );
  const toDelete =
    currentRows
      ?.filter(
        (row: any) => !nextKeys.has(`${row.variant_id}:${row.option_set_id}`)
      )
      .map((row: any) => row.id) ?? [];

  if (toDelete.length) {
    const { error } = await supabase
      .from("product_variant_options")
      .delete()
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .in("id", toDelete);
    if (error) throw error;
  }
}

async function syncProductVariants({
  supabase,
  organizationId,
  productId,
  variants,
  deletedIds,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  productId: string;
  variants: PersistableVariant[];
  deletedIds: string[];
}) {
  const supabaseAny = supabase as any;

  if (variants.length) {
    const rows = variants.map((variant) => ({
      id: variant.id,
      organization_id: organizationId,
      product_id: productId,
      sku: variant.sku,
      gtin: variant.gtin,
      name: variant.name,
      image_url: null,
      weight_grams: variant.weight_grams,
      price: variant.price,
      is_active: variant.is_active,
      is_default: variant.is_default,
    }));

    const { error } = await supabaseAny
      .from("product_variants")
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  if (deletedIds.length) {
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .in("id", deletedIds);
    if (error) throw error;
  }
}

async function fetchVariantInventory(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<Record<string, VariantInventoryDraft[]>> {
  const { data, error } = await supabase
    .from("product_variant_batches")
    .select(
      "id, batch_code, expiration_date, quantity_units, unit_cost, warehouse_id, variant_id"
    )
    .eq("organization_id", organizationId)
    .eq("product_id", productId);

  if (error) throw error;

  const grouped: Record<string, VariantInventoryDraft[]> = {};

  (data ?? []).forEach((row: any) => {
    const variantId = row.variant_id as string;
    if (!grouped[variantId]) grouped[variantId] = [];
    grouped[variantId].push({
      id: row.id,
      variant_id: variantId,
      warehouse_id: row.warehouse_id ?? null,
      batch_code: row.batch_code ?? "",
      expiration_date: row.expiration_date,
      quantity_units:
        row.quantity_units != null ? String(row.quantity_units) : "",
      unit_cost: row.unit_cost != null ? String(row.unit_cost) : "",
    });
  });

  Object.keys(grouped).forEach((variantId) => {
    grouped[variantId] = sortInventoryDrafts(grouped[variantId]);
  });

  return grouped;
}

async function syncVariantInventory({
  supabase,
  organizationId,
  productId,
  persistableInventory,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  productId: string;
  persistableInventory: PersistableVariantInventory[];
}) {
  const supabaseAny = supabase as any;

  const { data: currentRows, error: currentError } = await supabase
    .from("product_variant_batches")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId);
  if (currentError) throw currentError;

  const currentIds = new Set((currentRows ?? []).map((row: any) => row.id));
  const nextIds = new Set(persistableInventory.map((row) => row.id));

  if (persistableInventory.length) {
    const rows = persistableInventory.map((row) => ({
      id: row.id,
      organization_id: organizationId,
      product_id: productId,
      variant_id: row.variant_id,
      warehouse_id: row.warehouse_id,
      batch_code: row.batch_code,
      expiration_date: row.expiration_date,
      quantity_units: row.quantity_units,
      unit_cost: row.unit_cost,
    }));

    const { error: upsertError } = await supabaseAny
      .from("product_variant_batches")
      .upsert(rows, { onConflict: "id" });
    if (upsertError) throw upsertError;
  }

  const toDelete = Array.from(currentIds).filter((id) => !nextIds.has(id));
  if (toDelete.length) {
    const { error: deleteError } = await supabase
      .from("product_variant_batches")
      .delete()
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .in("id", toDelete);
    if (deleteError) throw deleteError;
  }
}

 

type ProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (product: Product) => void;
  onDeleted: (productId: string) => void;
  organizationId?: string;
  product?: Product | null;
};

const RESTAURANT_BUSINESS_IDS = new Set([
  "restaurant",
  "restaurante",
  "cafe",
  "coffee_shop",
  "fast_food",
  "bar",
]);

const STORE_BUSINESS_IDS = new Set([
  "store",
  "supermarket",
  "boutique",
  "electronics",
  "hardware",
  "beauty",
  "convenience",
  "pharmacy",
  "clinic",
]);

const PHARMACY_BUSINESS_IDS = new Set(["pharmacy"]);

function isRestaurantCategory(cat: string): boolean {
  return cat ? RESTAURANT_BUSINESS_IDS.has(cat.toLowerCase()) : false;
}

function isStoreCategory(cat: string): boolean {
  return cat ? STORE_BUSINESS_IDS.has(cat.toLowerCase()) : false;
}

function isPharmacyCategory(cat: string): boolean {
  return cat ? PHARMACY_BUSINESS_IDS.has(cat.toLowerCase()) : false;
}

export function ProductModal({
  open,
  onClose,
  onSaved,
  onDeleted,
  organizationId,
  product,
}: ProductModalProps) {
  const supabase = getSupabaseBrowser();
  const supabaseAny = supabase as any;
  const isEdit = Boolean(product?.id);
  const { org } = useEnvironment();
  const businessCategory = (org?.business_category ?? "").toLowerCase();
  const isRestaurantBusiness = isRestaurantCategory(businessCategory);
  const isStoreBusiness = isStoreCategory(businessCategory);
  const isPharmacyBusiness = isPharmacyCategory(businessCategory);

  const [name, setName] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [description, setDescription] = useState("");
  const [preparationTime, setPreparationTime] = useState("");
  const [available, setAvailable] = useState(true);
  const [itemType, setItemType] = useState<ProductItemType>("physical");
  const [variants, setVariants] = useState<ProductVariantDraft[]>([]);
  const [variantEditorOpen, setVariantEditorOpen] = useState(false);
  const [variantEditorDraft, setVariantEditorDraft] =
    useState<ProductVariantDraft | null>(null);
  const [variantInventory, setVariantInventory] = useState<
    Record<string, VariantInventoryDraft[]>
  >({});
  const [inventoryModalVariantId, setInventoryModalVariantId] = useState<
    string | null
  >(null);

  const [priceIncludesTaxes, setPriceIncludesTaxes] = useState(false);
  const [ivaCategory, setIvaCategory] =
    useState<TaxIvaCategory>("NO_CAUSA");
  const [ivaRate, setIvaRate] = useState("0");
  const [incType, setIncType] = useState("NINGUNO");
  const [incRate, setIncRate] = useState("");
  const [incTypeOptions, setIncTypeOptions] = useState<string[]>(["NINGUNO"]);
  const incSelectOptions = useMemo(() => {
    const values = new Set(["NINGUNO", ...incTypeOptions]);
    return Array.from(values).sort((a, b) => {
      if (a === "NINGUNO") return -1;
      if (b === "NINGUNO") return 1;
      return a.localeCompare(b);
    });
  }, [incTypeOptions]);

  const [unspscCode, setUnspscCode] = useState("");
  const [dianTariffCode, setDianTariffCode] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [taxObservation, setTaxObservation] = useState("");
  const [showAdvancedTaxes, setShowAdvancedTaxes] = useState(false);

  const [minimumUnit, setMinimumUnit] = useState("");
  const [packagingUnit, setPackagingUnit] = useState("");
  const [contentUnit, setContentUnit] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("");

  const [fxAssetKind, setFxAssetKind] = useState<FxAssetKind>("currency");
  const [fxBaseCurrency, setFxBaseCurrency] = useState("USD");
  const [fxQuoteCurrency, setFxQuoteCurrency] = useState("COP");
  const [fxReferenceCode, setFxReferenceCode] = useState("");
  const [fxPricingMode, setFxPricingMode] = useState<FxPricingMode>("manual");
  const [fxReferencePrice, setFxReferencePrice] = useState("");
  const [fxBuyPrice, setFxBuyPrice] = useState("");
  const [fxSellPrice, setFxSellPrice] = useState("");
  const [fxBuyMarginBps, setFxBuyMarginBps] = useState("");
  const [fxSellMarginBps, setFxSellMarginBps] = useState("");
  const [fxQuantityPrecision, setFxQuantityPrecision] = useState("2");
  const [fxAutoPricing, setFxAutoPricing] = useState(false);
  const [fxQuoteUnit, setFxQuoteUnit] = useState("1");
  const [fxLastRateSource, setFxLastRateSource] = useState("");

  const [iumCode, setIumCode] = useState("");
  const [cumCode, setCumCode] = useState("");

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, [open]);
  const [invimaRecord, setInvimaRecord] = useState("");
  const [labName, setLabName] = useState("");
  const [activePrinciple, setActivePrinciple] = useState("");
  const [concentration, setConcentration] = useState("");
  const [manufacturerName, setManufacturerName] = useState("");
  const [manufacturerNit, setManufacturerNit] = useState("");
  const [storageTempMin, setStorageTempMin] = useState("");
  const [storageTempMax, setStorageTempMax] = useState("");

  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageUploadVariantId, setImageUploadVariantId] = useState<string>(
    PRODUCT_IMAGE_SCOPE
  );

  const [allCategories, setAllCategories] = useState<MiniCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [openCatDlg, setOpenCatDlg] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    { name: "General", fields: ["name", "itemType"] },
    { name: "Imágenes", fields: [] },
    { name: "Variantes", fields: ["name"] },
    { name: "Categoría", fields: [] },
    { name: "Impuestos", fields: [] },
    { name: "Disponibilidad", fields: [] },
  ];

  const canProceedToStep = (stepIndex: number) => {
    if (stepIndex <= currentStep) return true;
    if (stepIndex === 1) return name.trim().length > 0;
    if (stepIndex === 2) return name.trim().length > 0 && itemType;
    return true;
  };

  const goToStep = (stepIndex: number) => {
    if (canProceedToStep(stepIndex)) {
      setCurrentStep(stepIndex);
    } else {
      toast.error("Completa los campos requeridos en el paso actual");
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1 && canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    } else if (!canProceedToStep(currentStep + 1)) {
      toast.error("Completa los campos requeridos antes de continuar");
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const [allModifierSets, setAllModifierSets] = useState<MiniModifierSet[]>([]);
  const [selectedModifierSetIds, setSelectedModifierSetIds] = useState<
    string[]
  >([]);
  const [openModSetDlg, setOpenModSetDlg] = useState(false);
  const [allOptionSets, setAllOptionSets] = useState<OptionSetWithValues[]>([]);
  const [selectedOptionSetIds, setSelectedOptionSetIds] = useState<string[]>([]);
  const [optionLinksLoaded, setOptionLinksLoaded] = useState(false);
  const [openAddVariationsDlg, setOpenAddVariationsDlg] = useState(false);
  const optionSetIdsRef = useRef<string[]>([]);
  const imagesSectionRef = useRef<HTMLDivElement | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState(true);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(
    new Set()
  );
  const [productLowStockThresholds, setProductLowStockThresholds] = useState<
    Record<string, string>
  >({});
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [variantLocationMap, setVariantLocationMap] = useState<
    Record<string, VariantLocationConfig>
  >({});
  const [availabilityContext, setAvailabilityContext] = useState<{
    type: "product" | "variant";
    variantId?: string;
  }>({ type: "product" });

  const [openTypeDlg, setOpenTypeDlg] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showingDeleteToast, setShowingDeleteToast] = useState(false);

  const primaryImage =
    images.find((image) => image.is_primary) ?? images[0] ?? null;

  useEffect(() => {
    optionSetIdsRef.current = selectedOptionSetIds;
  }, [selectedOptionSetIds]);

  useEffect(() => {
    setVariants((prev) =>
      prev.map((variant) => {
        const nextOptions = buildVariantOptionsMap(
          selectedOptionSetIds,
          variant.options
        );
        const currentOptions = variant.options ?? {};
        const nextKeys = Object.keys(nextOptions);
        const currentKeys = Object.keys(currentOptions);
        const changed =
          nextKeys.length !== currentKeys.length ||
          nextKeys.some((key) => nextOptions[key] !== currentOptions[key]);
        return changed ? { ...variant, options: nextOptions } : variant;
      })
    );
  }, [selectedOptionSetIds]);

  useEffect(() => {
    setVariantLocationMap((prev) => {
      let changed = false;
      const next: Record<string, VariantLocationConfig> = {};

      Object.entries(prev).forEach(([variantId, config]) => {
        next[variantId] = {
          allLocations: config.allLocations,
          selectedLocationIds: new Set(config.selectedLocationIds),
          lowStockThresholds: { ...config.lowStockThresholds },
        };
      });

      variants.forEach((variant) => {
        if (!next[variant.id]) {
          next[variant.id] = {
            allLocations: true,
            selectedLocationIds: new Set(),
            lowStockThresholds: {},
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [variants]);

  useEffect(() => {
    if (
      imageUploadVariantId !== PRODUCT_IMAGE_SCOPE &&
      !variants.some((variant) => variant.id === imageUploadVariantId)
    ) {
      setImageUploadVariantId(PRODUCT_IMAGE_SCOPE);
    }
  }, [imageUploadVariantId, variants]);

  const resetState = () => {
    setName("");
    setDescription("");
    setPreparationTime("");
    setAvailable(true);
    setItemType("physical");

    const defaultVariant = createVariantDraft({
      isDefault: true,
      name: "Variante principal",
    });
    setVariants([defaultVariant]);
    setVariantEditorDraft(null);
    setVariantInventory({ [defaultVariant.id]: [] });
    setInventoryModalVariantId(null);

    setPriceIncludesTaxes(false);
    setIvaCategory("NO_CAUSA");
    setIvaRate("0");
    setIncType("NINGUNO");
    setIncRate("");
    setShowAdvancedTaxes(false);

    setUnspscCode("");
    setDianTariffCode("");
    setUnitCode("");
    setTaxObservation("");

    setMinimumUnit("");
    setPackagingUnit("");
    setContentUnit("");
    setMeasurementUnit("");
    setFxAssetKind("currency");
    setFxBaseCurrency("USD");
    setFxQuoteCurrency("COP");
    setFxReferenceCode("");
    setFxPricingMode("manual");
    setFxReferencePrice("");
    setFxBuyPrice("");
    setFxSellPrice("");
    setFxBuyMarginBps("");
    setFxSellMarginBps("");
    setFxQuantityPrecision("2");
    setFxAutoPricing(false);
    setFxQuoteUnit("1");
    setFxLastRateSource("");

    setIumCode("");
    setCumCode("");
    setInvimaRecord("");
    setLabName("");
    setActivePrinciple("");
    setConcentration("");
    setManufacturerName("");
    setManufacturerNit("");
    setStorageTempMin("");
    setStorageTempMax("");

    setImages([]);
    setSelectedCategoryIds([]);
    setSelectedModifierSetIds([]);
    setSelectedOptionSetIds([]);
    setAllLocations(true);
    setSelectedLocationIds(new Set());
    setProductLowStockThresholds({});
    setVariantLocationMap({});
    setAvailabilityModalOpen(false);
    setAvailabilityContext({ type: "product" });
    setImageUploadVariantId(PRODUCT_IMAGE_SCOPE);
    setOptionLinksLoaded(false);
    setOpenAddVariationsDlg(false);
    setShowingDeleteToast(false);
  };

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setPreparationTime(
      product?.preparation_time_minutes != null
        ? String(product.preparation_time_minutes)
        : ""
    );
    setAvailable(product?.is_available ?? true);
    setItemType(product?.item_type ?? "physical");

    setPriceIncludesTaxes(product?.price_includes_taxes ?? false);
    const nextIvaCategory = product?.iva_category ?? "NO_CAUSA";
    setIvaCategory(nextIvaCategory);
    setIvaRate(
      product?.iva_rate != null
        ? String(product.iva_rate)
        : nextIvaCategory === "GRAVADO"
        ? "19"
        : "0"
    );
    setIncType(product?.inc_type ?? "NINGUNO");
    setIncRate(product?.inc_rate != null ? String(product.inc_rate) : "");

    setUnspscCode(product?.unspsc_code ?? "");
    setDianTariffCode(product?.dian_tariff_code ?? "");
    setUnitCode(product?.unit_code ?? "");
    setTaxObservation(product?.tax_observation ?? "");
    setShowAdvancedTaxes(
      Boolean(
        product?.unspsc_code ||
          product?.dian_tariff_code ||
          product?.unit_code ||
          product?.tax_observation
      )
    );

    setMinimumUnit(product?.minimum_unit ?? "");
    setPackagingUnit(product?.packaging_unit ?? "");
    setContentUnit(product?.content_unit ?? "");
    setMeasurementUnit(product?.measurement_unit ?? "");

    setFxAssetKind((product?.fx_asset_kind as FxAssetKind | null) ?? "currency");
    setFxBaseCurrency(
      product?.fx_base_currency && product.fx_base_currency.trim()
        ? product.fx_base_currency.toUpperCase()
        : "USD"
    );
    setFxQuoteCurrency(
      product?.fx_quote_currency && product.fx_quote_currency.trim()
        ? product.fx_quote_currency.toUpperCase()
        : "COP"
    );
    setFxReferenceCode(product?.fx_reference_code ?? "");
    setFxPricingMode((product?.fx_pricing_mode as FxPricingMode | null) ?? "manual");
    setFxReferencePrice(
      product?.fx_reference_price != null ? String(product.fx_reference_price) : ""
    );
    setFxBuyPrice(product?.fx_buy_price != null ? String(product.fx_buy_price) : "");
    setFxSellPrice(product?.fx_sell_price != null ? String(product.fx_sell_price) : "");
    setFxBuyMarginBps(
      product?.fx_buy_margin_bps != null ? String(product.fx_buy_margin_bps) : ""
    );
    setFxSellMarginBps(
      product?.fx_sell_margin_bps != null ? String(product.fx_sell_margin_bps) : ""
    );
    setFxQuantityPrecision(
      product?.fx_quantity_precision != null ? String(product.fx_quantity_precision) : "2"
    );
    setFxAutoPricing(Boolean(product?.fx_auto_pricing));
    setFxQuoteUnit(
      product?.fx_quote_unit != null ? String(product.fx_quote_unit) : "1"
    );
    setFxLastRateSource(product?.fx_last_rate_source ?? "");

    setIumCode(product?.ium_code ?? "");
    setCumCode(product?.cum_code ?? "");
    setInvimaRecord(product?.invima_record ?? "");
    setLabName(product?.lab_name ?? "");
    setActivePrinciple(product?.active_principle ?? "");
    setConcentration(product?.concentration ?? "");
    setManufacturerName(product?.manufacturer_name ?? "");
    setManufacturerNit(product?.manufacturer_nit ?? "");
    setStorageTempMin(
      product?.storage_temp_min != null ? String(product.storage_temp_min) : ""
    );
    setStorageTempMax(
      product?.storage_temp_max != null ? String(product.storage_temp_max) : ""
    );
    if (!product?.id || !organizationId || !optionLinksLoaded) {
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const [
          { data, error },
          { data: optionRows, error: optionError },
          inventoryMap,
        ] = await Promise.all([
          supabase
            .from("product_variants")
            .select(
              "id, name, sku, gtin, price, weight_grams, is_active, is_default"
            )
            .eq("organization_id", organizationId)
            .eq("product_id", product.id)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: true }),
          supabase
            .from("product_variant_options")
            .select("variant_id, option_set_id, option_value_id")
            .eq("organization_id", organizationId)
            .eq("product_id", product.id),
          fetchVariantInventory(supabase, organizationId, product.id),
        ]);
        if (error) throw error;
        if (optionError) throw optionError;

        const optionSetIdsSnapshot = optionSetIdsRef.current ?? [];
        const optionMap: Record<string, Record<string, string | null>> = {};
        (optionRows ?? []).forEach((row: any) => {
          const variantId = row.variant_id as string;
          if (!optionMap[variantId]) optionMap[variantId] = {};
          optionMap[variantId][row.option_set_id as string] =
            row.option_value_id as string;
        });

        const drafts =
          data?.map((row: any) =>
            createVariantDraft({
              id: row.id,
              name: row.name ?? "",
              sku: row.sku ?? "",
              gtin: row.gtin ?? "",
              price: row.price != null ? String(row.price) : "",
              weight_grams:
                row.weight_grams != null ? String(row.weight_grams) : "",
              isActive: row.is_active,
              isDefault: row.is_default,
              isNew: false,
              markedForDeletion: false,
              options: buildVariantOptionsMap(
                optionSetIdsSnapshot,
                optionMap[row.id]
              ),
            })
          ) ?? [];

        const normalized = ensureDefaultVariant(
          drafts.length
            ? drafts
            : [
                createVariantDraft({
                  id: uuid(),
                  name: product.name ?? "Variante principal",
                  isDefault: true,
                  isActive: true,
                  isNew: false,
                  options: buildVariantOptionsMap(optionSetIdsSnapshot),
                }),
              ]
        );

        if (!isMounted) return;

        const normalizedInventory: Record<string, VariantInventoryDraft[]> = {};
        normalized.forEach((variant) => {
          normalizedInventory[variant.id] = inventoryMap[variant.id]
            ? sortInventoryDrafts(
                inventoryMap[variant.id].map((row) => ({
                  ...row,
                  variant_id: variant.id,
                }))
              )
            : [];
        });

        setVariants(normalized);
        setVariantInventory(normalizedInventory);
      } catch (error: any) {
        if (isMounted) {
          toast.error(
            error?.message || "No se pudieron cargar las variantes del producto."
          );
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, product, organizationId, supabase, optionLinksLoaded]);

  useEffect(() => {
    if (!open) return;
    setOptionLinksLoaded(!product?.id);
  }, [open, product?.id]);

  useEffect(() => {
    if (!open || !organizationId) {
      setLocations([]);
      return;
    }

    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        toast.error(error.message);
        return;
      }

      setLocations((data ?? []) as Location[]);
    })().catch((error: any) => {
      if (!active) return;
      toast.error(error?.message || "No se pudieron cargar las ubicaciones");
    });

    return () => {
      active = false;
    };
  }, [open, organizationId, supabase]);

  useEffect(() => {
    if (!organizationId) {
      setWarehouses([]);
      return;
    }

    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, location_id, locations(name)")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (!active) return;
      if (error) {
        toast.error(error.message);
        setWarehouses([]);
        return;
      }
      const items: WarehouseOption[] =
        (data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name ?? "Bodega sin nombre",
          locationName: row.locations?.name ?? null,
        })) ?? [];
      setWarehouses(items);
    })().catch((error: any) => {
      if (!active) return;
      toast.error(error?.message || "No se pudieron cargar las bodegas");
    });

    return () => {
      active = false;
    };
  }, [organizationId, supabase]);

  useEffect(() => {
    if (!open || !organizationId || !product?.id) {
      setImages([]);
      return;
    }

    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select(
          "id, product_id, organization_id, variant_id, url, storage_path, is_primary, sort_order, created_at"
        )
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!active) return;

      if (error) {
        toast.error(error.message);
      } else {
        setImages((data ?? []) as ProductImage[]);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, organizationId, product?.id, supabase]);

  useEffect(() => {
    if (!open || !organizationId) {
      return;
    }

    if (!product?.id) {
      setSelectedCategoryIds([]);
      setSelectedModifierSetIds([]);
      setAllLocations(true);
      setSelectedLocationIds(new Set());
      return;
    }

    let active = true;

    (async () => {
      try {
        const [
          { data: categoryRows, error: categoryError },
          { data: modifierRows, error: modifierError },
          { data: locationRows, error: locationError },
          { data: optionLinkRows, error: optionLinkError },
        ] = await Promise.all([
          supabase
            .from("product_category_products")
            .select("category_id")
            .eq("organization_id", organizationId)
            .eq("product_id", product.id),
          supabaseAny
            .from("product_modifier_sets")
            .select("modifier_set_id")
            .eq("organization_id", organizationId)
            .eq("product_id", product.id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("product_location_settings")
            .select("location_id, is_available, variant_id, low_stock_threshold")
            .eq("organization_id", organizationId)
            .eq("product_id", product.id),
          supabase
            .from("product_option_set_links")
            .select("option_set_id, sort_order")
            .eq("organization_id", organizationId)
            .eq("product_id", product.id)
            .order("sort_order", { ascending: true }),
        ]);

        if (!active) return;

        if (categoryError) toast.error(categoryError.message);
        if (categoryRows) {
          setSelectedCategoryIds(
            (categoryRows as any[]).map((row) => row.category_id)
          );
        }

        if (modifierError) toast.error(modifierError.message);
        if (modifierRows) {
          const unique = Array.from(
            new Set((modifierRows as any[]).map((row) => row.modifier_set_id))
          );
          setSelectedModifierSetIds(unique);
        }

        if (optionLinkError) {
          toast.error(optionLinkError.message);
        }
        if (optionLinkRows) {
          const ordered = (optionLinkRows as any[])
            .sort(
              (a, b) =>
                (a.sort_order ?? 0) - (b.sort_order ?? 0)
            )
            .map((row) => row.option_set_id as string);
          setSelectedOptionSetIds(Array.from(new Set(ordered)));
        }

        if (locationError) {
          toast.error(locationError.message);
          setAllLocations(true);
          setSelectedLocationIds(new Set());
          setProductLowStockThresholds({});
          setVariantLocationMap({});
        } else if (locationRows && locationRows.length > 0) {
          const productRows = (locationRows as any[]).filter(
            (row) => !row.variant_id
          );
          if (productRows.length) {
            const enabled = productRows.filter(
              (row) => row.is_available !== false
            );
            setAllLocations(false);
            setSelectedLocationIds(
              new Set(enabled.map((row) => row.location_id as string))
            );
            const thresholds: Record<string, string> = {};
            productRows.forEach((row) => {
              if (row.low_stock_threshold != null) {
                thresholds[row.location_id as string] = String(
                  row.low_stock_threshold
                );
              }
            });
            setProductLowStockThresholds(thresholds);
          } else {
            setAllLocations(true);
            setSelectedLocationIds(new Set());
            const thresholds: Record<string, string> = {};
            (locationRows as any[])
              .filter((row) => !row.variant_id && row.low_stock_threshold != null)
              .forEach((row) => {
                thresholds[row.location_id as string] = String(
                  row.low_stock_threshold
                );
              });
            setProductLowStockThresholds(thresholds);
          }

          const variantRows = (locationRows as any[]).filter(
            (row) => row.variant_id
          );
          if (variantRows.length) {
            const variantConfigs: Record<string, VariantLocationConfig> = {};
            variantRows.forEach((row) => {
              const variantId = row.variant_id as string;
              if (!variantConfigs[variantId]) {
                variantConfigs[variantId] = {
                  allLocations: false,
                  selectedLocationIds: new Set<string>(),
                  lowStockThresholds: {},
                };
              }
              if (row.is_available !== false) {
                variantConfigs[variantId].selectedLocationIds.add(
                  row.location_id as string
                );
              }
              if (row.low_stock_threshold != null) {
                variantConfigs[variantId].lowStockThresholds[row.location_id as string] =
                  String(row.low_stock_threshold);
              }
            });
            const next: Record<string, VariantLocationConfig> = {};
            Object.entries(variantConfigs).forEach(([variantId, config]) => {
              next[variantId] = {
                allLocations: false,
                selectedLocationIds: new Set(config.selectedLocationIds),
                lowStockThresholds: { ...config.lowStockThresholds },
              };
            });
            setVariantLocationMap(next);
          } else {
            setVariantLocationMap({});
          }
        } else {
          setAllLocations(true);
          setSelectedLocationIds(new Set());
          setProductLowStockThresholds({});
          setVariantLocationMap({});
        }
      } catch (error: any) {
        toast.error(error?.message || "No se pudo cargar la información.");
      } finally {
        if (active) {
          setOptionLinksLoaded(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [open, organizationId, product?.id, supabase, supabaseAny]);

  useEffect(() => {
    if (!organizationId) return;

    (async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (!error && data) setAllCategories(data as MiniCategory[]);
    })();
  }, [organizationId, supabase]);

  useEffect(() => {
    if (!organizationId) return;

    (async () => {
      const { data, error } = await supabase
        .from("modifier_sets")
        .select(
          "id, name, display_name, require_selection, min_selections, max_selections, is_active"
        )
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (!error && data) setAllModifierSets(data as MiniModifierSet[]);
    })();
  }, [organizationId, supabase]);

  useEffect(() => {
    if (!organizationId) {
      setAllOptionSets([]);
      return;
    }

    let active = true;

    (async () => {
      try {
        const { data: sets, error: setsError } = await supabase
          .from("option_sets")
          .select("id, organization_id, name, display_name")
          .eq("organization_id", organizationId)
          .order("name", { ascending: true });
        if (setsError) throw setsError;

        const ids = (sets ?? []).map((set: any) => set.id);
        let optionRows: any[] = [];
        if (ids.length) {
          const { data: rows, error: optionError } = await supabase
            .from("options")
            .select("id, option_set_id, name, display_name, sort_order")
            .in("option_set_id", ids)
            .order("sort_order", { ascending: true });
          if (optionError) throw optionError;
          optionRows = rows ?? [];
        }

        if (!active) return;

        const grouped = new Map<string, OptionValue[]>();
        optionRows.forEach((row: any) => {
          const list = grouped.get(row.option_set_id) ?? [];
          list.push({
            id: row.id,
            option_set_id: row.option_set_id,
            name: row.name,
            display_name: row.display_name,
          });
          grouped.set(row.option_set_id, list);
        });

        const enriched: OptionSetWithValues[] = (sets ?? []).map((set: any) => ({
          id: set.id,
          organization_id: set.organization_id,
          name: set.name,
          display_name: set.display_name,
          options: grouped.get(set.id) ?? [],
        }));

        setAllOptionSets(enriched);
      } catch (error: any) {
        if (active) {
          toast.error(
            error?.message ||
              "No se pudieron cargar las listas de opciones disponibles."
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [organizationId, supabase]);

  useEffect(() => {
    if (!open || !organizationId) return;

    (async () => {
      const values = new Set<string>(["NINGUNO"]);
      if (product?.inc_type) values.add(product.inc_type);

      const { data, error } = await supabase
        .from("products")
        .select("inc_type")
        .eq("organization_id", organizationId)
        .not("inc_type", "is", null)
        .limit(200);

      if (!error && data) {
        data.forEach((row: any) => {
          if (row.inc_type) values.add(row.inc_type);
        });
      }

      setIncTypeOptions(Array.from(values));
    })();
  }, [open, organizationId, product?.inc_type, supabase]);

  const handleFileInput = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !organizationId) return;
    for (const file of files) {
      const validationError = getImageValidationError(file);
      if (validationError) {
        toast.error(validationError);
        event.target.value = "";
        return;
      }
    }
    const uploadVariantId =
      imageUploadVariantId === PRODUCT_IMAGE_SCOPE
        ? null
        : imageUploadVariantId;

    try {
      setUploading(true);
      const uploads: ProductImage[] = [];

      for (const file of files) {
        const ext = getImageExt(file);
        const path = `${organizationId}/products/${
          product?.id ?? "_new"
        }/${uuid()}.${ext}`;

        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, file, {
            upsert: false,
            cacheControl: "3600",
            contentType: file.type || undefined,
          });
        if (error) throw error;

        const { data: publicData } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);

        const url = publicData?.publicUrl as string;

        if (isEdit && product?.id) {
          const { data: inserted, error: insertError } = await supabase
            .from("product_images")
            .insert([
              {
                product_id: product.id,
                organization_id: organizationId,
                variant_id: uploadVariantId,
                url,
                storage_path: path,
                is_primary: images.length === 0 && uploads.length === 0,
                sort_order: (images[images.length - 1]?.sort_order ?? 0) + 1,
              },
            ])
            .select("*")
            .single();
          if (insertError) throw insertError;
          uploads.push(inserted as ProductImage);
        } else {
          uploads.push({
            id: uuid(),
            product_id: null,
            variant_id: uploadVariantId,
            organization_id: organizationId,
            url,
            storage_path: path,
            is_primary: images.length === 0 && uploads.length === 0,
            sort_order:
              (images[images.length - 1]?.sort_order ?? 0) + uploads.length + 1,
          });
        }
      }

      setImages((prev) => [...prev, ...uploads]);
      toast.success(`${uploads.length} imagen(es) cargada(s)`);
    } catch (error: any) {
      toast.error(error?.message || "Error subiendo imágenes");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveImage = async (image: ProductImage) => {
    try {
      if (image.product_id && isEdit) {
        const { error } = await supabase
          .from("product_images")
          .delete()
          .eq("id", image.id);
        if (error) throw error;
      }

      await supabase.storage
        .from("product-images")
        .remove([image.storage_path]);

      setImages((prev) => {
        const next = prev.filter((item) => item.id !== image.id);
        if (!next.some((item) => item.is_primary) && next[0]) {
          next[0].is_primary = true;
        }
        return [...next];
      });
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar la imagen");
    }
  };

  const handleMakePrimary = (imageId: string) => {
    setImages((prev) =>
      prev.map((item) => ({
        ...item,
        is_primary: item.id === imageId,
      }))
    );
  };

  const handleImageVariantChange = async (
    image: ProductImage,
    value: string
  ) => {
    const nextVariantId =
      value === PRODUCT_IMAGE_SCOPE ? null : value;
    if (image.variant_id === nextVariantId) return;

    const previousVariantId = image.variant_id;
    setImages((prev) =>
      prev.map((item) =>
        item.id === image.id ? { ...item, variant_id: nextVariantId } : item
      )
    );

    if (isEdit && image.product_id) {
      try {
        const { error } = await supabase
          .from("product_images")
          .update({ variant_id: nextVariantId })
          .eq("id", image.id);
        if (error) throw error;
      } catch (error: any) {
        toast.error(error?.message || "No se pudo actualizar la imagen.");
        setImages((prev) =>
          prev.map((item) =>
            item.id === image.id
              ? { ...item, variant_id: previousVariantId }
              : item
          )
        );
      }
    }
  };

  const handleAssignVariantImage = (variantId: string) => {
    setImageUploadVariantId(variantId);
    imagesSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleAddVariantClick = () => {
    const draft = createVariantDraft({
      name: name.trim() ? `${name.trim()} (variante)` : "Nueva variante",
      isDefault: variants.every((variant) => variant.markedForDeletion),
      options: buildVariantOptionsMap(optionSetIdsRef.current),
    });
    setVariantEditorDraft(draft);
    setVariantEditorOpen(true);
  };

  const handleEditVariantClick = (variantId: string) => {
    const draft = variants.find((variant) => variant.id === variantId);
    if (!draft) return;
    setVariantEditorDraft(draft);
    setVariantEditorOpen(true);
  };

  const handleVariantDialogClose = () => {
    setVariantEditorOpen(false);
    setVariantEditorDraft(null);
  };

  const handleOpenBulkVariants = () => {
    if (!allOptionSets.length) {
      toast.error(
        "Crea listas de opciones desde Inventario → Opciones antes de continuar."
      );
      return;
    }
    setOpenAddVariationsDlg(true);
  };

  const handleVariantSave = (draft: ProductVariantDraft) => {
    setVariants((prev) => {
      const exists = prev.some((variant) => variant.id === draft.id);
      const next = exists
        ? prev.map((variant) => (variant.id === draft.id ? draft : variant))
        : [...prev, draft];
      return ensureDefaultVariant(
        next,
        draft.isDefault ? draft.id : undefined
      );
    });
    setVariantInventory((prev) => {
      if (prev[draft.id]) return prev;
      return { ...prev, [draft.id]: [] };
    });
  };

  const handleApplyVariantSets = (sets: VariationSetDraft[]) => {
    const normalized = sets
      .filter(
        (set): set is VariationSetDraft & { optionSetId: string } =>
          Boolean(set.optionSetId && set.selectedOptionIds.length)
      )
      .map((set) => ({
        ...set,
        optionSetId: set.optionSetId!,
        selectedOptionIds: Array.from(new Set(set.selectedOptionIds)),
      }));

    if (!normalized.length) return;

    const orderedSetIds = normalized.map((set) => set.optionSetId);
    const optionLookup = new Map(
      allOptionSets.map((set) => [set.id, set] as const)
    );

    const combos = buildCombinations(
      normalized.map((set) => ({
        optionSetId: set.optionSetId,
        optionIds: set.selectedOptionIds,
      })),
      optionLookup
    );

    if (!combos.length) return;

    let nextVariantsSnapshot: ProductVariantDraft[] = [];
    setSelectedOptionSetIds(orderedSetIds);

    setVariants((prev) => {
      const existingByKey = new Map<string, ProductVariantDraft>();
      prev.forEach((variant) => {
        const key = buildVariantKey(orderedSetIds, variant.options);
        if (key) {
          existingByKey.set(key, variant);
        }
      });

      const comboVariants = combos.map((combo, index) => {
        const mappedOptions = buildVariantOptionsMap(
          orderedSetIds,
          combo.mapping
        );
        const existing =
          combo.key && existingByKey.has(combo.key)
            ? existingByKey.get(combo.key)
            : null;
        if (existing) {
          return {
            ...existing,
            options: mappedOptions,
            name: existing.name || combo.labels.join(", "),
            markedForDeletion: false,
          };
        }
        return createVariantDraft({
          name: combo.labels.join(", ") || `Variante ${index + 1}`,
          options: mappedOptions,
        });
      });

      const manualVariants = prev.filter(
        (variant) => !buildVariantKey(orderedSetIds, variant.options)
      );

      nextVariantsSnapshot = ensureDefaultVariant([
        ...comboVariants,
        ...manualVariants,
      ]);

      return nextVariantsSnapshot;
    });

    setVariantInventory((prev) => {
      const next: Record<string, VariantInventoryDraft[]> = {};
      nextVariantsSnapshot.forEach((variant) => {
        next[variant.id] = prev[variant.id] ? [...prev[variant.id]] : [];
      });
      return next;
    });
  };

  const handleSetDefaultVariant = (variantId: string) => {
    setVariants((prev) => ensureDefaultVariant(prev, variantId));
  };

  const handleToggleVariantActive = (variantId: string) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? { ...variant, isActive: !variant.isActive }
          : variant
      )
    );
  };

  const handleToggleVariantDeletion = (variantId: string) => {
    setVariants((prev) =>
      ensureDefaultVariant(
        prev.map((variant) =>
          variant.id === variantId
            ? { ...variant, markedForDeletion: !variant.markedForDeletion }
            : variant
        )
      )
    );
  };
  const openProductLocations = () => {
    setAvailabilityContext({ type: "product" });
    setAvailabilityModalOpen(true);
  };
  const openVariantLocations = (variantId: string) => {
    setAvailabilityContext({ type: "variant", variantId });
    setAvailabilityModalOpen(true);
  };
  const handleAvailabilityModalSave = (config: AvailabilityConfig) => {
    if (availabilityContext.type === "variant" && availabilityContext.variantId) {
      const variantId = availabilityContext.variantId;
      setVariantLocationMap((prev) => ({
        ...prev,
        [variantId]: {
          allLocations: config.allLocations,
          selectedLocationIds: config.allLocations
            ? new Set()
            : new Set(config.selectedLocationIds),
          lowStockThresholds: { ...config.lowStockThresholds },
        },
      }));
    } else {
      setAllLocations(config.allLocations);
      setSelectedLocationIds(
        config.allLocations ? new Set() : new Set(config.selectedLocationIds)
      );
      setProductLowStockThresholds({ ...config.lowStockThresholds });
    }
    setAvailabilityModalOpen(false);
  };

  const handleAddInventoryRow = (variantId: string) => {
    setVariantInventory((prev) => {
      const next = { ...prev };
      const current = next[variantId] ? [...next[variantId]] : [];
      current.push({
        ...EMPTY_INVENTORY_ROW,
        id: uuid(),
        variant_id: variantId,
      });
      next[variantId] = sortInventoryDrafts(current);
      return next;
    });
  };

  const handleInventoryRowChange = (
    variantId: string,
    rowId: string,
    field: keyof VariantInventoryDraft,
    value: string
  ) => {
    setVariantInventory((prev) => {
      const next = { ...prev };
      const rows = next[variantId] ?? [];
      next[variantId] = sortInventoryDrafts(
        rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                [field]:
                  field === "expiration_date"
                    ? value || null
                    : field === "warehouse_id"
                    ? value || null
                    : value,
              }
            : row
        )
      );
      return next;
    });
  };

  const handleRemoveInventoryRow = (variantId: string, rowId: string) => {
    setVariantInventory((prev) => {
      const next = { ...prev };
      next[variantId] = (next[variantId] ?? []).filter(
        (row) => row.id !== rowId
      );
      return next;
    });
  };
  const handleOpenInventoryModal = (variantId: string) => {
    setInventoryModalVariantId(variantId);
  };

  const validateNumbers = () => {
    const parsedIva = ivaCategory === "GRAVADO" ? Number(ivaRate || 0) : 0;
    if (Number.isNaN(parsedIva) || parsedIva < 0 || parsedIva > 100) {
      throw new Error("La tarifa de IVA debe estar entre 0% y 100%.");
    }

    const normalizedPreparationTime =
      isRestaurantBusiness && preparationTime.trim() !== ""
        ? Number(preparationTime)
        : null;
    if (
      normalizedPreparationTime != null &&
      (Number.isNaN(normalizedPreparationTime) ||
        normalizedPreparationTime < 0 ||
        !Number.isFinite(normalizedPreparationTime))
    ) {
      throw new Error("El tiempo de preparación debe ser un número no negativo.");
    }

    const normalizedIncType =
      incType && incType.trim() ? incType.trim() : "NINGUNO";
    const normalizedIncRate =
      normalizedIncType !== "NINGUNO" ? Number(incRate || 0) : null;
    if (normalizedIncType !== "NINGUNO") {
      if (
        normalizedIncRate == null ||
        Number.isNaN(normalizedIncRate) ||
        normalizedIncRate <= 0 ||
        normalizedIncRate > 100
      ) {
        throw new Error("La tarifa de INC debe estar entre 0% y 100%.");
      }
    }

    const parsedStorageMin =
      storageTempMin.trim() !== "" ? Number(storageTempMin) : null;
    const parsedStorageMax =
      storageTempMax.trim() !== "" ? Number(storageTempMax) : null;

    if (
      storageTempMin.trim() !== "" &&
      (parsedStorageMin == null || Number.isNaN(parsedStorageMin))
    ) {
      throw new Error("La temperatura mínima debe ser un número válido.");
    }

    if (
      storageTempMax.trim() !== "" &&
      (parsedStorageMax == null || Number.isNaN(parsedStorageMax))
    ) {
      throw new Error("La temperatura máxima debe ser un número válido.");
    }

    if (
      parsedStorageMin != null &&
      parsedStorageMax != null &&
      parsedStorageMin > parsedStorageMax
    ) {
      throw new Error(
        "La temperatura mínima no puede ser mayor a la temperatura máxima."
      );
    }

    let fxValues:
      | {
          assetKind: FxAssetKind;
          baseCurrency: string;
          quoteCurrency: string;
          referenceCode: string | null;
          pricingMode: FxPricingMode;
          referencePrice: number | null;
          buyPrice: number;
          sellPrice: number;
          buyMarginBps: number | null;
          sellMarginBps: number | null;
          quantityPrecision: number;
          quoteUnit: number;
          autoPricing: boolean;
          lastRateSource: string | null;
        }
      | null = null;

    if (itemType === "foreign_exchange_asset") {
      const baseCurrency = fxBaseCurrency.trim().toUpperCase();
      if (!baseCurrency) {
        throw new Error("Define la divisa base del activo.");
      }

      const quoteCurrency = fxQuoteCurrency.trim().toUpperCase();
      if (!quoteCurrency) {
        throw new Error("Define la divisa en la que cotizas el activo.");
      }

      const buyPrice = Number(fxBuyPrice);
      if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
        throw new Error("El precio de compra debe ser mayor a cero.");
      }

      const sellPrice = Number(fxSellPrice);
      if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
        throw new Error("El precio de venta debe ser mayor a cero.");
      }

      const referencePrice =
        fxReferencePrice.trim() !== "" ? Number(fxReferencePrice) : null;
      if (
        referencePrice != null &&
        (!Number.isFinite(referencePrice) || referencePrice <= 0)
      ) {
        throw new Error("El precio de referencia debe ser mayor a cero.");
      }

      const buyMargin = fxBuyMarginBps.trim() !== "" ? Number(fxBuyMarginBps) : null;
      if (buyMargin != null && Number.isNaN(buyMargin)) {
        throw new Error("El margen de compra debe ser un número válido.");
      }

      const sellMargin =
        fxSellMarginBps.trim() !== "" ? Number(fxSellMarginBps) : null;
      if (sellMargin != null && Number.isNaN(sellMargin)) {
        throw new Error("El margen de venta debe ser un número válido.");
      }

      const quantityPrecision =
        fxQuantityPrecision.trim() !== "" ? Number(fxQuantityPrecision) : 2;
      if (
        !Number.isInteger(quantityPrecision) ||
        quantityPrecision < 0 ||
        quantityPrecision > 6
      ) {
        throw new Error("Los decimales permitidos deben estar entre 0 y 6.");
      }

      const quoteUnit = fxQuoteUnit.trim() !== "" ? Number(fxQuoteUnit) : 1;
      if (!Number.isFinite(quoteUnit) || quoteUnit <= 0) {
        throw new Error("La unidad de cotización debe ser mayor a cero.");
      }

      const referenceCode = fxReferenceCode.trim().toUpperCase() || null;
      const lastRateSource = fxLastRateSource.trim() || null;

      fxValues = {
        assetKind: fxAssetKind,
        baseCurrency,
        quoteCurrency,
        referenceCode,
        pricingMode: fxPricingMode,
        referencePrice,
        buyPrice,
        sellPrice,
        buyMarginBps: buyMargin,
        sellMarginBps: sellMargin,
        quantityPrecision,
        quoteUnit,
        autoPricing: fxAutoPricing,
        lastRateSource,
      };
    }

    return {
      parsedIva,
      normalizedPreparationTime,
      normalizedIncType,
      normalizedIncRate,
      parsedStorageMin,
      parsedStorageMax,
      fxValues,
    };
  };

  const confirmDelete = async () => {
    if (!product?.id || !organizationId) return;

    try {
      setDeleting(true);

      if (images.length) {
        const storagePaths = images.map((img) => img.storage_path);
        await supabase.storage.from("product-images").remove(storagePaths);
        await supabase
          .from("product_images")
          .delete()
          .eq("product_id", product.id);
      }

      await supabase
        .from("product_category_products")
        .delete()
        .eq("product_id", product.id);

      await supabaseAny
        .from("product_modifier_sets")
        .delete()
        .eq("product_id", product.id);

      await supabase
        .from("product_batch_items")
        .delete()
        .eq("product_id", product.id);

      await supabase
        .from("product_variant_batches")
        .delete()
        .eq("product_id", product.id);

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);
      if (error) throw error;

      onDeleted(product.id);
      toast.success("Producto eliminado");
    } catch (error: any) {
      toast.error(error?.message || "Error eliminando el producto");
      throw error;
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    if (showingDeleteToast || deleting || !product) return;

    setShowingDeleteToast(true);
    toast(
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-base font-medium">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          ¿Eliminar producto?
        </div>
        <p className="text-sm text-muted-foreground">
          El producto <strong>{product.name}</strong> será eliminado
          permanentemente.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowingDeleteToast(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={async () => {
              toast.dismiss();
              setShowingDeleteToast(false);
              onClose();
              await toast.promise(confirmDelete(), {
                loading: "Eliminando producto...",
                success: "Producto eliminado exitosamente",
                error: "Error eliminando el producto",
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
  };

  const onSubmit = async () => {
    if (!organizationId) {
      toast.error("Selecciona una organización");
      return;
    }

    try {
      setSaving(true);

      if (!name.trim()) {
        toast.error("El nombre es obligatorio");
        return;
      }

      const isFxProduct = itemType === "foreign_exchange_asset";
      
      // Validación simplificada - se omite productInput ya que requiere variables 
      // que se definen después. La validación se hace en la base de datos.
      // TODO: Revisar y corregir la lógica de validación de productos

      // Reutilizar los valores ya validados en la validación del producto
      // Para evitar validaciones duplicadas, extraemos los valores necesarios
      // de los campos que ya fueron validados en validateProduct

      const sanitizedUnspsc = unspscCode.trim() || null;
      const sanitizedDianTariff = dianTariffCode.trim() || null;
      const sanitizedUnitCode = unitCode.trim().toUpperCase() || null;
      const sanitizedTaxObservation = taxObservation.trim() || null;

      const sanitizedMinimumUnit = minimumUnit.trim().toUpperCase() || null;
      const sanitizedPackagingUnit = packagingUnit.trim().toUpperCase() || null;
      const sanitizedContentUnit = contentUnit.trim().toUpperCase() || null;
      const sanitizedMeasurementUnit =
        measurementUnit.trim().toUpperCase() || null;

      const medicationEnabled = itemType === "medication";
      
      // Valores normalizados (antes venían de la validación)
      const parsedIva = ivaCategory === "GRAVADO" ? parseFloat(ivaRate || "0") : null;
      const normalizedIncType = incType && incType.trim() ? incType.trim() : "NINGUNO";
      const normalizedIncRate = normalizedIncType !== "NINGUNO" ? parseFloat(incRate || "0") : null;
      const normalizedPreparationTime = preparationTime ? parseInt(preparationTime) : null;
      const parsedStorageMin = storageTempMin && storageTempMin.trim() !== "" ? Number(storageTempMin) : null;
      const parsedStorageMax = storageTempMax && storageTempMax.trim() !== "" ? Number(storageTempMax) : null;
      
      // Preparar variantes para persistencia
      const {
        persistable: persistableVariants,
        deletedIds: deletedVariantIds,
        defaultVariant,
      } = prepareVariantsForPersistence(variants);

      if (!defaultVariant) {
        throw new Error("Se requiere una variante principal.");
      }

      const persistableInventory = prepareInventoryForPersistence({
        variantDrafts: variants,
        inventoryByVariant: variantInventory,
      });
      const activeVariantIds = persistableVariants.map(
        (variant) => variant.id
      );
      const variantOptionRows = prepareVariantOptions({
        variantDrafts: variants,
        optionSetIds: selectedOptionSetIds,
      });

      const payload: Partial<Product> & Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        price: isFxProduct ? parseFloat(fxSellPrice || "0") : defaultVariant.price,
        is_available: available,
        image_url: primaryImage?.url || null,
        item_type: itemType,
        principal_bar_code: defaultVariant.gtin,
        price_includes_taxes: priceIncludesTaxes,
        iva_category: ivaCategory,
        iva_rate: parsedIva,
        inc_type: normalizedIncType,
        inc_rate: normalizedIncType !== "NINGUNO" ? normalizedIncRate : null,
        unspsc_code: sanitizedUnspsc,
        dian_tariff_code: sanitizedDianTariff,
        unit_code: sanitizedUnitCode,
        tax_observation: sanitizedTaxObservation,
        preparation_time_minutes: normalizedPreparationTime,
        minimum_unit: sanitizedMinimumUnit,
        packaging_unit: sanitizedPackagingUnit,
        content_unit: sanitizedContentUnit,
        measurement_unit: sanitizedMeasurementUnit,
        ium_code: medicationEnabled ? iumCode.trim() || null : null,
        cum_code: medicationEnabled ? cumCode.trim() || null : null,
        invima_record: medicationEnabled ? invimaRecord.trim() || null : null,
        lab_name: medicationEnabled ? labName.trim() || null : null,
        active_principle: medicationEnabled
          ? activePrinciple.trim() || null
          : null,
        concentration: medicationEnabled ? concentration.trim() || null : null,
        manufacturer_name: medicationEnabled
          ? manufacturerName.trim() || null
          : null,
        manufacturer_nit: medicationEnabled
          ? manufacturerNit.trim() || null
          : null,
        storage_temp_min: medicationEnabled ? parsedStorageMin : null,
        storage_temp_max: medicationEnabled ? parsedStorageMax : null,
      };

      if (isFxProduct) {
        Object.assign(payload, {
          fx_asset_kind: fxAssetKind,
          fx_base_currency: fxBaseCurrency.trim().toUpperCase(),
          fx_quote_currency: fxQuoteCurrency.trim().toUpperCase(),
          fx_reference_code: fxReferenceCode.trim() || null,
          fx_pricing_mode: fxPricingMode,
          fx_reference_price: fxReferencePrice ? parseFloat(fxReferencePrice) : null,
          fx_buy_price: parseFloat(fxBuyPrice || "0"),
          fx_sell_price: parseFloat(fxSellPrice || "0"),
          fx_buy_margin_bps: fxBuyMarginBps ? parseInt(fxBuyMarginBps) : null,
          fx_sell_margin_bps: fxSellMarginBps ? parseInt(fxSellMarginBps) : null,
          fx_quantity_precision: fxQuantityPrecision ? parseInt(fxQuantityPrecision) : 2,
          fx_quote_unit: fxQuoteUnit ? parseInt(fxQuoteUnit) : 1,
          fx_auto_pricing: fxAutoPricing,
          fx_last_rate_source: fxLastRateSource || null,
        });
      } else {
        Object.assign(payload, {
          fx_asset_kind: null,
          fx_base_currency: null,
          fx_quote_currency: null,
          fx_reference_code: null,
          fx_pricing_mode: null,
          fx_reference_price: null,
          fx_buy_price: null,
          fx_sell_price: null,
          fx_buy_margin_bps: null,
          fx_sell_margin_bps: null,
          fx_quantity_precision: 2,
          fx_quote_unit: 1,
          fx_auto_pricing: false,
          fx_last_rate_source: null,
        });
      }

      if (!allLocations && selectedLocationIds.size === 0) {
        toast.error(
          "Selecciona al menos una ubicación o marca la opción de todas."
        );
        return;
      }
      const invalidVariantsForLocations = activeVariantIds.filter((variantId) => {
        const config = variantLocationMap[variantId];
        return config && !config.allLocations && config.selectedLocationIds.size === 0;
      });
      if (invalidVariantsForLocations.length) {
        const names = invalidVariantsForLocations
          .map(
            (variantId) =>
              variants.find((variant) => variant.id === variantId)?.name ||
              "Variante sin nombre"
          )
          .join(", ");
        toast.error(
          `Define al menos una sucursal para las variantes: ${names}.`
        );
        return;
      }

      if (isEdit && product?.id) {
        const { data: updated, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id)
          .select("*")
          .single();
        if (error) throw error;

        await syncProductVariants({
          supabase,
          organizationId,
          productId: product.id,
          variants: persistableVariants,
          deletedIds: deletedVariantIds,
        });

         if (primaryImage) {
           await supabase.rpc("set_primary_product_image", {
             p_product_id: product.id,
             p_image_id: primaryImage.id,
           });
         }

         if (primaryImage?.url) {
           const { error: updateImageUrlError } = await supabase
             .from("products")
             .update({ image_url: primaryImage.url })
             .eq("id", product.id);
           if (updateImageUrlError) throw updateImageUrlError;
         }

         await syncProductCategories({
          supabase,
          organizationId,
          productId: product.id,
          nextIds: selectedCategoryIds,
        });

        await syncProductModifierSets({
          supabase,
          organizationId,
          productId: product.id,
          nextIds: selectedModifierSetIds,
        });
        await syncProductOptionSetLinks({
          supabase,
          organizationId,
          productId: product.id,
          optionSetIds: selectedOptionSetIds,
        });
        await syncVariantOptions({
          supabase,
          organizationId,
          productId: product.id,
          rows: variantOptionRows,
        });

        await syncProductLocationSettings({
          supabase,
          organizationId,
          productId: product.id,
          allLocations,
          selectedLocationIds,
          productLowStockThresholds,
          variantLocations: variantLocationMap,
          activeVariantIds,
        });

        await syncVariantInventory({
          supabase,
          organizationId,
          productId: product.id,
          persistableInventory,
        });

        onSaved(updated as Product);
        toast.success("Producto actualizado");
        onClose();
        return;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("products")
        .insert([{ ...payload, organization_id: organizationId }])
        .select("*")
        .single();
      if (insertError) throw insertError;

      const productId = inserted.id as string;

      await syncProductVariants({
        supabase,
        organizationId,
        productId,
        variants: persistableVariants,
        deletedIds: deletedVariantIds,
      });

      if (images.length) {
        const pending = images.filter((img) => img.product_id === null);
        if (pending.length) {
          const rows = pending.map((img, index) => ({
            product_id: productId,
            organization_id: organizationId,
            url: img.url,
            storage_path: img.storage_path,
            is_primary: img.is_primary,
            sort_order: img.sort_order ?? index + 1,
          }));
          const { error: imgError } = await supabase
            .from("product_images")
            .insert(rows);
          if (imgError) throw imgError;

          const primary = pending.find((img) => img.is_primary);
          if (primary) {
            const { data: primaryRow } = await supabase
              .from("product_images")
              .select("id")
              .eq("product_id", productId)
              .eq("url", primary.url)
              .single();
             if (primaryRow) {
               await supabase.rpc("set_primary_product_image", {
                 p_product_id: productId,
                 p_image_id: primaryRow.id,
               });
             }
           }
         }
       }

       if (primaryImage?.url) {
         const { error: updateImageUrlError } = await supabase
           .from("products")
           .update({ image_url: primaryImage.url })
           .eq("id", productId);
         if (updateImageUrlError) throw updateImageUrlError;
       }

       if (selectedCategoryIds.length) {
        const rows = selectedCategoryIds.map((categoryId) => ({
          organization_id: organizationId,
          category_id: categoryId,
          product_id: productId,
        }));
        const { error: catError } = await supabase
          .from("product_category_products")
          .insert(rows);
        if (catError) throw catError;
      }

      if (selectedModifierSetIds.length) {
        const rows = Array.from(new Set(selectedModifierSetIds)).map(
          (modifierSetId, index) => ({
            organization_id: organizationId,
            product_id: productId,
            modifier_set_id: modifierSetId,
            sort_order: index + 1,
          })
        );
        if (rows.length) {
          const { error: modError } = await supabaseAny
            .from("product_modifier_sets")
            .insert(rows);
          if (modError) throw modError;
        }
      }

      await syncProductOptionSetLinks({
        supabase,
        organizationId,
        productId,
        optionSetIds: selectedOptionSetIds,
      });

      await syncVariantOptions({
        supabase,
        organizationId,
        productId,
        rows: variantOptionRows,
      });

      await syncProductLocationSettings({
        supabase,
        organizationId,
        productId,
        allLocations,
        selectedLocationIds,
        productLowStockThresholds,
        variantLocations: variantLocationMap,
        activeVariantIds,
      });

      if (persistableInventory.length) {
        const rows = persistableInventory.map((row) => ({
          id: row.id,
          organization_id: organizationId,
          product_id: productId,
          variant_id: row.variant_id,
          warehouse_id: row.warehouse_id,
          batch_code: row.batch_code,
          expiration_date: row.expiration_date,
          quantity_units: row.quantity_units,
          unit_cost: row.unit_cost,
        }));
        const { error: batchError } = await supabase
          .from("product_variant_batches")
          .insert(rows);
        if (batchError) throw batchError;
      }

      onSaved(inserted as Product);
      toast.success("Producto creado");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Error guardando el producto");
    } finally {
      setSaving(false);
    }
  };

  const showMedicationSection = itemType === "medication";
  const showFxSection = itemType === "foreign_exchange_asset";
  const activeVariants = useMemo(
    () => variants.filter((variant) => !variant.markedForDeletion),
    [variants]
  );
  const defaultVariantDraft = useMemo(
    () =>
      activeVariants.find((variant) => variant.isDefault) ??
      activeVariants[0] ??
      null,
    [activeVariants]
  );
  const selectedOptionSets = useMemo(
    () =>
      selectedOptionSetIds
        .map((id) => allOptionSets.find((set) => set.id === id))
        .filter((set): set is OptionSetWithValues => Boolean(set)),
    [selectedOptionSetIds, allOptionSets]
  );
  const isSingleVariantMode =
    selectedOptionSets.length === 0 && activeVariants.length === 1;
  const singleVariant = isSingleVariantMode ? defaultVariantDraft : null;
  const generatedFromLabel = useMemo(() => {
    if (!selectedOptionSets.length) return null;
    return selectedOptionSets
      .map((set) => set.display_name || set.name)
      .join(" y ");
  }, [selectedOptionSets]);
  const availabilityByVariant = useMemo(() => {
    const labels: Record<string, string> = {};
    variants.forEach((variant) => {
      const config = variantLocationMap[variant.id];
      if (!config || config.allLocations) {
        if (allLocations) {
          labels[variant.id] = "Todas las ubicaciones";
        } else if (selectedLocationIds.size === 0) {
          labels[variant.id] = "Sin ubicaciones";
        } else {
          labels[variant.id] = `${selectedLocationIds.size} sucursales`;
        }
      } else if (config.selectedLocationIds.size === 0) {
        labels[variant.id] = "Sin ubicaciones";
      } else {
        labels[variant.id] = `${config.selectedLocationIds.size} sucursales`;
      }
    });
    return labels;
  }, [variantLocationMap, variants, allLocations, selectedLocationIds]);
  const inventorySummaryByVariant = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(variantInventory).forEach(([variantId, rows]) => {
      totals[variantId] = rows.reduce((sum, row) => {
        const normalized = Number(
          row.quantity_units.trim()
            ? row.quantity_units.replace(",", ".")
            : "0"
        );
        if (!Number.isFinite(normalized)) return sum;
        return sum + normalized;
      }, 0);
    });
    return totals;
  }, [variantInventory]);
  const singleVariantInventoryCount = singleVariant
    ? inventorySummaryByVariant[singleVariant.id] ?? 0
    : 0;
  const singleVariantInventoryLabel =
    singleVariantInventoryCount > 0
      ? `${singleVariantInventoryCount.toLocaleString("es-CO")} uds`
      : "Sin registros";
  const singleVariantAvailabilityLabel = singleVariant
    ? availabilityByVariant[singleVariant.id] ?? "Todas las ubicaciones"
    : "Todas las ubicaciones";
  const variationSetDrafts = useMemo<VariationSetDraft[]>(() => {
    if (!selectedOptionSetIds.length) return [];
    return selectedOptionSetIds.map((setId) => {
      const set = allOptionSets.find((optionSet) => optionSet.id === setId);
      const usedValues = new Set<string>();
      variants.forEach((variant) => {
        const value = variant.options?.[setId];
        if (value) usedValues.add(value);
      });
      return {
        id: setId,
        optionSetId: setId,
        title: set?.display_name || set?.name || "",
        selectedOptionIds: Array.from(usedValues),
      };
    });
  }, [selectedOptionSetIds, allOptionSets, variants]);
  const availabilityModalVariant =
    availabilityContext.type === "variant" && availabilityContext.variantId
      ? variants.find((variant) => variant.id === availabilityContext.variantId) ??
        null
      : null;
  const availabilityModalConfig = useMemo<AvailabilityConfig>(() => {
    if (
      availabilityContext.type === "variant" &&
      availabilityContext.variantId
    ) {
      return cloneVariantLocationConfig(
        variantLocationMap[availabilityContext.variantId]
      );
    }
    return {
      allLocations,
      selectedLocationIds: new Set(selectedLocationIds),
      lowStockThresholds: { ...productLowStockThresholds },
    };
  }, [
    availabilityContext,
    allLocations,
    selectedLocationIds,
    productLowStockThresholds,
    variantLocationMap,
  ]);
  const availabilityModalTitle =
    availabilityContext.type === "variant" && availabilityModalVariant
      ? `Ubicaciones para ${availabilityModalVariant.name || "variante"}`
      : "Ubicaciones del producto";
  const availabilityModalDescription =
    availabilityContext.type === "variant"
      ? "Configura la disponibilidad por sucursal y el low stock solo para esta variante."
      : "Selecciona las sucursales disponibles y los umbrales de alerta para todo el producto.";
  const inventoryModalVariant =
    inventoryModalVariantId && inventoryModalVariantId.length
      ? variants.find((variant) => variant.id === inventoryModalVariantId) ??
        null
      : null;
  const inventoryModalRows =
    inventoryModalVariantId && variantInventory[inventoryModalVariantId]
      ? variantInventory[inventoryModalVariantId]
      : [];
  const handleVariantFieldChange = (
    variantId: string,
    field: "name" | "sku" | "gtin" | "price" | "weight_grams",
    value: string
  ) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.id === variantId ? { ...variant, [field]: value } : variant
      )
    );
  };
  return (
    <>
      <Dialog open={open} onOpenChange={(value) => (value ? null : onClose())}>
        <DialogContent className="mb-10 z-[10000] flex h-screen max-w-screen flex-col gap-4 sm:rounded-none">
          <DialogHeader className="gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                {isEdit ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    Editar producto
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Nuevo producto
                  </>
                )}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                {isEdit ? (
                  <Button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving || deleting}
                    className="bg-red-200 text-red-900 hover:bg-red-300"
                  >
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Eliminar
                  </Button>
                ) : null}
                <Button onClick={onSubmit} disabled={saving || deleting}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 overflow-x-auto">
                {steps.map((step, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToStep(index)}
                    disabled={!canProceedToStep(index) && index > currentStep}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                      index === currentStep
                        ? "bg-primary text-white"
                        : index < currentStep
                        ? "bg-green-100 text-green-700"
                        : canProceedToStep(index)
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-gray-50 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                    )}
                    {step.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextStep}
                  disabled={currentStep === steps.length - 1}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>

          <div className="!pb-10 mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 pb-10 lg:flex-row lg:items-start lg:gap-8">
            <div className="flex-1 space-y-6">
              <div className="rounded-xl  space-y-3">
                <Label className="text-sm font-medium">Tipo de ítem</Label>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div>
                    <div className="font-medium">
                      {ITEM_TYPES.find((item) => item.key === itemType)?.title ??
                        "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ITEM_TYPES.find((item) => item.key === itemType)?.subtitle}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenTypeDlg(true)}
                  >
                    Cambiar
                  </Button>
                </div>
              </div>

              <div className="rounded-xl bg-card space-y-4">
                <div className="flex-col space-y-3">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      ref={nameInputRef}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ej: Camisa Clásica"
                    />
                  </div>
                  {singleVariant ? (
                    <div className="space-y-2">
                      <Label>Precio</Label>
                      <Input
                        inputMode="decimal"
                        value={singleVariant.price}
                        onChange={(event) =>
                          handleVariantFieldChange(
                            singleVariant.id,
                            "price",
                            event.target.value
                          )
                        }
                        placeholder="Ej: 15000"
                      />
                    </div>
                  ) : null}
                  {isRestaurantBusiness ? (
                    <div className="space-y-2">
                      <Label>Tiempo de preparación (min)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={preparationTime}
                        onChange={(event) =>
                          setPreparationTime(event.target.value)
                        }
                        placeholder="Ej: 15"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Descripción corta"
                  />
                </div>
              </div>

              <div
                className="space-y-4 rounded-xl border bg-card p-4"
                ref={imagesSectionRef}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="block">Imágenes del producto</Label>
                    <p className="text-xs text-gray-500">
                      JPG, PNG, WEBP, etc. Maximo 500 KB.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={imageUploadVariantId}
                      onValueChange={(value) => setImageUploadVariantId(value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Asignar a" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PRODUCT_IMAGE_SCOPE}>
                          Producto (general)
                        </SelectItem>
                        {variants.map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.name || "Variante sin nombre"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      id="file-input"
                      type="file"
                      className="hidden"
                      multiple
                      accept={IMAGE_ACCEPT}
                      onChange={handleFileInput}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("file-input")?.click()
                      }
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Cargar imagen(es)
                    </Button>
                  </div>
                </div>

                {images.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {images.map((image) => (
                      <div key={image.id} className="rounded-xl border">
                        <div
                          className={`relative overflow-hidden rounded-t-xl ${
                            image.is_primary ? "ring-2 ring-primary" : ""
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt="product"
                            className="h-32 w-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-2 py-1 text-xs text-white">
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 ${
                                image.is_primary
                                  ? "opacity-100"
                                  : "opacity-80 hover:opacity-100"
                              }`}
                              onClick={() => handleMakePrimary(image.id)}
                            >
                              <Star className="h-4 w-4" />
                              {image.is_primary ? "Principal" : "Hacer principal"}
                            </button>
                            <button
                              type="button"
                              className="opacity-80 hover:opacity-100"
                              onClick={() => handleRemoveImage(image)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-2">
                          <Label className="text-xs text-muted-foreground">
                            Asociada a
                          </Label>
                          <Select
                            value={image.variant_id ?? PRODUCT_IMAGE_SCOPE}
                            onValueChange={(value) =>
                              handleImageVariantChange(image, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Producto (general)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={PRODUCT_IMAGE_SCOPE}>
                                Producto (general)
                              </SelectItem>
                              {variants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.name || "Variante sin nombre"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border py-6 text-center text-sm text-muted-foreground">
                    Aún no has cargado imágenes.
                  </div>
                )}
              </div>

              {isSingleVariantMode && singleVariant ? (
                <div className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Variante principal</p>
                    <p className="text-sm text-muted-foreground">
                      Mientras tengas una sola variante manejamos el precio y sus
                      detalles automáticamente.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Inventario</p>
                      <p className="text-sm font-semibold">
                        {singleVariantInventoryLabel}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Disponibilidad
                      </p>
                      <p className="text-sm font-semibold">
                        {singleVariantAvailabilityLabel}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Estado</p>
                          <p className="text-sm font-semibold">
                            {singleVariant.isActive ? "Activa" : "Inactiva"}
                          </p>
                        </div>
                        <Switch
                          aria-label="Activar variante"
                          checked={singleVariant.isActive}
                          onCheckedChange={() =>
                            handleToggleVariantActive(singleVariant.id)
                          }
                        />
                      </div>
                    </div>
                   </div>
                   <div className="grid gap-3 sm:grid-cols-3">
                     <div className="space-y-2">
                       <Label className="text-xs">SKU</Label>
                       <Input
                         value={singleVariant.sku}
                         onChange={(event) =>
                           handleVariantFieldChange(
                             singleVariant.id,
                             "sku",
                             event.target.value
                           )
                         }
                         placeholder="SKU interno"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label className="text-xs">Código de barras / GTIN</Label>
                       <Input
                         value={singleVariant.gtin}
                         onChange={(event) =>
                           handleVariantFieldChange(
                             singleVariant.id,
                             "gtin",
                             event.target.value
                           )
                         }
                         placeholder="7701234567890"
                         inputMode="numeric"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label className="text-xs">Peso envío (g)</Label>
                       <Input
                         value={singleVariant.weight_grams}
                         onChange={(event) =>
                           handleVariantFieldChange(
                             singleVariant.id,
                             "weight_grams",
                             event.target.value
                           )
                         }
                         placeholder="0"
                         inputMode="decimal"
                       />
                     </div>
                   </div>
                   <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => handleEditVariantClick(singleVariant.id)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar detalles
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => handleOpenInventoryModal(singleVariant.id)}
                    >
                      <Package className="h-4 w-4" />
                      Inventario
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => openVariantLocations(singleVariant.id)}
                    >
                      <MapPin className="h-4 w-4" />
                      Ubicaciones específicas
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={handleAddVariantClick}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar variante
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={handleOpenBulkVariants}
                    >
                      <Plus className="h-4 w-4" />
                      Crear con sets
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cuando agregues más variantes verás la tabla completa para
                    administrarlas.
                  </p>
                </div>
              ) : (
                <VariantList
                  variants={variants}
                  availabilityByVariant={availabilityByVariant}
                  inventoryByVariant={inventorySummaryByVariant}
                  generatedFromLabel={generatedFromLabel}
                  onBulkAdd={handleOpenBulkVariants}
                  onManualAdd={handleAddVariantClick}
                  onEdit={handleEditVariantClick}
                  onToggleActive={handleToggleVariantActive}
                  onSetDefault={handleSetDefaultVariant}
                  onToggleDeletion={handleToggleVariantDeletion}
                  onFieldChange={handleVariantFieldChange}
                  onOpenAvailability={openVariantLocations}
                  onOpenInventory={handleOpenInventoryModal}
                  onAssignImage={handleAssignVariantImage}
                />
              )}

              <div className="space-y-3 rounded-xl border bg-card p-4">
                  <div className=" flex justify-between">
                    <Label className="mt-2" >Conjuntos de modificadores</Label>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenModSetDlg(true)}
                    >
                      Seleccionar
                    </Button>
                  </div>
    
                <div className="rounded-xl ">
                  {selectedModifierSetIds.length ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedModifierSetIds.map((id) => {
                        const set = allModifierSets.find((item) => item.id === id);
                        if (!set) return null;
                        return (
                          <Badge key={id} variant="secondary">
                            {set.display_name || set.name}
                            {!set.is_active ? " (inactivo)" : ""}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Sin conjuntos seleccionados
                    </div>
                  )}
                  
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Unidad mínima (gobierno)</Label>
                    <Input
                      value={minimumUnit}
                      onChange={(event) => setMinimumUnit(event.target.value)}
                      placeholder="Ej: UND"
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidad de empaque</Label>
                    <Input
                      value={packagingUnit}
                      onChange={(event) => setPackagingUnit(event.target.value)}
                      placeholder="Ej: CAJA"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidad de contenido</Label>
                    <Input
                      value={contentUnit}
                      onChange={(event) => setContentUnit(event.target.value)}
                      placeholder="Ej: 500ML"
                      maxLength={12}
                    />
              </div>
              <div className="space-y-2">
                <Label>Unidad de medida</Label>
                <Input
                  value={measurementUnit}
                  onChange={(event) => setMeasurementUnit(event.target.value)}
                  placeholder="Ej: ML"
                  maxLength={12}
                />
              </div>
            </div>
          </div>

          {showFxSection ? (
            <div className="space-y-4 rounded-xl border bg-primary/5 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label className="block">Datos del activo</Label>
                  
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                  Actualización automática
                  <Switch checked={fxAutoPricing} onCheckedChange={setFxAutoPricing} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de activo</Label>
                  <Select
                    value={fxAssetKind}
                    onValueChange={(value) => setFxAssetKind(value as FxAssetKind)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {FX_ASSET_KIND_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modo de precio</Label>
                  <Select
                    value={fxPricingMode}
                    onValueChange={(value) => setFxPricingMode(value as FxPricingMode)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {FX_PRICING_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Divisa base</Label>
                  <Input
                    value={fxBaseCurrency}
                    onChange={(event) => setFxBaseCurrency(event.target.value.toUpperCase())}
                    placeholder="USD, ORO"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Divisa cotizada</Label>
                  <Input
                    value={fxQuoteCurrency}
                    onChange={(event) => setFxQuoteCurrency(event.target.value.toUpperCase())}
                    placeholder="COP"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidad de cotización</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={fxQuoteUnit}
                    onChange={(event) => setFxQuoteUnit(event.target.value)}
                    placeholder="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ej: 1 onza troy, 1 dólar, 100 gramos, etc.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Código de referencia</Label>
                  <Input
                    value={fxReferenceCode}
                    onChange={(event) => setFxReferenceCode(event.target.value.toUpperCase())}
                    placeholder="ISO, ticker, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Precio de compra</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={fxBuyPrice}
                    onChange={(event) => setFxBuyPrice(event.target.value)}
                    placeholder="Lo que pagas por unidad"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio de venta</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={fxSellPrice}
                    onChange={(event) => setFxSellPrice(event.target.value)}
                    placeholder="Lo que cobras a clientes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio de referencia</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={fxReferencePrice}
                    onChange={(event) => setFxReferencePrice(event.target.value)}
                    placeholder="Spot, TRM, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Margen compra (bps)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={fxBuyMarginBps}
                    onChange={(event) => setFxBuyMarginBps(event.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Margen venta (bps)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={fxSellMarginBps}
                    onChange={(event) => setFxSellMarginBps(event.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Decimales permitidos</Label>
                  <Input
                    type="number"
                    min="0"
                    max="6"
                    step="1"
                    value={fxQuantityPrecision}
                    onChange={(event) => setFxQuantityPrecision(event.target.value)}
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fuente del último precio</Label>
                <Input
                  value={fxLastRateSource}
                  onChange={(event) => setFxLastRateSource(event.target.value)}
                  placeholder="Proveedor, API, etc."
                />
              </div>
            </div>
          ) : null}

          {showMedicationSection ? (
            <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
              <div>
                <Label className="block">Datos del medicamento</Label>

                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Código IUM</Label>
                      <Input
                        value={iumCode}
                        onChange={(event) => setIumCode(event.target.value)}
                        placeholder="IUM"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código CUM</Label>
                      <Input
                        value={cumCode}
                        onChange={(event) => setCumCode(event.target.value)}
                        placeholder="CUM"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Registro INVIMA</Label>
                      <Input
                        value={invimaRecord}
                        onChange={(event) => setInvimaRecord(event.target.value)}
                        placeholder="INVIMA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Laboratorio</Label>
                      <Input
                        value={labName}
                        onChange={(event) => setLabName(event.target.value)}
                        placeholder="Nombre del laboratorio"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Principio activo</Label>
                      <Input
                        value={activePrinciple}
                        onChange={(event) => setActivePrinciple(event.target.value)}
                        placeholder="Paracetamol"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Concentración</Label>
                      <Input
                        value={concentration}
                        onChange={(event) => setConcentration(event.target.value)}
                        placeholder="500 mg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fabricante</Label>
                      <Input
                        value={manufacturerName}
                        onChange={(event) =>
                          setManufacturerName(event.target.value)
                        }
                        placeholder="Nombre del fabricante"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>NIT fabricante</Label>
                      <Input
                        value={manufacturerNit}
                        onChange={(event) =>
                          setManufacturerNit(event.target.value)
                        }
                        placeholder="123456789-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Temperatura mínima (°C)</Label>
                      <Input
                        type="number"
                        value={storageTempMin}
                        onChange={(event) => setStorageTempMin(event.target.value)}
                        placeholder="Ej: 2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Temperatura máxima (°C)</Label>
                      <Input
                        type="number"
                        value={storageTempMax}
                        onChange={(event) => setStorageTempMax(event.target.value)}
                        placeholder="Ej: 8"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="block">Impuestos</Label>

                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Precio incluye impuestos
                    </span>
                    <Switch
                      checked={priceIncludesTaxes}
                      onCheckedChange={setPriceIncludesTaxes}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Categoría IVA</Label>
                    <Select
                      value={ivaCategory}
                      onValueChange={(value) => {
                        const next = value as TaxIvaCategory;
                        setIvaCategory(next);
                        if (next !== "GRAVADO") {
                          setIvaRate("0");
                        } else if (!ivaRate || ivaRate === "0") {
                          setIvaRate("19");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {IVA_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tarifa IVA (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={ivaRate}
                      onChange={(event) => setIvaRate(event.target.value)}
                      disabled={ivaCategory !== "GRAVADO"}
                      placeholder="19"
                    />
                    {ivaCategory !== "GRAVADO" ? (
                      <p className="text-xs text-muted-foreground">
                        Se establecerá automáticamente en 0%.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Impuesto al consumo</Label>
                    <Select
                      value={incType}
                      onValueChange={(value) => {
                        setIncType(value);
                        if (value === "NINGUNO") setIncRate("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {incSelectOptions.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value === "NINGUNO"
                              ? "Ninguno"
                              : value
                                .toLowerCase()
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (char) => char.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tarifa INC (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={incRate}
                      onChange={(event) => setIncRate(event.target.value)}
                      disabled={incType === "NINGUNO"}
                      placeholder="Ej: 8"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:underline"
                  onClick={() => setShowAdvancedTaxes((prev) => !prev)}
                >
                  {showAdvancedTaxes
                    ? "Ocultar campos avanzados"
                    : "Mostrar campos avanzados"}
                </button>

                {showAdvancedTaxes ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Código UNSPSC</Label>
                      <Input
                        value={unspscCode}
                        onChange={(event) => setUnspscCode(event.target.value)}
                        placeholder="Ej: 50161813"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código arancelario DIAN</Label>
                      <Input
                        value={dianTariffCode}
                        onChange={(event) => setDianTariffCode(event.target.value)}
                        placeholder="Ej: 2203000000"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unidad de medida (DIAN)</Label>
                      <Input
                        value={unitCode}
                        onChange={(event) => setUnitCode(event.target.value)}
                        placeholder="Ej: UND"
                        maxLength={3}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Observaciones de impuestos</Label>
                      <Textarea
                        value={taxObservation}
                        onChange={(event) => setTaxObservation(event.target.value)}
                        placeholder="Notas internas o aclaraciones para facturación"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

            </div>
            <div className="w-full shrink-0 space-y-6 lg:w-[400px]">
              <div className="space-y-6 rounded-xl border bg-card p-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Categorías</Label>
                  <div className="rounded-xl border px-3 py-2">
                    {selectedCategoryIds.length ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedCategoryIds.map((id) => {
                          const category = allCategories.find((item) => item.id === id);
                          if (!category) return null;
                          return (
                            <Badge key={id} variant="secondary">
                              {category.name}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Sin categorías seleccionadas
                      </div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenCatDlg(true)}
                      >
                        Seleccionar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ubicaciones y canales</Label>
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <div className="text-sm">
                      {allLocations ? (
                        <>
                          <div className="flex items-center gap-2 font-medium">
                            <MapPin className="h-4 w-4" /> Todas
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Disponible en todos los puntos.
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 font-medium">
                            <MapPin className="h-4 w-4" />
                            {selectedLocationIds.size} seleccionadas
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Limitado a las ubicaciones seleccionadas.
                          </div>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={openProductLocations}
                    >
                      Editar ubicaciones
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="block">Disponibilidad en el micrositio</Label>
                    <p className="text-xs text-muted-foreground">
                      Controla si aparece en el canal online.
                    </p>
                  </div>
                  <Switch checked={available} onCheckedChange={setAvailable} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 mx-auto flex w-full max-w-[1400px] flex-wrap gap-3 border-t bg-background/80 px-6 py-4 backdrop-blur sm:px-4">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              <X className="mr-1 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={saving || deleting}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VariantEditorDialog
        open={variantEditorOpen}
        variant={variantEditorDraft}
        onClose={handleVariantDialogClose}
        onSave={handleVariantSave}
        disableDefaultToggle={
          activeVariants.length <= 1 &&
          !!variantEditorDraft &&
          activeVariants.some((variant) => variant.id === variantEditorDraft.id)
        }
      />

      <VariantInventoryModal
        open={Boolean(inventoryModalVariantId)}
        variant={inventoryModalVariant}
        rows={inventoryModalRows}
        warehouses={warehouses}
        onClose={() => setInventoryModalVariantId(null)}
        onAddRow={() => {
          if (!inventoryModalVariantId) return;
          handleAddInventoryRow(inventoryModalVariantId);
        }}
        onRowChange={(rowId, field, value) => {
          if (!inventoryModalVariantId) return;
          handleInventoryRowChange(inventoryModalVariantId, rowId, field, value);
        }}
        onRemoveRow={(rowId) => {
          if (!inventoryModalVariantId) return;
          handleRemoveInventoryRow(inventoryModalVariantId, rowId);
        }}
      />

      <VariantAvailabilityModal
        open={availabilityModalOpen}
        onClose={() => setAvailabilityModalOpen(false)}
        locations={locations}
        title={availabilityModalTitle}
        description={availabilityModalDescription}
        initialConfig={availabilityModalConfig}
        onSave={handleAvailabilityModalSave}
      />

      <ItemTypeDialog
        open={openTypeDlg}
        onClose={() => setOpenTypeDlg(false)}
        value={itemType}
        onChange={setItemType}
        options={ITEM_TYPES}
      />

      <CategoryPickerDialog
        open={openCatDlg}
        onClose={() => setOpenCatDlg(false)}
        allCategories={allCategories}
        value={selectedCategoryIds}
        onChange={setSelectedCategoryIds}
      />

      <ModifierSetPickerDialog
        open={openModSetDlg}
        onClose={() => setOpenModSetDlg(false)}
        allModifierSets={allModifierSets}
        value={selectedModifierSetIds}
        onChange={setSelectedModifierSetIds}
      />

      <AddVariationsDialog
        open={openAddVariationsDlg}
        onClose={() => setOpenAddVariationsDlg(false)}
        optionSets={allOptionSets}
        initialSets={variationSetDrafts}
        onSave={handleApplyVariantSets}
      />
    </>
  );
}

export default ProductModal;
