// src/hooks/useLocationAnalytics.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface LocationMetrics {
  revenueToday: number;
  revenueYesterday: number;
  ordersToday: number;
  ordersYesterday: number;
  averageTicket: number;
  averageTicketYesterday: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  hourlySales: { hour: number; revenue: number; orders: number }[];
  comparisonVsYesterday: number;
  comparisonVsLastWeek: number;
  comparisonVsLastMonth: number;
  cashInDrawer: number;
  cashExpected: number;
  difference: number;
}

export function useLocationAnalytics(locationId: string | undefined) {
  const [metrics, setMetrics] = useState<LocationMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const loadMetrics = useCallback(async () => {
    if (!locationId) return;

    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
      const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStart = new Date(lastWeek.setHours(0, 0, 0, 0)).toISOString();

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStart = new Date(lastMonth.setHours(0, 0, 0, 0)).toISOString();

      // Today's sales
      const { data: todaySales } = await supabase
        .from("sales")
        .select("id, total, subtotal, created_at, created_by")
        .eq("location_id", locationId)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .eq("status", "completed");

      // Yesterday's sales
      const { data: yesterdaySales } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("location_id", locationId)
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd)
        .eq("status", "completed");

      // Last week sales
      const { data: lastWeekSales } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("location_id", locationId)
        .gte("created_at", lastWeekStart)
        .eq("status", "completed");

      // Last month sales
      const { data: lastMonthSales } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("location_id", locationId)
        .gte("created_at", lastMonthStart)
        .eq("status", "completed");

      // Calculate today's metrics
      const revenueToday = todaySales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const ordersToday = todaySales?.length || 0;
      const averageTicket = ordersToday > 0 ? revenueToday / ordersToday : 0;

      // Calculate yesterday's metrics
      const revenueYesterday = yesterdaySales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const ordersYesterday = yesterdaySales?.length || 0;
      const averageTicketYesterday = ordersYesterday > 0 ? revenueYesterday / ordersYesterday : 0;

      // Get top products from today's sales
      const todaySaleIds = todaySales?.map(s => s.id) || [];
      let topProducts: { name: string; quantity: number; revenue: number }[] = [];
      
      if (todaySaleIds.length > 0) {
        const { data: saleItems } = await supabase
          .from("sale_items")
          .select("product_name, quantity, unit_price, sale_id")
          .in("sale_id", todaySaleIds);

        if (saleItems && saleItems.length > 0) {
          const productMap = new Map<string, { quantity: number; revenue: number }>();
          saleItems.forEach(item => {
            const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
            productMap.set(item.product_name, {
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + (item.unit_price * item.quantity)
            });
          });

          topProducts = Array.from(productMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        }
      }

      // Calculate hourly sales for today
      const hourlyMap = new Map<number, { revenue: number; orders: number }>();
      todaySales?.forEach(sale => {
        const hour = new Date(sale.created_at).getHours();
        const existing = hourlyMap.get(hour) || { revenue: 0, orders: 0 };
        hourlyMap.set(hour, {
          revenue: existing.revenue + (sale.total || 0),
          orders: existing.orders + 1
        });
      });

      const hourlySales = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour - b.hour);

      // Get cash shift for today's drawer
      const { data: todayShift } = await supabase
        .from("cash_shifts")
        .select("opening_amount, closing_amount, status")
        .eq("location_id", locationId)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const cashInDrawer = todayShift?.closing_amount || todayShift?.opening_amount || 0;
      const cashExpected = cashInDrawer; // In a real app, this would be calculated from expected cash transactions
      const difference = cashExpected - cashInDrawer;

      // Comparisons
      const comparisonVsYesterday = revenueYesterday > 0
        ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
        : 0;

      const revenueLastWeek = lastWeekSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const comparisonVsLastWeek = revenueLastWeek > 0
        ? ((revenueToday - revenueLastWeek) / revenueLastWeek) * 100
        : 0;

      const revenueLastMonth = lastMonthSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const comparisonVsLastMonth = revenueLastMonth > 0
        ? ((revenueToday - revenueLastMonth) / revenueLastMonth) * 100
        : 0;

      setMetrics({
        revenueToday,
        revenueYesterday,
        ordersToday,
        ordersYesterday,
        averageTicket,
        averageTicketYesterday,
        topProducts,
        hourlySales,
        comparisonVsYesterday,
        comparisonVsLastWeek,
        comparisonVsLastMonth,
        cashInDrawer,
        cashExpected,
        difference
      });

    } catch (err) {
      console.error("Error loading location metrics:", err);
      setError(err instanceof Error ? err.message : "Error loading metrics");
    } finally {
      setLoading(false);
    }
  }, [locationId, supabase]);

  useEffect(() => {
    if (locationId) {
      loadMetrics();
    }
  }, [locationId, loadMetrics]);

  return {
    metrics,
    loading,
    error,
    refresh: loadMetrics
  };
}
