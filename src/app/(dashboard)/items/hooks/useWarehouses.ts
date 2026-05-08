"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";

export interface WarehouseRecord {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  location_id: string;
  created_at: string | null;
  updated_at: string | null;
  location_name: string | null;
}

export interface WarehouseFilters {
  query: string;
}

interface Option {
  id: string;
  name: string;
}

interface UseWarehousesOptions {
  organizationId?: string;
}

export function useWarehouses({ organizationId }: UseWarehousesOptions) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  // State
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<WarehouseFilters>({ query: "" });

  // Fetch warehouses
  const fetchWarehouses = useCallback(async () => {
    if (!organizationId) {
      setWarehouses([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("warehouses")
        .select(
          "id, organization_id, name, description, location_id, created_at, updated_at, location:locations(id, name)"
        )
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;

      const rows =
        (data || []).map((row: any) => {
          const locationRecord = Array.isArray(row.location)
            ? row.location[0]
            : row.location;
          return {
            id: row.id,
            organization_id: row.organization_id,
            name: row.name,
            description: row.description ?? null,
            location_id: row.location_id,
            created_at: row.created_at ?? null,
            updated_at: row.updated_at ?? null,
            location_name: locationRecord?.name ?? null,
          };
        }) ?? [];
      setWarehouses(rows);
    } catch (err: any) {
      setError(err?.message || "Error cargando bodegas");
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setLocations((data || []) as Option[]);
    } catch (err: any) {
      console.error("Error loading locations:", err);
    }
  }, [organizationId, supabase]);

  // Fetch on mount and when org changes
  useEffect(() => {
    if (!organizationId) {
      setWarehouses([]);
      setLocations([]);
      return;
    }
    fetchWarehouses();
    fetchLocations();
  }, [organizationId, fetchWarehouses, fetchLocations]);

  // Filter helpers
  const setQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  }, []);

  // Computed: filtered warehouses
  const filteredWarehouses = useMemo(() => {
    const term = filters.query.trim().toLowerCase();
    if (!term) return warehouses;
    return warehouses.filter((wh) => {
      const nameMatch = wh.name?.toLowerCase().includes(term);
      const branchMatch = wh.location_name?.toLowerCase().includes(term);
      return Boolean(nameMatch || branchMatch);
    });
  }, [warehouses, filters.query]);

  // Actions
  const updateWarehouse = useCallback((warehouse: WarehouseRecord) => {
    setWarehouses((prev) => {
      const index = prev.findIndex((w) => w.id === warehouse.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = warehouse;
        return next;
      }
      return [warehouse, ...prev];
    });
  }, []);

  const removeWarehouse = useCallback((id: string) => {
    setWarehouses((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const deleteWarehouse = useCallback(
    async (warehouse: WarehouseRecord) => {
      if (!organizationId) return;

      const { error } = await supabase
        .from("warehouses")
        .delete()
        .eq("id", warehouse.id)
        .eq("organization_id", organizationId);

      if (error) throw error;
      removeWarehouse(warehouse.id);
    },
    [organizationId, supabase, removeWarehouse]
  );

  return {
    // Data
    warehouses: filteredWarehouses,
    allWarehouses: warehouses,
    locations,
    loading,
    error,

    // Filters
    filters,
    setQuery,

    // Actions
    refresh: fetchWarehouses,
    updateWarehouse,
    removeWarehouse,
    deleteWarehouse,
  };
}