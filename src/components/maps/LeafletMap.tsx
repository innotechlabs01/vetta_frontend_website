"use client";

import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface CoverageZone {
  id: string;
  name: string;
  color: string;
  path: MapPoint[];
}

interface LeafletMapProps {
  center?: MapPoint;
  zoom?: number;
  markers?: MapPoint[];
  zones?: CoverageZone[];
  onMapClick?: (point: MapPoint) => void;
  onMarkerClick?: (point: MapPoint) => void;
  onZoneClick?: (zoneId: string) => void;
  className?: string;
  showControls?: boolean;
  dragging?: boolean;
  scrollWheelZoom?: boolean;
}

function fixLeafletIcon() {
  if (typeof window === "undefined") return;
  
  // Fix default marker icons
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

function MapEventsHandler({ onClick }: { onClick?: (point: MapPoint) => void }) {
  useMapEvents({
    click: (e) => {
      if (onClick) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function MapController({ center, zoom }: { center?: MapPoint; zoom?: number }) {
  const map = useMap();

  useEffect(() => {
    fixLeafletIcon();
  }, []);

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom ?? map.getZoom());
    }
  }, [center?.lat, center?.lng, zoom, map]);

  return null;
}

export function LeafletMap({
  center = { lat: 4.711, lng: -74.0721 },
  zoom = 13,
  markers = [],
  zones = [],
  onMapClick,
  onMarkerClick,
  onZoneClick,
  className = "",
  showControls = true,
  dragging = true,
  scrollWheelZoom = true,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    fixLeafletIcon();
  }, []);

  const handleZoneClick = (zoneId: string) => {
    if (onZoneClick) {
      onZoneClick(zoneId);
    }
  };

  return (
    <MapContainer
      center={[center.lat, center.lng] as LatLngExpression}
      zoom={zoom}
      className={className}
      dragging={dragging}
      scrollWheelZoom={scrollWheelZoom}
      zoomControl={showControls}
      doubleClickZoom={showControls}
      touchZoom={showControls}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      
      <MapController center={center} zoom={zoom} />
      <MapEventsHandler onClick={onMapClick} />

      {markers.map((marker, idx) => (
        <Marker
          key={`marker-${idx}`}
          position={[marker.lat, marker.lng] as LatLngExpression}
          eventHandlers={{
            click: () => onMarkerClick?.(marker),
          }}
        />
      ))}

      {zones.map((zone) => {
        const positions = zone.path.map((p) => [p.lat, p.lng] as LatLngExpression);
        if (positions.length < 3) return null;

        return (
          <Polygon
            key={`zone-${zone.id}`}
            positions={positions}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.3,
              weight: 2,
            }}
            eventHandlers={{
              click: () => handleZoneClick(zone.id),
            }}
          />
        );
      })}
    </MapContainer>
  );
}

export default LeafletMap;
