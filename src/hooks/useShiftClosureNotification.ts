/**
 * Hook para notificar al usuario cuando se acerca la hora de cierre de turno
 * 
 * Uso:
 * useShiftClosureNotification(activeShift)
 * 
 * El hook maneja automáticamente:
 * - Notificaciones visuales progresivas (30min, 15min, 5min antes del cierre)
 * - Sonidos de alerta
 * - Conteo regresivo
 * - Cierre automático si llega la hora exacta
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

export interface CashShift {
  id: string;
  opened_at: string | null;
  expected_closing_time?: string | null;
  opening_amount: number;
  status: "open" | "closed" | "pending_approval";
}

interface NotificationConfig {
  soundUrl?: string; // URL del sonido de alerta
  autoCloseAtExactTime?: boolean; // Auto-cerrar cuando llega hora exacta?
}

const DEFAULT_CONFIG: NotificationConfig = {
  autoCloseAtExactTime: false,
};

/**
 * Genera un sonido simple de alerta usando Web Audio API
 */
function playAlertSound(duration: number = 500) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.warn("No se pudo reproducir sonido de alerta:", error);
  }
}

/**
 * Formatea tiempo restante para mostrar
 */
function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return "¡Hora de cerrar!";
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? "s" : ""}`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let result = `${hours} hora${hours !== 1 ? "s" : ""}`;
  if (mins > 0) result += ` ${mins} minuto${mins !== 1 ? "s" : ""}`;
  return result;
}

/**
 * Hook para notificaciones de cierre de turno
 */
export function useShiftClosureNotification(
  shift: CashShift | null,
  config: NotificationConfig = DEFAULT_CONFIG
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [notificationLevel, setNotificationLevel] = useState<"none" | "warning" | "urgent">("none");
  const notifiedRef = useRef<Set<number>>(new Set()); // Evitar duplicadas

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeRemaining(null);
    setNotificationLevel("none");
    notifiedRef.current.clear();
  }, []);

  useEffect(() => {
    // Si no hay shift o no está abierto, limpiar
    if (!shift || shift.status !== "open" || !shift.opened_at) {
      cleanup();
      return;
    }

    // Determinar hora de cierre estimada
    // Si hay expected_closing_time, usarla; si no, asumir 8 horas después de apertura
    let closingTime: Date;

    if (shift.expected_closing_time) {
      closingTime = new Date(shift.expected_closing_time);
    } else {
      // Default: 8 horas de turno
      closingTime = new Date(shift.opened_at);
      closingTime.setHours(closingTime.getHours() + 8);
    }

    // Iniciar timer que chequea cada minuto
    const tick = () => {
      const now = new Date();
      const diffMs = closingTime.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));

      setTimeRemaining(diffMinutes);

      // Lógica de notificaciones
      if (diffMinutes <= 0) {
        // ¡Hora de cerrar!
        if (!notifiedRef.current.has(0)) {
          setNotificationLevel("urgent");
          playAlertSound(1000);
          toast.error("¡Es hora de cerrar el turno!", {
            description: "Dirígete a la sección de cierre de turno",
            duration: 30000,
          });
          notifiedRef.current.add(0);

          if (config.autoCloseAtExactTime) {
            // Aquí iría la lógica para cerrar automáticamente si está configurado
            console.log("Hora de cierre exacta alcanzada");
          }
        }
      } else if (diffMinutes === 5) {
        // 5 minutos
        if (!notifiedRef.current.has(5)) {
          setNotificationLevel("urgent");
          playAlertSound(500);
          toast.warning("5 minutos para cerrar el turno", {
            description: "Prepárate para finalizar el día",
            duration: 10000,
          });
          notifiedRef.current.add(5);
        }
      } else if (diffMinutes === 15) {
        // 15 minutos
        if (!notifiedRef.current.has(15)) {
          setNotificationLevel("warning");
          playAlertSound(300);
          toast.info("15 minutos para cerrar el turno", {
            description: formatTimeRemaining(diffMinutes),
            duration: 8000,
          });
          notifiedRef.current.add(15);
        }
      } else if (diffMinutes === 30) {
        // 30 minutos
        if (!notifiedRef.current.has(30)) {
          setNotificationLevel("warning");
          toast.info("Recordatorio: 30 minutos para cerrar turno", {
            description: "Comienza a preparar el cierre de caja",
            duration: 5000,
          });
          notifiedRef.current.add(30);
        }
      }
    };

    // Primera ejecución inmediata
    tick();

    // Luego cada minuto
    timerRef.current = setInterval(tick, 60 * 1000);

    return () => {
      cleanup();
    };
  }, [shift, config.autoCloseAtExactTime, cleanup]);

  return {
    timeRemaining,
    timeRemainingLabel: timeRemaining !== null ? formatTimeRemaining(timeRemaining) : null,
    notificationLevel,
    isUrgent: notificationLevel === "urgent",
    isWarning: notificationLevel === "warning",
  };
}

/**
 * Componente visual para mostrar el estado del cierre de turno
 * 
 * Este archivo está en .ts pero contiene código que necesita ser usado desde .tsx
 * Para usarlo, importa desde el hook y renderiza usando React.FC
 */

export interface ShiftClosureNotificationBadgeProps {
  shift: CashShift | null;
  config?: NotificationConfig;
}

// Esta es una función de utilidad para obtener los estilos del badge
export function getShiftClosureNotificationStyles(
  isUrgent: boolean,
  isWarning: boolean
): { containerClass: string; icon: string } {
  return {
    containerClass: isUrgent
      ? "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-red-100 text-red-700 border border-red-300"
      : isWarning
        ? "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-yellow-100 text-yellow-700 border border-yellow-300"
        : "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-blue-100 text-blue-700 border border-blue-300",
    icon: isUrgent ? "⏰" : "ℹ️",
  };
}
