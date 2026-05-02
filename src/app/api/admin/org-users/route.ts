// app/api/admin/org-users/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server"; // tu helper SSR con cookies
import { getSupabaseAdmin } from "@/utils/supabase/admin";

type Body = {
  organizationId: string;
  q?: string;
  page?: number;      // 1-based
  pageSize?: number;  // default 20
  sortBy?: "full_name" | "email" | "phone" | "role";
  sortDir?: "asc" | "desc";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const {
      organizationId,
      q = "",
      page = 1,
      pageSize = 20,
      sortBy = "full_name",
      sortDir = "asc",
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId requerido" }, { status: 400 });
    }

    const supaSSR = await createClient();

    const {
      data: { user },
      error: authErr,
    } = await supaSSR.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Chequear membership (ajista roles permitidos si quieres)
    const { data: membership, error: memErr } = await supaSSR
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }
    if (!membership) {
      return NextResponse.json({ error: "No perteneces a esta organización" }, { status: 403 });
    }
    // Opcional: si quieres restringir a ciertos roles:
    // if (!["owner","admin","manager"].includes(membership.role)) { ... }

    // 2) Consulta con SERVICE_ROLE (bypassa RLS para la vista)
    const admin = getSupabaseAdmin();

    // Construcción de query
    let query = admin
      .from("v_org_members_with_locations")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId);

    // Búsqueda server-side (ajusta campos según la vista)
    const term = q.trim();
    if (term) {
      // Usa OR con ilike; asegúrate que esas columnas existan en la vista
      query = query.or(
        [
          `full_name.ilike.%${term}%`,
          `email.ilike.%${term}%`,
          `phone.ilike.%${term}%`,
          `name.ilike.%${term}%`, // si 'name' es un alias extra
        ].join(",")
      );
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortDir === "asc" });

    // Paginación (1-based)
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Fetch menu access for each user
    const rowsWithMenuAccess = await Promise.all(
      (rows ?? []).map(async (row: any) => {
        // First, check if user has custom menu_access saved in profile
        const { data: profile } = await supaSSR
          .from('profiles')
          .select('menu_access')
          .eq('user_id', row.user_id)
          .maybeSingle();
        
        // If user has custom menu_access, use it
        if (profile?.menu_access && Array.isArray(profile.menu_access) && profile.menu_access.length > 0) {
          // Fetch menu details for the saved paths
          const { data: menuItems } = await supaSSR
            .from('menu_config')
            .select('label, path')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .in('path', profile.menu_access);
          
          return {
            ...row,
            menu_access: menuItems?.map((m: any) => ({ label: m.label, path: m.path })) ?? []
          };
        }
        
        // Fall back to role-based menus
        const userRole = row.role;
        const { data: menuItems } = await supaSSR
          .from('menu_config')
          .select('label, path')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .contains('visible_to_roles', [userRole])
          .order('sort_order', { ascending: true });
        
        return {
          ...row,
          menu_access: menuItems?.map((m: any) => ({ label: m.label, path: m.path })) ?? []
        };
      })
    );
    
    return NextResponse.json({ rows: rowsWithMenuAccess ?? [], count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { organizationId, userId } = await req.json();

    if (!organizationId || !userId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1) Verificar rol actual del miembro
    const { data: member, error: fetchErr } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 400 });
    }
    if (!member) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }
    if (member.role === "owner") {
      return NextResponse.json({ error: "No puedes eliminar al owner" }, { status: 403 });
    }

    // 2) Eliminar
    const { error: delErr } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error eliminando usuario" }, { status: 500 });
  }
}