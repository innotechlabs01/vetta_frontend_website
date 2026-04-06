"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { DraftSummary } from "../types";

type UseDraftsLoaderOptions = {
  organizationId: string | null;
  supabase: any;
  mapSaleRowToDraft: (row: any) => DraftSummary;
  onDraftsLoaded: (drafts: DraftSummary[]) => void;
  onEmptyDrafts: () => Promise<unknown> | unknown;
};

export function useDraftsLoader({
  organizationId,
  supabase,
  mapSaleRowToDraft,
  onDraftsLoaded,
  onEmptyDrafts,
}: UseDraftsLoaderOptions) {
  return useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("sales")
        .select(
          `
            id,
            order_number,
            invoice_number,
            created_at,
            status,
            notes,
            delivery_metadata,
            subtotal_amount,
            total_amount,
            grand_total,
            tip_percentage,
            customer_id,
            customer:customers (id)
          `,
        )
        .eq("organization_id", organizationId)
        .in("status", ["DRAFT"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        await onEmptyDrafts();
        return;
      }

      const mapped = data.map(mapSaleRowToDraft);
      onDraftsLoaded(mapped);
    } catch (err: any) {
      console.error("Error cargando borradores", err);
      toast.error(err?.message ?? "No se pudieron cargar los borradores");
    }
  }, [organizationId, supabase, mapSaleRowToDraft, onDraftsLoaded, onEmptyDrafts]);
}
