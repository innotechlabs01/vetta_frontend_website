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

export interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  currentStock: number;
  minStock: number;
}

export function useOrganizationAnalytics(orgId: string | undefined) {
  const [metrics, setMetrics] = useState<OrganizationMetrics | null>(null);
  const [locationPerformance, setLocationPerformance] = useState<LocationPerformance[]>([]);
  const [topProductsByLocation, setTopProductsByLocation] = useState<Map<string, TopProduct[]>>(new Map());
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
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
        .select("id, total_amount, subtotal_amount, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .eq("status", "completed");

      // Query sales for yesterday (comparison)
      const { data: yesterdaySales } = await supabase
        .from("sales")
        .select("id, total_amount, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd)
        .eq("status", "completed");

      // Query sales for this week
      const { data: weekSales } = await supabase
        .from("sales")
        .select("id, total_amount, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", weekStartISO)
        .eq("status", "completed");

      // Query sales for this month
      const { data: monthSales } = await supabase
        .from("sales")
        .select("id, total_amount, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", monthStartISO)
        .eq("status", "completed");

      // Get all time sales
      const { data: allTimeSales } = await supabase
        .from("sales")
        .select("id, total_amount, created_at")
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
      const revenueToday = todaySales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const revenueYesterday = yesterdaySales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const revenueThisWeek = weekSales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const revenueThisMonth = monthSales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const totalRevenue = allTimeSales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

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

  const loadLocationPerformance = useCallback(async (date?: Date) => {
    if (!orgId) return;

    try {
      const selectedDate = date || new Date();
      const targetDateStart = new Date(selectedDate);
      targetDateStart.setHours(0, 0, 0, 0);
      const targetDateEnd = new Date(selectedDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      const targetStart = targetDateStart.toISOString();
      const targetEnd = targetDateEnd.toISOString();

      // Get yesterday for comparison
      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
      const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

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

      // Get today's sales with shift info
      const { data: allTodaySales } = await supabase
        .from("sales")
        .select("id, total, shift_id, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", targetStart)
        .lte("created_at", targetEnd)
        .eq("status", "completed");

      // Get yesterday's sales
      const { data: allYesterdaySales } = await supabase
        .from("sales")
        .select("id, total, shift_id, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd)
        .eq("status", "completed");

      // Get all shifts that have location info for the target date
      const shiftIds = Array.from(new Set([
        ...(allTodaySales?.map(s => s.shift_id).filter(Boolean) || []),
        ...(allYesterdaySales?.map(s => s.shift_id).filter(Boolean) || [])
      ]));

      let shiftLocationMap: Record<string, string> = {};

      if (shiftIds.length > 0) {
        const { data: shifts } = await supabase
          .from("shifts")
          .select("id, location_id")
          .in("id", shiftIds);
        
        if (shifts) {
          shifts.forEach(s => {
            if (s.location_id) {
              shiftLocationMap[s.id] = s.location_id;
            }
          });
        }
      }

      // Build location map for easy lookup
      const locationMap = new Map(locations.map(l => [l.id, l.name]));

      // Calculate performance for each location
      const performancePromises = locations.map(async (location) => {
        const todaySales = allTodaySales?.filter(s => shiftLocationMap[s.shift_id] === location.id) || [];
        const yesterdaySales = allYesterdaySales?.filter(s => shiftLocationMap[s.shift_id] === location.id) || [];

        const revenue = todaySales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        const orders = todaySales.length;
        const avgTicket = orders > 0 ? revenue / orders : 0;
        const revenueYesterday = yesterdaySales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        
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
          activeCashiers: 0,
          performanceTrend,
          comparisonVsYesterday
        };
      });

      const performance = await Promise.all(performancePromises);
      performance.sort((a, b) => b.revenue - a.revenue);
      setLocationPerformance(performance);

    } catch (err) {
      console.error("Error loading location performance:", err);
    }
  }, [orgId, supabase]);

  const loadTopProductsByLocation = useCallback(async () => {
    if (!orgId) return;

    try {
      // Get all locations for the organization
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true);

      if (!locations || locations.length === 0) return;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      today.setHours(23, 59, 59, 999);
      const todayEnd = today.toISOString();

      const productsByLocation = new Map<string, TopProduct[]>();

      // Get top products for each location
      for (const location of locations) {
        // Get sales for this location today
        const { data: salesItems } = await supabase
          .from("sale_items")
          .select("product_id, quantity, price, total")
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd)
          .eq("location_id", location.id);

        if (!salesItems || salesItems.length === 0) {
          productsByLocation.set(location.id, []);
          continue;
        }

        // Get product details
        const productIds = Array.from(new Set(salesItems.map(s => s.product_id)));
        const { data: products } = await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds);

        const productMap = new Map(products?.map(p => [p.id, p.name]) || []);

        // Aggregate by product
        const productStats = new Map<string, { quantity: number; revenue: number }>();
        for (const item of salesItems) {
          const existing = productStats.get(item.product_id) || { quantity: 0, revenue: 0 };
          productStats.set(item.product_id, {
            quantity: existing.quantity + (item.quantity || 0),
            revenue: existing.revenue + (item.total || 0)
          });
        }

        // Convert to array and sort
        const topProducts: TopProduct[] = Array.from(productStats.entries())
          .map(([productId, stats]) => ({
            productId,
            productName: productMap.get(productId) || "Producto",
            quantity: stats.quantity,
            revenue: stats.revenue
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        productsByLocation.set(location.id, topProducts);
      }

      setTopProductsByLocation(productsByLocation);

    } catch (err) {
      console.error("Error loading top products:", err);
    }
  }, [orgId, supabase]);

  const loadInventoryAlerts = useCallback(async () => {
    if (!orgId) return;

    try {
      // Get all locations for the organization
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true);

      if (!locations || locations.length === 0) return;

      // Get products with inventory alerts (low stock)
      const { data: inventoryItems } = await supabase
        .from("product_locations")
        .select("id, product_id, location_id, stock, min_stock")
        .in("location_id", locations.map(l => l.id))
        .lt("stock", 10) // Considerar como alerta si stock < 10
        .order("stock", { ascending: true });

      if (!inventoryItems || inventoryItems.length === 0) {
        setInventoryAlerts([]);
        return;
      }

      // Get product and location details
      const productIds = Array.from(new Set(inventoryItems.map(i => i.product_id)));
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      const productMap = new Map(products?.map(p => [p.id, p.name]) || []);
      const locationMap = new Map(locations.map(l => [l.id, l.name]));

      const alerts: InventoryAlert[] = inventoryItems
        .filter(item => item.stock < (item.min_stock || 10))
        .map(item => ({
          productId: item.product_id,
          productName: productMap.get(item.product_id) || "Producto",
          locationId: item.location_id,
          locationName: locationMap.get(item.location_id) || "Sucursal",
          currentStock: item.stock,
          minStock: item.min_stock || 10
        }))
        .slice(0, 10);

      setInventoryAlerts(alerts);

    } catch (err) {
      console.error("Error loading inventory alerts:", err);
    }
  }, [orgId, supabase]);

  useEffect(() => {
    loadMetrics();
    loadLocationPerformance();
    loadTopProductsByLocation();
    loadInventoryAlerts();
  }, [loadMetrics, loadLocationPerformance, loadTopProductsByLocation, loadInventoryAlerts]);

  return {
    metrics,
    locationPerformance,
    topProductsByLocation,
    inventoryAlerts,
    loading,
    error,
    refresh: (date?: Date) => {
      loadMetrics();
      loadLocationPerformance(date);
      loadTopProductsByLocation();
      loadInventoryAlerts();
    },
    loadLocationPerformance
  };
}
