"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCcw } from "lucide-react";
import type { Product } from "./types";
import { ProductModal } from "./modals/productModal";

function formatCOP(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function ProductsPage() {
  const { org } = useEnvironment();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const organizationId = org?.id;

  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  type Option = { id: string; name: string };
  const [categories, setCategories] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [statusChecked, setStatusChecked] = useState<{
    activo: boolean;
    inactivo: boolean;
  }>({ activo: true, inactivo: false });

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const selectedCategoriesKey = selectedCategoryIds.join(",");
  const selectedBranchesKey = selectedBranchIds.join(",");

  useEffect(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const onDeleted = (deletedId: string) => {
    setRows((prev) => prev.filter((product) => product.id !== deletedId));
  };

  const fetchData = async () => {
    try {
      if (!organizationId) return;
      setLoading(true);

      let productIdsByCategory: string[] | null = null;
      if (selectedCategoryIds.length) {
        const { data: categoryLinks, error: categoryError } = await supabase
          .from("product_category_products")
          .select("product_id")
          .eq("organization_id", organizationId)
          .in("category_id", selectedCategoryIds);

        if (categoryError) throw categoryError;

        productIdsByCategory = Array.from(
          new Set((categoryLinks ?? []).map((row: any) => row.product_id).filter(Boolean))
        );

        if (!productIdsByCategory.length) {
          setRows([]);
          return;
        }
      }

      let availability: "all" | "available" | "unavailable" = "all";
      if (statusChecked.activo && !statusChecked.inactivo) availability = "available";
      if (!statusChecked.activo && statusChecked.inactivo) availability = "unavailable";

      let queryBuilder = supabase
        .from("products")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (availability !== "all") {
        queryBuilder = queryBuilder.eq("is_available", availability === "available");
      }

      if (query.trim()) {
        queryBuilder = queryBuilder.ilike("name", `%${query.trim()}%`);
      }

      if (productIdsByCategory) {
        queryBuilder = (queryBuilder as any).in("id", productIdsByCategory);
      }
      if (selectedBranchIds.length) {
        queryBuilder = (queryBuilder as any).in("location_id", selectedBranchIds);
      }

      const { data, error } = await queryBuilder.limit(200);
      if (error) throw error;

      const filtered = (data as Product[]).filter((product) => {
        if (product.price == null) return true;
        return (
          product.price >= priceRange[0] && product.price <= priceRange[1]
        );
      });

      setRows(filtered);
    } catch (error: any) {
      toast.error(error?.message || "Error cargando productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    organizationId,
    statusChecked.activo,
    statusChecked.inactivo,
    selectedCategoriesKey,
    selectedBranchesKey,
  ]);

  useEffect(() => {
    if (!organizationId) return;
    const timeout = setTimeout(() => {
      fetchData();
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange]);

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      try {
        const categoriesResponse = await supabase
          .from("product_categories")
          .select("id, name")
          .eq("organization_id", organizationId)
          .order("name");
        if (!categoriesResponse.error && categoriesResponse.data) {
          setCategories(categoriesResponse.data as Option[]);
        }

        const branchesResponse = await supabase
          .from("locations")
          .select("id, name")
          .eq("organization_id", organizationId)
          .order("name");
        if (!branchesResponse.error && branchesResponse.data) {
          setBranches(branchesResponse.data as Option[]);
        }
      } catch {
        // silencioso
      }
    })();
  }, [organizationId, supabase]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  );

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setOpenModal(true);
  };

  const onSaved = (product: Product) => {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.id === product.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = product;
        return next;
      }
      return [product, ...prev];
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Administra el catálogo de tu tienda
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
          </Button>
          <Button onClick={openCreate} size="lg" className="px-3">
            <Plus className="w-4 h-4 mr-2" /> Nuevo producto
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="md:flex-1 max-w-xl">
          <Label className="sr-only">Buscar</Label>
          <Input
            ref={searchRef}
            className="rounded-xl"
            placeholder="Buscar por nombre"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[160px] justify-between">
                Categoría
                {selectedCategoryIds.length ? (
                  <span className="ml-2 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                    {selectedCategoryIds.length}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Selecciona categorías
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.length ? (
                categories.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category.id}
                    checked={selectedCategoryIds.includes(category.id)}
                    onCheckedChange={(checked) =>
                      setSelectedCategoryIds((prev) =>
                        checked
                          ? [...prev, category.id]
                          : prev.filter((id) => id !== category.id)
                      )
                    }
                    className="data-[state=checked]:text-blue-600"
                  >
                    {category.name}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Sin categorías
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[160px] justify-between">
                Sucursales
                {selectedBranchIds.length ? (
                  <span className="ml-2 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                    {selectedBranchIds.length}
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-muted-foreground">Todas</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Selecciona sucursales
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {branches.length ? (
                branches.map((branch) => (
                  <DropdownMenuCheckboxItem
                    key={branch.id}
                    checked={selectedBranchIds.includes(branch.id)}
                    onCheckedChange={(checked) =>
                      setSelectedBranchIds((prev) =>
                        checked
                          ? [...prev, branch.id]
                          : prev.filter((id) => id !== branch.id)
                      )
                    }
                    className="data-[state=checked]:text-blue-600"
                  >
                    {branch.name}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Sin sucursales
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px] justify-between">
                Estado
                <span className="ml-2 text-xs text-muted-foreground">
                  {statusChecked.activo && !statusChecked.inactivo && "Activo"}
                  {!statusChecked.activo && statusChecked.inactivo && "Inactivo"}
                  {(statusChecked.activo && statusChecked.inactivo) ||
                  (!statusChecked.activo && !statusChecked.inactivo)
                    ? "Todos"
                    : null}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuCheckboxItem
                checked={statusChecked.activo}
                onCheckedChange={(checked) =>
                  setStatusChecked((prev) => ({ ...prev, activo: !!checked }))
                }
                className="data-[state=checked]:text-blue-600"
              >
                Activo
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusChecked.inactivo}
                onCheckedChange={(checked) =>
                  setStatusChecked((prev) => ({ ...prev, inactivo: !!checked }))
                }
                className="data-[state=checked]:text-blue-600"
              >
                Inactivo
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* <div className="mt-3 max-w-md">
        <Label className="text-xs text-muted-foreground">
          Rango de precio (COP)
        </Label>
        <div className="mt-2 space-y-2 rounded-xl border px-4 py-3">
          <Slider
            value={priceRange}
            min={0}
            max={1000000}
            step={5000}
            onValueChange={(values) =>
              setPriceRange([values[0] ?? 0, values[1] ?? 0] as [number, number])
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCOP(priceRange[0])}</span>
            <span>{formatCOP(priceRange[1])}</span>
          </div>
        </div>
      </div> */}

      <div className="rounded-xl border overflow-hidden mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[68px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Descripción</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="w-[130px]">Estado</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cargando productos...
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No hay productos para los filtros aplicados.
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {pagedRows.map((product) => (
              <TableRow key={product.id} className="hover:bg-muted/40">
                <TableCell>
                  {product.image_url ? (
                    <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-[52px] h-[52px] rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      N/A
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div
                    className="font-medium truncate max-w-[260px]"
                    title={product.name}
                  >
                    {product.name}
                  </div>
                  {product.description ? (
                    <div className="md:hidden text-xs text-muted-foreground truncate max-w-[260px]">
                      {product.description}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[420px]">
                  {product.description || ""}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCOP(product.price ?? null)}
                </TableCell>
                <TableCell>
                  {product.is_available ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">
                      Disponible
                    </Badge>
                  ) : (
                    <Badge variant="secondary">No disponible</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                      <Pencil className="w-4 h-4 mr-1" /> Editar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableCaption className="pb-2">
            Mostrando {pagedRows.length} de {rows.length} productos
          </TableCaption>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <div className="text-sm text-muted-foreground">
            Página {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      ) : null}

      <ProductModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onDeleted={onDeleted}
        product={editing}
        onSaved={onSaved}
        organizationId={organizationId}
      />
    </div>
  );
}
