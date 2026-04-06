"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, RefreshCcw, X, Check, Trash2, Upload, Search, MapPin } from "lucide-react";

// ------------------ Tipos ------------------

type Location = {
  id: string;
  organization_id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  // Dirección
  address_line1: string | null;
  address_line2: string | null; // Apto, local, etc.
  city: string | null;
  province: string | null; // Departamento / provincia
  country: string | null; // País o región
  postal_code: string | null;
  phone: string | null;
  // Config switches
  prep_orders: boolean; // Usar inventario de esta sucursal para pedidos online
  shipping_enabled: boolean; // Envío
  local_delivery_enabled: boolean; // Entrega local
  pickup_enabled: boolean; // Retiro en tienda
  created_at?: string | null;
  updated_at?: string | null;

  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  place_description?: string | null;

};

type TimeRange = { open_time: string; close_time: string };
type DayRow = {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Dom
  is_open: boolean;
  ranges: TimeRange[];  // <= 2
};

type SpecialRange = TimeRange;

type SpecialDay = {
  id?: string;
  date: string;               // "YYYY-MM-DD"
  label?: string;
  is_closed: boolean;
  ranges: SpecialRange[];     // si is_closed=false, al menos 1 rango
  note?: string;
};

type CoverageZone = {
  id: string;
  name: string;
  color: string;
  logistics_cost: string;
  delivery_time_minutes: string;
};

const COVERAGE_COLORS = ["#22c55e", "#0ea5e9", "#f97316", "#a855f7", "#ef4444", "#14b8a6"];
const DEFAULT_ZONE_COLOR = COVERAGE_COLORS[0];

function nextCoverageColor(index: number) {
  return COVERAGE_COLORS[index % COVERAGE_COLORS.length] ?? DEFAULT_ZONE_COLOR;
}

type MapPoint = { lat: number; lng: number };

const DEFAULT_MAP_CENTER: MapPoint = { lat: 4.711, lng: -74.0721 };

let googleMapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("Window unavailable"));
  if ((window as any).google?.maps) return Promise.resolve();

  if (!googleMapsScriptPromise) {
    googleMapsScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Error cargando Google Maps")));
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMaps = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Error cargando Google Maps"));
      document.head.appendChild(script);
    });
  }

  return googleMapsScriptPromise;
}

function useGoogleMapsApi() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      return;
    }
    loadGoogleMapsScript(apiKey)
      .then(() => setReady(true))
      .catch((err: Error) => setError(err.message));
  }, []);

  return { ready, error };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  const normalized = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  if (normalized.length !== 6) return null;
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

function saturateHexColor(hex: string, amount = 0.2) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const nextS = clamp(s + amount, 0, 1);
  const next = hslToRgb(h, nextS, l);
  return rgbToHex(next.r, next.g, next.b);
}

function parseCoveragePath(raw: any): MapPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((point) => ({
      lat: Number(point?.lat),
      lng: Number(point?.lng),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function parseLogisticsCost(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDeliveryMinutes(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}

type CoverageOverlay = CoverageZone & { path: MapPoint[] };

type CoverageOverviewMapProps = {
  center: MapPoint;
  zoom: number;
  marker?: MapPoint | null;
  zones: CoverageOverlay[];
  onZoneClick?: (zoneId: string) => void;
  className?: string;
};

function CoverageOverviewMap({ center, zoom, marker, zones, onZoneClick, className }: CoverageOverviewMapProps) {
  const { ready, error } = useGoogleMapsApi();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polygonsRef = useRef<Map<string, any>>(new Map());
  const listenersRef = useRef<Map<string, any[]>>(new Map());
  const zoneMetaRef = useRef<Map<string, CoverageOverlay>>(new Map());
  const onZoneClickRef = useRef<typeof onZoneClick>(onZoneClick);

  useEffect(() => {
    onZoneClickRef.current = onZoneClick;
  }, [onZoneClick]);

  useEffect(() => {
    zoneMetaRef.current = new Map(zones.map((zone) => [zone.id, zone]));
  }, [zones]);

  useEffect(() => {
    if (!ready || !mapContainerRef.current) return;
    const g = (window as any).google;

    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapContainerRef.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      return;
    }

    mapRef.current.setCenter(center);
    mapRef.current.setZoom(zoom);
  }, [ready, center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const map = mapRef.current;

    if (marker) {
      if (!markerRef.current) {
        markerRef.current = new g.maps.Marker({ map, position: marker });
      } else {
        markerRef.current.setPosition(marker);
        markerRef.current.setMap(map);
      }
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [ready, marker?.lat, marker?.lng]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const map = mapRef.current;

    const activeIds = new Set(zones.map((zone) => zone.id));

    polygonsRef.current.forEach((polygon, id) => {
      if (!activeIds.has(id)) {
        polygon.setMap(null);
        const listeners = listenersRef.current.get(id) ?? [];
        listeners.forEach((listener) => listener.remove());
        listenersRef.current.delete(id);
        polygonsRef.current.delete(id);
      }
    });

    zones.forEach((zone) => {
      if (zone.path.length < 3) {
        const existing = polygonsRef.current.get(zone.id);
        if (existing) {
          existing.setMap(null);
        }
        return;
      }

      let polygon = polygonsRef.current.get(zone.id);
      if (!polygon) {
        const zoneId = zone.id;
        polygon = new g.maps.Polygon({
          map,
          strokeColor: zone.color,
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: zone.color,
          fillOpacity: 0.2,
        });
        polygonsRef.current.set(zone.id, polygon);

        const listeners = [
          polygon.addListener("mouseover", () => {
            const meta = zoneMetaRef.current.get(zoneId);
            const baseColor = meta?.color || zone.color;
            const highlightColor = saturateHexColor(baseColor, 0.25);
            polygon.setOptions({ fillOpacity: 0.38, fillColor: highlightColor, strokeColor: highlightColor });
          }),
          polygon.addListener("mouseout", () => {
            const meta = zoneMetaRef.current.get(zoneId);
            const baseColor = meta?.color || zone.color;
            polygon.setOptions({ fillOpacity: 0.2, fillColor: baseColor, strokeColor: baseColor });
          }),
          polygon.addListener("click", () => {
            onZoneClickRef.current?.(zoneId);
          }),
        ];
        listenersRef.current.set(zone.id, listeners);
      }

      polygon.setOptions({ strokeColor: zone.color, fillColor: zone.color });
      polygon.setPath(zone.path);
      polygon.setMap(map);
    });
  }, [ready, zones]);

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <div ref={mapContainerRef} className="absolute inset-0" />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-xs text-muted-foreground">
          {error}
        </div>
      ) : (
        !ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-xs text-muted-foreground">
            Cargando mapa...
          </div>
        )
      )}
    </div>
  );
}

type GoogleMapCanvasProps = {
  center: MapPoint;
  zoom: number;
  marker?: MapPoint | null;
  polygon?: MapPoint[];
  polygonColor?: string;
  overlays?: { id: string; path: MapPoint[]; color: string }[];
  onMapClick?: (point: MapPoint) => void;
  preserveView?: boolean;
  className?: string;
};

function GoogleMapCanvas({
  center,
  zoom,
  marker,
  polygon,
  polygonColor = DEFAULT_ZONE_COLOR,
  overlays,
  onMapClick,
  preserveView = false,
  className,
}: GoogleMapCanvasProps) {
  const { ready, error } = useGoogleMapsApi();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const pointMarkersRef = useRef<any[]>([]);
  const overlayPolygonsRef = useRef<Map<string, any>>(new Map());
  const clickListenerRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !mapContainerRef.current) return;
    const g = (window as any).google;

    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapContainerRef.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      return;
    }

    if (!preserveView) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(zoom);
    }
  }, [ready, center.lat, center.lng, zoom, preserveView]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const map = mapRef.current;

    if (marker) {
      if (!markerRef.current) {
        markerRef.current = new g.maps.Marker({ map, position: marker });
      } else {
        markerRef.current.setPosition(marker);
        markerRef.current.setMap(map);
      }
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [ready, marker?.lat, marker?.lng]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const map = mapRef.current;
    const path = polygon ?? [];

    if (!polylineRef.current) {
      polylineRef.current = new g.maps.Polyline({
        map,
        strokeColor: polygonColor,
        strokeOpacity: 0.9,
        strokeWeight: 3,
        zIndex: 4,
      });
    }
    polylineRef.current.setOptions({ strokeColor: polygonColor });
    polylineRef.current.setPath(path);

    if (path.length >= 3) {
      if (!polygonRef.current) {
        polygonRef.current = new g.maps.Polygon({
          map,
          strokeColor: polygonColor,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: polygonColor,
          fillOpacity: 0.2,
          zIndex: 3,
        });
      }
      polygonRef.current.setOptions({ strokeColor: polygonColor, fillColor: polygonColor });
      polygonRef.current.setPath(path);
      polygonRef.current.setMap(map);
    } else if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }

    pointMarkersRef.current.forEach((m) => m.setMap(null));
    pointMarkersRef.current = path.map((point: MapPoint, index: number) => new g.maps.Marker({
      map,
      position: point,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: polygonColor,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 1,
      },
      label: {
        text: String(index + 1),
        color: "#111827",
        fontSize: "10px",
      },
    }));
  }, [ready, polygon, polygonColor]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const map = mapRef.current;
    const overlayList = overlays ?? [];
    const activeIds = new Set(overlayList.map((overlay) => overlay.id));

    overlayPolygonsRef.current.forEach((polygon, id) => {
      if (!activeIds.has(id)) {
        polygon.setMap(null);
        overlayPolygonsRef.current.delete(id);
      }
    });

    overlayList.forEach((overlay) => {
      if (overlay.path.length < 3) {
        const existing = overlayPolygonsRef.current.get(overlay.id);
        if (existing) existing.setMap(null);
        return;
      }

      let polygon = overlayPolygonsRef.current.get(overlay.id);
      if (!polygon) {
        polygon = new g.maps.Polygon({
          map,
          strokeColor: overlay.color,
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillColor: overlay.color,
          fillOpacity: 0.12,
          clickable: false,
          zIndex: 1,
        });
        overlayPolygonsRef.current.set(overlay.id, polygon);
      }

      polygon.setOptions({ strokeColor: overlay.color, fillColor: overlay.color });
      polygon.setPath(overlay.path);
      polygon.setMap(map);
    });
  }, [ready, overlays]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }

    if (!onMapClick) return;
    clickListenerRef.current = map.addListener("click", (event: any) => {
      if (!event?.latLng) return;
      onMapClick({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    });

    return () => {
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
    };
  }, [ready, onMapClick]);

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <div ref={mapContainerRef} className="absolute inset-0" />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-xs text-muted-foreground">
          {error}
        </div>
      ) : (
        !ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-xs text-muted-foreground">
            Cargando mapa...
          </div>
        )
      )}
    </div>
  );
}

const DEFAULT_WEEKLY: DayRow[] = [
  { weekday: 1, is_open: false, ranges: [] }, // Lunes
  { weekday: 2, is_open: false, ranges: [] },
  { weekday: 3, is_open: false, ranges: [] },
  { weekday: 4, is_open: false, ranges: [] },
  { weekday: 5, is_open: false, ranges: [] },
  { weekday: 6, is_open: false, ranges: [] },
  { weekday: 0, is_open: false, ranges: [] }, // Domingo
];

const DEFAULT_SPECIALS: SpecialDay[] = [
  { date: "2025-10-13", label: "Día de la Raza", is_closed: true, ranges: [] },
  { date: "2025-11-03", label: "Día de todos los Santos", is_closed: true, ranges: [] },
  { date: "2025-11-17", label: "Independencia de Cartagena", is_closed: true, ranges: [] },
  { date: "2025-12-07", label: "Día Velitas", is_closed: true, ranges: [] },
  { date: "2025-12-08", label: "Inmaculada Concepción", is_closed: true, ranges: [] },
  { date: "2025-12-24", label: "Noche Buena", is_closed: true, ranges: [] },
  { date: "2025-12-25", label: "Navidad", is_closed: true, ranges: [] },
  { date: "2025-12-31", label: "Fin de año", is_closed: true, ranges: [] },
];

function addMinutesStr(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  let t = h * 60 + m + minutes;
  // clamp al día 00:00..24:00 (23:59)
  t = Math.max(0, Math.min(t, 24 * 60 - 1));
  const hh = String(Math.floor(t / 60)).padStart(2, "0");
  const mm = String(t % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isValidRange(r: TimeRange) {
  const a = toMinutes(r.open_time);
  const b = toMinutes(r.close_time);
  return a >= 0 && b > a && (b - a) >= 120; // >= 2h
}

function hasOneHourGap(a: TimeRange, b: TimeRange) {
  // asume a termina antes que b empieza
  const endA = toMinutes(a.close_time);
  const startB = toMinutes(b.open_time);
  return (startB - endA) >= 60; // >= 1h
}

function normalizeAndValidateRanges(ranges: TimeRange[]): { ok: boolean; msg?: string } {
  const rs = [...ranges].sort((x, y) => toMinutes(x.open_time) - toMinutes(y.open_time));
  if (rs.length > 2) return { ok: false, msg: "Máximo 2 turnos por día." };
  for (const r of rs) {
    if (!isValidRange(r)) return { ok: false, msg: "Cada turno debe durar mínimo 2 horas y fin > inicio." };
  }
  if (rs.length === 2 && rs[1]) {
    if (!hasOneHourGap(rs[0], rs[1])) return { ok: false, msg: "Debe existir al menos 1 hora de diferencia entre turnos." };
  }
  return { ok: true };
}

// ------------------ Utils ------------------

function validateSpecials(specs: SpecialDay[]) {
  const errors: string[] = [];
  const seen = new Set<string>();

  specs.forEach((s, idx) => {
    const label = (s.label ?? "").trim();
    const date = (s.date ?? "").trim();

    if (!date) {
      errors.push(`Error en Horario Especial: \n Fila ${idx + 1}, La fecha es obligatoria.`);
      return;
    }
    if (!label) {
      errors.push(`Error en Horario Especial: \n "${date}", El nombre es obligatorio.`);
      return;
    }

    // 👇 Duplicados
    if (seen.has(date)) {
      errors.push(`Error en Horario Especial: \n Ya existe una fecha especial para "${date}".`);
      return;
    }
    seen.add(date);

    if (!s.is_closed) {
      if (s.ranges.length === 0) {
        errors.push(`Error en Horario Especial: \n "${label}" (${date}), agrega al menos una franja o marca "Cerrar todo el día".`);
        return;
      }
      const { ok, msg } = normalizeAndValidateRanges(s.ranges);
      if (!ok) errors.push(`"${label}" (${date}): ${msg}`);
    }
  });

  return errors;
}

function uuid() {
  // simple uuid v4 fallback
  return (crypto as any)?.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Very small debounce helper
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function isDuplicateDate(specs: SpecialDay[], date: string, idxToIgnore?: number) {
  const d = (date ?? "").trim();
  if (!d) return false;
  return specs.some((s, i) => i !== idxToIgnore && (s.date ?? "").trim() === d);
}

// ------------------ Google Places (plug‑n‑play) ------------------
// Para usar con Google Places Autocomplete crea un endpoint /api/places o
// inyecta un provider via props. Aquí dejamos un hook minimal con fetch opcional.

type PlaceSuggestion = { id: string; description: string };

function usePlacesAutocomplete(query: string, provider?: (q: string) => Promise<PlaceSuggestion[]>) {
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const q = useDebounced(query, 300);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!q || !provider) {
        setResults([]);
        return;
      }
      try {
        setLoading(true);
        const r = await provider(q);
        if (!cancelled) setResults(r);
      } catch (_) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [q, provider]);

  return { results, loading };
}

// ------------------ Modal Crear/Editar ------------------

type LocationModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (l: Location) => void;
  organizationId?: string;
  location?: Location | null;
  placesProvider?: (q: string) => Promise<PlaceSuggestion[]>; // opcional: para el dropdown de Maps
};

function LocationModal({ open, onClose, onSaved, location, organizationId, placesProvider }: LocationModalProps) {
  const supabase = getSupabaseBrowser();
  const isEdit = Boolean(location?.id);

  const [name, setName] = useState(location?.name ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(location?.image_url ?? null);
  const [isActive, setIsActive] = useState<boolean>(location?.is_active ?? true);
  const loadedSpecialIdsRef = useRef<Set<string>>(new Set());
  const loadedCoverageIdsRef = useRef<Set<string>>(new Set());

  // Dirección
  const [address1, setAddress1] = useState(location?.address_line1 ?? "");
  const [address2, setAddress2] = useState(location?.address_line2 ?? "");
  const [city, setCity] = useState(location?.city ?? "");
  const [province, setProvince] = useState(location?.province ?? "");
  const [country, setCountry] = useState(location?.country ?? "Colombia");
  const [postalCode, setPostalCode] = useState(location?.postal_code ?? "");
  const [phone, setPhone] = useState(location?.phone ?? "");
  const [placeId, setPlaceId] = useState<string | null>(location?.place_id ?? null);
  const [lat, setLat] = useState<number | null>(location?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(location?.longitude ?? null);
  const [placeDesc, setPlaceDesc] = useState<string | null>(location?.place_description ?? null);

  // Switches
  const [prepOrders, setPrepOrders] = useState<boolean>(location?.prep_orders ?? true);
  const [shippingEnabled, setShippingEnabled] = useState<boolean>(location?.shipping_enabled ?? false);
  const [localDeliveryEnabled, setLocalDeliveryEnabled] = useState<boolean>(location?.local_delivery_enabled ?? false);
  const [pickupEnabled, setPickupEnabled] = useState<boolean>(location?.pickup_enabled ?? false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Autocomplete de Maps para el buscador (address1)
  const [searchQ, setSearchQ] = useState("");
  const { results: placeResults, loading: placesLoading } = usePlacesAutocomplete(searchQ, placesProvider);
  const [showPlaces, setShowPlaces] = useState(false); // 👈 nuevo
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [weekly, setWeekly] = useState<DayRow[]>(DEFAULT_WEEKLY);
  const [specials, setSpecials] = useState<SpecialDay[]>(DEFAULT_SPECIALS);
  const [loadingHours, setLoadingHours] = useState(false);
  const [coverageZones, setCoverageZones] = useState<CoverageZone[]>([]);
  const [coveragePaths, setCoveragePaths] = useState<Record<string, MapPoint[]>>({});
  const [coverageEditorOpen, setCoverageEditorOpen] = useState(false);
  const [coverageEditorZoneId, setCoverageEditorZoneId] = useState<string | null>(null);
  const [savingCoverage, setSavingCoverage] = useState(false);

  useEffect(() => {
    async function loadHours() {
      if (!open || !organizationId) return;
      if (!location?.id) { // new
        setWeekly(DEFAULT_WEEKLY);
        setSpecials(DEFAULT_SPECIALS);
        setCoverageZones([]);
        setCoveragePaths({});
        loadedCoverageIdsRef.current = new Set();
        return;
      }
      try {
        setLoadingHours(true);
        const { data: w } = await supabase
          .from("location_hours_weekly")
          .select("weekday,is_open,open_time_1,close_time_1,open_time_2,close_time_2") // 👈
          .eq("location_id", location.id).order("weekday", { ascending: true });

        if (w?.length) {
          // Orden a L→D (1..6,0)
          const order = [1, 2, 3, 4, 5, 6, 0];
          const byWd = new Map<number, any>(w.map((r: any) => [r.weekday, r]));
          setWeekly(order.map((wd) => {
            const r = byWd.get(wd);
            if (!r) return { weekday: wd as DayRow["weekday"], is_open: false, ranges: [] };
            const ranges: TimeRange[] = [];
            if (r.open_time_1 && r.close_time_1) ranges.push({
              open_time: String(r.open_time_1).slice(0, 5),
              close_time: String(r.close_time_1).slice(0, 5),
            });
            if (r.open_time_2 && r.close_time_2) ranges.push({
              open_time: String(r.open_time_2).slice(0, 5),
              close_time: String(r.close_time_2).slice(0, 5),
            });
            return { weekday: r.weekday, is_open: !!r.is_open && ranges.length > 0, ranges };
          }));
        } else {
          setWeekly(DEFAULT_WEEKLY);
        }

        // especiales
        const { data: sd } = await supabase
          .from("location_special_days")
          .select("id,date,label,is_closed,note")
          .eq("location_id", location.id)
          .order("date", { ascending: true });

        if (sd?.length) {
          const ids = sd.map((d: any) => d.id);
          const { data: rng } = await supabase
            .from("location_special_day_ranges")
            .select("*")
            .in("special_day_id", ids);

          const byId = new Map<string, SpecialRange[]>();
          rng?.forEach((r: any) => {
            const arr = byId.get(r.special_day_id) || [];
            arr.push({ open_time: r.open_time.slice(0, 5), close_time: r.close_time.slice(0, 5) });
            byId.set(r.special_day_id, arr);
          });

          const mapped = sd.map((d: any) => ({
            id: d.id,
            date: d.date,
            label: d.label || undefined,
            is_closed: d.is_closed,
            note: d.note || undefined,
            ranges: byId.get(d.id) || [],
          }));

          setSpecials(mapped);
          loadedSpecialIdsRef.current = new Set(mapped.map(d => d.id!));
        } else {
          // En EDIT: no defaults; en NEW ya los pusimos arriba.
          setSpecials([]);
          loadedSpecialIdsRef.current = new Set();
        }

        const { data: coverageData, error: coverageError } = await supabase
          .from("location_coverage_zones")
          .select("id,name,color,logistics_cost,delivery_time_minutes,path,created_at")
          .eq("location_id", location.id)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: true });

        if (coverageError) throw coverageError;

        const mappedZones = (coverageData ?? []).map((row: any) => ({
          id: row.id,
          name: row.name ?? "",
          color: row.color ?? DEFAULT_ZONE_COLOR,
          logistics_cost: row.logistics_cost != null ? String(row.logistics_cost) : "",
          delivery_time_minutes: row.delivery_time_minutes != null ? String(row.delivery_time_minutes) : "",
        }));

        const mappedPaths: Record<string, MapPoint[]> = {};
        (coverageData ?? []).forEach((row: any) => {
          mappedPaths[row.id] = parseCoveragePath(row.path);
        });

        setCoverageZones(mappedZones);
        setCoveragePaths(mappedPaths);
        loadedCoverageIdsRef.current = new Set(mappedZones.map((zone) => zone.id));
      } catch (err: any) {
        toast.error(err?.message || "Error cargando datos de la sucursal");
      } finally {
        setLoadingHours(false);
      }
    }
    loadHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location?.id, organizationId]);

  useEffect(() => {
    if (!open) return;
    setName(location?.name ?? "");
    setImageUrl(location?.image_url ?? null);
    setIsActive(location?.is_active ?? true);

    setAddress1(location?.address_line1 ?? "");
    setAddress2(location?.address_line2 ?? "");
    setCity(location?.city ?? "");
    setProvince(location?.province ?? "");
    setCountry(location?.country ?? "Colombia");
    setPostalCode(location?.postal_code ?? "");
    setPhone(location?.phone ?? "");

    setPrepOrders(location?.prep_orders ?? true);
    setShippingEnabled(location?.shipping_enabled ?? false);
    setLocalDeliveryEnabled(location?.local_delivery_enabled ?? false);
    setPickupEnabled(location?.pickup_enabled ?? false);
    setPlaceId(location?.place_id ?? null);
    setLat(location?.latitude ?? null);
    setLng(location?.longitude ?? null);
    setPlaceDesc(location?.place_description ?? null);
    setCoverageZones([]);
    setCoveragePaths({});
    setCoverageEditorOpen(false);
    setCoverageEditorZoneId(null);
    loadedCoverageIdsRef.current = new Set();
    setSearchQ("");
    setShowPlaces(false);
  }, [open, location]);

  useEffect(() => {
    if (!open) {
      setCoverageEditorOpen(false);
      setCoverageEditorZoneId(null);
    }
  }, [open]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !organizationId) return;
    try {
      setUploading(true);
      const file = files[0];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${organizationId}/locations/${location?.id ?? "_new"}/${uuid()}.${ext}`;
      const { error } = await supabase.storage.from("location-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("location-images").getPublicUrl(path);
      setImageUrl(data?.publicUrl ?? null);
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      //e.currentTarget.value = "";
    }
  }

  useEffect(() => {
    if (!showPlaces) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPlaces(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowPlaces(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [showPlaces]);

  const onSelectPlace = (p: any) => {
    setAddress1(p.address?.line1 ?? p.description ?? "");
    setCity(p.address?.city ?? "");
    setProvince(p.address?.province ?? "");
    setCountry(p.address?.country ?? "Colombia");
    setPostalCode(p.address?.postal_code ?? "");

    // Datos obligatorios de la selección
    setPlaceId(p.id ?? null);
    setLat(p.location?.lat ?? null);
    setLng(p.location?.lng ?? null);
    setPlaceDesc(p.description ?? null);

    setSearchQ("");
    setShowPlaces(false);
  };

  const hasInvalidHours = useMemo(() => {
    // Validar que haya AL MENOS un día abierto
    const hasAnyOpenDay = weekly.some(d => d.is_open && d.ranges.length > 0);
    if (!hasAnyOpenDay) return true; // Sin horarios definidos = inválido

    // Validar rangos de días abiertos
    for (const d of weekly) {
      if (!d.is_open) continue;
      const v = normalizeAndValidateRanges(d.ranges);
      if (!v.ok) return true;
    }
    // Validar rangos de especiales
    for (const s of specials) {
      if (s.is_closed) continue;
      const v = normalizeAndValidateRanges(s.ranges);
      if (!v.ok) return true;
    }
    return false;
  }, [weekly, specials]);

  const hasCoords = lat != null && lng != null;
  const mapCenter = useMemo(
    () => (hasCoords ? { lat: lat as number, lng: lng as number } : DEFAULT_MAP_CENTER),
    [hasCoords, lat, lng]
  );
  const mapZoom = hasCoords ? 15 : 6;

  const addCoverageZone = () => {
    const id = uuid();
    const color = nextCoverageColor(coverageZones.length);
    setCoverageZones((prev) => [
      ...prev,
      { id, name: `zona ${prev.length + 1}`, color, logistics_cost: "", delivery_time_minutes: "" },
    ]);
    setCoveragePaths((prev) => ({ ...prev, [id]: [] }));
    setCoverageEditorZoneId(id);
    setCoverageEditorOpen(true);
  };

  const openCoverageEditor = (id: string) => {
    setCoverageEditorZoneId(id);
    setCoverageEditorOpen(true);
  };

  const handleZoneClick = (id: string) => {
    if (!coverageEditorOpen || coverageEditorZoneId !== id) {
      openCoverageEditor(id);
    }
  };

  const closeCoverageEditor = () => {
    setCoverageEditorOpen(false);
    setCoverageEditorZoneId(null);
  };

  const updateCoverageZone = (id: string, patch: Partial<CoverageZone>) => {
    setCoverageZones((prev) => prev.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)));
  };

  const removeCoverageZone = (id: string) => {
    setCoverageZones((prev) => prev.filter((zone) => zone.id !== id));
    setCoveragePaths((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (coverageEditorZoneId === id) closeCoverageEditor();
  };

  const addCoveragePoint = (point: MapPoint) => {
    if (!coverageEditorZoneId) return;
    setCoveragePaths((prev) => {
      const current = prev[coverageEditorZoneId] ?? [];
      return { ...prev, [coverageEditorZoneId]: [...current, point] };
    });
  };

  const removeLastCoveragePoint = () => {
    if (!coverageEditorZoneId) return;
    setCoveragePaths((prev) => {
      const current = prev[coverageEditorZoneId] ?? [];
      return { ...prev, [coverageEditorZoneId]: current.slice(0, -1) };
    });
  };

  const clearCoveragePoints = () => {
    if (!coverageEditorZoneId) return;
    setCoveragePaths((prev) => ({ ...prev, [coverageEditorZoneId]: [] }));
  };

  const activeCoverageZone = useMemo(
    () => coverageZones.find((zone) => zone.id === coverageEditorZoneId) ?? null,
    [coverageZones, coverageEditorZoneId]
  );
  const activeCoveragePath = useMemo(
    () => (coverageEditorZoneId ? coveragePaths[coverageEditorZoneId] ?? [] : []),
    [coverageEditorZoneId, coveragePaths]
  );

  const coverageOverlays = useMemo<CoverageOverlay[]>(
    () =>
      coverageZones.map((zone) => ({
        ...zone,
        path: coveragePaths[zone.id] ?? [],
      })),
    [coverageZones, coveragePaths]
  );

  const editorOverlays = useMemo(
    () => coverageOverlays.filter((zone) => zone.id !== coverageEditorZoneId),
    [coverageOverlays, coverageEditorZoneId]
  );

  const displayAddress = useMemo(() => {
    if (placeDesc) return placeDesc;
    const parts = [address1, address2, city, province, country].filter(Boolean);
    return parts.join(", ");
  }, [placeDesc, address1, address2, city, province, country]);

  const coordsLabel = useMemo(() => {
    if (lat == null || lng == null) return null;
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }, [lat, lng]);

  async function saveHours(locId: string) {
    // 1) WEEKLY (igual que ya tienes)
    await Promise.all(
      weekly.map((row) => {
        const { ok, msg } = row.is_open ? normalizeAndValidateRanges(row.ranges) : { ok: true };
        if (!ok) throw new Error(`Horario inválido (${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][row.weekday]}): ${msg}`);

        const r1 = row.ranges[0];
        const r2 = row.ranges[1];

        return supabase.from("location_hours_weekly").upsert(
          {
            location_id: locId,
            weekday: row.weekday,
            is_open: row.is_open && row.ranges.length > 0,
            open_time_1: r1 ? r1.open_time + ":00" : null,
            close_time_1: r1 ? r1.close_time + ":00" : null,
            open_time_2: r2 ? r2.open_time + ":00" : null,
            close_time_2: r2 ? r2.close_time + ":00" : null,
          },
          { onConflict: "location_id,weekday" }
        );
      })
    );

    // ---- ESPECIALES ----

    // 2.a) Determinar cuáles especiales válidos se van a conservar/crear
    const validToKeep = specials.filter((s) => {
      const label = (s.label ?? "").trim();
      const date = (s.date ?? "").trim();
      if (!date || !label) return false;
      if (s.is_closed) return true;
      if (s.ranges.length === 0) return false;
      const { ok } = normalizeAndValidateRanges(s.ranges);
      return ok;
    });

    const currentIds = new Set(validToKeep.map(s => s.id).filter(Boolean) as string[]);
    const prevIds = loadedSpecialIdsRef.current;

    // 2.b) Borrar en DB los especiales que existían y ya no están
    const toDelete = Array.from(prevIds).filter(id => !currentIds.has(id));

    if (toDelete.length) {
      // primero borrar rangos (si no hay FK ON DELETE CASCADE)
      await supabase.from("location_special_day_ranges").delete().in("special_day_id", toDelete);
      // luego borrar los días
      await supabase.from("location_special_days").delete().in("id", toDelete);
    }

    // 2.c) Upsert de los que quedan (crear/actualizar) + rangos
    for (const s of validToKeep) {
      const { data: dayRow, error: dayErr } = await supabase
        .from("location_special_days")
        .upsert({
          id: s.id, // si viene undefined => insert
          location_id: locId,
          date: s.date,
          is_closed: s.is_closed,
          label: s.label || null,
          note: s.note || null,
        })
        .select("*")
        .single();

      if (dayErr) throw dayErr;
      const dayId = dayRow.id;

      // limpiar rangos previos y reinsertar
      await supabase.from("location_special_day_ranges").delete().eq("special_day_id", dayId);

      if (!s.is_closed) {
        for (const r of s.ranges) {
          const { error: rErr } = await supabase.from("location_special_day_ranges").insert({
            special_day_id: dayId,
            open_time: r.open_time + ":00",
            close_time: r.close_time + ":00",
          });
          if (rErr) throw rErr;
        }
      }
    }

    // 2.d) Refrescar el set de ids cargados (útil si vuelves a abrir sin recargar)
    loadedSpecialIdsRef.current = new Set(
      validToKeep.map(s => s.id).filter(Boolean) as string[]
    );
  }

  async function saveCoverageZones(locId: string) {
    if (!organizationId) throw new Error("Falta negocio");
    const payload = coverageZones.map((zone) => ({
      id: zone.id,
      organization_id: organizationId,
      location_id: locId,
      name: zone.name?.trim() || "Zona sin nombre",
      color: zone.color || DEFAULT_ZONE_COLOR,
      logistics_cost: parseLogisticsCost(zone.logistics_cost),
      delivery_time_minutes: parseDeliveryMinutes(zone.delivery_time_minutes),
      path: coveragePaths[zone.id] ?? [],
    }));

    const currentIds = new Set(payload.map((zone) => zone.id));
    const prevIds = loadedCoverageIdsRef.current;
    const toDelete = Array.from(prevIds).filter((id) => !currentIds.has(id));

    if (toDelete.length) {
      const { error: deleteError } = await supabase
        .from("location_coverage_zones")
        .delete()
        .in("id", toDelete)
        .eq("organization_id", organizationId);
      if (deleteError) throw deleteError;
    }

    if (payload.length) {
      const { error: upsertError } = await supabase
        .from("location_coverage_zones")
        .upsert(payload, { onConflict: "id" });
      if (upsertError) throw upsertError;
    }

    loadedCoverageIdsRef.current = new Set(payload.map((zone) => zone.id));
  }

  async function persistCoverageAndClose() {
    if (!location?.id) {
      toast("Guarda la sucursal para persistir las zonas de cobertura.");
      closeCoverageEditor();
      return;
    }
    if (!organizationId) {
      toast.error("Falta negocio");
      return;
    }
    try {
      setSavingCoverage(true);
      await saveCoverageZones(location.id);
      toast.success("Cobertura guardada");
      closeCoverageEditor();
    } catch (err: any) {
      toast.error(err?.message || "Error guardando cobertura");
    } finally {
      setSavingCoverage(false);
    }
  }

  const onSubmit = async () => {
    try {
      setSaving(true);
      if (!organizationId) throw new Error("Falta negocio");

      if (!name.trim()) return toast.error("El nombre es obligatorio");
      if (!address1.trim()) return toast.error("La dirección es obligatoria");
      if (!city.trim()) return toast.error("La ciudad es obligatoria");
      if (!province.trim()) return toast.error("La provincia es obligatoria");

      // 🔐 Requerir selección real de Google Maps
      if (!placeId || lat == null || lng == null) {
        return toast.error("Debes seleccionar una dirección de Google Maps (no solo escribirla).");
      }

      const payload: Partial<Location> = {
        name: name.trim(),
        image_url: imageUrl,
        is_active: isActive,
        address_line1: address1?.trim() || null,
        address_line2: address2?.trim() || null,
        city: city?.trim() || null,
        province: province?.trim() || null,
        country: country?.trim() || null,
        postal_code: postalCode?.trim() || null,
        phone: phone?.trim() || null,
        prep_orders: prepOrders,
        shipping_enabled: shippingEnabled,
        local_delivery_enabled: localDeliveryEnabled,
        pickup_enabled: pickupEnabled,
        place_id: placeId,
        place_description: placeDesc,
        latitude: lat,
        longitude: lng,
      };

      let locId: string;

      const specialErrors = validateSpecials(specials);
      if (specialErrors.length > 0) {
        toast.error(specialErrors[0]); // muestra el primer error encontrado
        setSaving(false);
        return;
      }

      if (isEdit) {
        const { data, error } = await supabase
          .from("locations")
          .update(payload)
          .eq("id", location!.id)
          .select("*")
          .single();
        if (error) throw error;

        locId = data.id; // id existente

        // 🔁 Guardar horarios también en EDIT
        await saveHours(locId);
        await saveCoverageZones(locId);

        onSaved(data as Location);
        toast.success("Sucursal actualizada");
        onClose();
        return;
      }

      // CREATE
      const { data, error } = await supabase
        .from("locations")
        .insert([{ ...payload, organization_id: organizationId }])
        .select("*")
        .single();
      if (error) throw error;

      locId = data.id;

      // 🔁 Guardar horarios también en CREATE
      await saveHours(locId);
      await saveCoverageZones(locId);

      onSaved(data as Location);
      toast.success("Sucursal creada");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Error guardando la sucursal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())} >
        <DialogContent className="w-screen h-screen sm:rounded-none max-w-screen pb-8">
          {/* HEADER */}
          <DialogHeader className="sticky py-3">
            <div className="w-full flex justify-between sticky top-0 z-10 items-center gap-3">
              <div className="flex justify-center">
                <DialogTitle className="flex items-center gap-2 text-base md:text-xl">
                  {isEdit ? "Editar sucursal" : "Nueva sucursal"}
                  {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{" "}
                </DialogTitle>
              </div>

              {/* Col 3: acciones + X, alineadas a la derecha */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="outline" size="lg" onClick={onClose} disabled={saving}>
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
                
                {/* Mostrar mensaje de validación */}
                {(hasInvalidHours || !placeId || lat == null || lng == null) && (
                  <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    {hasInvalidHours && "✓ Configura horarios"}
                    {!placeId && "✓ Selecciona dirección"}
                  </div>
                )}
                
                <Button size="lg" onClick={onSubmit}
                  disabled={saving || !placeId || lat == null || lng == null || hasInvalidHours}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Guardar
                </Button>

                {/* X adicional (cierra modal) */}
                {/* Si quieres sólo este X y no el botón Cancelar, quita el Button outline de arriba */}

              </div>
            </div>
          </DialogHeader>

          <div className="w-full grid gap-8 px-6 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-5">
              {/* Datos básicos con imagen al lado */}
              <div className="flex gap-6 items-start mb-6">
                {/* Imagen */}
                <div className="w-2/6">
                  <Label>Imagen de la sucursal</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Se mostrará en listados y micrositio.
                  </p>
                  <div className="relative group rounded-xl overflow-hidden bg-muted min-h-50 h-50">
                    <input
                      id="loc-file-input"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt="location"
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex min-h-[220px] items-center justify-center w-full h-full text-sm text-muted-foreground">
                        Cargar Imagen
                      </div>
                    )}
                    {/* Botón oculto que aparece en hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => document.getElementById("loc-file-input")?.click()}
                        disabled={uploading}
                        className="bg-white/90 hover:bg-white"
                      >
                        {uploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Subir
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Nombre y estado */}
                <div className="flex flex-col w-4/6 gap-4 pt-5">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Sede Centro"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between border rounded-xl px-4 py-3">
                    <div>
                      <Label className="block mb-2">Estado:
                        <span className={`
                      px-2 py-1 rounded-full text-xs ml-2
                     ${isActive ? "bg-green-200 text-green-800" : "text-red-800 bg-red-200"}
                     `}>
                          {isActive ? "Abierta" : "Cerrada"}
                        </span>
                      </Label>

                      <p className="text-xs text-muted-foreground">Abrir o Cerrar Sucursal</p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>

                  {/* Buscador con dropdown (Google Maps) */}
                  <div className="space-y-2">
                    <Label>Buscar dirección (Google Maps)</Label>
                    <div className="relative">
                      <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Escribe para buscar..." className="pr-9" />
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      {searchQ && placeResults.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow">
                          {placeResults.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                              onClick={() => onSelectPlace(r)}
                            >
                              {r.description}
                            </button>
                          ))}
                        </div>
                      )}
                      {placesLoading && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow p-2 text-xs text-muted-foreground">Buscando...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-semibold">Datos de la Sucursal</h2>

              {/* Dirección completa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dirección *</Label>
                  <Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Calle 123 #45-67" />
                </div>
                <div className="space-y-2">
                  <Label>Apartamento, local, etc.</Label>
                  <Input value={address2 ?? ""} onChange={(e) => setAddress2(e.target.value)} placeholder="Local 203" />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad *</Label>
                  <Input value={city ?? ""} onChange={(e) => setCity(e.target.value)} placeholder="Medellín" />
                </div>
                <div className="space-y-2">
                  <Label>Provincia *</Label>
                  <Input value={province ?? ""} onChange={(e) => setProvince(e.target.value)} placeholder="Antioquia" />
                </div>
                <div className="space-y-2">
                  <Label>País o región</Label>
                  <Input value={country ?? ""} onChange={(e) => setCountry(e.target.value)} placeholder="Colombia" />
                </div>
                <div className="space-y-2">
                  <Label>Código postal</Label>
                  <Input value={postalCode ?? ""} onChange={(e) => setPostalCode(e.target.value)} placeholder="050021" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Teléfono</Label>
                  <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} placeholder="+57 300 000 0000" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Cobertura</h2>
                    <p className="text-xs text-muted-foreground">
                      Define zonas en el mapa y asigna color y costo logístico por área.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCoverageZone}>
                    <Plus className="w-4 h-4 mr-1" /> Agregar zona
                  </Button>
                </div>
                <div className="rounded-xl border bg-white">
                  <div className="grid grid-cols-[50px_1fr_160px_160px_120px_40px] gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
                    <div>Color</div>
                    <div>Zona</div>
                    <div>Costo</div>
                    <div>Entrega aprox.</div>
                    <div>Polígono</div>
                    <div></div>
                  </div>
                  {coverageZones.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      Aún no hay zonas. Crea una para asignar color y costo logístico.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {coverageZones.map((zone, index) => (
                        <div key={zone.id} className="grid grid-cols-[50px_1fr_160px_160px_120px_40px] items-center gap-3 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={zone.color}
                              onChange={(e) => updateCoverageZone(zone.id, { color: e.target.value })}
                              className="h-10 w-10 cursor-pointer rounded-md border bg-white p-0"
                              aria-label={`Color de ${zone.name || `Zona ${index + 1}`}`}
                            />
                          </div>
                          <Input
                            value={zone.name}
                            onChange={(e) => updateCoverageZone(zone.id, { name: e.target.value })}
                            placeholder={`Zona ${index + 1}`}
                            className="h-10"
                          />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={zone.logistics_cost}
                              onChange={(e) => updateCoverageZone(zone.id, { logistics_cost: e.target.value })}
                              placeholder="Costo"
                              className="h-10 pl-6"
                            />
                          </div>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={zone.delivery_time_minutes}
                            onChange={(e) => updateCoverageZone(zone.id, { delivery_time_minutes: e.target.value })}
                            placeholder="Min"
                            className="h-10"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openCoverageEditor(zone.id)}
                          >
                            Configurar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCoverageZone(zone.id)}
                            aria-label="Eliminar zona"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <h2 className="text-xl font-semibold mt-5">Canales</h2>
              {/* Switches de configuración */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between border rounded-xl px-4 py-3">
                  <div>
                    <Label className="block mb-2">Online</Label>
                    <p className="text-xs text-muted-foreground">Usar inventario de esta sucursal en online</p>
                  </div>
                  <Switch checked={prepOrders} onCheckedChange={setPrepOrders} />
                </div>
                {/* <div className="flex items-center justify-between border rounded-xl px-4 py-3">
              <div>
                <Label className="block">Envío</Label>
                <p className="text-xs text-muted-foreground">Despacho por paquetería</p>
              </div>
              <Switch checked={shippingEnabled} onCheckedChange={setShippingEnabled} />
            </div>
            <div className="flex items-center justify-between border rounded-xl px-4 py-3">
              <div>
                <Label className="block">Entrega local</Label>
                <p className="text-xs text-muted-foreground">Reparto propio o courier local</p>
              </div>
              <Switch checked={localDeliveryEnabled} onCheckedChange={setLocalDeliveryEnabled} />
            </div>
            <div className="flex items-center justify-between border rounded-xl px-4 py-3 md:col-span-3">
              <div>
                <Label className="block">Retiro en tienda</Label>
                <p className="text-xs text-muted-foreground">El cliente recoge en esta sucursal</p>
              </div>
              <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
            </div> */}
              </div>

              <h2 className="text-xl font-semibold mt-5">Horario Regular</h2>
              <div className="">
                <div className="grid grid-cols-1 gap-3">
                  {weekly.map((d, idx) => {
                    const setDay = (next: DayRow) => {
                      const copy = [...weekly]; copy[idx] = next; setWeekly(copy);
                    };
                    const addRange = () => {
                      if (d.ranges.length >= 2) return toast.error("Máximo 2 turnos por día.");

                      let draft: TimeRange;

                      if (d.ranges.length === 0) {
                        // Primera franja por defecto
                        draft = { open_time: "08:00", close_time: "12:00" };
                      } else {
                        // Nueva franja: 1h después del cierre de la anterior, con 2h de duración
                        const prev = d.ranges[d.ranges.length - 1];
                        const start = addMinutesStr(prev.close_time, 60); // gap de 1h
                        const end = addMinutesStr(start, 240); // duración mínima 2h
                        draft = { open_time: start, close_time: end };
                      }

                      const next = { ...d, is_open: true, ranges: [...d.ranges, draft] };
                      const v = normalizeAndValidateRanges(next.ranges);
                      if (!v.ok) return toast.error(v.msg);
                      setDay(next);
                    };
                    const updateRange = (ri: number, patch: Partial<TimeRange>) => {
                      const next = { ...d, ranges: d.ranges.map((r, i) => i === ri ? { ...r, ...patch } : r) };
                      const v = normalizeAndValidateRanges(next.ranges);
                      if (!v.ok) return toast.error(v.msg);
                      setDay(next);
                    };
                    const removeRange = (ri: number) => {
                      const nextRanges = d.ranges.filter((_, i) => i !== ri);
                      setDay({ ...d, is_open: nextRanges.length > 0 ? d.is_open : false, ranges: nextRanges });
                    };

                    return (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="w-40 text-md font-medium">
                            {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][d.weekday]}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{d.is_open ? "Abierto" : "Cerrado"}</span>
                            <Switch checked={d.is_open} onCheckedChange={(v) => {
                              if (!v) setDay({ ...d, is_open: false, ranges: [] });
                              else if (d.ranges.length === 0) {
                                // auto-crear una franja válida
                                setDay({ ...d, is_open: true, ranges: [{ open_time: "08:00", close_time: "12:00" }] });
                              } else setDay({ ...d, is_open: true });
                            }} />
                          </div>
                        </div>

                        {/* Cabecera Inicio/Cierre cuando está abierto */}
                        {d.is_open && (
                          <div className="mt-3">
                            <div className="grid grid-cols-[auto,auto,1fr,auto] gap-3 px-1 text-xs text-muted-foreground">
                              <div className="w-[130px]">Inicio</div>
                              <div className="w-[130px]">Cierre</div>
                              <div></div>
                              <div className="w-10 text-right"> </div>
                            </div>

                            <div className="space-y-2 mt-1">
                              {d.ranges.map((r, ri) => (
                                <div key={ri} className="grid grid-cols-[auto,auto,1fr,auto] gap-3 items-center">
                                  <Input type="time" className="w-[130px]" value={r.open_time}
                                    onChange={(e) => updateRange(ri, { open_time: e.target.value })} />
                                  <Input type="time" className="w-[130px]" value={r.close_time}
                                    onChange={(e) => updateRange(ri, { close_time: e.target.value })} />
                                  <div className="text-xs text-muted-foreground">
                                    {(() => {
                                      const mins = toMinutes(r.close_time) - toMinutes(r.open_time);
                                      return mins > 0 ? `Duración: ${Math.floor(mins / 60)}h ${mins % 60}m` : "";
                                    })()}
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => removeRange(ri)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            {d.ranges.length < 2 && (
                              <Button className="mt-2 bg-gray-100" variant="outline" size="sm" onClick={addRange}>
                                <Plus className="w-4 h-4 mr-1" /> Añadir franja
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mt-5">Horario Especial</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Si en un día específico tu tienda operará en un horario diferente al habitual o cerrará, puedes crear una fecha especial.
                  Por ejemplo, cierre por protestas o remodelación, navidad, fin de año o fechas personales. También puedes editar un festivo.
                </p>
              </div>

              {/* ===== Festivos y fechas especiales ===== */}
              <div className="">

                <div className="space-y-4">
                  <div className="">
                    <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="w-[150px]">
                          Fecha
                        </div>
                        <div className="flex-1">
                          Nombre
                        </div>
                        <div className="w-[160px] text-center">
                          Cerrar todo el día
                        </div>
                      </div>
                      <div className="w-[110px] text-center">
                        Eliminar
                      </div>
                    </div>

                  </div>

                  {specials.map((s, i) => (
                    <div key={i} className="">
                      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                        <div className="flex gap-4 flex-1">
                          <div className="w-[150px]">
                            <Input
                              type="date"
                              className="bg-gray-100 "
                              value={s.date}
                              onChange={(e) => {
                                let newDate = e.target.value;
                                if (isDuplicateDate(specials, newDate, i)) {
                                  e.target.value = ""
                                  toast.error(`Ya existe una fecha especial para "${newDate}".`);
                                  newDate = ""
                                }
                                const next = [...specials];
                                next[i] = { ...next[i], date: newDate };
                                setSpecials(next);
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <Input className="bg-gray-100" placeholder="Navidad, Remodelación…" value={s.label || ""} onChange={(e) => {
                              const next = [...specials]; next[i] = { ...next[i], label: e.target.value }; setSpecials(next);
                            }} />
                          </div>
                          <div className="w-[160px]">
                            <div className="h-9 flex items-center justify-center">
                              <Switch
                                checked={s.is_closed}
                                onCheckedChange={(v) => {
                                  const next = [...specials];
                                  next[i] = { ...next[i], is_closed: v };

                                  if (v) {
                                    // Si se cierra todo el día, limpiar franjas
                                    next[i].ranges = [];
                                  } else {
                                    // Si se vuelve a abrir el día y no hay franjas, crear una por defecto
                                    if (next[i].ranges.length === 0) {
                                      next[i].ranges = [{ open_time: "08:00", close_time: "12:00" }]; // 2h mín
                                    }
                                  }
                                  setSpecials(next);
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="bg-gray-100"
                          size="sm"
                          onClick={() => {
                            const next = [...specials]; next.splice(i, 1); setSpecials(next);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                        </Button>
                      </div>

                      {!s.is_closed && (
                        <div className="mt-3">
                          {/* Cabeceras */}
                          <div className="grid grid-cols-[auto,auto,1fr,auto] gap-3 px-1 text-xs text-muted-foreground">
                            <div className="w-[130px]">Inicio</div>
                            <div className="w-[130px]">Cierre</div>
                            <div></div>
                            <div className="w-10 text-right"> </div>
                          </div>

                          <div className="space-y-2 mt-1">
                            {s.ranges.map((r, ri) => (
                              <div key={ri} className="grid grid-cols-[auto,auto,1fr,auto] gap-3 items-center">
                                <Input type="time" className="w-[130px]" value={r.open_time}
                                  onChange={(e) => {
                                    const next = [...specials];
                                    next[i].ranges[ri] = { ...r, open_time: e.target.value };
                                    const v = normalizeAndValidateRanges(next[i].ranges);
                                    if (!v.ok) return toast.error(v.msg);
                                    setSpecials(next);
                                  }} />
                                <Input type="time" className="w-[130px]" value={r.close_time}
                                  onChange={(e) => {
                                    const next = [...specials];
                                    next[i].ranges[ri] = { ...r, close_time: e.target.value };
                                    const v = normalizeAndValidateRanges(next[i].ranges);
                                    if (!v.ok) return toast.error(v.msg);
                                    setSpecials(next);
                                  }} />
                                <div className="text-xs text-muted-foreground">
                                  {(() => {
                                    const mins = toMinutes(r.close_time) - toMinutes(r.open_time);
                                    return mins > 0 ? `Duración: ${Math.floor(mins / 60)}h ${mins % 60}m` : "";
                                  })()}
                                </div>
                                <Button variant="ghost" size="icon"
                                  onClick={() => {
                                    const next = [...specials]; next[i].ranges.splice(ri, 1);
                                    setSpecials(next);
                                  }}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {s.ranges.length < 2 && (
                            <Button className="mt-2" variant="outline" size="sm"
                              onClick={() => {
                                const next = [...specials];

                                let draft: SpecialRange;
                                if (next[i].ranges.length === 0) {
                                  draft = { open_time: "08:00", close_time: "12:00" };
                                } else {
                                  const prev = next[i].ranges[next[i].ranges.length - 1];
                                  const start = addMinutesStr(prev.close_time, 60); // gap 1h
                                  const end = addMinutesStr(start, 240);            // 2h mín
                                  draft = { open_time: start, close_time: end };
                                }

                                const cand = [...next[i].ranges, draft];
                                const v = normalizeAndValidateRanges(cand);
                                if (!v.ok) return toast.error(v.msg);
                                next[i].ranges = cand;
                                setSpecials(next);
                              }}>
                              <Plus className="w-4 h-4 mr-1" /> Añadir franja
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <Button variant="secondary" size="sm"
                    onClick={() => setSpecials([...specials, { date: "", label: "", is_closed: true, ranges: [] }])}>
                    <Plus className="w-4 h-4 mr-1" /> Agregar fecha especial
                  </Button>
                </div>

              </div>
            </div>
            <aside className="lg:sticky lg:top-[89px] h-fit">
              <div className="rounded-3xl">
                <div className="relative min-h-[640px] overflow-hidden rounded-2xl lg:h-[calc(100vh-110px)]">
                <CoverageOverviewMap
                  center={mapCenter}
                  zoom={mapZoom}
                  marker={hasCoords ? mapCenter : null}
                  zones={coverageOverlays}
                  onZoneClick={handleZoneClick}
                  className="absolute inset-0"
                />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute right-3 top-3 z-10"
                    onClick={addCoverageZone}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Zonas de cobertura
                  </Button>
                  <div className="absolute bottom-3 left-3 right-3 z-10 rounded-lg bg-white/90 p-3 text-xs text-muted-foreground shadow">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-foreground">Dirección</div>
                        <div>{displayAddress || "Selecciona una dirección para ver el mapa."}</div>
                        {coordsLabel && (
                          <div className="mt-1 text-[11px] text-muted-foreground">{coordsLabel}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

          </div>

        </DialogContent>
      </Dialog>
      <Dialog open={coverageEditorOpen} onOpenChange={(v) => (v ? null : closeCoverageEditor())}>
        <DialogContent className="w-full max-w-5xl pb-6">
        <DialogHeader>
          <DialogTitle>Configurar zona de cobertura</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 px-6 pb-6">
          {activeCoverageZone ? (
            <div className="grid gap-3 rounded-xl bg-white sm:grid-cols-[70px_1fr_180px_200px]">
              <div className=" flex pt-1 flex-col items-start">
                <Label className="mb-3">Color</Label>
                <input
                  type="color"
                  value={activeCoverageZone.color}
                  onChange={(e) => updateCoverageZone(activeCoverageZone.id, { color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-md border bg-white p-0"
                  aria-label="Color de la zona"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={activeCoverageZone.name}
                  onChange={(e) => updateCoverageZone(activeCoverageZone.id, { name: e.target.value })}
                  placeholder="Zona de cobertura"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Costo</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={activeCoverageZone.logistics_cost}
                    onChange={(e) => updateCoverageZone(activeCoverageZone.id, { logistics_cost: e.target.value })}
                    placeholder="Costo logístico"
                    className="h-10 pl-6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tiempo aprox. (min)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={activeCoverageZone.delivery_time_minutes}
                  onChange={(e) => updateCoverageZone(activeCoverageZone.id, { delivery_time_minutes: e.target.value })}
                  placeholder="Ej: 30"
                  className="h-10"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-white px-4 py-3 text-xs text-muted-foreground">
              Selecciona una zona para editar sus datos.
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Haz clic en el mapa para agregar puntos. Necesitas al menos 3 para cerrar el polígono.
            </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeLastCoveragePoint}
                  disabled={activeCoveragePath.length === 0}
                >
                  Deshacer punto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCoveragePoints}
                  disabled={activeCoveragePath.length === 0}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          <div className="h-[420px] overflow-hidden rounded-xl border lg:h-[520px]">
            <GoogleMapCanvas
              center={mapCenter}
              zoom={hasCoords ? 14 : 6}
              marker={hasCoords ? mapCenter : null}
              polygon={activeCoveragePath}
              polygonColor={activeCoverageZone?.color ?? DEFAULT_ZONE_COLOR}
              overlays={editorOverlays}
              onMapClick={addCoveragePoint}
              preserveView
            />
          </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                {activeCoverageZone?.name ? activeCoverageZone.name : "Nueva zona"} · {activeCoveragePath.length} punto(s)
              </div>
            <Button type="button" size="sm" onClick={persistCoverageAndClose} disabled={savingCoverage}>
              {savingCoverage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {savingCoverage ? "Guardando" : "Listo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ------------------ Página ------------------

export default function LocationsPage() {
  const { org } = useEnvironment();
  const supabase = getSupabaseBrowser();
  const organizationId = org?.id;

  const [rows, setRows] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);

  // Search integrado en header
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);

  // Filtros (chips/badges): Activo/Inactivo
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Paginación simple (cliente), tabla compacta
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function placesProvider(q: string) {
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Error consultando places");
    const data = await res.json();

    // Si tu endpoint ya devuelve un array [{id, description}], deja esto:
    if (Array.isArray(data)) return data;

    // Si devuelve { predictions: [...] } (estándar Google):
    if (Array.isArray(data?.predictions)) {
      return data.predictions.map((p: any) => ({
        id: p.id ?? p.place_id ?? crypto.randomUUID(),
        description: p.description ?? `${p.structured_formatting?.main_text ?? ""} ${p.structured_formatting?.secondary_text ?? ""}`.trim(),
        // si tu /api/places ya expone lat/lng y address, puedes incluirlos aquí y
        // leerlos en onSelectPlace (p.location, p.address, etc.)
      }));
    }

    // Fallback: vacío
    return [];
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!organizationId) return;
      let query = supabase
        .from("locations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(200);
      const { data, error } = await query;
      if (error) throw error;
      setRows((data as Location[]) ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Error cargando sucursales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filtered = useMemo(() => {
    const term = dq.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (r.is_active && !showActive) return false;
        if (!r.is_active && !showInactive) return false;
        if (!term) return true;
        const blob = `${r.name} ${r.address_line1 ?? ""} ${r.city ?? ""} ${r.province ?? ""} ${r.country ?? ""}`.toLowerCase();
        return blob.includes(term);
      });
  }, [rows, dq, showActive, showInactive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };
  const openEdit = (l: Location) => {
    setEditing(l);
    setOpenModal(true);
  };
  const onSaved = (l: Location) => {
    setRows((prev) => {
      const ix = prev.findIndex((x) => x.id === l.id);
      if (ix >= 0) {
        const next = [...prev];
        next[ix] = l;
        return next;
      }
      return [l, ...prev];
    });
  };

  // UI helpers (badge filters)
  const ToggleBadge = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs border transition ${active ? "bg-blue-100 text-blue-900 border-blue-200" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/70"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto py-6 ">
      {/* Header compact con acciones */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold tracking-tight">Sucursales</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </Button>
          <Button onClick={openCreate} className="px-3">
            <Plus className="w-4 h-4 mr-2" /> Nueva sucursal
          </Button>
        </div>
      </div>

      {/* Tabla compacta con buscador integrado en el header */}
      <div className="rounded-xl border overflow-hidden bg-white">
        <Table className="bg-white">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead colSpan={7} className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative sm:flex-1 min-w-[220px]">
                    <Input
                      value={q}
                      name="red"
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nombre o ubicación"
                      className="pl-10 max-w-md bg-red font-regular rounded-lg h-9"
                    />
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ToggleBadge active={showActive} label="Abiertas" onClick={() => setShowActive((v) => !v)} />
                    <ToggleBadge active={showInactive} label="Cerradas" onClick={() => setShowInactive((v) => !v)} />
                  </div>
                </div>
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="w-[64px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Ubicación</TableHead>
              <TableHead>País/Región</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-[110px]">Estado</TableHead>
              <TableHead className="w-[110px]"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando sucursales...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-8 text-center text-sm text-muted-foreground">No hay sucursales para los filtros aplicados.</div>
                </TableCell>
              </TableRow>
            )}

            {pagedRows.map((l) => (
              <TableRow key={l.id} className="hover:bg-muted/40">
                <TableCell>
                  {l.image_url ? (
                    <div className="relative w-[48px] h-[48px] rounded-lg overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.image_url} alt={l.name} className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="w-[48px] h-[48px] rounded-lg bg-muted flex items-center justify-center text-[10px] text-muted-foreground">N/A</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium truncate max-w-[220px]" title={l.name}>{l.name}</div>
                  <div className="md:hidden text-xs text-muted-foreground truncate max-w-[220px]">
                    {l.address_line1 || ""} {l.city ? `· ${l.city}` : ""}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[360px]">
                  {l.address_line1 || ""}
                  {l.address_line2 ? `, ${l.address_line2}` : ""}
                  {l.city ? `, ${l.city}` : ""}
                  {l.province ? `, ${l.province}` : ""}
                </TableCell>
                <TableCell className="text-muted-foreground">{l.country || ""}</TableCell>
                <TableCell className="text-muted-foreground">{l.phone || ""}</TableCell>
                <TableCell>
                  {l.is_active ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Abierta</Badge>
                  ) : (
                    <Badge variant="secondary">Cerrada</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(l)}>
                      <Pencil className="w-4 h-4 mr-1" /> Editar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableCaption className="pb-2">Mostrando {pagedRows.length} de {filtered.length} sucursales</TableCaption>
        </Table>
      </div>

      {/* Paginación simple */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3 bg-white">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
          <div className="text-sm text-muted-foreground">Página {page} / {totalPages}</div>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente</Button>
        </div>
      )}

      {/* Modal */}
      <LocationModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        location={editing}
        onSaved={onSaved}
        organizationId={organizationId}
        placesProvider={placesProvider}
      />
    </div>
  );
}
