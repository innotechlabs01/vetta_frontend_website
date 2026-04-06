// hooks/useLocations.ts
"use client";

import { useEffect, useMemo, useState, useCallback  } from "react";
import { createClient } from "@/utils/supabase/client";
import { getSupabaseBrowser } from '@/utils/supabase/client';

export type LocationRow = {
  id: string;
  organization_id: string;
  name: string;
  country: string;
  city: string | null;
  address: string | null;
  shop_location: string | null;
  status: "active" | "inactive";
  pos_pro: boolean;
  created_at: string;
  updated_at: string;
};

export type LocationsFilters = {
  status?: "all" | "active" | "inactive";
  pos?: "all" | "pospro" | "nopos";
  q?: string; 
};

export type SlugValidationResult = {
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
  recheckSlug: () => void;
  isValidFormat: boolean;
  isReserved: boolean;
};

const RESERVED_SLUGS = [
  'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 
  'store', 'support', 'help', 'about', 'contact', 'terms', 
  'privacy', 'legal', 'security', 'cdn', 'static', 'assets',
  'public', 'private', 'system', 'root', 'null', 'undefined',
  'dashboard', 'login', 'signup', 'auth', 'settings', 'profile'
];

export function useLocations(orgId?: string, filters: LocationsFilters = {}, page = 1, pageSize = 20) {
  const [data, setData] = useState<LocationRow[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!orgId) return;

    const fetcher = async () => {
      setLoading(true);
      setError(null);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("organization_locations")
        .select("*", { count: "exact" })
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.pos === "pospro") query = query.eq("pos_pro", true);
      if (filters.pos === "nopos") query = query.eq("pos_pro", false);

      if (filters.q && filters.q.trim()) {
   
        const q = `%${filters.q.trim()}%`;
        query = query.or(`name.ilike.${q},city.ilike.${q}`);
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        setError(error.message);
        setData([]);
        setTotal(0);
      } else {
        setData((data || []) as LocationRow[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    };

    fetcher();
  }, [orgId, filters.status, filters.pos, filters.q, page, pageSize, supabase]);

  return { data, total, isLoading, error };
}


function isValidSlugFormat(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  
  // Patrón: debe empezar y terminar con alfanumérico, 3-40 caracteres
  const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
  const hasConsecutiveHyphens = /--/.test(slug);
  const startsOrEndsWithHyphen = /^-|-$/.test(slug);
  
  return (
    slugPattern.test(slug) && 
    !hasConsecutiveHyphens && 
    !startsOrEndsWithHyphen
  );
}

function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}



export function useSlugValidation(slug: string, currentOrgId: string, originalSlug: string | null) {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (slug === originalSlug) {
      setIsAvailable(null);
      return;
    }

    if (!slug || slug.length < 3) {
      setIsAvailable(null);
      return;
    }

    const checkSlug = async () => {
      setIsChecking(true);
      
      try {
        const supabase = getSupabaseBrowser();

        const { data, error } = await supabase.rpc('check_slug_availability', {
          p_slug: slug,
          p_current_org_id: currentOrgId
        });

        if (error) throw error;

        setIsAvailable(data.available);

      } catch (error) {
        console.error('Error:', error);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    };

    const timeoutId = setTimeout(checkSlug, 500);
    return () => clearTimeout(timeoutId);
  }, [slug, currentOrgId, originalSlug]);

  return { isChecking, isAvailable };
}

