/**
 * Hook para consultar sucursales disponibles con delivery/pickup/shipping
 * 
 * Uso:
 * const { locations, loading, error } = useAvailableLocations({
 *   organizationId: "org-123",
 *   service: "delivery",
 *   lat: 4.7110, 
 *   lng: -74.0721,
 *   radiusKm: 5
 * })
 */

import { useEffect, useState, useCallback } from "react";

interface AvailableLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  is_open_now: boolean;
  open_time?: string;
  close_time?: string;
  next_open_time?: string;
  delivery_time_minutes?: number;
  logistics_cost?: number;
  coverage_zones?: number;
}

interface UseAvailableLocationsParams {
  organizationId: string;
  service?: "delivery" | "pickup" | "national_shipping";
  lat?: number;
  lng?: number;
  radiusKm?: number;
  dateTime?: Date;
  enabled?: boolean; // Para permitir control manual de cuándo hacer fetch
}

interface UseAvailableLocationsResult {
  locations: AvailableLocation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAvailableLocations({
  organizationId,
  service = "delivery",
  lat,
  lng,
  radiusKm = 5,
  dateTime,
  enabled = true,
}: UseAvailableLocationsParams): UseAvailableLocationsResult {
  const [locations, setLocations] = useState<AvailableLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    if (!enabled || !organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        organization_id: organizationId,
        service,
        radius_km: String(radiusKm),
      });

      if (lat != null && lng != null) {
        params.append("lat", String(lat));
        params.append("lng", String(lng));
      }

      if (dateTime) {
        params.append("date_time", dateTime.toISOString());
      }

      const response = await fetch(`/api/delivery/available-locations?${params}`);

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Error desconocido");
      }

      setLocations(data.locations || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, service, lat, lng, radiusKm, dateTime, enabled]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
  };
}

/**
 * Función standalone para consultar disponibilidad de una sucursal específica
 */
export async function checkLocationAvailability(
  organizationId: string,
  locationId: string,
  service: "delivery" | "pickup" | "national_shipping" = "delivery",
  dateTime?: Date
): Promise<{ isAvailable: boolean; reason?: string }> {
  try {
    const params = new URLSearchParams({
      organization_id: organizationId,
      service,
    });

    if (dateTime) {
      params.append("date_time", dateTime.toISOString());
    }

    const response = await fetch(`/api/delivery/available-locations?${params}`);

    if (!response.ok) {
      return { isAvailable: false, reason: "Error consultando disponibilidad" };
    }

    const data = await response.json();

    if (!data.success) {
      return { isAvailable: false, reason: data.error };
    }

    const location = (data.locations as AvailableLocation[]).find((l) => l.id === locationId);

    if (!location) {
      return {
        isAvailable: false,
        reason: "Sucursal no disponible para este servicio",
      };
    }

    return {
      isAvailable: location.is_open_now,
      reason: location.is_open_now ? undefined : `Abre a ${location.next_open_time}`,
    };
  } catch (error) {
    return {
      isAvailable: false,
      reason: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
