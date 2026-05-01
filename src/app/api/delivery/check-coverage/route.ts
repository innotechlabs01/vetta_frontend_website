/**
 * GET /api/delivery/check-coverage
 * 
 * Verifica si una ubicación está dentro de las zonas de cobertura de una sucursal
 * Usa PostGIS para validación geoespacial eficiente
 */
export const dynamic = 'force-dynamic';


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const organizationId = searchParams.get("organization_id");
    const locationId = searchParams.get("location_id");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!organizationId || !locationId || !lat || !lng) {
      return NextResponse.json(
        { success: false, error: "Parámetros requeridos faltantes" },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { success: false, error: "Coordenadas inválidas" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Configuración de Supabase incompleta" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener la sucursal
    const { data: location, error: locError } = await supabase
      .from("locations")
      .select("id, name, latitude, longitude, location")
      .eq("id", locationId)
      .single();

    if (locError || !location) {
      return NextResponse.json(
        { success: false, error: "Sucursal no encontrada" },
        { status: 404 }
      );
    }

    // Calcular distancia a la sucursal usando PostGIS si está disponible
    let distanceKm = null;
    if (location.location) {
      const { data: distanceData } = await supabase.rpc("calculate_distance_between_points", {
        lat1: latitude,
        lng1: longitude,
        lat2: location.latitude,
        lng2: location.longitude
      });
      
      if (distanceData) {
        distanceKm = distanceData / 1000;
      }
    } else {
      // Fallback a Haversine
      const R = 6371;
      const dLat = ((location.latitude - latitude) * Math.PI) / 180;
      const dLng = ((location.longitude - longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((latitude * Math.PI) / 180) *
          Math.cos((location.latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = R * c;
    }

    // Usar la función PostGIS para verificar cobertura
    const { data: coverageData, error: coverageError } = await supabase.rpc(
      "is_point_in_coverage_zone",
      {
        p_location_id: locationId,
        p_lat: latitude,
        p_lng: longitude,
      }
    );

    if (coverageError) {
      console.error("Error en is_point_in_coverage_zone:", coverageError);
    }

    if (coverageData && coverageData.length > 0 && coverageData[0].is_covered) {
      const zone = coverageData[0];
      return NextResponse.json(
        {
          success: true,
          is_covered: true,
          zone: {
            id: zone.zone_id,
            name: zone.zone_name,
            logistics_cost: zone.logistics_cost,
            delivery_time_minutes: zone.delivery_time_minutes,
          },
          distance_km: distanceKm,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        is_covered: false,
        zone: null,
        distance_km: distanceKm,
        message: "La ubicación está fuera de las zonas de cobertura",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en check-coverage:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
