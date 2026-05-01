import dynamic from "next/dynamic";

// Use dynamic import with default export to avoid SSR issues with Leaflet
const LeafletMapComponent = dynamic(
  () => import("./LeafletMapDirect").then((mod) => ({ default: mod.LeafletMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Cargando mapa...</span>
      </div>
    )
  }
);

export const LeafletMap = LeafletMapComponent;

export type { MapPoint, CoverageZone } from "./LeafletMap";
