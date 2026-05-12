import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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

    // Capture supabase auth cookies and apply them to the final response
    const supabaseCookies: { name: string; value: string; options: any }[] = [];
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookies: any) => {
            supabaseCookies.push(...cookies);
          },
        },
      }
    );

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      console.error("[bypass-session] Failed to get user:", userError);
      return NextResponse.redirect(new URL("/login?error=bypass_user_not_found", req.url));
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[bypass-session] Failed to generate link:", linkError);
      return NextResponse.redirect(new URL("/login?error=bypass_link_failed", req.url));
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyError) {
      console.error("[bypass-session] Verify error:", verifyError);
      return NextResponse.redirect(new URL("/login?error=bypass_verify_failed", req.url));
    }

    console.log("[bypass-session] Session established for user:", userId);

    const redirectUrl = orgId
      ? `/api/org/select?org=${orgId}&next=${encodeURIComponent(nextPath)}`
      : "/org/select";

    const response = NextResponse.redirect(new URL(redirectUrl, req.url));

    for (const { name, value, options } of supabaseCookies) {
      response.cookies.set(name, value, options);
    }

    return response;
  } catch (err) {
    console.error("[bypass-session] Unexpected error:", err);
    return NextResponse.redirect(new URL("/login?error=bypass_unexpected", req.url));
  }
}
