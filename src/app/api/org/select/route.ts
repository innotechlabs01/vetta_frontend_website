import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

const DEFAULT_NEXT = "/home";

function normalizeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return DEFAULT_NEXT;
  return next;
}

async function hasMembership(orgId: string, supabase: any): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return false;
  }

  const { data: membership, error: memberError } = await getSupabaseAdmin()
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .limit(1);

  if (memberError) {
    console.error("[api/org/select] Membership check error:", memberError);
    return false;
  }

  return Boolean(membership?.length);
}

function createSupabaseWithCookies(req: NextRequest) {
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
  return { supabase, supabaseCookies };
}

function applyCookies(response: NextResponse, supabaseCookies: { name: string; value: string; options: any }[]) {
  for (const { name, value, options } of supabaseCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}

function applyOrgCookie(response: NextResponse, orgId: string) {
  response.cookies.set("org_id", orgId, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org");
  const next = normalizeNext(url.searchParams.get("next"));

  if (!orgId) {
    url.pathname = "/org/select";
    url.searchParams.delete("org");
    return NextResponse.redirect(url);
  }

  const { supabase, supabaseCookies } = createSupabaseWithCookies(req);

  const validMembership = await hasMembership(orgId, supabase);
  if (!validMembership) {
    url.pathname = "/org/select";
    url.searchParams.set("error", "forbidden");
    return applyCookies(NextResponse.redirect(url), supabaseCookies);
  }

  const response = NextResponse.redirect(new URL(next, req.url));
  applyOrgCookie(response, orgId);
  return applyCookies(response, supabaseCookies);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const orgId = typeof body?.org === "string" ? body.org : null;
  const next = normalizeNext(typeof body?.next === "string" ? body.next : null);

  if (!orgId) {
    return NextResponse.json({ ok: false, error: "org is required" }, { status: 400 });
  }

  const { supabase, supabaseCookies } = createSupabaseWithCookies(req);

  const validMembership = await hasMembership(orgId, supabase);
  if (!validMembership) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, next });
  applyOrgCookie(response, orgId);
  return applyCookies(response, supabaseCookies);
}
