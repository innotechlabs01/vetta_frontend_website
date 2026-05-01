/**
 * Validaciones para gestión de productos
 * 
 * Estas validaciones aseguran que:
 * 1. El producto pertenece a la organización correcta
 * 2. Los precios son válidos (no negativos)
 * 3. Los códigos de barras/GTIN tienen formato correcto y son únicos
 * 4. Los SKU son únicos dentro de la organización
 * 5. Los impuestos (IVA, INC) están en rangos válidos
 * 6. Las unidades de medida son válidas
 * 7. Para medicamentos: validaciones específicas de registros
 * 8. Para activos de cambio: validaciones de divisas y precios
 */

import { getSupabaseBrowser } from "@/utils/supabase/client";
import type { LocationInfo } from "@/lib/get-env";
import type { 
  ProductItemType, 
  TaxIvaCategory, 
  FxAssetKind, 
  FxPricingMode 
} from "@/app/(dashboard)/items/types";

type SupabaseClient = ReturnType<typeof getSupabaseBrowser>;

export interface ProductValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida que un producto pueda ser creado/actualizado
 */
export async function validateProduct({
  organizationId,
  input,
  productId, // Para actualizaciones, ID del producto existente
  supabase,
}: {
  organizationId: string;
  input: {
    name: string;
    description?: string;
    price?: number | null;
    item_type: ProductItemType;
    iva_category: TaxIvaCategory;
    iva_rate?: number | null;
    inc_type?: string;
    inc_rate?: number | null;
    principal_bar_code?: string;
    sku?: string;
    unspsc_code?: string;
    dian_tariff_code?: string;
    unit_code?: string;
    tax_observation?: string;
    preparation_time_minutes?: number | null;
    minimum_unit?: string;
    packaging_unit?: string;
    content_unit?: string;
    measurement_unit?: string;
    // Medicamentos
    ium_code?: string;
    cum_code?: string;
    invima_record?: string;
    lab_name?: string;
    active_principle?: string;
    concentration?: string;
    manufacturer_name?: string;
    manufacturer_nit?: string;
    storage_temp_min?: number | null;
    storage_temp_max?: number | null;
    // Activos de cambio
    fx_asset_kind?: FxAssetKind;
    fx_base_currency?: string;
    fx_quote_currency?: string;
    fx_reference_code?: string;
    fx_pricing_mode?: FxPricingMode;
    fx_reference_price?: number | null;
    fx_buy_price?: number | null;
    fx_sell_price?: number | null;
    fx_buy_margin_bps?: number | null;
    fx_sell_margin_bps?: number | null;
    fx_quantity_precision?: number | null;
    fx_quote_unit?: number | null;
    fx_auto_pricing?: boolean;
    fx_last_rate_source?: string;
    available?: boolean;
    image_url?: string;
  };
  productId?: string; // ID del producto si es actualización
  supabase: SupabaseClient;
}): Promise<ProductValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Validar organización
    if (!organizationId) {
      errors.push("Organización no especificada");
      return { valid: false, errors, warnings };
    }

    // 2. Validar nombre requerido
    if (!input.name || input.name.trim().length < 2) {
      errors.push("El nombre es requerido y debe tener al menos 2 caracteres");
    }

    // 3. Validar precio (si se proporciona)
    if (input.price !== null && input.price !== undefined) {
      if (typeof input.price !== 'number' || input.price < 0) {
        errors.push("El precio debe ser un número mayor o igual a cero");
      } else if (input.price > 100000000) { // 100 millones como límite razonable
        warnings.push("El precio parece excesivamente alto");
      }
    }

    // 4. Validar IVA
    const validIvaCategories = ['GRAVADO', 'EXENTO', 'EXCLUIDO', 'NO_CAUSA'];
    if (!validIvaCategories.includes(input.iva_category)) {
      errors.push("Categoría de IVA no válida");
    } else if (input.iva_rate !== null && input.iva_rate !== undefined) {
      if (typeof input.iva_rate !== 'number' || input.iva_rate < 0 || input.iva_rate > 100) {
        errors.push("La tasa de IVA debe estar entre 0% y 100%");
      }
    }

    // 5. Validar INC (si aplica)
    if (input.inc_type && input.inc_type.trim() !== '') {
      if (input.inc_rate === null || input.inc_rate === undefined) {
        errors.push("Si especifica tipo de INC, debe especificar la tasa");
      } else if (typeof input.inc_rate !== 'number' || input.inc_rate < 0 || input.inc_rate > 100) {
        errors.push("La tasa de INC debe estar entre 0% y 100%");
      }
    }

    // 6. Validar GTIN (código de barras) si se proporciona
    if (input.principal_bar_code) {
      const gtin = input.principal_bar_code.trim();
      if (gtin.length > 0) {
        // Validar formato GTIN (8, 12, 13 o 14 dígitos)
        const gtinPattern = /^(\d{8}|\d{12}|\d{13}|\d{14})$/;
        if (!gtinPattern.test(gtin)) {
          warnings.push("El GTIN debe tener 8, 12, 13 o 14 dígitos");
        }
        
        // Verificar unicidad dentro de la organización (excluyendo el producto actual si es actualización)
        const { data: existingProducts, error: gtinError } = await supabase
          .from("products")
          .select("id, principal_bar_code")
          .eq("organization_id", organizationId)
          .eq("principal_bar_code", gtin)
          .neq("id", productId ?? null);

        if (gtinError) {
          console.error("Error checking GTIN uniqueness:", gtinError);
          warnings.push("No se pudo validar la unicidad del GTIN");
        } else if (existingProducts && existingProducts.length > 0) {
          errors.push("Ya existe un producto con este GTIN en la organización");
        }
      }
    }

    // 7. Validar SKU si se proporciona
    if (input.sku) {
      const sku = input.sku.trim();
      if (sku.length > 0) {
        // Verificar unicidad dentro de la organización (excluyendo el producto actual si es actualización)
        const { data: existingProducts, error: skuError } = await supabase
          .from("products")
          .select("id, sku")
          .eq("organization_id", organizationId)
          .eq("sku", sku)
          .neq("id", productId ?? null);

        if (skuError) {
          console.error("Error checking SKU uniqueness:", skuError);
          warnings.push("No se pudo validar la unicidad del SKU");
        } else if (existingProducts && existingProducts.length > 0) {
          errors.push("Ya existe un producto con este SKU en la organización");
        }
      }
    }

    // 8. Validar unidad de medida básica
    const validUnits = [
      'UN', 'KG', 'G', 'MG', 'L', 'ML', 'CM', 'M', 'MM',
      'PAQ', 'CAJA', 'BOT', 'LATA', 'ROL', 'HOJA', 'SET',
      'JUEGO', 'PAR', 'DOCENA', 'MEDIA_DOCENA', 'CENTENA'
    ];
    
    if (input.unit_code) {
      const unitCode = input.unit_code.trim().toUpperCase();
      if (!validUnits.includes(unitCode)) {
        warnings.push(`Unidad de medida "${unitCode}" no está en la lista estándar. Unidades comunes: ${validUnits.slice(0, 10).join(', ')}...`);
      }
    }

    // 9. Validaciones específicas por tipo de producto
    if (input.item_type === 'medication') {
      // Validaciones para medicamentos
      if (!input.ium_code || input.ium_code.trim() === '') {
        warnings.push("Se recomienda especificar el código IUM para medicamentos");
      }
      
      if (!input.invima_record || input.invima_record.trim() === '') {
        warnings.push("Se recomienda especificar el registro INVIMA para medicamentos");
      }
      
      if (!input.active_principle || input.active_principle.trim() === '') {
        warnings.push("Se recomienda especificar el principio activo para medicamentos");
      }
      
      if (input.storage_temp_min !== null && input.storage_temp_min !== undefined) {
        if (typeof input.storage_temp_min !== 'number' || input.storage_temp_min < -273) { // cero absoluto
          errors.push("La temperatura mínima de almacenamiento debe ser un número válido");
        }
      }
      
      if (input.storage_temp_max !== null && input.storage_temp_max !== undefined) {
        if (typeof input.storage_temp_max !== 'number') {
          errors.push("La temperatura máxima de almacenamiento debe ser un número");
        } else if (
          input.storage_temp_min !== null &&
          input.storage_temp_min !== undefined &&
          input.storage_temp_max < input.storage_temp_min
        ) {
          errors.push("La temperatura máxima no puede ser menor que la temperatura mínima");
        }
      }
    }

    if (input.item_type === 'foreign_exchange_asset') {
      // Validaciones para activos de cambio
      const validFxAssetKinds = ['currency', 'precious_metal', 'commodity'];
      if (input.fx_asset_kind && !validFxAssetKinds.includes(input.fx_asset_kind)) {
        errors.push("Tipo de activo de cambio no válido");
      }
      
      const validFxPricingModes = ['manual', 'market_plus_margin', 'market_minus_margin', 'fixed_spread'];
      if (input.fx_pricing_mode && !validFxPricingModes.includes(input.fx_pricing_mode)) {
        errors.push("Modo de precios para activo de cambio no válido");
      }
      
      if (input.fx_base_currency) {
        const baseCurrency = input.fx_base_currency.trim().toUpperCase();
        if (baseCurrency.length !== 3 || !/^[A-Z]{3}$/.test(baseCurrency)) {
          errors.push("La divisa base debe tener formato ISO 4217 de 3 letras (ej: USD, EUR)");
        }
      }
      
      if (input.fx_quote_currency) {
        const quoteCurrency = input.fx_quote_currency.trim().toUpperCase();
        if (quoteCurrency.length !== 3 || !/^[A-Z]{3}$/.test(quoteCurrency)) {
          errors.push("La divisa de cotización debe tener formato ISO 4217 de 3 letras (ej: USD, EUR)");
        }
      }
      
      // Validar precios para FX
      const priceFields = ['fx_buy_price', 'fx_sell_price', 'fx_reference_price'];
      for (const field of priceFields) {
        const value = input[field as keyof typeof input];
        if (value !== null && value !== undefined) {
          if (typeof value !== 'number' || value <= 0) {
            errors.push(`El ${field} debe ser un número mayor a cero`);
          }
        }
      }
      
      // Validar márgenes en puntos básicos (tipicamente -5000 a +5000)
      const marginFields = ['fx_buy_margin_bps', 'fx_sell_margin_bps'];
      for (const field of marginFields) {
        const value = input[field as keyof typeof input];
        if (value !== null && value !== undefined) {
          if (typeof value !== 'number' || value < -5000 || value > 5000) {
            warnings.push(`El ${field} parece fuera del rango típico (-5000 a +5000 puntos básicos)`);
          }
        }
      }
      
      if (input.fx_quantity_precision !== null && input.fx_quantity_precision !== undefined) {
        if (!Number.isInteger(input.fx_quantity_precision) || input.fx_quantity_precision < 0 || input.fx_quantity_precision > 6) {
          errors.push("La precisión de cantidad debe ser un entero entre 0 y 6");
        }
      }
      
      if (input.fx_quote_unit !== null && input.fx_quote_unit !== undefined) {
        if (typeof input.fx_quote_unit !== 'number' || input.fx_quote_unit <= 0) {
          errors.push("La unidad de cotización debe ser un número mayor a cero");
        }
      }
    }

    // 10. Validar tiempo de preparación (si aplica)
    if (input.preparation_time_minutes !== null && input.preparation_time_minutes !== undefined) {
      if (typeof input.preparation_time_minutes !== 'number' || input.preparation_time_minutes < 0) {
        errors.push("El tiempo de preparación debe ser un número mayor o igual a cero");
      } else if (input.preparation_time_minutes > 1440) { // 24 horas
        warnings.push("El tiempo de preparación parece excesivamente alto (más de 24 horas)");
      }
    }

    // Determinar si es válido
    const valid = errors.length === 0;

    return { valid, errors, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    errors.push(`Error validando producto: ${message}`);
    return { valid: false, errors, warnings };
  }
}