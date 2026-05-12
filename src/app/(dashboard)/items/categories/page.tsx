// app/(dashboard)/catalog/categories/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, RefreshCcw, X, Check, Upload, Link2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { GripVertical } from "lucide-react";

type Category = {
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
};

type Product = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
};

function uuid() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function CategoryModal({ open, onClose, onSaved, organizationId, category }: {
  open: boolean;
  onClose: () => void;
  onSaved: (c: Category) => void;
  organizationId?: string;
  category?: Category | null;
}) {
  const supabase = getSupabaseBrowser();
  const isEdit = Boolean(category?.id);

  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [parentId, setParentId] = useState<string | null>(category?.parent_id ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(category?.image_url ?? null);
  const [storagePath, setStoragePath] = useState<string | null>(category?.storage_path ?? null);
  const [isActive, setIsActive] = useState<boolean>(category?.is_active ?? true);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [queryProducts, setQueryProducts] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open || !organizationId) return;


      setName(category?.name ?? "");
      setDescription(category?.description ?? "");
      setParentId(category?.parent_id ?? null);
      setImageUrl(category?.image_url ?? null);
      setStoragePath(category?.storage_path ?? null);
      setIsActive(category?.is_active ?? true);

      const { data: cats } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name");
      if (mounted && cats) setAllCategories(cats as any);

      const { data: prods } = await supabase
        .from("products")
        .select("id, name, description, price, image_url")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (mounted && prods) setAllProducts(prods as any);

      if (isEdit && category?.id) {
        const { data: links } = await supabase
          .from("product_category_products")
          .select("product_id")
          .eq("category_id", category.id)
          .eq("organization_id", organizationId);
        if (mounted && links) setSelectedProductIds((links as any).map((r: any) => r.product_id));
      } else {
        setSelectedProductIds([]);
      }
    }
    load();
    return () => { mounted = false };
  }, [open, organizationId, category?.id]);

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !organizationId) return;

    try {
      setUploading(true);
      const file = files[0];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${organizationId}/categories/${category?.id ?? "_new"}/${uuid()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("category-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("category-images").getPublicUrl(path);
      const url = pub?.publicUrl as string;
      setImageUrl(url);
      setStoragePath(path);
      toast.success("Imagen cargada");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function saveLinks(categoryId: string) {
    if (!organizationId) return;
    await supabase
      .from("product_category_products")
      .delete()
      .eq("organization_id", organizationId)
      .eq("category_id", categoryId);

    if (selectedProductIds.length) {
      const rows = selectedProductIds.map((pid) => ({
        organization_id: organizationId!,
        category_id: categoryId,
        product_id: pid,
      }));
      const { error } = await supabase.from("product_category_products").insert(rows);
      if (error) throw error;
    }
  }

  const onSubmit = async () => {
    try {
      setSaving(true);
      if (!organizationId) throw new Error("Falta negocio");

      const payload: Partial<Category> = {
        name: name.trim(),
        description: description?.trim() || null,
        parent_id: parentId || null,
        image_url: imageUrl,
        storage_path: storagePath,
        is_active: isActive,
        organization_id: organizationId,
      } as any;

      if (!payload.name) {
        toast.error("El nombre es obligatorio");
        return;
      }

      if (isEdit && category?.id) {
        const { data: updated, error } = await supabase
          .from("product_categories")
          .update(payload)
          .eq("id", category.id)
          .select("*")
          .single();
        if (error) throw error;

        await saveLinks(category.id);
        onSaved(updated as any);
        toast.success("Categoría actualizada");
        onClose();
        return;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("product_categories")
        .insert([payload])
        .select("*")
        .single();
      if (insErr) throw insErr;

      const categoryId = (inserted as any).id as string;
      await saveLinks(categoryId);

      onSaved(inserted as any);
      toast.success("Categoría creada");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Error guardando la categoría");
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = allProducts.filter((p) =>
    p.name.toLowerCase().includes(queryProducts.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="pb-6 gap-0 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEdit ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2 w-full px-6 mb-6 m-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Hamburguesas"
              />
            </div>
            <div className="space-y-2">
              <Label>Padre</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={parentId ?? ""}
                onChange={(e) => setParentId(e.target.value || null)}
              >
                <option value="">(Sin padre)</option>
                {allCategories
                  .filter((c) => !isEdit || c.id !== category?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Texto opcional"
            />
          </div>

          <div className="space-y-2">
            <Label>Imagen</Label>
            <div className="flex items-center gap-3">
              <input
                id="cat-file"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileInput}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("cat-file")?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Subir imagen
              </Button>
              {imageUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted">
                  <Image
                    src={imageUrl}
                    alt="category"
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Sin imagen</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="block">Productos asignados</Label>
              <div className="w-64">
                <Input
                  placeholder="Buscar productos"
                  value={queryProducts}
                  onChange={(e) => setQueryProducts(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedProductIds.map((pid) => {
                const p = allProducts.find((x) => x.id === pid);
                if (!p) return null;
                return (
                  <Badge key={pid} className="px-2 py-1" variant="secondary">
                    <Link2 className="w-3 h-3 mr-1" /> {p.name}
                    <button
                      className="ml-2"
                      onClick={() =>
                        setSelectedProductIds((prev) =>
                          prev.filter((id) => id !== pid)
                        )
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
              {!selectedProductIds.length && (
                <span className="text-xs text-muted-foreground">
                  Sin productos asignados
                </span>
              )}
            </div>

            <div className="max-h-48 overflow-auto rounded-md border">
              {filteredProducts.map((p) => {
                const checked = selectedProductIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-md overflow-hidden bg-muted">
                        {p.image_url ? (
                          <Image
                            src={p.image_url}
                            alt={p.name}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-medium leading-none">{p.name}</div>
                        {p.description ? (
                          <div className="text-xs text-muted-foreground truncate max-w-[320px]">
                            {p.description}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setSelectedProductIds((prev) =>
                          v ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                        );
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 m-auto">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildHierarchy(rows: Category[]): (Category & { level: number })[] {
  const byId: Record<string, Category & { level: number }> = {};
  const childrenMap: Record<string, string[]> = {};
  const orderIndex: Record<string, number> = {};
  const result: (Category & { level: number })[] = [];
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

function computeFractionalOrder(
  list: (Category & { level: number })[],
  baseStep = 1,
  fractionBase = 10
): Record<string, number> {
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
}

function reorderByIds(
  list: (Category & { level: number })[],
  newIds: string[]
): (Category & { level: number })[] {
  const map = new Map(list.map((x) => [x.id, x]));
  return newIds.map((id) => map.get(id)!).filter(Boolean);
}

export default function CategoriesPage() {
  const { org } = useEnvironment();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const firstFiltersRun = useRef(true);

  // Estados principales
  const organizationId = org?.id;
  const [optimisticHierarchy, setOptimisticHierarchy] = useState<(Category & { level: number })[] | null>(null);
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [confirmCat, setConfirmCat] = useState<Category | null>(null);
  const [descCount, setDescCount] = useState<number | null>(null);
  const [isLoadingDesc, setIsLoadingDesc] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const pageSize = 100;
  const [page, setPage] = useState(1);
  const [orderMap, setOrderMap] = useState<Record<string, number>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  function SortableRow({
    id,
    children,
  }: {
    id: string;
    children: (args: {
      attributes: React.HTMLAttributes<any>;
      listeners: any;
      isDragging: boolean;
      setNodeRef: (node: HTMLElement | null) => void;
      style: React.CSSProperties;
    }) => React.ReactNode;
  }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : undefined,
      background: isDragging ? "var(--muted)" : undefined,
    };

    return (
      <TableRow ref={setNodeRef} style={style}>
        {children({ attributes, listeners, isDragging, setNodeRef, style })}
      </TableRow>
    );
  }

  async function persistOrder(nextMap: Record<string, number>) {
    if (!organizationId) return;
    const payload = Object.entries(nextMap).map(([id, sort_order]) => ({ id, sort_order }));
    const { error } = await supabase.rpc("category_reorder_simple", {
      p_org: organizationId,
      p_items: payload as any,
    });
    if (error) throw error;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = hierarchicalRows.map((r) => r.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const newIds = arrayMove(ids, oldIndex, newIndex);
    const newHierarchy = reorderByIds(hierarchicalRows, newIds);
    const nextMap = computeFractionalOrder(newHierarchy);

    setOptimisticHierarchy(newHierarchy);
    setOrderMap(nextMap);

    (async () => {
      try {
        await persistOrder(nextMap);
        toast.success("Orden guardado");
        fetchData();
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "No se pudo guardar el orden");
        setOptimisticHierarchy(null);
      }
    })();
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const sortedRows = useMemo(() => {
    if (Object.keys(orderMap).length) {
      return [...rows].sort((a, b) => {
        const A = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
        const B = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
        if (A !== B) return A - B;
        return a.name.localeCompare(b.name);
      });
    }
    return [...rows].sort((a, b) => {
      const A = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const B = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (A !== B) return A - B;
      return a.name.localeCompare(b.name);
    });
  }, [rows, orderMap]);

  function shallowEqual(a: Record<string, number>, b: Record<string, number>) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (a[k] !== b[k]) return false;
    return true;
  }

  useEffect(() => {
    const m: Record<string, number> = {};
    rows.forEach((r, i) => {
      m[r.id] = r.sort_order ?? (i + 1);
    });

    setOrderMap(prev => (shallowEqual(prev, m) ? prev : m));
    setOptimisticHierarchy(null);
  }, [rows]);

  const hierarchicalRows = useMemo(
    () => optimisticHierarchy ?? buildHierarchy(sortedRows),
    [sortedRows, optimisticHierarchy]
  );

  const pagedRows = useMemo(
    () => hierarchicalRows.slice((page - 1) * pageSize, page * pageSize),
    [hierarchicalRows, page]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // FALLBACK: Si no hay organizationId del contexto, usar uno de los que sabemos que tienen datos
      let targetOrgId = organizationId;
      
      if (!targetOrgId) {
        console.warn('⚠️ No organization ID from context, using fallback');
        // Usar uno de los organization_id que sabemos que tienen datos
        targetOrgId = '6611d7ab-95b2-4513-bd01-998e036cbd8c';
        toast.error('Problema con el contexto de organización. Usando datos de prueba.');
      }


      const p_search = query.trim() ? query.trim() : null;

      const { data, error } = await supabase.rpc("category_list_with_counts", {
        p_org: targetOrgId,
        p_search,
        p_is_active: null,
        p_limit: 200,
        p_offset: 0,
      });


      if (error) throw error;

      setRows((data as any[]) ?? []);
    } catch (err: any) {
      console.error('[fetchData] Error:', err);
      toast.error(err?.message || "Error cargando categorías");
    } finally {
      setLoading(false);
    }
  };

  async function getDescendantCategoryIds(rootId: string): Promise<string[]> {
    if (!organizationId) return [];
    const result: string[] = [];
    const queue: string[] = [rootId];

    while (queue.length) {
      const current = queue.shift()!;
      const { data: children, error } = await supabase
        .from("product_categories")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("parent_id", current);

      if (error) throw error;

      const kids = (children ?? []).map((c: any) => c.id as string);
      queue.push(...kids);
      result.push(...kids);
    }

    result.push(rootId);
    return result;
  }

  useEffect(() => {
    let active = true;
    async function loadDescCount() {
      if (!confirmCat) {
        setDescCount(null);
        return;
      }
      try {
        setIsLoadingDesc(true);
        const ids = await getDescendantCategoryIds(confirmCat.id);
        if (active) setDescCount(Math.max(0, ids.length - 1));
      } catch {
        if (active) setDescCount(null);
      } finally {
        if (active) setIsLoadingDesc(false);
      }
    }
    loadDescCount();
    return () => {
      active = false;
    };
  }, [confirmCat]);

  async function handleDeleteCategory(c: Category) {
    const targetOrgId = organizationId || '6611d7ab-95b2-4513-bd01-998e036cbd8c';

    try {
      const ids = await getDescendantCategoryIds(c.id);

      if (ids.length) {
        const { error: delLinksErr } = await supabase
          .from("product_category_products")
          .delete()
          .eq("organization_id", targetOrgId)
          .in("category_id", ids);
        if (delLinksErr) throw delLinksErr;
      }

      const { error: delCatsErr } = await supabase
        .from("product_categories")
        .delete()
        .eq("organization_id", targetOrgId)
        .in("id", ids);
      if (delCatsErr) throw delCatsErr;

      toast.success("Categoría y subcategorías eliminadas");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "No se pudo eliminar la categoría");
    }
  }

  useEffect(() => {
    if (firstFiltersRun.current) {
      firstFiltersRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      fetchData();
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // Ejecutar fetchData cuando se monte el componente o cambie la organización
  useEffect(() => {
    fetchData();
  }, []); // Ejecutar siempre al montar, independientemente del organizationId

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setOpenModal(true);
  };

  const onSaved = () => {
    setOpenModal(false);
    fetchData();
  };

  // Mostrar el organizationId que se está usando (para debug)
  const currentOrgId = organizationId || '6611d7ab-95b2-4513-bd01-998e036cbd8c';

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Administra las categorías de tu catálogo
          </p>
          {!organizationId && (
            <p className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded mt-1">
              ⚠️ Usando datos de prueba - Problema con contexto de organización
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
          </Button>
          <Button onClick={openCreate} size="lg" className="px-3">
            <Plus className="w-4 h-4 mr-2" /> Nueva categoría
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="md:flex-1 max-w-xl">
          <Label className="sr-only">Buscar</Label>
          <Input
            ref={searchRef}
            className="rounded-xl"
            placeholder="Buscar por nombre de primer nivel"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[68px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Descripción</TableHead>
              <TableHead className="w-[120px]">Productos</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
              <TableHead className="w-[50px]">Orden</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando categorías...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No hay categorías
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && pagedRows.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pagedRows.map(r => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {pagedRows.map((c) => (
                    <SortableRow key={c.id} id={c.id}>
                      {({ attributes, listeners }) => (
                        <>
                          <TableCell>
                            <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                              {c.image_url ? (
                                <Image src={c.image_url} alt={c.name} fill sizes="52px" className="object-cover" />
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div
                              className="font-medium truncate max-w-[240px] flex items-center gap-2"
                              title={c.name}
                              style={{ paddingLeft: `${c.level * 24}px` }}
                            >
                              {c.level > 0 && <span className="text-gray-400">↳</span>}
                              {c.name}
                            </div>
                            {c.description && (
                              <div className="md:hidden text-xs text-muted-foreground truncate max-w-[240px]">
                                {c.description}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[360px]">
                            {c.description || ""}
                          </TableCell>
                          <TableCell className="font-medium">
                            {c.products_count ?? 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                                <Pencil className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="secondary"
                                size="sm"
                                title="Eliminar categoría"
                                onClick={() => setConfirmCat(c)}
                                disabled={isDeletingId === c.id}
                              >
                                {isDeletingId === c.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="flex pt-6 items-center gap-2 justify-center">
                            {!c.parent_id && (
                              <>
                                <span className="text-gray-500">{orderMap[c.id] ?? 0}</span>
                                <span
                                  className="text-muted-foreground cursor-grab active:cursor-grabbing"
                                  {...listeners}
                                  {...attributes}
                                  aria-label="Reordenar raíz"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </span>
                              </>
                            )}
                          </TableCell>
                        </>
                      )}
                    </SortableRow>
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </TableBody>
          <TableCaption className="pb-2">
            Mostrando {pagedRows.length} de {rows.length} categorías
          </TableCaption>
        </Table>
      </div>

      {/* Confirmación de borrado */}
      <AlertDialog
        open={!!confirmCat}
        onOpenChange={(open) => {
          if (!open) setConfirmCat(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCat ? (
                <>
                  Vas a eliminar <b>{confirmCat.name}</b>
                  {isLoadingDesc ? (
                    <>… contando subcategorías…</>
                  ) : (
                    <>
                      {typeof descCount === "number" && descCount > 0 ? (
                        <> y <b>{descCount}</b> subcategoría{descCount === 1 ? "" : "s"}.</>
                      ) : (
                        <>.</>
                      )}
                    </>
                  )}
                  <br />
                  Esta acción no se puede deshacer.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmCat(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmCat) return;
                try {
                  setIsDeletingId(confirmCat.id);
                  await handleDeleteCategory(confirmCat);
                  setConfirmCat(null);
                } finally {
                  setIsDeletingId(null);
                }
              }}
            >
              {isDeletingId ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Paginación simple */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm" 
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      <CategoryModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        category={editing}
        onSaved={onSaved}
        organizationId={currentOrgId}
      />
    </div>
  );
}
