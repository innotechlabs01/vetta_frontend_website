// app/app/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

const MOCK_USER_ID = "50205784-0c11-4c8a-8a02-6184607e2a1a";
const MOCK_AUTH_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_MOCK_AUTH_USER === "true";

export default async function AppHome() {
  const supabase = await createClient();
  const cookieStore = cookies();
  const orgCookie = cookieStore.get("org_id")?.value ?? null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const effectiveUserId = user?.id ?? (MOCK_AUTH_ENABLED ? MOCK_USER_ID : null);
  if ((userError && !MOCK_AUTH_ENABLED) || !effectiveUserId) {
    redirect("/login");
  }

  const listClient = user ? supabase : getSupabaseAdmin();
  const { data: orgs, error } = await listClient
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", effectiveUserId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const orgIds = orgs?.map((o) => o.organization_id) ?? [];

  console.log("orgIds", orgIds);

  if (orgIds.length === 0) {
    redirect("/onboarding");
  }

  console.log("orgCookie", orgCookie);

  // ¿La cookie apunta a una negocio válida?
  const hasCookieOrg = orgCookie && orgIds.includes(orgCookie);

  console.log("hasCookieOrg", hasCookieOrg);

  if (hasCookieOrg) {
    redirect(`/org/select?auto=${orgCookie}`);
  } else {
    // usar la primera disponible
    redirect(`/org/select?auto=${orgIds[0]}`);
  }
}
