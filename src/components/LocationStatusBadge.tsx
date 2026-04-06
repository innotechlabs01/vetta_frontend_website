"use client";

import { useEffect, useMemo, useCallback } from "react";
import { Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useLocationSchedule, useScheduledPickupValidation } from "@/hooks/useLocationSchedule";
import { cn } from "@/lib/utils";

interface LocationStatusBadgeProps {
  /** ID de la sucursal */
  locationId: string | null | undefined;
  /** Mostrar texto completo */
  showFullStatus?: boolean;
  /** Tamaño del badge */
  size?: "sm" | "md" | "lg";
  /** Actualización automática */
  autoRefresh?: boolean;
  /** Intervalo de actualización en ms (default: 60s) */
  refreshInterval?: number;
  /** Callback cuando se hace click */
  onRefresh?: () => void;
  /** Clases adicionales */
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    container: "text-xs gap-1 px-2 py-0.5",
    icon: "w-3 h-3",
    dot: "w-1.5 h-1.5",
  },
  md: {
    container: "text-sm gap-1.5 px-2.5 py-1",
    icon: "w-4 h-4",
    dot: "w-2 h-2",
  },
  lg: {
    container: "text-base gap-2 px-3 py-1.5",
    icon: "w-5 h-5",
    dot: "w-2.5 h-2.5",
  },
};

export function LocationStatusBadge({
  locationId,
  showFullStatus = false,
  size = "md",
  autoRefresh = true,
  refreshInterval = 60000,
  onRefresh,
  className,
}: LocationStatusBadgeProps) {
  const { isOpen, openTime, closeTime, closedReason, isLoading, refresh } =
    useLocationSchedule(locationId, {
      enabled: !!locationId && autoRefresh,
      refreshInterval,
    });

  const sizeConfig = SIZE_CONFIG[size];

  const statusConfig = useMemo(() => {
    if (isLoading) {
      return {
        label: "Cargando...",
        icon: RefreshCw,
        bgColor: "bg-gray-100",
        textColor: "text-gray-600",
        iconColor: "text-gray-500",
        dotColor: "bg-gray-400",
        animate: true,
      };
    }

    if (isOpen) {
      return {
        label: showFullStatus && openTime && closeTime
          ? `Abierto ${openTime} - ${closeTime}`
          : "Abierto",
        icon: CheckCircle2,
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        iconColor: "text-green-600",
        dotColor: "bg-green-500",
        animate: false,
      };
    }

    return {
      label: closedReason || "Cerrado",
      icon: XCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      iconColor: "text-red-600",
      dotColor: "bg-red-500",
      animate: false,
    };
  }, [isOpen, isLoading, openTime, closeTime, closedReason, showFullStatus]);

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        statusConfig.bgColor,
        statusConfig.textColor,
        sizeConfig.container,
        className
      )}
      onClick={onRefresh}
      role={onRefresh ? "button" : undefined}
      tabIndex={onRefresh ? 0 : undefined}
    >
      <span
        className={cn(
          "relative flex",
          sizeConfig.dot,
          statusConfig.dotColor,
          statusConfig.animate && "animate-pulse"
        )}
      >
        {statusConfig.animate && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full",
              statusConfig.dotColor,
              "opacity-75 animate-ping"
            )}
          />
        )}
      </span>
      <StatusIcon
        className={cn(sizeConfig.icon, statusConfig.iconColor, statusConfig.animate && "animate-spin")}
      />
      <span className="truncate max-w-[150px]">{statusConfig.label}</span>
    </div>
  );
}

interface LocationScheduleInfoProps {
  locationId: string | null | undefined;
  /** Canal de servicio a verificar (delivery, pickup, shipping) */
  serviceChannel?: "delivery" | "pickup" | "national_shipping";
  /** Mostrar información de siguiente apertura */
  showNextOpen?: boolean;
  /** Callback para agendar */
  onSchedulePickup?: (date: Date) => void;
  className?: string;
}

export function LocationScheduleInfo({
  locationId,
  serviceChannel = "pickup",
  showNextOpen = true,
  onSchedulePickup,
  className,
}: LocationScheduleInfoProps) {
  const { isOpen, openTime, closeTime, nextOpen, closedReason, checkChannel, checkSchedule, isLoading } =
    useLocationSchedule(locationId);

  const channelConfig = useMemo(() => {
    const configs = {
      delivery: {
        label: "Delivery",
        icon: "🛵",
        enabledLabel: "Entrega a domicilio",
        disabledLabel: "Delivery no disponible",
      },
      pickup: {
        label: "Pickup",
        icon: "🛒",
        enabledLabel: "Retiro en tienda",
        disabledLabel: "Retiro no disponible",
      },
      national_shipping: {
        label: "Shipping",
        icon: "📦",
        enabledLabel: "Envíos nacionales",
        disabledLabel: "Envíos no disponibles",
      },
    };
    return configs[serviceChannel];
  }, [serviceChannel]);

  const formatNextOpen = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `Abre ${days} día${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `Abre en ${hours} hora${hours > 1 ? "s" : ""}`;
    }
    return "Abre pronto";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Estado actual */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{channelConfig.icon}</span>
        <span className="text-sm font-medium">
          {isOpen ? channelConfig.enabledLabel : channelConfig.disabledLabel}
        </span>
        {isLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
        ) : isOpen ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            {openTime} - {closeTime}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" />
            Cerrado
          </span>
        )}
      </div>

      {/* Información de próxima apertura */}
      {showNextOpen && !isOpen && nextOpen && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{formatNextOpen(nextOpen)}</span>
          <span className="text-gray-400">
            ({nextOpen.toLocaleDateString("es-CO", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })})
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Componente para validar horario de recogida programada
 * Muestra error si el horario seleccionado no está disponible
 */
interface ScheduledPickupValidatorProps {
  locationId: string | null | undefined;
  scheduledTime: Date | null;
  serviceChannel?: "delivery" | "pickup" | "national_shipping";
  onValidChange?: (isValid: boolean) => void;
  onSuggestTime?: (date: Date) => void;
  className?: string;
}

export function ScheduledPickupValidator({
  locationId,
  scheduledTime,
  serviceChannel = "pickup",
  onValidChange,
  onSuggestTime,
  className,
}: ScheduledPickupValidatorProps) {
  const { isValid, error, nextAvailableTime, validate, isLoading } =
    useScheduledPickupValidation({
      locationId,
      scheduledDateTime: scheduledTime,
      serviceChannel,
    });

  useEffect(() => {
    if (scheduledTime) {
      validate();
    }
  }, [scheduledTime, locationId, serviceChannel, validate]);

  useEffect(() => {
    onValidChange?.(isValid);
  }, [isValid, onValidChange]);

  if (!scheduledTime) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-gray-500", className)}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Validando horario...</span>
      </div>
    );
  }

  if (isValid) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-green-600", className)}>
        <CheckCircle2 className="w-4 h-4" />
        <span>Horario disponible</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-2 text-sm text-red-600", className)}>
      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <span>{error || "Horario no disponible"}</span>
        {nextAvailableTime && (
          <button
            type="button"
            className="block text-blue-600 hover:underline cursor-pointer"
            onClick={() => {
              onSuggestTime?.(nextAvailableTime);
            }}
          >
            {nextAvailableTime.toLocaleString("es-CO", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </button>
        )}
      </div>
    </div>
  );
}

export default LocationStatusBadge;
