// context/EnvironmentContext.tsx
"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { Environment, LocationInfo } from "@/lib/get-env";

type LocationAccess = {
  canAccessLocation: (locationId: string) => boolean;
  canAccessAllLocations: boolean;
  currentLocation: LocationInfo | null;
  switchLocation: (locationId: string) => void;
};

type EnvCtx = Environment & {
  hasPermission: (perm: string) => boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isManager: boolean;
  // Location access helpers
  locationAccess: LocationAccess;
};

const Ctx = createContext<EnvCtx | undefined>(undefined);

export function EnvironmentProvider({ value, children }: { value: Environment; children: React.ReactNode }) {
  const isAdmin = value.memberRole === "owner" || value.memberRole === "admin";
  const isOwner = value.memberRole === "owner";
  const isManager = value.memberRole === "manager";

  const hasPermission = useCallback(
    (perm: string) => {
      if (["owner", "admin"].includes(value.memberRole ?? "")) return true;
      // Additional permission checks can be added here
      return false;
    },
    [value.memberRole]
  );

  // Location access helpers
  const locationAccess = useMemo(() => {
    const canAccessLocation = (locationId: string) => {
      // If has org-level access, can access all locations
      if (value.hasOrganizationLevelAccess) return true;
      // Otherwise check if location is in accessible list
      return value.accessibleLocations.some(loc => loc.id === locationId);
    };

    const canAccessAllLocations = value.hasOrganizationLevelAccess;

    const currentLocation = value.currentLocationId 
      ? value.organizationLocations.find(loc => loc.id === value.currentLocationId) ?? null
      : null;

    const switchLocation = (locationId: string) => {
      // This will be handled by the client-side router
      window.location.href = `/api/location/select?location=${locationId}`;
    };

    return {
      canAccessLocation,
      canAccessAllLocations,
      currentLocation,
      switchLocation
    };
  }, [value]);

  const ctx = useMemo<EnvCtx>(
    () => ({ 
      ...value, 
      hasPermission, 
      isAdmin, 
      isOwner,
      isManager,
      locationAccess
    }),
    [value, hasPermission, isAdmin, isOwner, isManager, locationAccess]
  );

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useEnvironment() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEnvironment must be used within EnvironmentProvider");
  return ctx;
}