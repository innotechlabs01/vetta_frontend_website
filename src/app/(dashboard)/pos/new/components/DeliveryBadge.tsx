"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";

interface DeliveryBadgeProps {
  organizationId: string;
  locationId: string;
  onClick?: () => void;
}

export default function DeliveryBadge({ organizationId, locationId, onClick }: DeliveryBadgeProps) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !locationId) {
      setLoading(false);
      return;
    }

    loadCount();
    
    // Suscribirse a cambios en tiempo real
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`sales-location-${locationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `store_id=eq.${locationId}`,
        },
        () => {
          loadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, locationId]);

  const loadCount = async () => {
    const supabase = getSupabaseBrowser();
    const { count, error } = await supabase
      .from("sales")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("store_id", locationId)
      .eq("order_type", "DELIVERY_LOCAL")
      .in("status", ["NEW", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"]);

    if (error) {
      console.error("Error cargando contador de domicilios:", error);
    }

    setCount(count || 0);
    setLoading(false);
  };

  if (!organizationId || !locationId) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`
        relative inline-flex items-center gap-2 pl-2.5 pr-3 py-2
        bg-white border rounded-lg shadow-sm
        transition-all duration-200 ease-out
        hover:shadow-md hover:border-orange-300 hover:bg-orange-50/50
        active:scale-[0.98]
        ${count > 0 ? 'border-orange-200' : 'border-gray-200'}
      `}
      aria-label={`Domicilios pendientes: ${loading ? "cargando" : count}`}
    >
      <div className={`
        flex items-center justify-center w-7 h-7 rounded-md
        ${count > 0 ? 'bg-orange-100' : 'bg-gray-100'}
        transition-colors
      `}>
        <svg
          className={`w-4 h-4 ${count > 0 ? 'text-orange-600' : 'text-gray-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <div className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
          Domicilios
        </span>
        <span className={`text-sm font-semibold ${count > 0 ? 'text-orange-700' : 'text-gray-700'}`}>
          {loading ? "..." : count}
        </span>
      </div>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {count > 9 ? '9+' : count}
          </span>
        </span>
      )}
    </button>
  );
}
