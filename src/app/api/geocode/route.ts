import { NextRequest, NextResponse } from "next/server";

interface AddressSuggestion {
  id: string;
  description: string;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    postal_code: string | null;
  };
  location: { lat: number | null; lng: number | null };
}

interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface NominatimReverse {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

function parseAddressNominatim(addr: NominatimPlace["address"]): {
  line1: string | null;
  line2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  postal_code: string | null;
} {
  if (!addr) {
    return {
      line1: null,
      line2: null,
      city: null,
      province: null,
      country: null,
      postal_code: null,
    };
  }

  const line1 = [addr.road, addr.house_number].filter(Boolean).join(" ") || null;
  const line2 = addr.neighbourhood || addr.suburb || null;
  const city = addr.city || addr.municipality || addr.county || null;
  const province = addr.state || null;
  const country = addr.country || null;
  const postal_code = addr.postcode || null;

  return { line1, line2, city, province, country, postal_code };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (lat && lng) {
    return handleReverseGeocode(req, lat, lng);
  }

  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  const results = await searchAddresses(q);
  return NextResponse.json(results);
}

async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  // Nominatim tiene cobertura limitada en Sabaneta
  // Primero buscar como ciudad/barrio, luego expandir
  
  // Intentar búsqueda con múltiples variaciones
  const searchQueries = [
    query,
    query.replace(/sur/gi, "sur").replace(/Sur/gi, "Sur"),
    query + ", Sabaneta, Antioquia, Colombia",
    query + ", Antioquia, Colombia",
  ];
  
  for (const searchQuery of searchQueries) {
    const params = new URLSearchParams({
      q: searchQuery,
      format: "json",
      addressdetails: "1",
      limit: "10",
      countrycodes: "co",
      "accept-language": "es",
    });

    const url = `https://nominatim.openstreetmap.org/search?${params}`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "VettaApp/1.0 (contacto@vetta.app)",
          "Accept-Language": "es",
        },
      });

      if (!res.ok) continue;

      const data: NominatimPlace[] = await res.json();

      if (data && data.length > 0) {
        // Filtrar resultados más relevantes
        const results = data.map((place) => {
          const addr = parseAddressNominatim(place.address);
          return {
            id: String(place.place_id),
            description: place.display_name,
            address: addr,
            location: {
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lon),
            },
          };
        });

        // Priorizar resultados con tipo address (calles específicas)
        const addrResults = results.filter(r => 
          r.description.toLowerCase().includes("carrera") || 
          r.description.toLowerCase().includes("calle") ||
          r.description.toLowerCase().includes("diagonal")
        );
        
        return addrResults.length > 0 ? addrResults : results;
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  }

  return [];
}

async function handleReverseGeocode(req: NextRequest, lat: string, lng: string) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }

  const params = new URLSearchParams({
    lat: lat,
    lon: lng,
    format: "json",
    addressdetails: "1",
    "accept-language": "es",
  });

  const url = `https://nominatim.openstreetmap.org/reverse?${params}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "VettaApp/1.0 (contacto@vetta.app)",
        "Accept-Language": "es",
      },
    });

    if (!res.ok) {
      console.error("Nominatim reverse error:", res.status);
      return NextResponse.json({ error: "Error en geocodificación" }, { status: 500 });
    }

    const data: NominatimReverse = await res.json();

    if (!data || !data.lat) {
      return NextResponse.json({ error: "No se pudo obtener la dirección" }, { status: 400 });
    }

    const addr = parseAddressNominatim(data.address);

    return NextResponse.json({
      address: {
        formatted: data.display_name,
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        province: addr.province,
        country: addr.country,
        postal_code: addr.postal_code,
        neighborhood: data.address?.neighbourhood || data.address?.suburb || null,
      },
      location: {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
      },
    });
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return NextResponse.json({ error: "Error en geocodificación" }, { status: 500 });
  }
}
