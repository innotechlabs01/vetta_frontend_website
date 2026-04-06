/**
 * Validaciones para pedidos de delivery/pickup/shipping
 * 
 * Estas validaciones aseguran que:
 * 1. La sucursal esté abierta a la hora del pedido
 * 2. El canal de servicio esté habilitado en la sucursal
 * 3. La dirección del cliente esté dentro de zona de cobertura
 * 4. El turno tenga ese canal activo (delivery_enabled, etc)
 */

import { getSupabaseBrowser } from "@/utils/supabase/client";
import { checkLocationSchedule, checkServiceChannelAvailability } from "@/utils/schedule-validation";

type SupabaseClient = ReturnType<typeof getSupabaseBrowser>;

export interface OrderDeliveryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida que una dirección esté dentro de una zona de cobertura
 * usando los polígonos almacenados en location_coverage_zones
 */
function isPointInPolygon(
  lat: number,
  lng: number,
  polygonPoints: Array<{ lat: number; lng: number }>
): boolean {
  if (polygonPoints.length < 3) return false;

  let inside = false;
  const x = lng;
  const y = lat;

  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const xi = polygonPoints[i].lng;
    const yi = polygonPoints[i].lat;
    const xj = polygonPoints[j].lng;
    const yj = polygonPoints[j].lat;

    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Valida un pedido de delivery
 */
export async function validateDeliveryOrder({
  organizationId,
  locationId,
  serviceChannel,
  shiftId,
  deliveryLat,
  deliveryLng,
  deliveryDateTime = new Date(),
  supabase,
}: {
  organizationId: string;
  locationId: string;
  serviceChannel: "delivery" | "pickup" | "national_shipping";
  shiftId: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryDateTime?: Date;
  supabase: SupabaseClient;
}): Promise<OrderDeliveryValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Validar que el turno está abierto y tiene el canal habilitado
    const { data: shift, error: shiftError } = await supabase
      .from("cash_shifts")
      .select(
        `
        id,
        status,
        pickup_enabled,
        delivery_enabled,
        national_shipping_enabled,
        location_id,
        opened_at,
        expected_closing_amount
      `
      )
      .eq("id", shiftId)
      .eq("organization_id", organizationId)
      .single();

    if (shiftError || !shift) {
      errors.push("Turno no encontrado o inválido");
      return { valid: false, errors, warnings };
    }

    if (shift.status !== "open") {
      errors.push("El turno no está abierto");
      return { valid: false, errors, warnings };
    }

    // Verificar que el canal esté habilitado en el turno
    const channelFieldMap = {
      pickup: "pickup_enabled",
      delivery: "delivery_enabled",
      national_shipping: "national_shipping_enabled",
    };
    const fieldName = channelFieldMap[serviceChannel] as keyof typeof shift;

    if (!shift[fieldName]) {
      errors.push(`Canal "${serviceChannel}" no está habilitado en este turno`);
      return { valid: false, errors, warnings };
    }

    // 2. Validar que la sucursal esté abierta (si el horario es "ahora" o cercano)
    const scheduleCheck = await checkLocationSchedule(locationId, supabase, deliveryDateTime);

    if (!scheduleCheck.isOpen) {
      if (serviceChannel === "delivery" || serviceChannel === "national_shipping") {
        warnings.push(
          `La sucursal no está abierta: ${scheduleCheck.reason || "Horario desconocido"}`
        );
      } else if (serviceChannel === "pickup") {
        // Para pickup, es más crítico
        errors.push(`No puedes hacer pickup: ${scheduleCheck.reason}`);
      }
    }

    // 3. Validar que el canal esté disponible en la sucursal
    const channelCheck = await checkServiceChannelAvailability(locationId, serviceChannel, supabase);

    if (!channelCheck.enabled) {
      errors.push(channelCheck.reason || `Canal ${serviceChannel} no disponible`);
      return { valid: false, errors, warnings };
    }

    // 4. Validar cobertura (si se proporciona dirección de entrega)
    if (
      serviceChannel !== "pickup" &&
      deliveryLat != null &&
      deliveryLng != null &&
      (serviceChannel === "delivery" || serviceChannel === "national_shipping")
    ) {
      try {
        const { data: zones, error: zonesError } = await supabase
          .from("location_coverage_zones")
          .select("id,path")
          .eq("location_id", locationId)
          .eq("organization_id", organizationId)
          .eq("service_channel", serviceChannel === "delivery" ? "delivery" : "national_shipping");

        if (zonesError) {
          warnings.push("No se pudo validar zona de cobertura");
        } else if (!zones || zones.length === 0) {
          warnings.push(`No hay zonas de cobertura configuradas para ${serviceChannel}`);
        } else {
          // Verificar si la dirección está en alguna zona
          let inCoverage = false;

          for (const zone of zones) {
            try {
              const polygonPoints = JSON.parse(zone.path || "[]");
              if (isPointInPolygon(deliveryLat, deliveryLng, polygonPoints)) {
                inCoverage = true;
                break;
              }
            } catch (parseError) {
              console.warn("Error parsing zone polygon:", zone.id);
            }
          }

          if (!inCoverage) {
            warnings.push("La dirección de entrega está fuera de las zonas de cobertura");
          }
        }
      } catch (error) {
        console.warn("Error validating coverage:", error);
        warnings.push("No se pudo validar completamente la cobertura");
      }
    }

    // 5. Validar capacidad/límites si es necesario
    // (Esto podría incluir: ¿está en cierre?, ¿hay demasiados pedidos pendientes?, etc.)

    // Determinar si es válido
    const valid = errors.length === 0;

    return { valid, errors, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    errors.push(`Error validando pedido: ${message}`);
    return { valid: false, errors, warnings };
  }
}

/**
 * Valida rápidamente si un servicio está disponible en una sucursal (sin detalles)
 */
export async function isServiceAvailableQuick(
  locationId: string,
  serviceChannel: "delivery" | "pickup" | "national_shipping",
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const channelCheck = await checkServiceChannelAvailability(locationId, serviceChannel, supabase);
    const scheduleCheck = await checkLocationSchedule(locationId, supabase);

    return channelCheck.enabled && scheduleCheck.isOpen;
  } catch {
    return false;
  }
}
