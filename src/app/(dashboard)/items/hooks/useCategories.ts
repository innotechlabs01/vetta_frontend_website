"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  storage_path: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  parent_name?: string | null;
  products_count?: number | null;
  sort_order?: number | null;
}

export interface CategoryWithLevel extends Category {
  level: number;
}

export interface CategoryFilters {
  query: string;
}

interface UseCategoriesOptions {
  organizationId?: string;
}

function buildHierarchy(rows: Category[]): CategoryWithLevel[] {
  const byId: Record<string, CategoryWithLevel> = {};
  const childrenMap: Record<string, string[]> = {};
  const orderIndex: Record<string, number> = {};
  const result: CategoryWithLevel[] = [];
  const visited = new Set<string>();

  rows.forEach((c, i) => {
    byId[c.id] = { ...c, level: 0 };
    orderIndex[c.id] = i;
    if (c.parent_id) {
      if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
      childrenMap[c.parent_id].push(c.id);
    }
  });

  function traverse(id: string, level: number) {
    if (visited.has(id)) return;
    const node = byId[id];
    if (!node) return;
    visited.add(id);
    node.level = level;
    result.push(node);

    const kids = childrenMap[id] || [];
    kids.forEach((kidId) => traverse(kidId, level + 1));
  }

  const roots = rows.filter((c) => !c.parent_id);
  roots.sort((a, b) => orderIndex[a.id] - orderIndex[b.id]);
  roots.forEach((root) => traverse(root.id, 0));

  return result;
}

export function useCategories({ organizationId }: UseCategoriesOptions) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<CategoryFilters>({ query: "" });

  // Sorting
  const [orderMap, setOrderMap] = useState<Record<string, number>>({});
  const [optimisticHierarchy, setOptimisticHierarchy] = useState<CategoryWithLevel[] | null>(null);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!organizationId) {
      setCategories([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const searchParam = debouncedQuery.trim() || null;

      const { data, error: fetchError } = await supabase.rpc("category_list_with_counts", {
        p_org: organizationId,
        p_search: searchParam,
        p_is_active: null,
        p_limit: 200,
        p_offset: 0,
      });

      if (fetchError) throw fetchError;

      setCategories((data as Category[]) || []);
    } catch (err: any) {
      setError(err?.message || "Error cargando categorías");
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase, debouncedQuery]);

  // Persist order to DB
  const persistOrder = useCallback(
    async (nextMap: Record<string, number>) => {
      if (!organizationId) return;

      const payload = Object.entries(nextMap).map(([id, sort_order]) => ({
        id,
        sort_order,
      }));

      const { error } = await supabase.rpc("category_reorder_simple", {
        p_org: organizationId,
        p_items: payload as any,
      });

      if (error) throw error;
    },
    [organizationId, supabase]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 350);
    return () => clearTimeout(timer);
  }, [filters.query]);

  // Fetch when debounced query changes
  useEffect(() => {
    if (!organizationId) return;
    fetchCategories();
  }, [organizationId, fetchCategories]);

  // Update order map when categories change
  useEffect(() => {
    const m: Record<string, number> = {};
    categories.forEach((c, i) => {
      m[c.id] = c.sort_order ?? i + 1;
    });

    setOrderMap((prev) => {
      const keysMatch =
        Object.keys(prev).length === Object.keys(m).length &&
        Object.keys(prev).every((k) => prev[k] === m[k]);
      return keysMatch ? prev : m;
    });
    setOptimisticHierarchy(null);
  }, [categories]);

  // Filter helpers
  const setQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  }, []);

  // Computed: sorted categories
  const sortedCategories = useMemo(() => {
    if (Object.keys(orderMap).length > 0) {
      return [...categories].sort((a, b) => {
        const A = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
        const B = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
        if (A !== B) return A - B;
        return a.name.localeCompare(b.name);
      });
    }
    return [...categories].sort((a, b) => {
      const A = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const B = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (A !== B) return A - B;
      return a.name.localeCompare(b.name);
    });
  }, [categories, orderMap]);

  // Computed: hierarchical categories
  const hierarchicalCategories = useMemo(
    () => optimisticHierarchy ?? buildHierarchy(sortedCategories),
    [sortedCategories, optimisticHierarchy]
  );

  // Update order after drag
  const updateOrder = useCallback(
    (newHierarchy: CategoryWithLevel[]) => {
      const computeFractionalOrder = (
        list: CategoryWithLevel[],
        baseStep = 1,
        fractionBase = 10
      ): Record<string, number> => {
        const orders: Record<string, number> = {};
        let rootIndex = 0;
        const levelCounters: number[] = [];
        const baseStack: number[] = [];

        for (const item of list) {
          const lvl = item.level;
          levelCounters.length = lvl;
          baseStack.length = lvl;

          if (lvl === 0) {
            rootIndex += 1;
            baseStack[0] = rootIndex * baseStep;
            levelCounters[0] = 0;
            orders[item.id] = baseStack[0];
            continue;
          }

          levelCounters[lvl] = (levelCounters[lvl] ?? 0) + 1;
          const parentBase = baseStack[lvl - 1];
          const denom = Math.pow(fractionBase, lvl);
          const frac = levelCounters[lvl] / denom;
          const value = parentBase + frac;
          baseStack[lvl] = value;
          orders[item.id] = value;
        }
        return orders;
      };

      const nextMap = computeFractionalOrder(newHierarchy);
      setOptimisticHierarchy(newHierarchy);
      setOrderMap(nextMap);

      persistOrder(nextMap)
        .then(() => {
          // Order saved successfully
        })
        .catch((err) => {
          console.error("Failed to persist order:", err);
          setOptimisticHierarchy(null);
        });
    },
    [persistOrder]
  );

  // Actions
  const addCategory = useCallback((category: Category) => {
    setCategories((prev) => [category, ...prev]);
  }, []);

  const updateCategory = useCallback((category: Category) => {
    setCategories((prev) => {
      const index = prev.findIndex((c) => c.id === category.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = category;
        return next;
      }
      return prev;
    });
  }, []);

  const removeCategory = useCallback((categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }, []);

  return {
    // Data
    categories: hierarchicalCategories,
    loading,
    error,

    // Filters
    filters,
    setQuery,

    // Actions
    refresh: fetchCategories,
    addCategory,
    updateCategory,
    removeCategory,
    updateOrder,
  };
}