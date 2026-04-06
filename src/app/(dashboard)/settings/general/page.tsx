// app/org/page.tsx
import { createClient } from "@/utils/supabase/server";
import { getEnvironment } from "@/lib/get-env";
import OrgSettingsClient from "./Orgsettings";

export default async function OrgPage() {
  const supabase = await createClient();
  const { org } = await getEnvironment();

  if (!org?.id) {
    // Si no hay org en cookie/contexto, redirige a selector
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-semibold mb-2">No hay negocio activa</h1>
          <p className="text-gray-600">Selecciona o crea una para continuar.</p>
          <a href="/org/select" className="mt-4 inline-block rounded-lg bg-blue-600 text-white px-4 py-2">
            Ir al selector
          </a>
        </div>
      </main>
    );
  }

  const { data: settings } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", org.id)
    .single();

  return <OrgSettingsClient org={org} initialSettings={settings ?? null} />;
}