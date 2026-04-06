import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import OnlineModule from "./OnlineModule";
import { useSlugValidation } from "@/hooks/uselocations";


export default async function OnlinePage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get('org_id')?.value;
  
  if (!orgId) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">No hay organización seleccionada</p>
    </div>;
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name, 
      slug,
      brand_banner_url,
      brand_logo_landscape_url,
      brand_description,
      brand_colors,
      social_links,
       title_init,
       title_last
    `)
    .eq("id", orgId)
    .single();

  if (error || !org) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">Error: {error?.message || "Organización no encontrada"}</p>
    </div>;
  }

  const initialBrandData = {
    brand_banner_url: org.brand_banner_url,
    brand_logo_landscape_url: org.brand_logo_landscape_url,
    brand_description: org.brand_description,
    brand_colors: org.brand_colors,
    social_links: org.social_links,
    title_init: org.title_init,
    title_last: org.title_last,
  };

  return (
    <OnlineModule 
      org={{
        id: org.id,
        name: org.name,
        slug: org.slug
      }}
      initialBrandData={initialBrandData}
    />
  );
}