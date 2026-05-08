// app/api/auth/bypass-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user");
  const orgId = url.searchParams.get("org");
  const nextPath = url.searchParams.get("next") || "/home";

  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=bypass_missing_user", req.url));
  }

  try {
    const admin = getSupabaseAdmin();
    const supabase = await createClient();

    // Get user to find their email
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      console.error("[bypass-session] Failed to get user:", userError);
      return NextResponse.redirect(new URL("/login?error=bypass_user_not_found", req.url));
    }

    // Use Supabase's recommended pattern: generateLink + verifyOtp
    // This creates a session without sending any email (admin API)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[bypass-session] Failed to generate link:", linkError);
      return NextResponse.redirect(new URL("/login?error=bypass_link_failed", req.url));
    }

    // Verify the OTP to establish the session
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyError) {
      console.error("[bypass-session] Verify error:", verifyError);
      return NextResponse.redirect(new URL("/login?error=bypass_verify_failed", req.url));
    }

    console.log("[bypass-session] Session established for user:", userId);

    // Now redirect to org select API to set org_id cookie and go to appropriate page
    if (orgId) {
      return NextResponse.redirect(
        new URL(`/api/org/select?org=${orgId}&next=${nextPath}`, req.url)
      );
    }

    return NextResponse.redirect(new URL("/org/select", req.url));
  } catch (err) {
    console.error("[bypass-session] Unexpected error:", err);
    return NextResponse.redirect(new URL("/login?error=bypass_unexpected", req.url));
  }
}
