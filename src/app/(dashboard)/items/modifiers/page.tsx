// app/(dashboard)/catalog/modifiers/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Loader2,
  RefreshCcw,
  X,
  Check,
  Upload,
  Trash2,
  EyeOff,
  Eye,
  MapPin,
  ChevronDown,
} from "lucide-react";
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
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { GripVertical } from "lucide-react";
import { useSortable, SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext, DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
// ---------- Tipos ----------

type ModifierSet = {
  id: string;
  organization_id: string;
  name: string;
  display_name: string | null;
  is_active: boolean;
  hide_online: boolean;
  require_selection: boolean;
  min_selections: number;
  max_selections: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type Modifier = {
  id: string;
  organization_id: string;
  modifier_set_id: string;
  name: string;
  display_name: string | null;
  price_delta: number;
  is_active: boolean;
  hide_online: boolean;
  preselect: boolean;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
  image_url?: string | null;
};

type Location = { id: string; name: string };

type ModifierSetWithCounts = ModifierSet & { modifiers_count?: number };

// ---------- Utils ----------
function uuid() {
  // simple uuid v4 fallback
  // @ts-ignore
  return (
    crypto?.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: ((dragListeners: any) => React.ReactNode) | React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      {typeof children === "function" ? (children as any)(listeners) : children}
    </tr>
  );
}

function DragCell({ listeners }: { listeners?: any }) {
  return (
    <td className="w-[36px] align-top pt-3">
      <button className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground" {...listeners} title="Arrastrar para reordenar">
        <GripVertical className="w-4 h-4" />
      </button>
    </td>
  );
}
DragCell.displayName = "DragCell";

// ---------- Subcomponentes ----------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-sm font-semibold">{children}</Label>;
}

function SwitchWithHint({
  checked,
  onCheckedChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  hint: string;
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1" title={hint}>
      <div className="text-sm leading-tight">
        <span className="font-medium">{label}</span>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ModifierRow({
  m,
  onChange,
  onDelete,
  onUpload,
  openAvailability,
  unavailableCount,
  dragListeners,
}: {
  m: Modifier;
  onChange: (next: Partial<Modifier>) => void;
  onDelete: () => void;
  onUpload: (file: File) => Promise<void>;
  openAvailability: () => void;
  unavailableCount: number;
  dragListeners?: any;
}) {
  const [uploading, setUploading] = useState(false);
  const fileId = `file-${m.id}`;

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      await onUpload(file);
      toast.success("Imagen cargada");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo cargar la imagen");
    } finally {
      setUploading(false);
    }
  }

  const disponibilidadLabel =
    unavailableCount === 0
      ? "En stock"
      : unavailableCount === 1
        ? "1 ubicación sin stock"
        : `${unavailableCount} ubicaciones sin stock`;

  return (
    <>
      {/* Col 1: Imagen (header vacío) */}
      <TableCell className="py-2 w-[56px]">
        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0 group">
          {m.image_url ? (
            <Image
              height={96}
              width={96}
              src={m.image_url}
              alt={m.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-[10px] text-muted-foreground">
              N/A
            </div>
          )}
          <input
            id={fileId}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handlePick}
          />
          <button
            type="button"
            className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 text-white text-xs"
            onClick={() => document.getElementById(fileId)?.click()}
            title={uploading ? "Cargando..." : "Cambiar imagen"}
            disabled={uploading}
          >
            {uploading ? "Cargando..." : "Cambiar"}
          </button>
        </div>
      </TableCell>

      {/* Col 2: Nombre */}
      <TableCell className="min-w-[250px]">
        <Input
          className="max-w-xs"
          value={m.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nombre del modificador"
          title="Nombre interno del modificador"
        />
      </TableCell>

      {/* Col 3: Precio */}
      <TableCell className="min-w-[150px]">
        <Input
          type="number"
          step="0.01"
          value={m.price_delta}
          onChange={(e) =>
            onChange({ price_delta: parseFloat(e.target.value || "0") })
          }
          title="Diferencia de precio"
          placeholder="Precio"
        />
      </TableCell>

      {/* Col 4: Visibilidad (Ocultar online + Preseleccionar) */}
      <TableCell className="w-[200px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Switch
              checked={m.hide_online}
              onCheckedChange={(v) => onChange({ hide_online: v })}
              id={`hide-${m.id}`}
            />
            <label htmlFor={`hide-${m.id}`} className="cursor-pointer">
              Ocultar online
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={m.preselect}
              onCheckedChange={(v) => onChange({ preselect: v })}
              id={`pre-${m.id}`}
            />
            <label htmlFor={`pre-${m.id}`} className="cursor-pointer">
              Preseleccionar
            </label>
          </div>
        </div>
      </TableCell>

      {/* Col 5: Disponibilidad */}
      <TableCell className="w-[160px]">
        <Button
          variant="ghost"

          size="sm"
          onClick={openAvailability}
          title="Configurar disponibilidad por ubicación"
          className="justify-start text-blue-700"
        >
          {disponibilidadLabel}
        </Button>
      </TableCell>

      {/* Col 6: Acciones (Trash y Drag al final) */}
      <TableCell className="w-[120px]">
        <div className="flex items-center justify-end gap-1">
          {/* Trash a la izquierda del drag-handle */}
          <Button
            variant="secondary"
            size="icon"
            onClick={onDelete}
            title="Eliminar modificador"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          {/* Drag-handle al final */}
          <button
            className="cursor-grab active:cursor-grabbing p-2 text-muted-foreground hover:text-foreground"
            title="Arrastrar para reordenar"
            {...(dragListeners || {})}
          >
            <GripVertical />
          </button>
        </div>
      </TableCell>
    </>
  );
}

function LocationsModal({
  open,
  onClose,
  locations,
  allLocations,
  setAllLocations,
  selectedLocs,
  setSelectedLocs,
}: {
  open: boolean;
  onClose: () => void;
  locations: Location[];
  allLocations: boolean;
  setAllLocations: (v: boolean) => void;
  selectedLocs: Set<string>;
  setSelectedLocs: (v: Set<string>) => void;
}) {
  const [query, setQuery] = useState("");
  // estados temporales para permitir Cancelar sin afectar el padre
  const [tmpAll, setTmpAll] = useState(allLocations);
  const [tmpSelected, setTmpSelected] = useState<Set<string>>(new Set(selectedLocs));

  // Re-sync al abrir
  useEffect(() => {
    if (open) {
      setTmpAll(allLocations);
      setTmpSelected(new Set(selectedLocs));
      setQuery("");
    }
  }, [open, allLocations, selectedLocs]);

  // Filtro por búsqueda
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) => l.name.toLowerCase().includes(q));
  }, [query, locations]);

  // Auto manejar "Todas" según el tamaño de la selección
  useEffect(() => {
    const total = locations.length;
    const sel = tmpSelected.size;

    if (total === 0) {
      if (tmpAll) setTmpAll(false);
      return;
    }

    // Si todas seleccionadas → activar "Todas"
    if (sel === total && !tmpAll) {
      setTmpAll(true);
    }
    // Si falta alguna y tmpAll estaba activo → desactivar "Todas"
    if (sel < total && tmpAll) {
      setTmpAll(false);
    }
  }, [tmpSelected, locations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle individual
  function toggle(id: string) {
    setTmpSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Cambiar "Todas" manualmente desde el switch
  function onToggleAll(v: boolean) {
    setTmpAll(v);
    if (v) {
      // seleccionar TODAS
      setTmpSelected(new Set(locations.map((l) => l.id)));
    } else {
      // mantener selección actual (no la borramos)
      // si quieres vaciar al desactivar, descomenta:
      // setTmpSelected(new Set());
    }
  }

  function onSave() {
    // Asegurar coherencia: si todas están seleccionadas, tmpAll = true
    const finalAll = tmpSelected.size === locations.length && locations.length > 0;
    setAllLocations(finalAll);
    setSelectedLocs(new Set(tmpSelected));
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Editar ubicaciones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <p className="text-sm text-muted-foreground">
            Este conjunto estará disponible en el flujo de venta solo en las ubicaciones seleccionadas.
          </p>


          {/* Barra de búsqueda + acciones en bloque */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar ubicaciones"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1">
                  <ChevronDown className="w-4 h-4" />
                  Acciones
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    // Seleccionar solo las visibles (filtradas)
                    setTmpSelected((prev) => {
                      const next = new Set(prev);
                      filtered.forEach((f) => next.add(f.id));
                      return next;
                    });
                  }}
                  title="Seleccionar visibles"
                >
                  Seleccionar visibles
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => setTmpSelected(new Set())}
                >
                  Limpiar selección
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    // Seleccionar TODAS (no solo las filtradas)
                    setTmpSelected(new Set(locations.map((l) => l.id)));
                  }}
                >
                  Seleccionar todas
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>


          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="text-sm">
              <div className="font-medium">Todas las ubicaciones</div>
              <div className="text-xs text-muted-foreground">Aplicar el conjunto en todos los locales</div>
            </div>
            <Switch checked={tmpAll} onCheckedChange={onToggleAll} />
          </div>

          {/* Lista SIEMPRE visible */}
          <div className="rounded-md border max-h-[340px] overflow-auto divide-y">
            {filtered.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Sin resultados</div>
            )}
            {filtered.map((loc) => {
              const checked = tmpSelected.has(loc.id);
              return (
                <label
                  key={loc.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                  title={loc.name}
                >
                  <span className="truncate">{loc.name}</span>
                  <Switch checked={checked} onCheckedChange={() => toggle(loc.id)} />
                </label>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            {tmpSelected.size} seleccionadas
          </div>
        </div>

        <DialogFooter className="px-6 pb-6" >
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ModifierAvailability = Record<string, Set<string>>;


function ModifierSetModal({
  open,
  onClose,
  organizationId,
  setToEdit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
  setToEdit?: ModifierSet | null;
  onSaved: () => void;
}) {
  const supabase = getSupabaseBrowser();
  const isEdit = !!setToEdit?.id;
  const [openLocsModal, setOpenLocsModal] = useState(false);
  const [name, setName] = useState(setToEdit?.name ?? "");
  const [displayName, setDisplayName] = useState(setToEdit?.display_name ?? "");
  const [isActive, setIsActive] = useState<boolean>(setToEdit?.is_active ?? true);
  const [hideOnline, setHideOnline] = useState<boolean>(setToEdit?.hide_online ?? false);
  const [requireSel, setRequireSel] = useState<boolean>(setToEdit?.require_selection ?? false);
  const [minSel, setMinSel] = useState<number>(setToEdit?.min_selections ?? 0);
  const [maxSel, setMaxSel] = useState<number | "" | null>(setToEdit?.max_selections ?? null);
  const [modAvailability, setModAvailability] = useState<ModifierAvailability>({});
  const [openModAvailability, setOpenModAvailability] = useState(false);
  const [activeModForAvailability, setActiveModForAvailability] = useState<Modifier | null>(null);

  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialModifierIds, setInitialModifierIds] = useState<Set<string>>(new Set());

  // Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState(true);
  const [selectedLocs, setSelectedLocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !organizationId) return;

      // Reset campos al abrir
      setName(setToEdit?.name ?? "");
      setDisplayName(setToEdit?.display_name ?? "");
      setIsActive(setToEdit?.is_active ?? true);
      setHideOnline(setToEdit?.hide_online ?? false);
      setRequireSel(setToEdit?.require_selection ?? false);
      setMinSel(setToEdit?.min_selections ?? 0);
      setMaxSel(setToEdit?.max_selections ?? null);

      // Cargar locations
      const { data: locs, error: locErr } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (locErr) toast.error(locErr.message);
      if (mounted) setLocations((locs as Location[]) || []);

      // Cargar modifiers + set locations si es edición
      if (isEdit && setToEdit?.id) {
        const [{ data, error }, { data: mslData, error: mslErr }] = await Promise.all([
          supabase
            .from("modifiers")
            .select(
              "id, organization_id, modifier_set_id, name, display_name, price_delta, is_active, hide_online, preselect, sort_order, image_url"
            )
            .eq("organization_id", organizationId)
            .eq("modifier_set_id", setToEdit.id)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase
            .from("modifier_set_locations")
            .select("location_id")
            .eq("organization_id", organizationId)
            .eq("modifier_set_id", setToEdit.id),
        ]);

        if (error) toast.error(error.message);

        if (mounted) {
          const mods = ((data as Modifier[]) ?? []).map((m) => ({ ...m }));
          setModifiers(mods);
          setInitialModifierIds(new Set(mods.map((m) => m.id)));
        }

        if (mslErr) toast.error(mslErr.message);
        const locIds = new Set<string>((mslData as any[])?.map((r) => r.location_id));
        // Si no hay filas -> interpretamos "All locations" (o aún no configurado)
        if (mounted) {
          if (!locIds.size) {
            setAllLocations(true);
            setSelectedLocs(new Set());
          } else {
            setAllLocations(false);
            setSelectedLocs(locIds);
          }
        }
      } else {
        setModifiers([]);
        setInitialModifierIds(new Set());
        setAllLocations(true);
        setSelectedLocs(new Set());
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setToEdit?.id, organizationId]);

  function pushBlankModifier() {
    if (!organizationId) return;
    const tmp: Modifier = {
      id: uuid(),
      organization_id: organizationId,
      modifier_set_id: setToEdit?.id || "temp",
      name: "",
      display_name: "",
      price_delta: 0,
      is_active: true,
      hide_online: false,
      preselect: false,
      sort_order: modifiers.length
        ? (modifiers[modifiers.length - 1].sort_order ?? modifiers.length) + 1
        : 1,
      created_at: null,
      updated_at: null,
    };
    setModifiers((prev) => [...prev, tmp]);
  }

  async function uploadModifierImage(idx: number, file: File) {
    if (!organizationId) throw new Error("Falta negocio");
    const m = modifiers[idx];
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${organizationId}/modifiers/${m.id}/${uuid()}.${ext}`;
    const { error: upErr } = await getSupabaseBrowser()
      .storage
      .from("modifier-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (upErr) throw upErr;
    const { data: pub } = getSupabaseBrowser()
      .storage
      .from("modifier-images")
      .getPublicUrl(path);
    const url = (pub?.publicUrl as string) || "";
    setModifiers((prev) => prev.map((mm, i) => (i === idx ? { ...mm, image_url: url } : mm)));
  }


  async function persist() {
    try {
      setSaving(true);
      if (!organizationId) throw new Error("Falta negocio");
      if (!name.trim()) return toast.error("El nombre del set es obligatorio");

      let setId = setToEdit?.id as string | undefined;

      if (isEdit && setId) {
        const { error } = await supabase
          .from("modifier_sets")
          .update({
            name: name.trim(),
            display_name: displayName?.trim() || null,
            is_active: isActive,
            hide_online: hideOnline,
            require_selection: requireSel,
            min_selections: Number(minSel) || 0,
            max_selections: maxSel === "" ? null : maxSel == null ? null : Number(maxSel),
          })
          .eq("id", setId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("modifier_sets")
          .insert([
            {
              organization_id: organizationId,
              name: name.trim(),
              display_name: displayName?.trim() || null,
              is_active: isActive,
              hide_online: hideOnline,
              require_selection: requireSel,
              min_selections: Number(minSel) || 0,
              max_selections: maxSel === "" ? null : maxSel == null ? null : Number(maxSel),
            },
          ])
          .select("id")
          .single();
        if (error) throw error;
        setId = data?.id as string;
      }

      if (!setId) throw new Error("No se pudo obtener el ID del set");

      const normalized = modifiers.map((m, idx) => ({ ...m, sort_order: idx + 1 }));

      const currentIds = new Set(normalized.map((m) => m.id));
      const existing = normalized.filter((m) => initialModifierIds.has(m.id));
      const news = normalized.filter((m) => !initialModifierIds.has(m.id));
      const toDelete = Array.from(initialModifierIds).filter((id) => !currentIds.has(id));

      if (existing.length) {
        const payload = existing.map((m) => ({
          id: m.id,
          organization_id: organizationId,
          modifier_set_id: setId!,
          name: m.name.trim(),
          display_name: m.display_name?.trim() || null,
          price_delta: Number(m.price_delta) || 0,
          is_active: !!m.is_active,
          hide_online: !!m.hide_online,
          preselect: !!m.preselect,
          sort_order: m.sort_order ?? null,
          image_url: m.image_url ?? null,
        }));
        const { error } = await supabase
          .from("modifiers")
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
      }

      if (toDelete.length) {
        const { error: deleteErr } = await supabase
          .from("modifiers")
          .delete()
          .eq("organization_id", organizationId)
          .eq("modifier_set_id", setId)
          .in("id", toDelete);
        if (deleteErr) throw deleteErr;
      }

      if (news.length) {
        const payload = news.map((m) => ({
          organization_id: organizationId,
          modifier_set_id: setId!,
          name: m.name.trim(),
          display_name: m.display_name?.trim() || null,
          price_delta: Number(m.price_delta) || 0,
          is_active: !!m.is_active,
          hide_online: !!m.hide_online,
          preselect: !!m.preselect,
          sort_order: m.sort_order ?? null,
          image_url: m.image_url ?? null,
        }));
        const { error } = await supabase.from("modifiers").insert(payload);
        if (error) throw error;
      }

      // ---- Locations del SET ----
      // Estrategia: borrar todo y reinsertar según selección
      const { error: delErr } = await supabase
        .from("modifier_set_locations")
        .delete()
        .eq("organization_id", organizationId)
        .eq("modifier_set_id", setId);
      if (delErr) throw delErr;

      const locIdsToInsert = allLocations
        ? locations.map((l) => l.id)
        : Array.from(selectedLocs);

      if (locIdsToInsert.length) {
        const payloadMSL = locIdsToInsert.map((locId) => ({
          organization_id: organizationId,
          modifier_set_id: setId!,
          location_id: locId,
          is_available: true,
          hide_online: hideOnline, // por defecto hereda del set
        }));
        const { error: insErr } = await supabase
          .from("modifier_set_locations")
          .insert(payloadMSL);
        if (insErr) throw insErr;
      }

      toast.success("Conjunto guardado");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = modifiers.findIndex((x) => x.id === active.id);
    const newIndex = modifiers.findIndex((x) => x.id === over.id);
    const next = arrayMove(modifiers, oldIndex, newIndex).map((m, idx) => ({
      ...m,
      sort_order: idx + 1, // normalizamos 1..n
    }));
    setModifiers(next);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="h-screen max-w-screen sm:rounded-none gap-4 pb-10 mb-10">
        <DialogHeader className="">
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{" "}
            <div className="w-3 h-1"></div>
            {isEdit ? "Editar conjunto de modificadores" : "Nuevo conjunto de modificadores"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-8 mx-auto max-w-3xl mb-5">
          <div className="flex flex-col gap-4">
            <div className="space-y-2" title="Nombre interno (requerido)">
              <FieldLabel>Nombre</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Salsas" />
            </div>
            <div className="space-y-2" title="Nombre visible en canales (opcional)">
              <FieldLabel>Nombre para mostrar</FieldLabel>
              <Input value={displayName ?? ""} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ej: Elige tu salsa" />
            </div>
          </div>

          {/* Locations (resumen + botón) */}
          <div className="space-y-2">
            <FieldLabel>Ubicaciones</FieldLabel>
            <div className="rounded-md border p-3 flex items-center justify-between">
              <div className="text-sm">
                {allLocations ? (
                  <>
                    <div className="font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Todas las ubicaciones
                    </div>
                    <div className="text-xs text-muted-foreground">El conjunto aplica en todos los locales</div>
                  </>
                ) : (
                  <>
                    <div className="font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> {selectedLocs.size} seleccionadas
                    </div>
                    <div className="text-xs text-muted-foreground">Limitado a las ubicaciones seleccionadas</div>
                  </>
                )}
              </div>
              <Button variant="ghost" onClick={() => setOpenLocsModal(true)} title="Editar ubicaciones">
                Editar ubicaciones <ChevronDown className="ml-1 w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Modal de locations */}
          <LocationsModal
            open={openLocsModal}
            onClose={() => setOpenLocsModal(false)}
            locations={locations}
            allLocations={allLocations}
            setAllLocations={setAllLocations}
            selectedLocs={selectedLocs}
            setSelectedLocs={setSelectedLocs}
          />

          <ModifierAvailabilityModal
            open={openModAvailability}
            onClose={() => setOpenModAvailability(false)}
            modifier={activeModForAvailability}
            // Solo ubicaciones del set (si es "todas", pasa todas)
            locations={allLocations ? locations : locations.filter((l) => selectedLocs.has(l.id))}
            // Conjunto de ubicaciones sin stock para el modificador activo
            unavailableLocs={
              activeModForAvailability
                ? modAvailability[activeModForAvailability.id] || new Set<string>()
                : new Set<string>()
            }
            // Guardar en estado local del modal padre
            setUnavailableLocs={(next) => {
              if (!activeModForAvailability) return;
              setModAvailability((prev) => ({
                ...prev,
                [activeModForAvailability.id]: next,
              }));
            }}
          />

          <div className="h-2 w-full bg-gray-200"></div>

          {/* Modifiers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="">
                <h2 className="font-semibold text-xl">
                  Lista de Modificadores
                </h2>
              </div>

              <Button variant="outline" size="sm" onClick={pushBlankModifier} title="Agregar una nueva opción/modificador">
                <Plus className="w-4 h-4 mr-2" /> Agregar Modificador
              </Button>
            </div>

            <div className="rounded-md border overflow-hidden">

              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-[120px]">Precio</TableHead>
                      <TableHead className="w-[200px]">Visibilidad</TableHead>
                      <TableHead className="w-[160px]">Disponibilidad</TableHead>
                      <TableHead className="w-[200px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext items={modifiers.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                    <TableBody>
                      {modifiers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <div className="py-8 text-center text-sm text-muted-foreground">No hay modificadores</div>
                          </TableCell>
                        </TableRow>
                      )}

                      {modifiers.map((m, idx) => {
                        const unavailableLocs = modAvailability[m.id] || new Set<string>();
                        const unavailableCount = unavailableLocs.size;

                        return (
                          <SortableRow key={m.id} id={m.id}>
                            {(dragListenersFromSortable: any) => (
                              <ModifierRow
                                m={m}
                                onChange={(next) =>
                                  setModifiers((prev) =>
                                    prev.map((mm, i) => (i === idx ? { ...mm, ...next } : mm))
                                  )
                                }
                                onDelete={() =>
                                  setModifiers((prev) => prev.filter((_, i) => i !== idx))
                                }
                                onUpload={(file) => uploadModifierImage(idx, file)}
                                unavailableCount={unavailableCount}
                                openAvailability={() => {
                                  setActiveModForAvailability(m);
                                  setOpenModAvailability(true);
                                }}
                                dragListeners={dragListenersFromSortable}
                              />
                            )}
                          </SortableRow>
                        );
                      })}
                    </TableBody>
                  </SortableContext>
                </Table>

              </DndContext>
            </div>
          </div>

          <div className="h-2 w-full bg-gray-200">

          </div>
          <div className="w-full">
            <div className="mb-4">
              <h2 className="font-semibold text-xl">Reglas de selección</h2>
              <p className="text-sm text-muted-foreground">
                Estas reglas serán las predeterminadas para el conjunto. Para cambiarlas en un producto específico, añade el conjunto al producto y personaliza allí.
              </p>
            </div>

            <div className="rounded-md border p-3 space-y-4">
              {/* Fila con label a la izquierda y switch a la derecha */}
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Requerir una selección</div>
                  <div className="text-xs text-muted-foreground">
                    Obliga a elegir al menos una opción del conjunto.
                  </div>
                </div>
                <Switch checked={requireSel} onCheckedChange={setRequireSel} />
              </div>

              {requireSel && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    ¿Cómo quieres modificar la selección mínima y máxima?
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1" title="Mínimo de opciones a seleccionar">
                      <FieldLabel>Mínimo</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        value={minSel}
                        onChange={(e) => setMinSel(parseInt(e.target.value || "0"))}
                      />
                    </div>
                    <div className="space-y-1" title="Máximo de opciones (vacío = sin límite)">
                      <FieldLabel>Máximo (vacío = ∞)</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        value={maxSel ?? ""}
                        onChange={(e) => setMaxSel(e.target.value === "" ? "" : parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        <DialogFooter className="mt-5 w-full m-auto max-w-4xl px-5 ">
          <Button variant="outline" onClick={onClose} disabled={saving} title="Cerrar sin guardar">
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={persist} disabled={saving} title="Guardar conjunto y modificadores">
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

function ModifierAvailabilityModal({
  open,
  onClose,
  modifier,
  locations,
  unavailableLocs,
  setUnavailableLocs,
}: {
  open: boolean;
  onClose: () => void;
  modifier: Modifier | null;
  locations: Location[];
  unavailableLocs: Set<string>;
  setUnavailableLocs: (next: Set<string>) => void;
}) {
  const [query, setQuery] = useState("");
  const [tmp, setTmp] = useState<Set<string>>(new Set(unavailableLocs));

  useEffect(() => {
    if (open) setTmp(new Set(unavailableLocs));
  }, [open, unavailableLocs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) => l.name.toLowerCase().includes(q));
  }, [query, locations]);

  function toggle(id: string) {
    setTmp((prev) => {
      const next = new Set(prev);
      // switch ON = Disponible -> lo quitamos de "unavailable"
      if (next.has(id)) next.delete(id);
      else next.add(id); // switch OFF = Sold out -> lo añadimos a unavailable
      return next;
    });
  }

  function onSave() {
    setUnavailableLocs(new Set(tmp));
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-2xl gap-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Disponibilidad por ubicación {modifier ? `— ${modifier.name || ""}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <p className="text-sm text-muted-foreground">
            Cambia la disponibilidad en cada local. <b>Switch activado = Disponible</b>. Switch apagado = <b>Sold out</b>.
          </p>

          <Input
            placeholder="Buscar ubicaciones"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="rounded-md border max-h-[340px] overflow-auto divide-y">
            {filtered.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Sin resultados</div>
            )}
            {filtered.map((loc) => {
              const isSoldOut = tmp.has(loc.id);
              return (
                <label
                  key={loc.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                  title={loc.name}
                >
                  <span className="truncate">{loc.name}</span>
                  <Switch
                    checked={!isSoldOut}
                    onCheckedChange={() => toggle(loc.id)}
                  />
                </label>
              );
            })}
          </div>
        </div>

        <DialogFooter className="p-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Página principal ----------
export default function ModifiersPage() {
  const { org } = useEnvironment();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const organizationId = org?.id;

  const [rows, setRows] = useState<ModifierSetWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{ activo: boolean; inactivo: boolean }>({ activo: true, inactivo: false });

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ModifierSet | null>(null);
  const [confirmSet, setConfirmSet] = useState<ModifierSet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  async function fetchData() {
    if (!organizationId) return;
    try {
      setLoading(true);
      // 1) traer sets
      const { data: sets, error } = await supabase
        .from("modifier_sets")
        .select(
          "id, organization_id, name, display_name, is_active, hide_online, require_selection, min_selections, max_selections, created_at, updated_at"
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const list: ModifierSetWithCounts[] = (sets ?? []) as any;

      // 2) fetch modifiers para contar por set (una sola consulta y contamos en cliente)
      const { data: mods, error: e2 } = await supabase
        .from("modifiers")
        .select("id, modifier_set_id")
        .eq("organization_id", organizationId);
      if (e2) throw e2;
      const mapCount = new Map<string, number>();
      (mods ?? []).forEach((m: any) => {
        mapCount.set(m.modifier_set_id, (mapCount.get(m.modifier_set_id) || 0) + 1);
      });

      setRows(list.map((s) => ({ ...s, modifiers_count: mapCount.get(s.id) || 0 })));
    } catch (err: any) {
      toast.error(err?.message || "Error cargando conjuntos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || (r.display_name ?? "").toLowerCase().includes(q)
      );
    if (status.activo && !status.inactivo) list = list.filter((r) => r.is_active);
    if (!status.activo && status.inactivo) list = list.filter((r) => !r.is_active);
    return list;
  }, [rows, query, status]);

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };
  const openEdit = (s: ModifierSet) => {
    setEditing(s);
    setOpenModal(true);
  };
  const onSaved = () => {
    setOpenModal(false);
    fetchData();
  };

  async function deleteSet(s: ModifierSet) {
    if (!organizationId) return;
    try {
      setIsDeleting(true);
      // Cascade en FK borra modifiers
      const { error } = await supabase
        .from("modifier_sets")
        .delete()
        .eq("id", s.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
      toast.success("Conjunto eliminado");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "No se pudo eliminar");
    } finally {
      setIsDeleting(false);
      setConfirmSet(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Modificadores</h1>
          <p className="text-sm text-muted-foreground">
            Crea y administra conjuntos de modificadores y sus opciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} title="Recargar">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </Button>
          <Button onClick={openCreate} size="lg" className="px-3" title="Crear conjunto">
            <Plus className="w-4 h-4 mr-2" /> Nuevo conjunto
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
            onChange={(e) => setQuery(e.target.value)}
            title="Filtra por nombre o display name"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px] justify-between" title="Filtrar por estado">
                Estado
                <span className="ml-2 text-xs text-muted-foreground">
                  {status.activo && !status.inactivo && "Activo"}
                  {!status.activo && status.inactivo && "Inactivo"}
                  {((status.activo && status.inactivo) || (!status.activo && !status.inactivo)) && "Todos"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuCheckboxItem
                checked={status.activo}
                onCheckedChange={(v) => setStatus((s) => ({ ...s, activo: !!v }))}
              >
                Activo
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={status.inactivo}
                onCheckedChange={(v) => setStatus((s) => ({ ...s, inactivo: !!v }))}
              >
                Inactivo
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Display</TableHead>
              <TableHead className="w-[150px]">Reglas</TableHead>
              <TableHead className="w-[110px]">Visibilidad</TableHead>
              <TableHead className="w-[120px] text-center"># Mods</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando…
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="py-8 text-center text-sm text-muted-foreground">No hay conjuntos</div>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium truncate max-w-[240px]" title={s.name}>
                      {s.name}
                    </div>
                    <div className="md:hidden text-xs text-muted-foreground truncate max-w-[240px]">
                      {s.display_name ?? ""}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[360px]">
                    {s.display_name ?? ""}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>{s.require_selection ? "Requiere selección" : "Opcional"}</div>
                    </div>
                  </TableCell>
                  <TableCell className=" ">
                    <div className="flex items-center gap-2 text-xs">
                      {s.is_active ? (
                        <Badge variant="secondary">Activo</Badge>
                      ) : (
                        <Badge variant="outline">Inactivo</Badge>
                      )}
                      {s.hide_online ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <EyeOff className="w-3 h-3" /> Oculto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-3 h-3" /> Visible
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-center">{s.modifiers_count ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="p-0 h-auto" onClick={() => openEdit(s)} title="Editar">
                        <div className="p-2 px-3">
                          <Pencil className="w-4 h-5" />
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Eliminar"
                        onClick={() => setConfirmSet(s)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
          <TableCaption className="pb-2">{filtered.length} conjuntos</TableCaption>
        </Table>
      </div>

      {/* Confirmación eliminar */}
      <AlertDialog open={!!confirmSet} onOpenChange={(o) => !o && setConfirmSet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conjunto</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmSet ? (
                <>
                  Vas a eliminar <b>{confirmSet.name}</b>. Esto elimina también sus modificadores. Esta acción no se puede deshacer.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmSet(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmSet && deleteSet(confirmSet)}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ModifierSetModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        setToEdit={editing}
        onSaved={onSaved}
        organizationId={organizationId}
      />
    </div>
  );
}
