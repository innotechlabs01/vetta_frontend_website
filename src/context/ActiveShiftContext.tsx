"use client";

import { createContext, useCallback, useContext, useEffect, useState, useMemo } from "react";

type ActiveShift = {
  locationId: string | null;
  locationName: string | null;
  hasOpenShift: boolean;
  shiftId: string | null;
};

type ActiveShiftContextType = {
  activeShift: ActiveShift;
  setActiveShift: (locationId: string | null, locationName?: string | null, shiftId?: string | null) => void;
  clearActiveShift: () => void;
};

const STORAGE_KEY = "active_shift_location";

const defaultActiveShift: ActiveShift = {
  locationId: null,
  locationName: null,
  hasOpenShift: false,
  shiftId: null,
};

const ActiveShiftCtx = createContext<ActiveShiftContextType | undefined>(undefined);

function getInitialState(): ActiveShift {
  if (typeof window === "undefined") {
    return defaultActiveShift;
  }
  
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        locationId: parsed.locationId ?? null,
        locationName: parsed.locationName ?? null,
        hasOpenShift: parsed.hasOpenShift ?? false,
        shiftId: parsed.shiftId ?? null,
      };
    }
  } catch (e) {
    console.error("Error reading active shift from storage:", e);
  }
  
  return defaultActiveShift;
}

function setStorage(value: ActiveShift) {
  if (typeof window === "undefined") return;
  
  try {
    if (value.hasOpenShift && value.locationId) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error("Error saving active shift to storage:", e);
  }
}

export function ActiveShiftProvider({ children }: { children: React.ReactNode }) {
  const [activeShift, setActiveShiftState] = useState<ActiveShift>(defaultActiveShift);

  useEffect(() => {
    setActiveShiftState(getInitialState());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setActiveShiftState({
              locationId: parsed.locationId ?? null,
              locationName: parsed.locationName ?? null,
              hasOpenShift: parsed.hasOpenShift ?? false,
              shiftId: parsed.shiftId ?? null,
            });
          } catch {
            setActiveShiftState(defaultActiveShift);
          }
        } else {
          setActiveShiftState(defaultActiveShift);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setActiveShift = useCallback((locationId: string | null, locationName?: string | null, shiftId?: string | null) => {
    const newValue: ActiveShift = {
      locationId,
      locationName: locationName ?? null,
      hasOpenShift: locationId !== null,
      shiftId: shiftId ?? null,
    };
    setActiveShiftState(newValue);
    setStorage(newValue);
  }, []);

  const clearActiveShift = useCallback(() => {
    setActiveShiftState(defaultActiveShift);
    setStorage(defaultActiveShift);
  }, []);

  const value = useMemo(
    () => ({ activeShift, setActiveShift, clearActiveShift }),
    [activeShift, setActiveShift, clearActiveShift]
  );

  return <ActiveShiftCtx.Provider value={value}>{children}</ActiveShiftCtx.Provider>;
}

export function useActiveShift() {
  const ctx = useContext(ActiveShiftCtx);
  if (!ctx) {
    throw new Error("useActiveShift must be used within ActiveShiftProvider");
  }
  return ctx;
}
