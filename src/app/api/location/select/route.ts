// src/app/api/location/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const next = searchParams.get("next") || "/location/dashboard";

    if (!location) {
      return NextResponse.redirect(
        new URL("/?error=location_required", request.url)
      );
    }

    const supabase = await createClient();
    const cookieStore = await cookies();
    const orgId = cookieStore.get("org_id")?.value;

    if (!orgId) {
      return NextResponse.redirect(
        new URL("/org/select?error=no_org_selected", request.url)
      );
    }

    // Verify the location belongs to this organization
    const { data: locationData, error: locationError } = await supabase
      .from("locations")
      .select("id, organization_id")
      .eq("id", location)
      .single();

    if (locationError || !locationData) {
      return NextResponse.redirect(
        new URL("/?error=location_not_found", request.url)
      );
    }

    if (locationData.organization_id !== orgId) {
      return NextResponse.redirect(
        new URL("/?error=location_not_in_org", request.url)
      );
    }

    // Verify user has access to this location
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.user.id)
        .single();

      // If not owner/admin, check location membership
      if (membership && !["owner", "admin"].includes(membership.role)) {
        const { data: locationMember } = await supabase
          .from("location_members")
          .select("id")
          .eq("location_id", location)
          .eq("user_id", user.user.id)
          .single();

        if (!locationMember) {
          return NextResponse.redirect(
            new URL("/?error=no_location_access", request.url)
          );
        }
      }
    }

    // Set location cookie
    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.set("location_id", location, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error("Error selecting location:", error);
    return NextResponse.redirect(
      new URL("/?error=location_select_failed", request.url)
    );
  }
}
