"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  RefreshCcw,
  Loader2,
  Trash2,
  ChevronDown,
  GripVertical,
} from "lucide-react";

// dnd-kit
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// =====================
// Types
// =====================
export type OptionSet = {
  id: string;
  organization_id: string;
  name: string;
  display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type OptionItem = {
  id: string;
  organization_id: string;
  option_set_id: string;
  name: string;
  display_name: string | null;
  sort_order: number; // para ordenamiento
  created_at: string | null;
  updated_at: string | null;
};

export type OptionSetRow = OptionSet & {
  options_count?: number;
  options_preview?: string[]; // para listar rápido
};

// =====================
// Helpers
// =====================
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// =====================
// Sortable Row for Options inside Modal
// =====================
function SortableOptionRow({ id, index, value, onChange, onRemove }: {
  id: string;
  index: number;
  value: { id?: string; name: string; display_name: string };
  onChange: (upd: { name?: string; display_name?: string }) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "hsl(var(--accent))" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-2">
      <button className="p-2 mt-4 rounded hover:bg-accent" {...attributes} {...listeners} title="Reordenar">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 flex-1">
        <div className="md:col-span-3">
          <Label className="text-xs">Nombre (clave)</Label>
          <Input
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="p.ej. red"
          />
        </div>
        <div className="md:col-span-8">
          <Label className="text-xs">Nombre visible</Label>
          <Input
            value={value.display_name}
            onChange={(e) => onChange({ display_name: e.target.value })}
            placeholder="p.ej. Rojo"
          />
        </div>
        <div className="md:col-span-1 flex items-end justify-end">
          <Button type="button" variant="outline" onClick={onRemove} title="Eliminar opción">
            <Trash2 className="w-4 h-4 " />
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================
// Modal Crear/Editar Option Set
// =====================
function OptionSetModal({
  open,
  onClose,
  organizationId,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
  editing?: OptionSet | null;
  onSaved: () => void;
}) {
  const supabase = getSupabaseBrowser();
  const isEdit = !!editing?.id;

  const [name, setName] = useState(editing?.name ?? "");
  const [displayName, setDisplayName] = useState(editing?.display_name ?? "");
  const [loading, setLoading] = useState(false);

  // opciones internas del set (para crear/editar)
  type DraftOpt = { id?: string; _cid: string; name: string; display_name: string };

  const [options, setOptions] = useState<DraftOpt[]>([]);



  // dnd sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setDisplayName(editing?.display_name ?? "");
    if (isEdit && editing?.id) {
      (async () => {
        const { data, error } = await supabase
          .from("options")
          .select("id, name, display_name, sort_order")
          .eq("option_set_id", editing.id)
          .order("sort_order", { ascending: true });
        if (error) console.error(error);
        const list: DraftOpt[] = (data ?? []).map((r: any) => ({
          id: r.id,
          _cid: r.id,                  // estable para existentes
          name: r.name,
          display_name: r.display_name ?? ""
        }));
        setOptions(list);
      })();
    } else {
      setOptions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  function addOption() {
    setOptions((prev) => [
      ...prev,
      { _cid: crypto.randomUUID(), name: "", display_name: "" }
    ]);
  }

  function onDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o._cid === active.id);
    const newIndex = options.findIndex((o) => o._cid === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setOptions((items) => arrayMove(items, oldIndex, newIndex));
  }

  async function persist() {
    try {
      if (!organizationId) throw new Error("Falta negocio");
      if (!name.trim()) return toast.error("El nombre del set es obligatorio");

      setLoading(true);
      let setId = editing?.id as string | undefined;

      if (isEdit && setId) {
        const { error } = await supabase
          .from("option_sets")
          .update({ name: name.trim(), display_name: displayName || null })
          .eq("id", setId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("option_sets")
          .insert([{ organization_id: organizationId, name: name.trim(), display_name: displayName || null }])
          .select("id")
          .single();
        if (error) throw error;
        setId = data?.id;
      }

      if (!setId) throw new Error("No se pudo obtener el ID del set");

      // Persistir opciones: estrategia simple => borrar e insertar con orden actual
      await supabase.from("options").delete().eq("option_set_id", setId);
      if (options.length) {
        const payload = options.map((opt, idx) => ({
          organization_id: organizationId,
          option_set_id: setId!,
          name: opt.name.trim(),
          display_name: opt.display_name.trim() || null,
          sort_order: idx + 1,
        }));
        const { error } = await supabase.from("options").insert(payload);
        if (error) throw error;
      }

      toast.success("Option set guardado");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  }
  // ids estables para DnD y keys
  const ids = options.map((o) => o._cid);
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="h-screen flex flex-col max-w-screen sm:rounded-none gap-4 pb-10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Editar lista de opciones" : "Nueva lista de opciones"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mx-auto max-w-3xl min-w-[48rem] mb-5">
          {/* Details */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Detalles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre Interno</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="p.ej. sizes" />
              </div>
              <div className="space-y-2">
                <Label>Nombre Visible</Label>
                <Input value={displayName ?? ""} onChange={(e) => setDisplayName(e.target.value)} placeholder="p.ej. Tallas" />
              </div>
            </div>
          </div>

          {/* Options list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Opciones de {name || ""} </h2>
              <Button variant="outline" onClick={addOption}><Plus className="w-4 h-4 mr-1" /> Agregar opción</Button>
            </div>

            {options.length === 0 && (
              <div className="rounded-md border p-6 text-sm text-muted-foreground text-center">No hay opciones aún</div>
            )}

            {options.length > 0 && (
              <div className="rounded-lg border pb-2 pr-3">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {options.map((opt, idx) => (
                      <SortableOptionRow
                        key={opt._cid}
                        id={opt._cid}
                        index={idx}
                        value={{ name: opt.name, display_name: opt.display_name }}
                        onChange={(upd) => {
                          setOptions((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], ...upd };
                            return next;
                          });
                        }}
                        onRemove={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            <p className="text-xs text-muted-foreground">Para eliminar un set, primero elimina todas sus opciones.</p>
          </div>
        </div>

        <DialogFooter className="mt-5 w-full m-auto max-w-3xl">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={persist} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================
// Main Page
// =====================
export default function OptionsPage() {
  const { org } = useEnvironment();
  const supabase = getSupabaseBrowser();
  const organizationId = org?.id;

  const [rows, setRows] = useState<OptionSetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{ withOptions: boolean; empty: boolean }>({ withOptions: true, empty: true });

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<OptionSet | null>(null);
  const [deleting, setDeleting] = useState<OptionSet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  async function fetchData() {
    if (!organizationId) return;
    try {
      setLoading(true);
      const { data: list, error } = await supabase
        .from("option_sets")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (list ?? []).map((d: any) => d.id);
      if (ids.length === 0) { setRows([]); return; }

      const { data: opts } = await supabase
        .from("options")
        .select("option_set_id, name")
        .in("option_set_id", ids)
        .order("sort_order", { ascending: true });

      const mapCount = new Map<string, number>();
      const mapPreview = new Map<string, string[]>();
      (opts ?? []).forEach((o: any) => {
        mapCount.set(o.option_set_id, (mapCount.get(o.option_set_id) || 0) + 1);
        const arr = mapPreview.get(o.option_set_id) || [];
        if (arr.length < 5) arr.push(o.name);
        mapPreview.set(o.option_set_id, arr);
      });

      const enriched: OptionSetRow[] = (list ?? []).map((d: any) => ({
        ...d,
        options_count: mapCount.get(d.id) || 0,
        options_preview: mapPreview.get(d.id) || [],
      }));

      setRows(enriched);
    } catch (err: any) {
      toast.error(err?.message || "Error cargando options");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [organizationId]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(r => (r.name + (r.display_name || "")).toLowerCase().includes(q));
    if (status.withOptions && !status.empty) list = list.filter(r => (r.options_count || 0) > 0);
    if (!status.withOptions && status.empty) list = list.filter(r => (r.options_count || 0) === 0);
    return list;
  }, [rows, query, status]);

  const openCreate = () => { setEditing(null); setOpenModal(true); };
  const openEdit = (d: OptionSet) => { setEditing(d); setOpenModal(true); };
  const onSaved = () => { setOpenModal(false); fetchData(); };

  async function deleteSet(d: OptionSetRow) {
    if (!organizationId) return;
    if ((d.options_count || 0) > 0) {
      toast.error("Para eliminar un set, primero elimina todas sus opciones.");
      return;
    }
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("option_sets")
        .delete()
        .eq("id", d.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
      toast.success("Option set eliminado");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "No se pudo eliminar");
    } finally {
      setIsDeleting(false);
      setDeleting(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">listas de Opciones</h1>
          <p className="text-sm text-muted-foreground">Las opciones le ayudan a crear y organizar las variaciones de sus artículos con valores seleccionables al momento del pago.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} title="Recargar">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </Button>
          <Button onClick={openCreate} size="lg" className="px-3" title="Crear option set">
            <Plus className="w-4 h-4 mr-2" /> Nueva Lista
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="md:flex-1 max-w-xl">
          <Label className="sr-only">Buscar</Label>
          <Input
            ref={searchRef}
            className="rounded-xl"
            placeholder="Busca por nombre"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            title="Filtra por nombre"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Opciones</TableHead>
              <TableHead className="w-[120px] text-right">Productos</TableHead>
              <TableHead className="w-[140px]"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando…
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="py-8 text-center text-sm text-muted-foreground">Aún no creaste ninguna lista</div>
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate" title={d.display_name || d.name}>
                      {d.display_name || d.name}
                    </span>
                    {d.display_name && (
                      <Badge variant="outline" className="shrink-0">{d.name}</Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="align-center text-sm text-muted-foreground max-w-[360px] truncate" title={(d.options_preview || []).join(", ")}>
                  {(d.options_preview || []).length ? (d.options_preview || []).join(", ") : "—"}
                </TableCell>

                <TableCell className="text-right">0</TableCell>{/* Items conectará luego con productos */}

                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" className="p-0 h-auto" onClick={() => openEdit(d)} title="Editar">
                      <div className="p-2 px-3"><Pencil className="w-4 h-5" /></div>
                    </Button>
                    <Button variant="outline" size="icon" title="Eliminar" onClick={() => setDeleting(d)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableCaption className="pb-2">{filtered.length} lista(s)</TableCaption>
        </Table>
      </div>

      <OptionSetModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        organizationId={organizationId}
        editing={editing}
        onSaved={onSaved}
      />

      {deleting && (
        <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
          <DialogContent className="gap-0">
            <DialogHeader>
              <DialogTitle>Eliminar Lista de Opciones</DialogTitle>
            </DialogHeader>
            <div className="text-sm px-6 mb-6">Vas a eliminar <b>{deleting.display_name || deleting.name}</b>. Esta acción no se puede deshacer.</div>
            <DialogFooter className="px-6 pb-6">
              <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button className="bg-destructive hover:bg-destructive/90" onClick={() => deleteSet(deleting as any)}>
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
