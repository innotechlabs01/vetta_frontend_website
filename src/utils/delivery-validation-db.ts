/**
 * Validaciones de delivery contra la base de datos
 * Integra con Supabase para validar zonas, ubicaciones, etc
 */

import type {
  ShippingAddress,
  DeliveryMetadata,
  DeliveryValidationResult,
} from '@/types/delivery';
import {
  validatePointInCoverageZone,
  validateAddressStructure,
  validatePostalCodeRestrictions,
  extractCoordinates,
  normalizeAddress,
} from './delivery-geometry';

type SupabaseClient = ReturnType<
  typeof import('@/utils/supabase/client').getSupabaseBrowser
>;

/**
 * Valida una dirección de delivery completa
 * Verifica:
 * 1. Estructura válida
 * 2. Coordenadas válidas (si existen)
 * 3. Punto dentro de zona de cobertura
 * 4. Horario de sucursal disponible
 * 5. Canal habilitado en sucursal
 * 
 * @param address Dirección a validar
 * @param locationId UUID de la sucursal origen
 * @param supabase Cliente Supabase
 * @returns Resultado de validación con metadata
 */
export async function validateDeliveryAddress({
  address,
  locationId,
  supabase,
}: {
  address: ShippingAddress;
  locationId: string;
  supabase: SupabaseClient;
}): Promise<DeliveryValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validar estructura de dirección
  const structureErrors = validateAddressStructure(address);
  if (structureErrors.length > 0) {
    return {
      valid: false,
      errors: structureErrors,
      warnings: [],
    };
  }

  // Normalizar dirección
  const normalizedAddress = normalizeAddress(address);

  // 2. Validar que la sucursal existe y tiene delivery habilitado
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, local_delivery_enabled, latitude, longitude, timezone')
    .eq('id', locationId)
    .single();

  if (locationError || !location) {
    return {
      valid: false,
      errors: ['Sucursal no encontrada'],
      warnings: [],
    };
  }

  if (!location.local_delivery_enabled) {
    return {
      valid: false,
      errors: ['Delivery no está habilitado en esta sucursal'],
      warnings: [],
    };
  }

  // 3. Si tiene coordenadas, validar que está en zona de cobertura
  if (
    typeof normalizedAddress.latitude === 'number' &&
    typeof normalizedAddress.longitude === 'number'
  ) {
    const coordinates = extractCoordinates(normalizedAddress);
    if (coordinates) {
      // Obtener zonas de cobertura de la sucursal
      const { data: zones, error: zonesError } = await supabase
        .from('location_coverage_zones')
        .select('id, name, path, is_active, logistics_cost, delivery_time_minutes')
        .eq('location_id', locationId);

      if (zonesError) {
        warnings.push('No se pudo validar zona de cobertura');
      } else if (zones && zones.length > 0) {
        // Verificar que el punto esté en alguna zona
        const zoneResult = validatePointInCoverageZone(coordinates, zones as any);

        if (!zoneResult.valid) {
          return {
            valid: false,
            errors: [zoneResult.error || 'Dirección fuera de zona de cobertura'],
            warnings,
          };
        }

        // Retornar con metadata de zona
        return {
          valid: true,
          errors: [],
          warnings,
          metadata: {
            coverage_zone_id: zoneResult.zone?.id,
            coverage_zone_name: zoneResult.zone?.name,
            estimated_time_minutes: zoneResult.zone?.delivery_time_minutes,
            logistics_cost: zoneResult.zone?.logistics_cost,
          },
        };
      }
    }
  } else {
    // Si no tiene coordenadas, intenta validar por código postal
    const { data: serviceZones, error: serviceZonesError } = await supabase
      .from('location_service_zones')
      .select('enabled, postal_prefix')
      .eq('location_id', locationId)
      .eq('service_channel', 'delivery')
      .eq('enabled', true);

    if (serviceZonesError) {
      warnings.push('No se pudo validar restricciones de código postal');
    } else if (serviceZones && serviceZones.length > 0) {
      const postalPrefixes = serviceZones
        .map((z: any) => z.postal_prefix)
        .filter(Boolean);

      const postalValidation = validatePostalCodeRestrictions(
        normalizedAddress,
        postalPrefixes
      );

      if (!postalValidation.valid) {
        return {
          valid: false,
          errors: [postalValidation.error || 'Código postal no permitido'],
          warnings,
        };
      }
    }
  }

  // 4. Validar horario de sucursal (si tiene zona de cobertura activa)
  try {
    const { checkLocationSchedule } = await import('@/utils/schedule-validation');
    const scheduleCheck = await checkLocationSchedule(locationId, supabase, new Date());

    if (!scheduleCheck.isOpen) {
      return {
        valid: false,
        errors: [
          `Sucursal cerrada. ${scheduleCheck.reason || ''}`,
        ],
        warnings,
      };
    }
  } catch (err) {
    // No falles si hay error en validación de horario, solo advierte
    warnings.push('No se pudo validar horario de sucursal');
  }

  // ✅ Toda la validación pasó
  return {
    valid: true,
    errors: [],
    warnings,
  };
}

/**
 * Valida que una orden de delivery tenga dirección antes de guardarse
 * @param address Dirección (puede ser partial si viene de formulario)
 * @returns Objeto con validación y mensajes
 */
export function validateAddressForDeliveryOrder(
  address: Partial<ShippingAddress> | null | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!address) {
    errors.push('Dirección es requerida para delivery');
    return { valid: false, errors };
  }

  const structureErrors = validateAddressStructure(address);
  if (structureErrors.length > 0) {
    return { valid: false, errors: structureErrors };
  }

  return { valid: true, errors: [] };
}

/**
 * Construye el objeto DeliveryMetadata para una orden
 * @param data Datos de delivery
 * @returns DeliveryMetadata para guardar en orden
 */
export function buildDeliveryMetadata(data: {
  locationId: string;
  address: ShippingAddress;
  zoneId?: string;
  zoneName?: string;
  estimatedTime?: number;
  logisticsCost?: number;
}): DeliveryMetadata {
  const coordinates = extractCoordinates(data.address);

  return {
    origin_location_id: data.locationId,
    coverage_zone_id: data.zoneId,
    coverage_zone_name: data.zoneName,
    estimated_delivery_time_minutes: data.estimatedTime,
    logistics_cost: data.logisticsCost,
    destination_coordinates: coordinates ?? undefined,
    status_history: [
      {
        status: 'NEW',
        timestamp: new Date().toISOString(),
        notes: 'Orden creada',
      },
    ],
  };
}

/**
 * Valida que una orden tenga todo lo necesario antes de pasarla a delivery
 * @param order Objeto con datos de orden
 * @returns Validación result
 */
export function validateOrderReadyForDelivery(order: {
  order_type?: string;
  shipping_address?: ShippingAddress | null;
  delivery_metadata?: DeliveryMetadata | null;
  status?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Solo valida si es delivery
  if (order.order_type !== 'DELIVERY_LOCAL') {
    return { valid: true, errors: [] };
  }

  if (!order.shipping_address) {
    errors.push('Dirección de envío es requerida');
  }

  if (!order.delivery_metadata?.origin_location_id) {
    errors.push('Ubicación de origen no especificada');
  }

  if (order.status === 'NEW' || order.status === 'DRAFT') {
    // En estados iniciales, validar que tenga info mínima
    if (errors.length === 0 && !order.shipping_address?.street) {
      errors.push('Dirección incompleta');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
