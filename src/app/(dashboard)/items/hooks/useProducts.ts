"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import type { Product } from "../types";

export interface ProductFilters {
  query: string;
  categoryIds: string[];
  branchIds: string[];
  availability: "all" | "available" | "unavailable";
}

interface Option {
  id: string;
  name: string;
}

interface UseProductsOptions {
  organizationId?: string;
}

export function useProducts({ organizationId }: UseProductsOptions) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  // Filter state
  const [filters, setFilters] = useState<ProductFilters>({
    query: "",
    categoryIds: [],
    branchIds: [],
    availability: "all",
  });

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Metadata
  const [categories, setCategories] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      // Get product IDs by category filter first
      let productIdsByCategory: string[] | null = null;
      if (filters.categoryIds.length > 0) {
        const { data: categoryLinks, error: categoryError } = await supabase
          .from("product_category_products")
          .select("product_id")
          .eq("organization_id", organizationId)
          .in("category_id", filters.categoryIds);

        if (categoryError) throw categoryError;

        const productIds = (categoryLinks ?? [])
          .map((row) => (row as { product_id: string }).product_id)
          .filter(Boolean);
        productIdsByCategory = Array.from(new Set(productIds));

        if (productIdsByCategory.length === 0) {
          setProducts([]);
          return;
        }
      }

      // Build query
      let queryBuilder = supabase
        .from("products")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.availability !== "all") {
        queryBuilder = queryBuilder.eq(
          "is_available",
          filters.availability === "available"
        );
      }

      if (debouncedQuery.trim()) {
        queryBuilder = queryBuilder.ilike("name", `%${debouncedQuery.trim()}%`);
      }

      if (productIdsByCategory) {
        queryBuilder = (queryBuilder as any).in("id", productIdsByCategory);
      }

      if (filters.branchIds.length > 0) {
        queryBuilder = (queryBuilder as any).in(
          "location_id",
          filters.branchIds
        );
      }

      const { data, error: fetchError } = await queryBuilder.limit(200);
      if (fetchError) throw fetchError;

      setProducts((data as Product[]) || []);
    } catch (err: any) {
      setError(err?.message || "Error cargando productos");
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase, filters, debouncedQuery]);

  // Fetch metadata (categories & branches)
  const fetchMetadata = useCallback(async () => {
    if (!organizationId) return;

    try {
      const [categoriesRes, branchesRes] = await Promise.all([
        supabase
          .from("product_categories")
          .select("id, name")
          .eq("organization_id", organizationId)
          .order("name"),
        supabase
          .from("locations")
          .select("id, name")
          .eq("organization_id", organizationId)
          .order("name"),
      ]);

      if (!categoriesRes.error && categoriesRes.data) {
        setCategories(categoriesRes.data as Option[]);
      }

      if (!branchesRes.error && branchesRes.data) {
        setBranches(branchesRes.data as Option[]);
      }
    } catch (err) {
      console.error("Error loading metadata:", err);
    }
  }, [organizationId, supabase]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 350);
    return () => clearTimeout(timer);
  }, [filters.query]);

  // Fetch products when filters change
  useEffect(() => {
    if (!organizationId) return;
    fetchProducts();
  }, [organizationId, fetchProducts]);

  // Fetch metadata on mount
  useEffect(() => {
    if (!organizationId) return;
    fetchMetadata();
  }, [organizationId, fetchMetadata]);

  // Filter helpers
  const updateFilters = useCallback(
    (updates: Partial<ProductFilters>) => {
      setFilters((prev) => ({ ...prev, ...updates }));
      setPage(1);
    },
    []
  );

  const setQuery = useCallback(
    (query: string) => {
      updateFilters({ query });
    },
    [updateFilters]
  );

  const toggleCategory = useCallback(
    (categoryId: string) => {
      const newCategories = filters.categoryIds.includes(categoryId)
        ? filters.categoryIds.filter((id) => id !== categoryId)
        : [...filters.categoryIds, categoryId];
      updateFilters({ categoryIds: newCategories });
    },
    [filters.categoryIds, updateFilters]
  );

  const toggleBranch = useCallback(
    (branchId: string) => {
      const newBranches = filters.branchIds.includes(branchId)
        ? filters.branchIds.filter((id) => id !== branchId)
        : [...filters.branchIds, branchId];
      updateFilters({ branchIds: newBranches });
    },
    [filters.branchIds, updateFilters]
  );

  const setAvailability = useCallback(
    (availability: "all" | "available" | "unavailable") => {
      updateFilters({ availability });
    },
    [updateFilters]
  );

  // Computed values
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const pagedProducts = products.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Update product in list
  const updateProduct = useCallback((product: Product) => {
    setProducts((prev) => {
      const index = prev.findIndex((p) => p.id === product.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = product;
        return next;
      }
      return [product, ...prev];
    });
  }, []);

  // Remove product from list
  const removeProduct = useCallback((productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  return {
    // Data
    products,
    pagedProducts,
    loading,
    error,

    // Filters
    filters,
    setQuery,
    toggleCategory,
    toggleBranch,
    setAvailability,

    // Metadata
    categories,
    branches,

    // Pagination
    page,
    setPage,
    totalPages,
    pageSize,

    // Actions
    refresh: fetchProducts,
    updateProduct,
    removeProduct,
  };
}