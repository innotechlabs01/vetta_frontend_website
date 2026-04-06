/**
 * Schedule Validation Utilities
 * 
 * Funciones para validar disponibilidad de sucursales basándose en:
 * 1. Horarios semanales (location_hours_weekly)
 * 2. Fechas especiales (location_special_days)
 * 3. Canales de servicio habilitados
 */

import { getSupabaseBrowser } from "@/utils/supabase/client";

type SupabaseClient = ReturnType<typeof getSupabaseBrowser>;

export interface ScheduleCheckResult {
  isOpen: boolean;
  reason?: string;
  nextOpen?: Date;
  nextClose?: Date;
  currentRangeOpen?: string; // "HH:MM"
  currentRangeClose?: string; // "HH:MM"
}

export interface LocationAvailability {
  locationId: string;
  isOpenNow: boolean;
  openTime?: string;
  closeTime?: string;
  nextOpenTime?: Date;
  nextCloseTime?: Date;
  isClosed: boolean; // es festivo completo
  closedReason?: string;
}

export interface ServiceChannelAvailability {
  channel: "delivery" | "pickup" | "national_shipping";
  enabled: boolean;
  reason?: string; // ej: "Sin horarios configurados"
}

type TimeRange = { start: string; end: string };

/**
 * Convierte una cadena "HH:MM" a minutos desde medianoche
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Obtiene el rango de horario actual para un día específico
 */
async function getWeeklyRanges(
  locationId: string,
  weekday: number, // 0 = domingo, 1 = lunes, ..., 6 = sábado
  supabase: SupabaseClient
): Promise<TimeRange[]> {
  const { data, error } = await supabase
    .from("location_hours_weekly")
    .select("open_time_1,close_time_1,open_time_2,close_time_2,is_open")
    .eq("location_id", locationId)
    .eq("weekday", weekday)
    .single();

  if (error || !data?.is_open) return [];

  const ranges: TimeRange[] = [];

  if (data.open_time_1 && data.close_time_1) {
    ranges.push({
      start: data.open_time_1.slice(0, 5),
      end: data.close_time_1.slice(0, 5),
    });
  }

  if (data.open_time_2 && data.close_time_2) {
    ranges.push({
      start: data.open_time_2.slice(0, 5),
      end: data.close_time_2.slice(0, 5),
    });
  }

  return ranges;
}

/**
 * Verifica si una fecha es un día especial (cerrado o con horarios diferentes)
 */
async function getSpecialDayRange(
  locationId: string,
  date: string, // "YYYY-MM-DD"
  supabase: SupabaseClient
): Promise<{ isClosed: boolean; ranges: TimeRange[] } | null> {
  const { data: specialDay, error: dayError } = await supabase
    .from("location_special_days")
    .select("id,is_closed")
    .eq("location_id", locationId)
    .eq("date", date)
    .single();

  if (dayError || !specialDay) return null;

  if (specialDay.is_closed) {
    return { isClosed: true, ranges: [] };
  }

  // Obtener rangos especiales
  const { data: ranges } = await supabase
    .from("location_special_day_ranges")
    .select("open_time,close_time")
    .eq("special_day_id", specialDay.id);

  const timeRanges: TimeRange[] = (ranges ?? []).map((r: any) => ({
    start: r.open_time.slice(0, 5),
    end: r.close_time.slice(0, 5),
  }));

  return { isClosed: false, ranges: timeRanges };
}

/**
 * Verifica si una hora cae dentro de alguno de los rangos de tiempo
 */
function isTimeInRanges(time: string, ranges: TimeRange[]): boolean {
  const timeMin = timeToMinutes(time);

  return ranges.some((range) => {
    const startMin = timeToMinutes(range.start);
    const endMin = timeToMinutes(range.end);
    return timeMin >= startMin && timeMin < endMin;
  });
}

/**
 * Encuentra el próximo horario de apertura desde una fecha/hora
 */
async function findNextOpenTime(
  locationId: string,
  fromDate: Date,
  supabase: SupabaseClient
): Promise<Date | null> {

  const nowMinutes =
    fromDate.getHours() * 60 + fromDate.getMinutes();

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(fromDate);
    checkDate.setDate(checkDate.getDate() + i);

    const dateStr = checkDate.toISOString().split("T")[0];
    const weekday = checkDate.getDay();

    const specialDay = await getSpecialDayRange(locationId, dateStr, supabase);
    if (specialDay?.isClosed) continue;

    const ranges =
      specialDay?.ranges ||
      (await getWeeklyRanges(locationId, weekday, supabase));

    if (ranges.length === 0) continue;

    ranges.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    for (const range of ranges) {

      const openMinutes = timeToMinutes(range.start);

      // Si es HOY debemos validar que aún no haya pasado
      if (i === 0) {
        if (openMinutes <= nowMinutes) continue;
      }

      const openTime = new Date(checkDate);
      const [h, m] = range.start.split(":").map(Number);
      openTime.setHours(h, m, 0, 0);

      return openTime;
    }
  }

  return null;
}

/**
 * Valida si una sucursal está abierta a una hora específica
 * 
 * @param locationId - ID de la sucursal
 * @param supabase - Cliente Supabase
 * @param checkTime - Hora a verificar (default: ahora)
 * @returns ScheduleCheckResult con estado de apertura
 */
export async function checkLocationSchedule(
  locationId: string,
  supabase: SupabaseClient,
  checkTime: Date = new Date()
): Promise<ScheduleCheckResult> {
  try {
    const dateStr = checkTime.toISOString().split("T")[0];
    const timeStr = checkTime.toTimeString().slice(0, 5); // "HH:MM"
    const weekday = checkTime.getDay(); // 0 = Sunday

    // 1. Verificar días especiales primero
    const specialDay = await getSpecialDayRange(locationId, dateStr, supabase);

    if (specialDay) {
      if (specialDay.isClosed) {
        const nextOpen = await findNextOpenTime(locationId, checkTime, supabase);
        return {
          isOpen: false,
          reason: "Cerrado por día especial",
          nextOpen: nextOpen || undefined,
        };
      }

      // Día especial con horarios personalizados
      if (isTimeInRanges(timeStr, specialDay.ranges)) {
        const range = specialDay.ranges.find(
          (r) =>
            timeToMinutes(timeStr) >= timeToMinutes(r.start) &&
            timeToMinutes(timeStr) < timeToMinutes(r.end)
        );
        return {
          isOpen: true,
          reason: "Horario especial",
          currentRangeOpen: range?.start,
          currentRangeClose: range?.end,
        };
      } else {
        const nextOpen = await findNextOpenTime(locationId, checkTime, supabase);
        return {
          isOpen: false,
          reason: "Fuera de horario especial",
          nextOpen: nextOpen || undefined,
        };
      }
    }

    // 2. Verificar horarios semanales
    const weeklyRanges = await getWeeklyRanges(locationId, weekday, supabase);

    if (weeklyRanges.length === 0) {
      const nextOpen = await findNextOpenTime(locationId, checkTime, supabase);
      return {
        isOpen: false,
        reason: "Sucursal cerrada este día",
        nextOpen: nextOpen || undefined,
      };
    }

    if (isTimeInRanges(timeStr, weeklyRanges)) {
      const range = weeklyRanges.find(
        (r) =>
          timeToMinutes(timeStr) >= timeToMinutes(r.start) &&
          timeToMinutes(timeStr) < timeToMinutes(r.end)
      );
      return {
        isOpen: true,
        currentRangeOpen: range?.start,
        currentRangeClose: range?.end,
      };
    } else {
      console.log("Check", checkTime);
      const nextOpen = await findNextOpenTime(locationId, checkTime, supabase);
      console.log("nextOpen", nextOpen);
      return {
        isOpen: false,
        reason: "Fuera de horarios de operación",
        nextOpen: nextOpen || undefined,
      };
    }
  } catch (error) {
    return {
      isOpen: false,
      reason: `Error validando horario: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

/**
 * Obtiene información de disponibilidad de un canal de servicio
 * 
 * @param locationId - ID de la sucursal
 * @param channel - Canal: 'delivery', 'pickup', 'national_shipping'
 * @param supabase - Cliente Supabase
 * @returns ServiceChannelAvailability
 */
export async function checkServiceChannelAvailability(
  locationId: string,
  channel: "delivery" | "pickup" | "national_shipping",
  supabase: SupabaseClient
): Promise<ServiceChannelAvailability> {
  try {
    // Obtener ubicación para verificar switches
    const { data: location, error: locError } = await supabase
      .from("locations")
      .select(
        channel === "delivery"
          ? "local_delivery_enabled"
          : channel === "pickup"
            ? "pickup_enabled"
            : "shipping_enabled"
      )
      .eq("id", locationId)
      .single();

    if (locError || !location) {
      return {
        channel,
        enabled: false,
        reason: "Ubicación no encontrada",
      };
    }

    const isEnabled =
      channel === "delivery"
        ? (location as any).local_delivery_enabled
        : channel === "pickup"
          ? (location as any).pickup_enabled
          : (location as any).shipping_enabled;

    if (!isEnabled) {
      return {
        channel,
        enabled: false,
        reason: `Canal ${channel} no habilitado en esta sucursal`,
      };
    }

    // Verificar que exista al menos un horario para este canal
    const { data: hasSchedule } = await supabase
      .from("location_hours_weekly")
      .select("id")
      .eq("location_id", locationId)
      .eq("is_open", true)
      .limit(1);

    if (!hasSchedule?.length) {
      return {
        channel,
        enabled: false,
        reason: "Sin horarios configurados",
      };
    }

    return {
      channel,
      enabled: true,
    };
  } catch (error) {
    return {
      channel,
      enabled: false,
      reason: `Error verificando canal: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

/**
 * Obtiene información completa de disponibilidad de una sucursal
 */
export async function getLocationAvailability(
  locationId: string,
  supabase: SupabaseClient,
  checkTime: Date = new Date()
): Promise<LocationAvailability> {
  const scheduleResult = await checkLocationSchedule(locationId, supabase, checkTime);

  return {
    locationId,
    isOpenNow: scheduleResult.isOpen,
    openTime: scheduleResult.currentRangeOpen,
    closeTime: scheduleResult.currentRangeClose,
    nextOpenTime: scheduleResult.nextOpen,
    nextCloseTime: scheduleResult.nextClose,
    isClosed: !scheduleResult.isOpen,
    closedReason: scheduleResult.reason,
  };
}
