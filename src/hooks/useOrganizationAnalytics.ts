// src/hooks/useOrganizationAnalytics.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface OrganizationMetrics {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  totalCustomers: number;
  newCustomersToday: number;
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  comparisonVsYesterday: number;
  comparisonVsLastWeek: number;
  comparisonVsLastMonth: number;
}

export interface LocationPerformance {
  locationId: string;
  locationName: string;
  sales: number;
  orders: number;
  averageTicket: number;
  revenue: number;
  activeCashiers: number;
  performanceTrend: "up" | "down" | "neutral";
  comparisonVsYesterday: number;
}

export function useOrganizationAnalytics(orgId: string | undefined) {
  const [metrics, setMetrics] = useState<OrganizationMetrics | null>(null);
  const [locationPerformance, setLocationPerformance] = useState<LocationPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const loadMetrics = useCallback(async () => {
    if (!orgId) return;

    try {
      setLoading(true);
      setError(null);

      // Get today's date range
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Get yesterday for comparison
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
      const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

      // Get this week range
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartISO = new Date(weekStart.setHours(0, 0, 0, 0)).toISOString();

      // Get this month range
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthStartISO = new Date(monthStart.setHours(0, 0, 0, 0)).toISOString();

      // Query sales for today
      const { data: todaySales } = await supabase
        .from("sales")
        .select("id, total, subtotal, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .eq("status", "completed");

      // Query sales for yesterday (comparison)
      const { data: yesterdaySales } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd)
        .eq("status", "completed");

      // Query sales for this week
      const { data: weekSales } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", weekStartISO)
        .eq("status", "completed");

      // Query sales for this month
      const { data: monthSales } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", monthStartISO)
        .eq("status", "completed");

      // Get all time sales
      const { data: allTimeSales } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("organization_id", orgId)
        .eq("status", "completed");

      // Get unique customers today
      const { data: todayCustomers } = await supabase
        .from("sales")
        .select("customer_id")
        .eq("organization_id", orgId)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .eq("status", "completed");

      // Get all unique customers
      const { data: allCustomers } = await supabase
        .from("customers")
        .select("id, created_at")
        .eq("organization_id", orgId);

      // Calculate metrics
      const revenueToday = todaySales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const revenueYesterday = yesterdaySales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const revenueThisWeek = weekSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const revenueThisMonth = monthSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const totalRevenue = allTimeSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;

      const ordersToday = todaySales?.length || 0;
      const ordersYesterday = yesterdaySales?.length || 0;
      const ordersThisWeek = weekSales?.length || 0;
      const ordersThisMonth = monthSales?.length || 0;
      const totalOrders = allTimeSales?.length || 0;

      const avgTicket = ordersToday > 0 ? revenueToday / ordersToday : 0;
      const avgTicketAllTime = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get unique customers today
      const uniqueCustomerIdsToday = new Set(todayCustomers?.map(s => s.customer_id).filter(Boolean));
      const newCustomersToday = uniqueCustomerIdsToday.size;

      const totalCustomers = allCustomers?.length || 0;

      // Comparisons
      const comparisonVsYesterday = revenueYesterday > 0 
        ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 
        : 0;

      const comparisonVsLastWeek = revenueThisWeek > 0
        ? ((revenueThisWeek - revenueThisWeek) / revenueThisWeek) * 100
        : 0;

      const comparisonVsLastMonth = revenueThisMonth > 0
        ? ((revenueThisMonth - revenueThisMonth) / revenueThisMonth) * 100
        : 0;

      setMetrics({
        totalSales: totalRevenue,
        totalOrders,
        averageTicket: avgTicketAllTime,
        totalCustomers,
        newCustomersToday,
        totalRevenue,
        revenueToday,
        revenueThisWeek,
        revenueThisMonth,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
        comparisonVsYesterday,
        comparisonVsLastWeek,
        comparisonVsLastMonth
      });

    } catch (err) {
      console.error("Error loading organization metrics:", err);
      setError(err instanceof Error ? err.message : "Error loading metrics");
    } finally {
      setLoading(false);
    }
  }, [orgId, supabase]);

  const loadLocationPerformance = useCallback(async () => {
    if (!orgId) return;

    try {
      // Get all locations for the organization
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true);

      if (!locations || locations.length === 0) {
        setLocationPerformance([]);
        return;
      }

      // Get today's date range
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Get yesterday for comparison
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
      const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

      // Get performance for each location
      const performancePromises = locations.map(async (location) => {
        // Today's sales
        const { data: todaySales } = await supabase
          .from("sales")
          .select("id, total, created_at")
          .eq("location_id", location.id)
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd)
          .eq("status", "completed");

        // Yesterday's sales
        const { data: yesterdaySales } = await supabase
          .from("sales")
          .select("id, total, created_at")
          .eq("location_id", location.id)
          .gte("created_at", yesterdayStart)
          .lte("created_at", yesterdayEnd)
          .eq("status", "completed");

        // Active cashiers today (unique users who made sales)
        const { data: cashiers } = await supabase
          .from("sales")
          .select("created_by")
          .eq("location_id", location.id)
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd)
          .eq("status", "completed");

        const revenue = todaySales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
        const orders = todaySales?.length || 0;
        const avgTicket = orders > 0 ? revenue / orders : 0;
        const revenueYesterday = yesterdaySales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
        
        const uniqueCashiers = new Set(cashiers?.map(c => c.created_by).filter(Boolean));
        const activeCashiers = uniqueCashiers.size;

        const comparisonVsYesterday = revenueYesterday > 0
          ? ((revenue - revenueYesterday) / revenueYesterday) * 100
          : 0;

        const performanceTrend: "up" | "down" | "neutral" = 
          comparisonVsYesterday > 5 ? "up" : 
          comparisonVsYesterday < -5 ? "down" : "neutral";

        return {
          locationId: location.id,
          locationName: location.name,
          sales: revenue,
          orders,
          averageTicket: avgTicket,
          revenue,
          activeCashiers,
          performanceTrend,
          comparisonVsYesterday
        };
      });

      const performance = await Promise.all(performancePromises);
      // Sort by revenue descending
      performance.sort((a, b) => b.revenue - a.revenue);
      setLocationPerformance(performance);

    } catch (err) {
      console.error("Error loading location performance:", err);
    }
  }, [orgId, supabase]);

  useEffect(() => {
    loadMetrics();
    loadLocationPerformance();
  }, [loadMetrics, loadLocationPerformance]);

  return {
    metrics,
    locationPerformance,
    loading,
    error,
    refresh: () => {
      loadMetrics();
      loadLocationPerformance();
    }
  };
}
