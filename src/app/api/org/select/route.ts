// app/api/org/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

const DEFAULT_NEXT = "/home";

function normalizeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return DEFAULT_NEXT;
  return next;
}

async function hasMembership(orgId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const effectiveUserId = user?.id;

  if (userError || !effectiveUserId) {
    return false;
  }

  const membershipClient = user ? supabase : getSupabaseAdmin();
  const { data: membership } = await membershipClient
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", orgId)
    .eq("user_id", effectiveUserId)
    .limit(1);

  return Boolean(membership?.length);
}

function applyOrgCookie(response: NextResponse, orgId: string) {
  response.cookies.set("org_id", orgId, {
    path: "/",
    httpOnly: true, // SECURITY FIX: Prevent XSS access to org_id cookie (IDOR vulnerability)
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org");
  const next = normalizeNext(url.searchParams.get("next"));

  console.log("orgId anthony", orgId);
  console.log("next", next);


  if (!orgId) {
    url.pathname = "/org/select";
    url.searchParams.delete("org");
    return NextResponse.redirect(url);
  }

  const validMembership = await hasMembership(orgId);
  if (!validMembership) {
    url.pathname = "/org/select";
    url.searchParams.set("error", "forbidden");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(new URL(next, req.url));
  return applyOrgCookie(response, orgId);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const orgId = typeof body?.org === "string" ? body.org : null;
  const next = normalizeNext(typeof body?.next === "string" ? body.next : null);

  if (!orgId) {
    return NextResponse.json({ ok: false, error: "org is required" }, { status: 400 });
  }

  const validMembership = await hasMembership(orgId);
  if (!validMembership) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, next });
  return applyOrgCookie(response, orgId);
}
