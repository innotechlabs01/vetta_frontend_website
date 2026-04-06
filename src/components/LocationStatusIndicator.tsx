"use client";

import { useEffect, useState } from "react";

type ServiceChannelConfig = {
  pickup: boolean;
  delivery: boolean;
  national_shipping: boolean;
};

type LocationStatusProps = {
  locationId: string | null;
  organizationChannels: ServiceChannelConfig;
  supabase: any;
};

type ScheduleStatus = {
  isOpen: boolean;
  reason?: string;
  currentRangeClose?: string;
};

export function LocationStatusIndicator({
  locationId,
  organizationChannels,
  supabase,
}: LocationStatusProps) {
  const [status, setStatus] = useState<ScheduleStatus>({ isOpen: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId || !supabase) {
      setLoading(false);
      return;
    }

    const checkSchedule = async () => {
      try {
        const { checkLocationSchedule } = await import("@/utils/schedule-validation");
        const result = await checkLocationSchedule(locationId, supabase);
        setStatus(result);
      } catch (error) {
        console.error("Error checking schedule:", error);
        setStatus({ isOpen: true });
      } finally {
        setLoading(false);
      }
    };

    checkSchedule();

    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [locationId, supabase]);

  const channelLabels: Record<keyof ServiceChannelConfig, { icon: string; label: string }> = {
    pickup: { icon: "📦", label: "Pickup" },
    delivery: { icon: "🚀", label: "Delivery" },
    national_shipping: { icon: "🚚", label: "Envíos" },
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 ml-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm">
          <span className="animate-pulse">⏳</span>
          Verificando...
        </span>
      </div>
    );
  }

  const activeChannels = (Object.entries(organizationChannels) as [keyof ServiceChannelConfig, boolean][])
    .filter(([_, enabled]) => enabled)
    .map(([channel]) => channel);

  return (
    <div className="flex items-center gap-2 ml-2 flex-wrap">
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.isOpen
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-red-100 text-red-700 border border-red-200"
          }`}
      >
        {status.isOpen ? (
          <>
            <span>🟢</span>
            <span>Abierto</span>
          </>
        ) : (
          <>
            <span>🔴</span>
            <span>Cerrado</span>
          </>
        )}
      </span>

      {/* {status.isOpen && activeChannels.length > 0 && (
        <div className="flex items-center gap-1">
          {activeChannels.map((channel) => (
            <span
              key={channel}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100"
            >
              <span>{channelLabels[channel].icon}</span>
              <span>{channelLabels[channel].label}</span>
            </span>
          ))}
        </div>
      )} */}
    </div>
  );
}
