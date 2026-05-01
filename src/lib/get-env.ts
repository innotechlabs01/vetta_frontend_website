// lib/get-environment.ts (SERVER ONLY)
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import { User } from "@supabase/supabase-js";

const MOCK_USER_EMAIL = "anthonyrivera51@gmail.com";
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_MOCK_AUTH_USER === "true";

export type OrgInfo = {
  id: string; name: string; slug: string | null;
  billing_address?: any;
  legal_name?: string;
  business_category?: string | null;
  default_tip_percentage?: number | null;
};

export type ProfileInfo = {
  id: string | null;
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export type LocationInfo = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_active?: boolean;
};

export type Environment = {
  org: OrgInfo | null;
  memberRole: "owner" | "admin" | "manager" | "member" | "viewer" | null;
  profile: ProfileInfo;
  user: User | null;
  // Multi-location support
  accessibleLocations: LocationInfo[];
  organizationLocations: LocationInfo[];
  currentLocationId: string | null;
  hasOrganizationLevelAccess: boolean;
  hasLocationLevelAccess: boolean;
  // Menu configuration from DB
  menuConfig: Array<{
    path: string;
    label: string;
    icon_name: string;
    is_active: boolean;
    sort_order: number;
  }>;
};

// cache() evita llamadas duplicadas a supabase.auth.getUser en la misma request
export const getMenuConfig = cache(async (supabase: any, orgId: string | null) => {
  if (!orgId) return [];
  
  const { data, error } = await supabase
    .from('menu_config')
    .select('path, label, icon_name, is_active, sort_order, parent_id, is_father, always_visible, visible_to_roles')
    .eq('organization_id', orgId)
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching menu config:', error);
    return [];
  }
  
  return data || [];
});

// cache() evita llamadas duplicadas a supabase.auth.getUser en la misma request
export const getEnvironment = cache(async (): Promise<Environment> => {
  const c = cookies();
  const orgId = c.get("org_id")?.value ?? null;
  const locationId = c.get("location_id")?.value ?? null;
  const supabase = await createClient();

  // Perfil (siempre disponible si hay sesión)
  const { data: me } = await supabase.auth.getUser();
  const user = me?.user;

  let profile: ProfileInfo = {
    id: null,
    user_id: null,
    full_name: 'User',
    avatar_url: null, // si usas signed URL, fírmala en el cliente
    email: null,
  }

  if (user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    profile = {
      id: prof?.id ?? null,
      user_id: prof?.user_id ?? user.id ?? null,
      full_name: prof?.full_name ?? 'User',
      avatar_url: prof?.avatar_url ?? null, // si usas signed URL, fírmala en el cliente
      email: user.email ?? null,
    };
  }

  if (!orgId) {
    return { 
      org: null, 
      memberRole: null, 
      profile, 
      user,
      accessibleLocations: [],
      organizationLocations: [],
      currentLocationId: null,
      hasOrganizationLevelAccess: false,
      hasLocationLevelAccess: false,
      menuConfig: [],
    };
  }

  if (!user) {
    return { 
      org: null, 
      memberRole: null, 
      profile, 
      user: null,
      accessibleLocations: [],
      organizationLocations: [],
      currentLocationId: null,
      hasOrganizationLevelAccess: false,
      hasLocationLevelAccess: false,
      menuConfig: [],
    };
  }

  // Mi rol en la org actual (1 fila)
  const membershipClient = me?.user ? supabase : getSupabaseAdmin();
  const { data: membership } = await membershipClient
    .from("organization_members")
    .select("role, organizations(id, name, slug, legal_name, billing_address, business_category, default_tip_percentage)")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .limit(1);

  if (!membership?.length) {
    // cookie inválida o sin permisos -> org null
    return { 
      org: null, 
      memberRole: null, 
      profile, 
      user,
      accessibleLocations: [],
      organizationLocations: [],
      currentLocationId: null,
      hasOrganizationLevelAccess: false,
      hasLocationLevelAccess: false,
      menuConfig: [],
    };
  }

  const row = membership[0] as any;
  const org: OrgInfo = {
    id: row.organizations?.id,
    name: row.organizations?.name,
    slug: row.organizations?.slug ?? null,
    legal_name: row.organizations?.legal_name,
    billing_address: row.organizations?.billing_address,
    business_category: row.organizations?.business_category ?? null,
    default_tip_percentage: row.organizations?.default_tip_percentage ?? null,
  };

  // Obtener TODAS las locations de la organización
  const { data: allLocations } = await supabase
    .from("locations")
    .select("id, name, address, phone, is_active")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  // Determinar locations accesibles basado en location_members
  const { data: locationMemberships } = await supabase
    .from("location_members")
    .select("location_id, role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id);

  const memberLocationIds = locationMemberships?.map(lm => lm.location_id) ?? [];
  const memberLocationRoles = locationMemberships?.reduce((acc, lm) => {
    acc[lm.location_id] = lm.role;
    return acc;
  }, {} as Record<string, string>) ?? {};

  // Si es owner/admin de organization, tiene acceso a todas las locations
  const hasOrgAccess = ["owner", "admin"].includes(row.role ?? "");
  
  // Accesso a nivel de organización (para dashboards consolidados)
  const hasOrganizationLevelAccess = hasOrgAccess;
  
  // Acceso a nivel de location (para ver data específica)
  const hasLocationLevelAccess = hasOrgAccess || memberLocationIds.length > 0;

  // Accessible locations: todas si es owner/admin, o solo las asignadas
  const accessibleLocations = hasOrgAccess 
    ? (allLocations ?? [])
    : (allLocations?.filter(loc => memberLocationIds.includes(loc.id)) ?? []);

  return {
    org,
    memberRole: row.role,
    profile,
    user,
    // Multi-location support
    accessibleLocations,
    organizationLocations: allLocations ?? [],
    currentLocationId: locationId && memberLocationIds.includes(locationId) ? locationId : (hasOrgAccess ? null : memberLocationIds[0] ?? null),
    hasOrganizationLevelAccess: hasOrgAccess,
    hasLocationLevelAccess,
    // Fetch menu configuration
    menuConfig: await getMenuConfig(supabase, orgId),
  };
});

// Helper function to get specific location environment
export const getLocationEnvironment = cache(async (locationId: string): Promise<{
  location: LocationInfo | null;
  organization: OrgInfo | null;
  userRole: string | null;
} | null> => {
  const supabase = await createClient();
  const { data: location } = await supabase
    .from("locations")
    .select("id, name, address, phone, is_active, organization_id")
    .eq("id", locationId)
    .single();

  if (!location) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, legal_name, billing_address, business_category, default_tip_percentage")
    .eq("id", (location as any).organization_id)
    .single();

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return { location, organization: null, userRole: null };

  // Get user's role in this location
  const { data: locationMember } = await supabase
    .from("location_members")
    .select("role")
    .eq("location_id", locationId)
    .eq("user_id", user.user.id)
    .single();

  // Also check org-level role
  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", (location as any).organization_id)
    .eq("user_id", user.user.id)
    .single();

  const effectiveRole = orgMember?.role ?? locationMember?.role ?? null;

  return {
    location,
    organization: org,
    userRole: effectiveRole
  };
});
