"use client";

import { useState, useEffect } from "react";
import { LeafletMap } from "@/components/maps";
import type { MapPoint } from "@/components/maps";

type CoverageOverviewMapProps = {
  center: MapPoint;
  zoom: number;
  marker?: MapPoint | null;
  zones?: any[];
  onZoneClick?: (zoneId: string) => void;
  className?: string;
  autoGps?: boolean;
};

export function CoverageOverviewMap({
  center,
  zoom,
  marker,
  zones = [],
  onZoneClick,
  className,
  autoGps = false,
}: CoverageOverviewMapProps) {
  const [gpsLocation, setGpsLocation] = useState<MapPoint | null>(null);

  useEffect(() => {
    if (!autoGps || typeof window === "undefined") return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("GPS error:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [autoGps]);

  const mapCenter = gpsLocation || center;

  return (
    <LeafletMap
      center={mapCenter}
      zoom={zoom}
      markers={marker ? [marker] : []}
      onMapClick={() => {}}
      className={className}
    />
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
  autoGps?: boolean;
};

export function GoogleMapCanvas({
  center,
  zoom,
  marker,
  preserveView = false,
  className,
  autoGps = false,
  onMapClick,
  polygon,
  polygonColor,
}: GoogleMapCanvasProps) {
  const [gpsLocation, setGpsLocation] = useState<MapPoint | null>(null);
  const effectiveZoom = preserveView ? zoom : (marker ? 14 : 6);

  useEffect(() => {
    if (!autoGps || typeof window === "undefined") return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("GPS error:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [autoGps]);

  const mapCenter = gpsLocation || center;

  const handleMapClick = (point: { lat: number; lng: number }) => {
    onMapClick?.(point);
  };

  return (
    <LeafletMap
      center={mapCenter}
      zoom={effectiveZoom}
      markers={marker ? [marker] : []}
      onMapClick={handleMapClick}
      className={className}
      polygon={polygon}
      polygonColor={polygonColor}
    />
  );
}