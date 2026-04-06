"use client";

import { useState, useRef, useEffect } from "react";
import { Package, Truck, Store, Check, Pause, XCircle, ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { ServiceChannelStatus, ServiceChannelStatusConfig } from "../types";

type DeliveryChannelsControlProps = {
  channelStatuses: ServiceChannelStatusConfig;
  onStatusChange: (channel: keyof ServiceChannelStatusConfig, status: ServiceChannelStatus) => void;
  disabled?: boolean;
};

const CHANNELS = [
  {
    key: "delivery" as const,
    label: "Domicilio",
    icon: Truck,
  },
  {
    key: "pickup" as const,
    label: "Retiro",
    icon: Store,
  },
  {
    key: "national_shipping" as const,
    label: "Envíos",
    icon: Package,
  },
] as const;

const STATUS_CONFIG: Record<ServiceChannelStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  active: { 
    label: "Activo", 
    color: "text-emerald-700", 
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    dotColor: "bg-emerald-500"
  },
  waiting: { 
    label: "Espera", 
    color: "text-amber-700", 
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    dotColor: "bg-amber-500"
  },
  inactive: { 
    label: "Inactivo", 
    color: "text-red-700", 
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    dotColor: "bg-red-400"
  },
};

export function DeliveryChannelsControl({
  channelStatuses,
  onStatusChange,
  disabled = false,
}: DeliveryChannelsControlProps) {
  const [openChannel, setOpenChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatusChange = async (
    channel: keyof ServiceChannelStatusConfig, 
    status: ServiceChannelStatus
  ) => {
    setLoading(channel);
    try {
      await onStatusChange(channel, status);
    } finally {
      setLoading(null);
      setOpenChannel(null);
    }
  };

  const activeCount = Object.values(channelStatuses).filter((s) => s === "active").length;
  const waitingCount = Object.values(channelStatuses).filter((s) => s === "waiting").length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {CHANNELS.map((channel) => {
          const status = channelStatuses[channel.key];
          const config = STATUS_CONFIG[status];
          const isOpen = openChannel === channel.key;
          const isLoading = loading === channel.key;
          const Icon = channel.icon;

          return (
            <Popover
              key={channel.key}
              open={isOpen}
              onOpenChange={(open) => !disabled && setOpenChannel(open ? channel.key : null)}
            >
              <PopoverTrigger asChild>
                <button
                  disabled={disabled || isLoading}
                  className={`
                    group flex items-center gap-2 px-3 py-1.5 rounded-full
                    border transition-all duration-200 ease-out
                    ${config.bgColor} ${config.borderColor}
                    hover:shadow-md hover:scale-[1.02]
                    active:scale-[0.98]
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-xs font-medium ${config.color}`}>
                    {channel.label}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
              </PopoverTrigger>

              <PopoverContent 
                className="w-40 p-1.5 z-[99999]" 
                sideOffset={6}
                align="start"
              >
                <div className="space-y-1">
                  {(Object.keys(STATUS_CONFIG) as ServiceChannelStatus[]).map((statusKey) => {
                    const optionConfig = STATUS_CONFIG[statusKey];
                    const isActive = status === statusKey;

                    return (
                      <button
                        key={statusKey}
                        onClick={() => handleStatusChange(channel.key, statusKey)}
                        disabled={disabled || isLoading}
                        className={`
                          w-full flex items-center gap-2 px-2.5 py-2 rounded-lg
                          text-sm font-medium transition-colors
                          ${isActive 
                            ? `${optionConfig.bgColor} ${optionConfig.color}` 
                            : "text-gray-600 hover:bg-gray-100"
                          }
                          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                      >
                        <div className={`w-2 h-2 rounded-full ${optionConfig.dotColor}`} />
                        {optionConfig.label}
                        {isActive && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      {waitingCount > 0 && (
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
          {waitingCount} en espera
        </span>
      )}
    </div>
  );
}

export default DeliveryChannelsControl;
