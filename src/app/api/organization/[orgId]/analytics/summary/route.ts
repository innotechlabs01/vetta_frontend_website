// src/app/api/organization/[orgId]/analytics/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const cookieStore = await cookies();
    const currentOrgId = cookieStore.get("org_id")?.value;

    // Verify user has access to this organization
    if (currentOrgId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized access to this organization" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    
    // Get user's role in this organization
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.user.id)
      .single();

    // Only owners and admins can view organization-wide analytics
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only organization owners and admins can view consolidated analytics" },
        { status: 403 }
      );
    }

    // Get date ranges
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartISO = new Date(weekStart.setHours(0, 0, 0, 0)).toISOString();

    const monthStart = new Date();
    const firstDayOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
    const monthStartISO = new Date(firstDayOfMonth.setHours(0, 0, 0, 0)).toISOString();

    // Get all locations for this organization
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("is_active", true);

    const locationIds = locations?.map(l => l.id) || [];

    // Query sales for different periods
    const [todaySales, yesterdaySales, weekSales, monthSales, allTimeSales] = await Promise.all([
      // Today's sales
      supabase
        .from("sales")
        .select("id, total, customer_id")
        .in("location_id", locationIds.length > 0 ? locationIds : [""])
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .eq("status", "completed"),
      
      // Yesterday's sales
      supabase
        .from("sales")
        .select("id, total")
        .in("location_id", locationIds.length > 0 ? locationIds : [""])
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd)
        .eq("status", "completed"),
      
      // This week's sales
      supabase
        .from("sales")
        .select("id, total")
        .in("location_id", locationIds.length > 0 ? locationIds : [""])
        .gte("created_at", weekStartISO)
        .eq("status", "completed"),
      
      // This month's sales
      supabase
        .from("sales")
        .select("id, total")
        .in("location_id", locationIds.length > 0 ? locationIds : [""])
        .gte("created_at", monthStartISO)
        .eq("status", "completed"),
      
      // All time sales
      supabase
        .from("sales")
        .select("id, total")
        .in("location_id", locationIds.length > 0 ? locationIds : [""])
        .eq("status", "completed")
    ]);

    // Calculate metrics
    const revenueToday = todaySales.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
    const revenueYesterday = yesterdaySales.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
    const revenueThisWeek = weekSales.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
    const revenueThisMonth = monthSales.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
    const totalRevenue = allTimeSales.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;

    const ordersToday = todaySales.data?.length || 0;
    const ordersYesterday = yesterdaySales.data?.length || 0;
    const ordersThisWeek = weekSales.data?.length || 0;
    const ordersThisMonth = monthSales.data?.length || 0;
    const totalOrders = allTimeSales.data?.length || 0;

    // Get customer counts
    const { data: allCustomers } = await supabase
      .from("customers")
      .select("id, created_at")
      .eq("organization_id", orgId);

    const { data: todayCustomers } = await supabase
      .from("sales")
      .select("customer_id")
      .in("location_id", locationIds.length > 0 ? locationIds : [""])
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd)
      .eq("status", "completed");

    const totalCustomers = allCustomers?.length || 0;
    const uniqueCustomerIdsToday = new Set(todayCustomers?.map(s => s.customer_id).filter(Boolean));
    const newCustomersToday = uniqueCustomerIdsToday.size;

    // Calculate comparisons
    const comparisonVsYesterday = revenueYesterday > 0 
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 
      : 0;

    const comparisonVsLastWeek = revenueThisWeek > 0
      ? ((revenueThisWeek - revenueThisWeek) / revenueThisWeek) * 100
      : 0;

    const comparisonVsLastMonth = revenueThisMonth > 0
      ? ((revenueThisMonth - revenueThisMonth) / revenueThisMonth) * 100
      : 0;

    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Return consolidated metrics
    return NextResponse.json({
      organization: {
        id: orgId,
        name: locations?.length ? "Organization" : null,
        locationCount: locations?.length || 0
      },
      metrics: {
        totalRevenue,
        revenueToday,
        revenueThisWeek,
        revenueThisMonth,
        totalOrders,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
        averageTicket,
        totalCustomers,
        newCustomersToday,
        comparisonVsYesterday,
        comparisonVsLastWeek,
        comparisonVsLastMonth
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching organization analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
