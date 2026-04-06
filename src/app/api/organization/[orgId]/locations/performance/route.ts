// src/app/api/organization/[orgId]/locations/performance/route.ts
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

    // Only owners and admins can view all locations performance
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only organization owners and admins can view all locations performance" },
        { status: 403 }
      );
    }

    // Get all locations for this organization
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, address, phone, is_active")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name");

    if (!locations || locations.length === 0) {
      return NextResponse.json({
        locations: [],
        message: "No active locations found"
      });
    }

    // Get date ranges
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

    // Get performance for each location
    const locationPerformancePromises = locations.map(async (location) => {
      // Today's sales
      const { data: todaySales } = await supabase
        .from("sales")
        .select("id, total, created_by")
        .eq("location_id", location.id)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .eq("status", "completed");

      // Yesterday's sales for comparison
      const { data: yesterdaySales } = await supabase
        .from("sales")
        .select("id, total")
        .eq("location_id", location.id)
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd)
        .eq("status", "completed");

      // Calculate metrics
      const revenue = todaySales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const orders = todaySales?.length || 0;
      const avgTicket = orders > 0 ? revenue / orders : 0;
      
      const revenueYesterday = yesterdaySales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      
      const comparisonVsYesterday = revenueYesterday > 0
        ? ((revenue - revenueYesterday) / revenueYesterday) * 100
        : 0;

      // Get active cashiers (unique users who made sales today)
      const uniqueCashiers = new Set(todaySales?.map(s => s.created_by).filter(Boolean));
      const activeCashiers = uniqueCashiers.size;

      // Determine performance trend
      const performanceTrend = comparisonVsYesterday > 5 
        ? "up" 
        : comparisonVsYesterday < -5 
          ? "down" 
          : "neutral";

      return {
        locationId: location.id,
        locationName: location.name,
        locationAddress: location.address,
        revenue,
        orders,
        averageTicket: avgTicket,
        activeCashiers,
        comparisonVsYesterday: Math.round(comparisonVsYesterday * 10) / 10,
        performanceTrend
      };
    });

    const locationPerformance = await Promise.all(locationPerformancePromises);

    // Sort by revenue descending
    locationPerformance.sort((a, b) => b.revenue - a.revenue);

    // Calculate organization totals
    const totals = locationPerformance.reduce(
      (acc, loc) => ({
        totalRevenue: acc.totalRevenue + loc.revenue,
        totalOrders: acc.totalOrders + loc.orders,
        totalCashiers: acc.totalCashiers + loc.activeCashiers
      }),
      { totalRevenue: 0, totalOrders: 0, totalCashiers: 0 }
    );

    return NextResponse.json({
      organization: {
        id: orgId,
        locationCount: locations.length
      },
      totals,
      locations: locationPerformance,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching location performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch location performance" },
      { status: 500 }
    );
  }
}
