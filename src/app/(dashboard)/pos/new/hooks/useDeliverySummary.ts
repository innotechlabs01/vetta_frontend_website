"use client";

import { useState, useCallback } from "react";

type DeliverySummary = {
  totalDeliverySales: number;
  totalDriverCommissions: number;
  totalTips: number;
  netProfit: number;
  orderCount: number;
};

type UseDeliverySummaryResult = {
  summary: DeliverySummary | null;
  loading: boolean;
  error: string | null;
  fetchSummary: (supabase: any, organizationId: string, locationId: string, dateRange?: { start: string; end: string }) => Promise<void>;
};

export function useDeliverySummary(): UseDeliverySummaryResult {
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (
    supabase: any, 
    organizationId: string, 
    locationId: string,
    dateRange?: { start: string; end: string }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const startOfDay = dateRange?.start || today.toISOString().split('T')[0];
      const endOfDay = dateRange?.end || today.toISOString().split('T')[0];

      const { data, error: fetchError } = await supabase
        .from("driver_earnings")
        .select(`
          total_amount,
          commission_amount,
          tip,
          created_at
        `)
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .gte("created_at", `${startOfDay}T00:00:00`)
        .lte("created_at", `${endOfDay}T23:59:59`);

      if (fetchError) throw fetchError;

      const earnings = data || [];
      
      const totalDeliverySales = earnings.reduce((acc: number, e: any) => acc + (e.total_amount || 0), 0);
      const totalDriverCommissions = earnings.reduce((acc: number, e: any) => acc + (e.commission_amount || 0), 0);
      const totalTips = earnings.reduce((acc: number, e: any) => acc + (e.tip || 0), 0);

      setSummary({
        totalDeliverySales,
        totalDriverCommissions,
        totalTips,
        netProfit: totalDeliverySales - totalDriverCommissions,
        orderCount: earnings.length,
      });
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching delivery summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { summary, loading, error, fetchSummary };
}
