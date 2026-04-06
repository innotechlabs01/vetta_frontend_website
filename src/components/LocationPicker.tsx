"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, Search, X, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentPosition, calculateDistance, type GeolocationCoords } from "@/hooks/useGeolocation";

interface AddressPlace {
  place_id?: string;
  label: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  neighborhood?: string;
}

interface LocationPickerProps {
  value?: AddressPlace | null;
  onChange: (address: AddressPlace | null) => void;
  organizationId: string;
  locationId?: string;
  className?: string;
}

interface CoverageZoneInfo {
  id: string;
  name: string;
  logistics_cost?: number;
  delivery_time_minutes?: number;
  is_covered: boolean;
}

export function LocationPicker({
  value,
  onChange,
  organizationId,
  locationId,
  className = "",
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GeolocationCoords | null>(null);
  const [coverageInfo, setCoverageInfo] = useState<CoverageZoneInfo | null>(null);
  const [isCheckingCoverage, setIsCheckingCoverage] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const hasLocation = !!value?.lat && !!value?.lng;

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 4) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setLocationError(null);

    try {
      const response = await fetch(
        `/api/places?query=${encodeURIComponent(query)}&organization_id=${organizationId}`
      );
      
      if (!response.ok) {
        throw new Error("Error buscando direcciones");
      }

      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        const places: AddressPlace[] = data.results.map((p: any) => ({
          place_id: p.id,
          label: p.description,
          line1: p.address?.line1 || p.description,
          line2: p.address?.line2,
          city: p.address?.city,
          state: p.address?.province || p.address?.state,
          country: p.address?.country,
          postal_code: p.address?.postal_code,
          lat: p.location?.lat,
          lng: p.location?.lng,
          neighborhood: p.address?.neighborhood,
        }));
        setSearchResults(places);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Error searching places:", error);
      setLocationError("No se pudieron buscar direcciones");
    } finally {
      setIsSearching(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length >= 4) {
      debounceRef.current = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  const handleGetCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const coords = await getCurrentPosition();
      
      if (!coords) {
        setLocationError("No se pudo obtener tu ubicación");
        return;
      }

      setCurrentLocation(coords);

      const response = await fetch(
        `/api/places/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          const address: AddressPlace = {
            label: data.address.formatted || data.address.line1,
            line1: data.address.line1,
            line2: data.address.line2,
            city: data.address.city,
            state: data.address.province,
            country: data.address.country,
            postal_code: data.address.postal_code,
            lat: coords.latitude,
            lng: coords.longitude,
            neighborhood: data.address.neighborhood,
          };
          onChange(address);
        }
      }
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationError("Error al obtener ubicación");
    } finally {
      setIsGettingLocation(false);
    }
  }, [onChange]);

  const checkCoverage = useCallback(async (lat: number, lng: number) => {
    if (!locationId || !organizationId) return;

    setIsCheckingCoverage(true);
    try {
      const response = await fetch(
        `/api/delivery/check-coverage?location_id=${locationId}&lat=${lat}&lng=${lng}&organization_id=${organizationId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCoverageInfo({
            id: data.zone?.id || "",
            name: data.zone?.name || "Zona sin nombre",
            logistics_cost: data.zone?.logistics_cost,
            delivery_time_minutes: data.zone?.delivery_time_minutes,
            is_covered: data.is_covered,
          });
        }
      }
    } catch (error) {
      console.error("Error checking coverage:", error);
    } finally {
      setIsCheckingCoverage(false);
    }
  }, [locationId, organizationId]);

  useEffect(() => {
    if (value?.lat && value?.lng && locationId) {
      checkCoverage(value.lat, value.lng);
    }
  }, [value?.lat, value?.lng, locationId, checkCoverage]);

  const handleSelectAddress = useCallback((address: AddressPlace) => {
    onChange(address);
    setSearchQuery(address.label);
    setSearchResults([]);
    setShowResults(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setSearchQuery("");
    setSearchResults([]);
    setCoverageInfo(null);
    setCurrentLocation(null);
  }, [onChange]);

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const distanceToLocation = useMemo(() => {
    if (!currentLocation || !value?.lat || !value?.lng) return null;
    return calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      value.lat,
      value.lng
    );
  }, [currentLocation, value?.lat, value?.lng]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation}
            title="Usar mi ubicación actual"
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-auto">
            {searchResults.map((result, index) => (
              <button
                key={result.place_id || index}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                onClick={() => handleSelectAddress(result)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">{result.line1}</div>
                    {(result.city || result.state) && (
                      <div className="text-xs text-gray-500">
                        {[result.city, result.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {locationError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {locationError}
        </div>
      )}

      {value && (
        <div className="rounded-xl border bg-gray-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <Check className="h-4 w-4" />
              Dirección seleccionada
            </div>
            {distanceToLocation !== null && (
              <div className="text-xs text-gray-500">
                ~{(distanceToLocation * 1000).toFixed(0)}m de ti
              </div>
            )}
          </div>

          <div className="text-sm">
            <div className="font-medium">{value.line1}</div>
            {(value.city || value.state) && (
              <div className="text-gray-500">
                {[value.city, value.state].filter(Boolean).join(", ")}
              </div>
            )}
            {value.neighborhood && (
              <div className="text-xs text-gray-400">{value.neighborhood}</div>
            )}
          </div>

          {isCheckingCoverage ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Verificando cobertura...
            </div>
          ) : coverageInfo ? (
            <div className={`text-xs p-2 rounded-lg ${
              coverageInfo.is_covered 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-700"
            }`}>
              {coverageInfo.is_covered ? (
                <div className="space-y-1">
                  <div className="font-medium">✓ Dentro de cobertura</div>
                  <div className="flex justify-between">
                    <span>Zona:</span>
                    <span>{coverageInfo.name}</span>
                  </div>
                  {coverageInfo.delivery_time_minutes && (
                    <div className="flex justify-between">
                      <span>Tiempo:</span>
                      <span>~{coverageInfo.delivery_time_minutes} min</span>
                    </div>
                  )}
                  {coverageInfo.logistics_cost !== undefined && coverageInfo.logistics_cost > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Envío:</span>
                      <span>${formatCOP(coverageInfo.logistics_cost)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>✕ Esta dirección está fuera de la zona de cobertura</div>
              )}
            </div>
          ) : null}

          {value.lat && value.lng && (
            <div className="text-xs text-gray-400">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </div>
          )}
        </div>
      )}

      {!value && (
        <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <div>Busca una dirección o usa tu ubicación actual</div>
        </div>
      )}
    </div>
  );
}

export default LocationPicker;
