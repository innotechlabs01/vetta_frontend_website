import { NextRequest, NextResponse } from "next/server";

type Suggestion = {
  id: string;
  description: string;
  address: {
    line1: string | null;        // dirección principal
    line2: string | null;        // apto/local (no siempre disponible)
    city: string | null;
    province: string | null;     // departamento
    country: string | null;
    postal_code: string | null;
  };
  location: { lat: number | null; lng: number | null };
};

function parseAddressComponents(components: any[] = []) {
  const get = (type: string) => components.find(c => c.types.includes(type))?.long_name || null;
  // city: suele venir como 'locality' o 'administrative_area_level_2'
  const city = get("locality") || get("administrative_area_level_2");
  const province = get("administrative_area_level_1");
  const country = get("country");
  const postal = get("postal_code");
  return { city, province, country, postal_code: postal };
}

function buildLine1(result: any) {
  // Toma route + street_number si existen; si no, usa formatted_address como fallback corto
  const comps = result.address_components || [];
  const route = comps.find((c:any)=> c.types.includes("route"))?.long_name;
  const number = comps.find((c:any) => c.types.includes("street_number"))?.long_name;
  if (route && number) return `${route} ${number}`;
  if (route) return route;
  // Como último recurso, usa name o el primer fragmento del formatted_address
  return result.name || result.formatted_address?.split(",")[0] || null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  // Si hay lat/lng, hacer reverse geocoding
  if (lat && lng) {
    return handleReverseGeocode(req, lat, lng);
  }

  if (!q) return NextResponse.json([], {
    headers: { "Cache-Control": "public, max-age=600, s-maxage=600" },
  });

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY_SECRET ||
    process.env.GOOGLE_MAPS_API_KEY_SECRET ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY; // usa una key para servidor (no referrer)
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  // 1) Autocomplete limitado a Colombia en español
  const acParams = new URLSearchParams({
    input: q,
    language: "es",
    region: "CO",
    key: apiKey,
  });
  const acUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${acParams}`;
  const acRes = await fetch(acUrl);
  const acData = await acRes.json();

  if (acData?.status !== "OK" && acData?.status !== "ZERO_RESULTS") {
    return NextResponse.json(
      { error: acData?.status, message: acData?.error_message || "Autocomplete error" },
      { status: 400 }
    );
  }

  const predictions: any[] = acData?.predictions ?? [];
  if (!predictions.length) return NextResponse.json([]);

  // 2) Para cada prediction, llama Place Details y arma el objeto estructurado
  const top = predictions.slice(0, 5); // limita para costo/latencia
  const results: Suggestion[] = [];

  for (const p of top) {
    const detailsParams = new URLSearchParams({
      place_id: p.place_id,
      language: "es",
      // Fields mínimos para dirección y geoloc:
      fields: "address_components,formatted_address,geometry/location,name",
      key: apiKey,
    });
    const dUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`;
    const dRes = await fetch(dUrl);
    const dData = await dRes.json();

    if (dData?.status !== "OK") {
      // si falla un details, lo omitimos
      continue;
    }

    const r = dData.result;
    const addr = parseAddressComponents(r.address_components);
    results.push({
      id: p.place_id,
      description: p.description, // lo que ves en el dropdown
      address: {
        line1: buildLine1(r),
        line2: null, // esto casi nunca viene estructurado; el usuario lo puede completar
        city: addr.city,
        province: addr.province,
        country: addr.country,
        postal_code: addr.postal_code,
      },
      location: {
        lat: r.geometry?.location?.lat ?? null,
        lng: r.geometry?.location?.lng ?? null,
      },
    });
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "public, max-age=600, s-maxage=600" },
  });
}

async function handleReverseGeocode(req: NextRequest, lat: string, lng: string) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY_SECRET ||
    process.env.GOOGLE_MAPS_API_KEY_SECRET ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=es&key=${apiKey}`;
  
  try {
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();

    if (geocodeData?.status !== "OK" || !geocodeData?.results?.length) {
      return NextResponse.json({ error: "No se pudo obtener la dirección" }, { status: 400 });
    }

    const result = geocodeData.results[0];
    const addr = parseAddressComponents(result.address_components);
    
    return NextResponse.json({
      address: {
        formatted: result.formatted_address,
        line1: buildLine1(result),
        line2: null,
        city: addr.city,
        province: addr.province,
        country: addr.country,
        postal_code: addr.postal_code,
        neighborhood: result.address_components.find((c: any) => c.types.includes("neighborhood"))?.long_name || null,
      },
      location: {
        lat: latitude,
        lng: longitude,
      },
    });
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return NextResponse.json({ error: "Error en geocodificación" }, { status: 500 });
  }
}
