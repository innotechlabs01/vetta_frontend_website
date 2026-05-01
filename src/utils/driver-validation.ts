/**
 * Validaciones para gestión de domiciliarios
 * 
 * Estas validaciones aseguran que:
 * 1. El domiciliario pertenece a la organización correcta
 * 2. El número de teléfono es único dentro de la organización
 * 3. La sucursal asignada está activa y pertenece a la organización
 * 4. Los datos del vehículo son consistentes
 */

import { getSupabaseBrowser } from "@/utils/supabase/client";
import type { LocationInfo } from "@/lib/get-env";

type SupabaseClient = ReturnType<typeof getSupabaseBrowser>;

export interface DriverValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida que un domiciliario pueda ser creado/actualizado
 */
export async function validateDriver({
  organizationId,
  input,
  driverId, // Para actualizaciones, ID del domiciliario existente
  supabase,
}: {
  organizationId: string;
  input: {
    name: string;
    phone?: string;
    location_id?: string;
    vehicle_type?: 'moto' | 'carro' | 'bicicleta';
    vehicle_plate?: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    is_active?: boolean;
    status?: 'available' | 'busy' | 'offline';
    max_simultaneous_orders?: number;
  };
  driverId?: string; // ID del domiciliario si es actualización
  supabase: SupabaseClient;
}): Promise<DriverValidationResult> {
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

    // 3. Validar unicidad de teléfono (si se proporciona)
    if (input.phone) {
      // Normalizar teléfono para comparación
      const normalizedPhone = input.phone.replace(/\s+/g, '').trim();
      
      if (normalizedPhone.length < 7) {
        warnings.push("El número de teléfono parece muy corto");
      }

      // Verificar si ya existe otro domiciliario con el mismo teléfono en la organización
      const { data: existingDrivers, error: phoneError } = await supabase
        .from("drivers")
        .select("id, phone")
        .eq("organization_id", organizationId)
        .ilike("phone", `%${input.phone.replace(/\s+/g, '')}%`)
        .neq("id", driverId ?? null); // Excluir el domiciliario actual si es actualización

      if (phoneError) {
        console.error("Error checking phone uniqueness:", phoneError);
        warnings.push("No se pudo validar la unicidad del teléfono");
      } else if (existingDrivers && existingDrivers.length > 0) {
        errors.push("Ya existe un domiciliario con este número de teléfono en la organización");
      }
    }

    // 4. Validar ubicación asignada (si se proporciona)
    if (input.location_id) {
      // Verificar que la ubicación existe y pertenece a la organización
      const { data: location, error: locationError } = await supabase
        .from("locations")
        .select("id, name, is_active, organization_id")
        .eq("id", input.location_id)
        .single();

      if (locationError) {
        errors.push("Ubicación no encontrada");
      } else if (!location) {
        errors.push("Ubicación no encontrada");
      } else if (location.organization_id !== organizationId) {
        errors.push("La ubicación no pertenece a la organización especificada");
      } else if (location.is_active === false) {
        warnings.push("La ubicación seleccionada está inactiva");
      }
    }

    // 5. Validar placa de vehículo (si se proporciona)
    if (input.vehicle_plate) {
      const normalizedPlate = input.vehicle_plate.replace(/\s+/g, '').toUpperCase();
      
      if (normalizedPlate.length < 3) {
        warnings.push("La placa del vehículo parece muy corta");
      }

      // Verificar unicidad de placa dentro de la organización (opcional)
      if (input.vehicle_type) {
        const { data: existingPlates, error: plateError } = await supabase
          .from("drivers")
          .select("id, vehicle_plate")
          .eq("organization_id", organizationId)
          .eq("vehicle_type", input.vehicle_type)
          .ilike("vehicle_plate", `%${input.vehicle_plate}%`)
          .neq("id", driverId ?? null);

        if (plateError) {
          console.error("Error checking plate uniqueness:", plateError);
        } else if (existingPlates && existingPlates.length > 0) {
          warnings.push("Ya existe un domiciliario con el mismo tipo de vehículo y placa similar");
        }
      }
    }

    // 6. Validar órdenes simultáneas
    if (input.max_simultaneous_orders !== undefined) {
      if (input.max_simultaneous_orders < 1) {
        errors.push("El número máximo de órdenes simultáneas debe ser al menos 1");
      } else if (input.max_simultaneous_orders > 10) {
        warnings.push("El número máximo de órdenes simultáneas es muy alto, considere reducirlo");
      }
    }

    // Determinar si es válido
    const valid = errors.length === 0;

    return { valid, errors, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    errors.push(`Error validando domiciliario: ${message}`);
    return { valid: false, errors, warnings };
  }
}