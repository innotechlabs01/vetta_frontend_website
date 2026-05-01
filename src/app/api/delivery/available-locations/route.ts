/**
 * GET /api/delivery/available-locations
 * 
 * Endpoint para consultar sucursales disponibles para delivery
 * Usa PostGIS para búsquedas geoespaciales eficientes
 */
export const dynamic = 'force-dynamic';


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkLocationSchedule, checkServiceChannelAvailability } from "@/utils/schedule-validation";

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

/**
 * Calcula distancia entre dos puntos en KM (Haversine formula)
 * Ya no se usa - se mantiene por compatibilidad
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const organizationId = searchParams.get("organization_id");
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "organization_id es requerido" },
        { status: 400 }
      );
    }

    const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null;
    const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null;
    const service = (searchParams.get("service") || "delivery") as
      | "delivery"
      | "pickup"
      | "national_shipping";
    const radiusKm = parseFloat(searchParams.get("radius_km") || "5");
    const dateTimeStr = searchParams.get("date_time");
    const checkTime = dateTimeStr ? new Date(dateTimeStr) : new Date();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Configuración de Supabase incompleta" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let locations: any[] = [];

    // Usar PostGIS si hay coordenadas del cliente
    if (lat != null && lng != null) {
      // Usar la función find_nearest_location de PostGIS
      const { data: nearestLocations, error: nearestError } = await supabase.rpc(
        "find_nearest_location",
        {
          p_org_id: organizationId,
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radiusKm,
          p_service_channel: service,
        }
      );

      if (nearestError) {
        console.error("Error en find_nearest_location:", nearestError);
      } else if (nearestLocations && nearestLocations.length > 0) {
        locations = nearestLocations;
      }
    }

    // Si no hay coordenadas o no hay resultados de PostGIS, obtener todas las ubicaciones
    if (locations.length === 0) {
      const { data: allLocations, error: locError } = await supabase
        .from("locations")
        .select(
          "id,name,address_line1,address_line2,city,province,latitude,longitude,local_delivery_enabled,pickup_enabled,shipping_enabled,is_active"
        )
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (locError) {
        console.error("Error fetching locations:", locError);
        return NextResponse.json(
          { success: false, error: "Error al obtener sucursales" },
          { status: 500 }
        );
      }

      if (!allLocations || allLocations.length === 0) {
        return NextResponse.json(
          { success: true, locations: [], total: 0 },
          { status: 200 }
        );
      }

      // Filtrar por canal de servicio
      locations = allLocations.filter((loc: any) => {
        if (service === "delivery") return loc.local_delivery_enabled;
        if (service === "pickup") return loc.pickup_enabled;
        if (service === "national_shipping") return loc.shipping_enabled;
        return true;
      });
    }

    // Enriquecer ubicaciones con información adicional
    const availableLocations: AvailableLocation[] = [];

    for (const loc of locations) {
      // Verificar disponibilidad del canal
      const channelCheck = await checkServiceChannelAvailability(loc.id, service, supabase);
      if (!channelCheck.enabled) {
        continue;
      }

      // Verificar horarios
      const scheduleCheck = await checkLocationSchedule(loc.id, supabase, checkTime);

      // Obtener información de cobertura
      let deliveryTimeMinutes: number | undefined;
      let logisticsCost: number | undefined;
      let coverageZoneCount: number | undefined;

      if (service === "delivery" || service === "national_shipping") {
        const { data: zones } = await supabase
          .from("location_coverage_zones")
          .select("delivery_time_minutes,logistics_cost")
          .eq("location_id", loc.id)
          .eq("organization_id", organizationId)
          .limit(1)
          .single();

        if (zones) {
          deliveryTimeMinutes = zones.delivery_time_minutes;
          logisticsCost = zones.logistics_cost;
        }

        const { count } = await supabase
          .from("location_coverage_zones")
          .select("id", { count: "exact", head: true })
          .eq("location_id", loc.id)
          .eq("organization_id", organizationId);

        coverageZoneCount = count || undefined;
      }

      const address = [loc.address_line1, loc.address_line2, loc.city, loc.province]
        .filter(Boolean)
        .join(", ");

      // Calcular distancia si no viene de PostGIS
      let distanceKm: number | undefined;
      if (loc.distance_meters != null) {
        distanceKm = loc.distance_meters / 1000;
      } else if (lat != null && lng != null && loc.latitude && loc.longitude) {
        distanceKm = calculateDistance(lat, lng, loc.latitude, loc.longitude);
      }

      availableLocations.push({
        id: loc.id,
        name: loc.name,
        address: address || "Sin dirección",
        latitude: loc.latitude,
        longitude: loc.longitude,
        distance_km: distanceKm ? Math.round(distanceKm * 100) / 100 : undefined,
        is_open_now: scheduleCheck.isOpen,
        open_time: scheduleCheck.currentRangeOpen,
        close_time: scheduleCheck.currentRangeClose,
        next_open_time: scheduleCheck.nextOpen?.toISOString(),
        delivery_time_minutes: deliveryTimeMinutes,
        logistics_cost: logisticsCost,
        coverage_zones: coverageZoneCount,
      });
    }

    // Ordenar por distancia si está disponible
    if (availableLocations.length > 0 && availableLocations[0].distance_km != null) {
      availableLocations.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    return NextResponse.json(
      {
        success: true,
        locations: availableLocations,
        total: availableLocations.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en available-locations:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
