/**
 * Hook para validar disponibilidad de horarios de una sucursal
 * 
 * Uso:
 * const { isOpen, isLoading, error, checkSchedule } = useLocationSchedule(locationId);
 * 
 * // Validar si está abierto en un momento específico
 * const result = await checkSchedule(new Date());
 * 
 * // Validar si está abierto en un horario específico (para scheduled pickup)
 * const result = await checkSchedule(new Date('2024-01-15T14:00:00'));
 */

import { useCallback, useState, useRef, useMemo, useEffect } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import {
  checkLocationSchedule,
  checkServiceChannelAvailability,
  type ScheduleCheckResult,
  type ServiceChannelAvailability,
} from "@/utils/schedule-validation";

interface UseLocationScheduleOptions {
  /** Habilitar/deshabilitar el hook */
  enabled?: boolean;
  /** Intervalo de actualización en ms (para estado en tiempo real) */
  refreshInterval?: number;
}

interface UseLocationScheduleResult {
  /** Si la sucursal está abierta ahora */
  isOpen: boolean;
  /** Horario de apertura actual */
  openTime?: string;
  /** Horario de cierre actual */
  closeTime?: string;
  /** Razón por la que está cerrada (si aplica) */
  closedReason?: string;
  /** Próxima apertura */
  nextOpen?: Date;
  /** Loading state */
  isLoading: boolean;
  /** Error si hay algún problema */
  error: string | null;
  /** Función para verificar horario específico */
  checkSchedule: (date?: Date) => Promise<ScheduleCheckResult>;
  /** Función para verificar disponibilidad de canal */
  checkChannel: (channel: "delivery" | "pickup" | "national_shipping") => Promise<ServiceChannelAvailability>;
  /** Forzar actualización */
  refresh: () => Promise<void>;
}

export function useLocationSchedule(
  locationId: string | null | undefined,
  options: UseLocationScheduleOptions = {}
): UseLocationScheduleResult {
  const { enabled = true, refreshInterval = 60000 } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [openTime, setOpenTime] = useState<string | undefined>();
  const [closeTime, setCloseTime] = useState<string | undefined>();
  const [closedReason, setClosedReason] = useState<string | undefined>();
  const [nextOpen, setNextOpen] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const doCheck = useCallback(
    async (checkDate: Date = new Date()): Promise<ScheduleCheckResult> => {
      if (!locationId || !enabled) {
        return { isOpen: false, reason: "Location ID no proporcionado" };
      }

      try {
        const result = await checkLocationSchedule(locationId, supabase, checkDate);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        return { isOpen: false, reason: message };
      }
    },
    [locationId, enabled, supabase]
  );

  const checkSchedule = useCallback(
    async (date?: Date): Promise<ScheduleCheckResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const checkDate = date ?? new Date();
        const result = await doCheck(checkDate);

        setIsOpen(result.isOpen);
        setOpenTime(result.currentRangeOpen);
        setCloseTime(result.currentRangeClose);
        setClosedReason(result.reason);
        setNextOpen(result.nextOpen);

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        return { isOpen: false, reason: message };
      } finally {
        setIsLoading(false);
      }
    },
    [doCheck]
  );

  const checkChannel = useCallback(
    async (
      channel: "delivery" | "pickup" | "national_shipping"
    ): Promise<ServiceChannelAvailability> => {
      if (!locationId || !enabled) {
        return { channel, enabled: false, reason: "Location ID no proporcionado" };
      }

      try {
        return await checkServiceChannelAvailability(locationId, channel, supabase);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        return { channel, enabled: false, reason: message };
      }
    },
    [locationId, enabled, supabase]
  );

  const refresh = useCallback(async () => {
    await checkSchedule();
  }, [checkSchedule]);

  // Efecto para cargar inicial y actualizar periódicamente
  useEffect(() => {
    if (!enabled || !locationId) {
      return;
    }

    // Carga inicial
    checkSchedule();

    // Configurar actualización periódica
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        checkSchedule();
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, locationId, refreshInterval]);

  return {
    isOpen,
    openTime,
    closeTime,
    closedReason,
    nextOpen,
    isLoading,
    error,
    checkSchedule,
    checkChannel,
    refresh,
  };
}

/**
 * Hook para validar si un horario de recogida programado es válido
 * 
 * Uso:
 * const { isValid, error, suggestedTimes } = useScheduledPickupValidation({
 *   locationId: "uuid",
 *   scheduledDateTime: new Date('2024-01-15T14:00:00'),
 *   serviceChannel: 'pickup'
 * });
 */

interface UseScheduledPickupValidationParams {
  locationId: string | null | undefined;
  scheduledDateTime: Date | null | undefined;
  serviceChannel?: "delivery" | "pickup" | "national_shipping";
}

interface UseScheduledPickupValidationResult {
  /** Si el horario programado es válido */
  isValid: boolean;
  /** Mensaje de error si no es válido */
  error: string | null;
  /** Próximo horario disponible */
  nextAvailableTime: Date | null;
  /** Loading state */
  isLoading: boolean;
  /** Validar el horario */
  validate: () => Promise<void>;
}

export function useScheduledPickupValidation(
  params: UseScheduledPickupValidationParams
): UseScheduledPickupValidationResult {
  const { locationId, scheduledDateTime, serviceChannel = "pickup" } = params;

  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextAvailableTime, setNextAvailableTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const validate = useCallback(async () => {
    if (!locationId || !scheduledDateTime) {
      setIsValid(false);
      setError("Faltan datos requeridos");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Verificar que el canal esté habilitado
      const channelCheck = await checkServiceChannelAvailability(
        locationId,
        serviceChannel,
        supabase
      );

      if (!channelCheck.enabled) {
        setIsValid(false);
        setError(channelCheck.reason ?? "Canal no disponible");
        return;
      }

      // 2. Verificar que esté abierto en el horario seleccionado
      const scheduleCheck = await checkLocationSchedule(
        locationId,
        supabase,
        scheduledDateTime
      );

      if (!scheduleCheck.isOpen) {
        setIsValid(false);
        
        // Generar mensaje de error más descriptivo
        let errorMsg = scheduleCheck.reason ?? "Sucursal cerrada en el horario seleccionado";
        
        if (scheduleCheck.nextOpen) {
          const nextTime = scheduleCheck.nextOpen;
          const options: Intl.DateTimeFormatOptions = {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          };
          errorMsg += `. Próxima apertura: ${nextTime.toLocaleString("es-CO", options)}`;
          setNextAvailableTime(scheduleCheck.nextOpen);
        }
        
        setError(errorMsg);
        return;
      }

      // 3. Verificar que el horario sea al menos 30 minutos en el futuro
      const now = new Date();
      const minutesUntilPickup = Math.floor(
        (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60)
      );

      if (minutesUntilPickup < 30 && minutesUntilPickup >= 0) {
        setIsValid(true);
        setError("El horario debe ser al menos 30 minutos en el futuro");
        setNextAvailableTime(null);
        return;
      }

      // Todo válido
      setIsValid(true);
      setError(null);
      setNextAvailableTime(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setIsValid(false);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [locationId, scheduledDateTime, serviceChannel, supabase]);

  return {
    isValid,
    error,
    nextAvailableTime,
    isLoading,
    validate,
  };
}

export type { ScheduleCheckResult, ServiceChannelAvailability };
