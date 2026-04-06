import { getEnvironment } from "@/lib/get-env";
import { createClient } from "@/utils/supabase/server";
import QrCodesModule from "../QrCodesModule";
import type { LocationLite, QrContext } from "@/types/database.types";

export default async function QrCodesPage() {
  const { org } = await getEnvironment();

  if (!org?.id) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">No hay organización seleccionada</p>
          <p className="text-sm text-gray-600 mt-1">Selecciona una organización para configurar tus QR Codes.</p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: contexts, error } = await supabase
    .from("qr_contexts")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  const { data: locations } = await supabase
    .from("locations")
    .select("id,name,address_line1,city")
    .eq("organization_id", org.id)
    .order("name");

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-red-600">No se pudieron cargar los QR</p>
          <p className="text-sm text-gray-600 mt-1">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <QrCodesModule
      orgId={org.id}
      orgSlug={org.slug}
      locations={(locations as LocationLite[]) || []}
      initialQrContexts={(contexts as QrContext[]) || []}
    />
  );
}
