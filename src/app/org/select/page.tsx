// app/org/select/page.tsx
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import { setOrgAction } from "../../actions";
import { redirect } from "next/navigation";
import OrgSelectForm from "./OrgSelectForm";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const MOCK_USER_ID = "50205784-0c11-4c8a-8a02-6184607e2a1a";
const MOCK_AUTH_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_MOCK_AUTH_USER === "true";

export default async function OrgSelectPage({
  searchParams,
}: { searchParams: { next?: string; auto?: string } }) {
  const next = searchParams.next || "/home";
  const auto = searchParams.auto;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const effectiveUserId = user?.id ?? (MOCK_AUTH_ENABLED ? MOCK_USER_ID : null);
  if ((userError && !MOCK_AUTH_ENABLED) || !effectiveUserId) {
    redirect("/login");
  }

  const listClient = user ? supabase : getSupabaseAdmin();
  const { data: orgs } = await listClient
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", effectiveUserId)
    .order("created_at", { ascending: false });

  const list =
    orgs?.map((o) => ({
      id: o.organization_id,
      name: (o as any).organizations?.name ?? "Neogicio",
    })) ?? [];

  if (auto && list.some((o) => o.id === auto)) {
    redirect(`/api/org/select?org=${auto}&next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow p-8 pb-9 space-y-6">
        {/* Header: logo + CTA primaria */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            {/*<Image
              src="/logo.svg"
              alt="Vetta Logo"
              width={160}
              height={40}
              priority
            />*/}
          </Link>
          <Button asChild className="bg-blue-600">
            <Link href="/onboarding">Crear Neogicio</Link>
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Hola de nuevo</h1>
          <span className="text-gray-600">Selecciona una negocio para continuar</span>
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border p-6 text-center">
            <p className="mb-2">No perteneces a ningún negocio.</p>
            <p className="text-sm text-gray-500">Crea tu primera tienda para empezar.</p>
          </div>
        ) : (
          // Importante: data-autosubmit para que el form haga submit al elegir
          <OrgSelectForm action={setOrgAction} className="space-y-3" data-autosubmit>
            <input type="hidden" name="next" value={next} />
            <div className="space-y-3">
              {list.map((o) => (
                <label
                  key={o.id}
                  className="group flex items-center justify-between gap-3 rounded-lg border p-4 cursor-pointer hover:bg-blue-50 transition"
                >
                  {/* Radio oculto pero accesible */}
                  <input
                    type="radio"
                    name="org_id"
                    value={o.id}
                    className="sr-only peer"
                    // El autosubmit se maneja dentro de OrgSelectForm (ver snippet abajo)
                    required
                  />
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-4 w-4 rounded-full border peer-checked:border-blue-600 peer-checked:ring-4 ring-blue-100 transition" />
                    <span className="font-medium">{o.name}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                </label>
              ))}
            </div>
          </OrgSelectForm>
        )}
      </div>
    </div>
  );
}
