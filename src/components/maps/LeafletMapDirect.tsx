"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const LEAFLET_CSS = `
  .leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-control {
    z-index: 1 !important;
  }
  .leaflet-control-zoom {
    border: none !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
  }
  .leaflet-control-zoom a {
    background: white !important;
    color: #333 !important;
  }
  .leaflet-control-zoom a:hover {
    background: #f0f0f0 !important;
  }
`;

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: { lat: number; lng: number }[];
  onMapClick?: (point: { lat: number; lng: number }) => void;
  className?: string;
  style?: CSSProperties;
  autoCenterOnGps?: boolean;
  polygon?: { lat: number; lng: number }[];
  polygonColor?: string;
}

export function LeafletMap({
  center = { lat: 4.711, lng: -74.0721 },
  zoom = 13,
  markers = [],
  onMapClick,
  className = "",
  style,
  autoCenterOnGps = false,
  polygon = [],
  polygonColor = "#3388ff",
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Inject Leaflet CSS
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "leaflet-custom-css";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = LEAFLET_CSS;
    document.head.appendChild(style);
  }, []);

  // Get user GPS location
  useEffect(() => {
    if (!autoCenterOnGps || typeof window === "undefined") return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
          
          // Pan map to user location
          if (mapRef.current) {
            mapRef.current.setView([coords.lat, coords.lng], 15);
          }
        },
        (error) => {
          console.log("GPS error:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [autoCenterOnGps]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Fix leaflet icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    // Use user location if available, otherwise use provided center
    const initialCenter = userLocation ? [userLocation.lat, userLocation.lng] : [center.lat, center.lng];

    const map = L.map(containerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom,
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add click handler
  useEffect(() => {
    if (!mapRef.current || !onMapClick) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    mapRef.current.on("click", handleClick);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleClick);
      }
    };
  }, [onMapClick]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add new markers
    markers.forEach((marker) => {
      L.marker([marker.lat, marker.lng]).addTo(mapRef.current!);
    });
  }, [markers]);

  // Update polygon
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing polygons
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add polygon if points exist
    if (polygon && polygon.length > 0) {
      const latLngs = polygon.map(p => [p.lat, p.lng] as L.LatLngTuple);
      const poly = L.polygon(latLngs, {
        color: polygonColor || "#3388ff",
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(mapRef.current);
    }
  }, [polygon, polygonColor]);

  // Update center when user location changes
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.setView([userLocation.lat, userLocation.lng], mapRef.current.getZoom());
  }, [userLocation]);

  const containerStyle = style || { width: "100%", height: "100%", minHeight: "300px", zIndex: 1 };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
    />
  );
}

export type { MapProps as LeafletMapProps };