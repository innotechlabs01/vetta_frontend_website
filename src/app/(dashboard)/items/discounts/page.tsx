// app/(dashboard)/catalog/discounts/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, RefreshCcw, Loader2, Trash2, Eye, EyeOff, ChevronDown, Calendar, MapPin, Sparkles, Copy } from "lucide-react";
import ItemPickerModal, { MiniRef as MiniItemRef } from "./itemPickerModal";
import CategoryPickerModal, { MiniRef as MiniCatRef } from "./CategoryPickerModal";
import SelectedChips from "./SelectedChips";

// Reutiliza el mismo LocationsModal que ya tienes:
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

function genCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Helpers para fecha/hora “bonita” (es-CO)
function parseLocal(date: string, time: string) {
  // Asegura HH:mm
  const hhmm = (time || "00:00").slice(0, 5);
  return new Date(`${date}T${hhmm}:00`);
}

const dtfDate = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dtfTime = new Intl.DateTimeFormat("es-CO", { timeStyle: "short" });

function fmtDate(d: Date) {
  // en es-CO algunas abreviaturas traen punto: "ago."
  return dtfDate.format(d).replace(/\./g, "");
}
function fmtTime(d: Date) {
  return dtfTime.format(d);
}

function prettyRange(r?: {
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  start_enabled?: boolean | null;
  end_enabled?: boolean | null;
}) {
  if (!r) return "";

  // Back-compat: si vienen undefined, trátalos como true
  const startOn = r.start_enabled ?? true;
  const endOn = r.end_enabled ?? true;

  // Helpers seguros
  const hasStart = startOn && !!r.start_date;
  const hasEnd   = endOn   && !!r.end_date;

  const s = hasStart ? parseLocal(r.start_date as string, (r.start_time || "00:00")) : null;
  const e = hasEnd   ? parseLocal(r.end_date   as string, (r.end_time || "23:59")) : null;

  // Si ninguna está habilitada/no hay fechas válidas
  if (!hasStart && !hasEnd) return "";

  // Flags de horas “completas”
  const startIsMidnight = (r.start_time || "00:00").slice(0,5) === "00:00";
  const endIsEOD        = (r.end_time || "23:59").slice(0,5) === "23:59";

  // Solo inicio
  if (hasStart && !hasEnd && s) {
    return startIsMidnight ? `Desde ${fmtDate(s)}` : `Desde ${fmtDate(s)}, ${fmtTime(s)}`;
  }

  // Solo fin
  if (!hasStart && hasEnd && e) {
    return endIsEOD ? `Hasta ${fmtDate(e)}` : `Hasta ${fmtDate(e)}, ${fmtTime(e)}`;
  }

  // Ambos (si alguna fecha falta, cae en las ramas previas)
  if (s && e) {
    const sameDay = (r.start_date === r.end_date);

    if (sameDay) {
      if (startIsMidnight && endIsEOD) {
        return `${fmtDate(s)} (todo el día)`;
      }
      return `${fmtDate(s)}, ${fmtTime(s)}–${fmtTime(e)}`;
    }

    const left  = `${fmtDate(s)}${startIsMidnight ? "" : `, ${fmtTime(s)}`}`;
    const right = `${fmtDate(e)}${endIsEOD ? "" : `, ${fmtTime(e)}`}`;
    return `${left} → ${right}`;
  }

  // Fallback por seguridad
  return "";
}

type Discount = {
  id: string;
  organization_id: string;
  name: string;
  amount_type: "percent" | "fixed";
  amount: number;
  automatic: boolean;
  scope: "all_items" | "items" | "categories";
  minimum_spend: number | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  discount_code: string | null;
};

type DiscountRow = Discount & {
  locations_count?: number;
  items_count?: number;
  categories_count?: number;
  has_weekly?: boolean;
  range?: {
    start_date: string | null;
    start_time: string | null;
    end_date: string | null;
    end_time: string | null;
    start_enabled?: boolean | null;
    end_enabled?: boolean | null;
  } | null;
  scope_summary?: string;
};

function formatHHmm(t?: string) {
  return (t ?? "").slice(0, 5);
}

type Location = { id: string; name: string };

const weekdaysLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function hhmmToInput(v?: string) {
  // espera "HH:MM" y devuelve lo mismo para <input type="time">
  return v ?? "00:00";
}

function nowLocalISODate() {
  const d = new Date(); const y = d.getFullYear(); const m = `${d.getMonth() + 1}`.padStart(2, "0"); const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function nowHHmm() {
  const d = new Date(); const hh = `${d.getHours()}`.padStart(2, "0"); const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}
/** Modal Crear/Editar */
function DiscountModal({
  open, onClose, organizationId, editing, onSaved,
}: {
  open: boolean; onClose: () => void; organizationId?: string; editing?: Discount | null; onSaved: () => void;
}) {
  const supabase = getSupabaseBrowser();
  const isEdit = !!editing?.id;

  // Campos base
  const [name, setName] = useState(editing?.name ?? "");
  const [discountCode, setDiscountCode] = useState<string>(editing?.discount_code ?? ""); // NUEVO
  const [amountType, setAmountType] = useState<"percent" | "fixed">(editing?.amount_type ?? "percent");
  const [amount, setAmount] = useState<number>(editing?.amount ?? 0);
  const [automatic, setAutomatic] = useState<boolean>(editing?.automatic ?? false);
  const [minimumSpend, setMinimumSpend] = useState<number | "">(editing?.minimum_spend ?? "");
  const [isActive, setIsActive] = useState<boolean>(editing?.is_active ?? true);

  // switches internos
  const [useWeeklySchedule, setUseWeeklySchedule] = useState<boolean>(false);
  const [useDateRange, setUseDateRange] = useState<boolean>(false);
  const [startEnabled, setStartEnabled] = useState<boolean>(true); // NUEVO
  const [endEnabled, setEndEnabled] = useState<boolean>(true);     // NUEVO

  // Scope
  const [scope, setScope] = useState<"all_items" | "items" | "categories">(editing?.scope ?? "all_items");
  const [selectedItems, setSelectedItems] = useState<MiniItemRef[]>([]);
  const [selectedCats, setSelectedCats] = useState<MiniCatRef[]>([]);
  const [openItemsModal, setOpenItemsModal] = useState(false);
  const [openCatsModal, setOpenCatsModal] = useState(false);

  // Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState(true);
  const [selectedLocs, setSelectedLocs] = useState<Set<string>>(new Set());
  const [openLocs, setOpenLocs] = useState(false);

  // Weekly schedule
  type DaySlot = { enabled: boolean; start: string; end: string };
  const [week, setWeek] = useState<DaySlot[]>(weekdaysLabels.map(() => ({ enabled: false, start: "00:00", end: "23:59" })));

  // Date range
  const [dateStart, setDateStart] = useState<string>("");
  const [timeStart, setTimeStart] = useState<string>("00:00");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [timeEnd, setTimeEnd] = useState<string>("00:00");

  useEffect(() => {
    if (!open || !organizationId) return;
    (async () => {
      // reset base
      setName(editing?.name ?? "");
      setDiscountCode(editing?.discount_code ?? "");
      setAmountType((editing?.amount_type as any) ?? "percent");
      setAmount(editing?.amount ?? 0);
      setAutomatic(editing?.automatic ?? false);
      setMinimumSpend(editing?.minimum_spend ?? "");
      setIsActive(editing?.is_active ?? true);
      setScope((editing?.scope as any) ?? "all_items");
      setUseWeeklySchedule(false);
      setUseDateRange(false);
      setStartEnabled(true);
      setEndEnabled(true);

      // ubics
      const { data: locs } = await supabase
        .from("locations")
        .select("id,name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      setLocations((locs as Location[]) ?? []);

      if (isEdit && editing?.id) {
        const [locsRes, weekRes, rangeRes, itemsRes, catsRes] = await Promise.all([
          supabase.from("discount_locations").select("location_id").eq("discount_id", editing.id),
          supabase.from("discount_weekly_schedules").select("weekday,start_time,end_time").eq("discount_id", editing.id),
          supabase.from("discount_date_ranges").select("start_date,start_time,end_date,end_time,start_enabled,end_enabled").eq("discount_id", editing.id).maybeSingle(),
          supabase.from("discount_items").select(`id,item_id,product:products ( id, name )`).eq("discount_id", editing.id),
          supabase.from("discount_item_categories").select(`id,category_id,category:product_categories ( id, name )`).eq("discount_id", editing.id),
        ]);

        if (itemsRes.error) console.error("itemsRes.error", itemsRes.error);
        if (catsRes.error) console.error("catsRes.error", catsRes.error);

        setSelectedItems((itemsRes.data ?? []).map((r: any) => ({ id: r.item_id, name: r.product?.name ?? r.item_id })));
        setSelectedCats((catsRes.data ?? []).map((r: any) => ({ id: r.category_id, name: r.category?.name ?? r.category_id })));

        // Locations
        const locIds = new Set<string>((locsRes.data ?? []).map((r: any) => r.location_id));
        if (locIds.size === 0) { setAllLocations(true); setSelectedLocs(new Set()); } else { setAllLocations(false); setSelectedLocs(locIds); }

        // Weekly
        const weekRows = weekRes.data ?? [];
        setUseWeeklySchedule(weekRows.length > 0);
        const wk = weekdaysLabels.map((_, idx) => {
          const r = weekRows.find((x: any) => x.weekday === idx);
          if (!r) return { enabled: false, start: "00:00", end: "23:59" };
          return { enabled: true, start: (r.start_time as string).slice(0, 5), end: (r.end_time as string).slice(0, 5) };
        });
        setWeek(wk);

        // Date range
        if (rangeRes.data) {
          setUseDateRange(true);
          setStartEnabled(rangeRes.data.start_enabled ?? true);
          setEndEnabled(rangeRes.data.end_enabled ?? true);
          setDateStart(rangeRes.data.start_date ?? "");
          setTimeStart((rangeRes.data.start_time ?? "00:00").slice(0, 5));
          setDateEnd(rangeRes.data.end_date ?? "");
          setTimeEnd((rangeRes.data.end_time ?? "00:00").slice(0, 5));
        } else {
          setUseDateRange(false);
          setDateStart(""); setTimeStart("00:00"); setDateEnd(""); setTimeEnd("00:00");
        }
      } else {
        // crear
        setWeek(weekdaysLabels.map(() => ({ enabled: false, start: "00:00", end: "23:59" })));
        setDateStart(""); setTimeStart("00:00"); setDateEnd(""); setTimeEnd("00:00");
        setSelectedItems([]); setSelectedCats([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizationId, editing?.id]);

  // cuando cambia "automático", maneja discountCode disabled/AUTOMATIC
  useEffect(() => {
    if (automatic) {
      setDiscountCode((prev) => prev || "AUTOMATIC");
    } else {
      if (discountCode === "AUTOMATIC") setDiscountCode("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automatic]);

  async function persist() {
    try {
      if (!organizationId) throw new Error("Falta negocio");
      if (!name.trim()) return toast.error("El nombre es obligatorio");
      if (amountType === "percent" && (amount < 0 || amount > 100)) {
        return toast.error("El porcentaje debe estar entre 0 y 100");
      }

      let discountId = editing?.id as string | undefined;

      // upsert discount (incluye discount_code)
      if (isEdit && discountId) {
        const { error } = await supabase
          .from("discounts")
          .update({
            name: name.trim(),
            discount_code: automatic ? "AUTOMATIC" : (discountCode?.trim() || null),
            amount_type: amountType,
            amount: Number(amount) || 0,
            automatic,
            scope,
            minimum_spend: minimumSpend === "" ? null : Number(minimumSpend),
            is_active: isActive,
          })
          .eq("id", discountId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("discounts")
          .insert([{
            organization_id: organizationId,
            name: name.trim(),
            discount_code: automatic ? "AUTOMATIC" : (discountCode?.trim() || null),
            amount_type: amountType,
            amount: Number(amount) || 0,
            automatic,
            scope,
            minimum_spend: minimumSpend === "" ? null : Number(minimumSpend),
            is_active: isActive,
          }])
          .select("id")
          .single();
        if (error) throw error;
        discountId = data?.id;
      }

      if (!discountId) throw new Error("No se pudo obtener el ID del descuento");

      // Locations
      await supabase.from("discount_locations").delete().eq("discount_id", discountId);
      const locIdsToInsert = allLocations ? [] : Array.from(selectedLocs);
      if (locIdsToInsert.length) {
        const payload = locIdsToInsert.map((locId) => ({ organization_id: organizationId, discount_id: discountId!, location_id: locId }));
        const { error } = await supabase.from("discount_locations").insert(payload);
        if (error) throw error;
      }

      // Weekly schedules
      await supabase.from("discount_weekly_schedules").delete().eq("discount_id", discountId);
      if (automatic && useWeeklySchedule) {
        const wkPayload = week
          .map((d, i) => d.enabled ? ({
            organization_id: organizationId,
            discount_id: discountId!,
            weekday: i,
            start_time: d.start + ":00",
            end_time: d.end + ":00",
          }) : null)
          .filter(Boolean) as any[];
        if (wkPayload.length) {
          const { error } = await supabase.from("discount_weekly_schedules").insert(wkPayload);
          if (error) throw error;
        }
      }

      // Date range
      await supabase.from("discount_date_ranges").delete().eq("discount_id", discountId);
      if (automatic && useDateRange) {
        // si tu tabla tiene start_date/end_date NULLABLE + flags:
        const payload: any = {
          organization_id: organizationId,
          discount_id: discountId!,
          start_enabled: startEnabled,
          end_enabled: endEnabled,
          start_date: startEnabled ? (dateStart || nowLocalISODate()) : null,
          start_time: (startEnabled ? (timeStart || "00:00") : "00:00") + ":00",
          end_date: endEnabled ? (dateEnd || (dateStart || nowLocalISODate())) : null,
          end_time: (endEnabled ? (timeEnd || "23:59") : "23:59") + ":00",
        };
        // Si NO hiciste la migración para permitir NULL, quita los null y pon defaults:
        if (payload.start_date === null) payload.start_date = nowLocalISODate();
        if (payload.end_date === null) payload.end_date = payload.start_date;

        const { error } = await supabase.from("discount_date_ranges").insert(payload);
        if (error) throw error;
      }

      // Scope items/categories
      await supabase.from("discount_items").delete().eq("discount_id", discountId);
      await supabase.from("discount_item_categories").delete().eq("discount_id", discountId);

      if (scope === "items" && selectedItems.length) {
        const payload = selectedItems.map(it => ({ organization_id: organizationId, discount_id: discountId!, item_id: it.id }));
        const { error } = await supabase.from("discount_items").insert(payload);
        if (error) throw error;
      }
      if (scope === "categories" && selectedCats.length) {
        const payload = selectedCats.map(ct => ({ organization_id: organizationId, discount_id: discountId!, category_id: ct.id }));
        const { error } = await supabase.from("discount_item_categories").insert(payload);
        if (error) throw error;
      }

      toast.success("Descuento guardado");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="h-screen flex flex-col max-w-screen sm:rounded-none gap-4 pb-10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Editar descuento" : "Nuevo descuento"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mx-auto max-w-3xl min-w-[48rem] mb-5">
          {/* Nombre + Código */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-7 space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: 50% Dsc" />
            </div>
            <div className="md:col-span-5 space-y-2">
              <Label>Código de descuento</Label>

              <div
                className="flex gap-3"
              >

                <Input
                  value={automatic ? "AUTOMATIC" : (discountCode || "")}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  disabled={automatic}
                  placeholder="Ej: VERANO25"
                />
                <Button type="button" variant='secondary'
                  onClick={() => setDiscountCode(genCode())}
                  disabled={automatic}
                  title={automatic ? "Automático: código fijo 'AUTOMATIC'" : "Generar código aleatorio"}>
                  <Sparkles className="w-4 h-4 mr-1" /> Generar
                </Button>

              </div>
            </div>
          </div>

          {/* Monto */}
          <div className="flex gap-3">
            <div className="space-y-2 w-full">
              <Label>Tipo de monto</Label>
              <select className="w-full border rounded-md px-2 py-3 bg-background"
                value={amountType} onChange={(e) => setAmountType(e.target.value as any)}>
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto ($)</option>
              </select>
            </div>
            <div className="space-y-2 w-full">
              <Label>{amountType === "percent" ? "Porcentaje (%)" : "Monto ($)"}</Label>
              <Input type="number" step="0.01" value={amount}
                onChange={(e) => setAmount(Number(e.target.value || 0))}
                placeholder={amountType === "percent" ? "10" : "5.00"} />
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <Label>Sucursales</Label>
            <div className="rounded-md border p-3 flex items-center justify-between">
              <div className="text-sm">
                {allLocations ? (
                  <>
                    <div className="font-medium flex items-center gap-2">Todas las sucursales</div>
                    <div className="text-xs text-muted-foreground">El descuento aplica en todos los locales</div>
                  </>
                ) : (
                  <>
                    <div className="font-medium">{selectedLocs.size} seleccionadas</div>
                    <div className="text-xs text-muted-foreground">Limitado a las ubicaciones seleccionadas</div>
                  </>
                )}
              </div>
              <Button variant="ghost" onClick={() => setOpenLocs(true)}>
                Editar ubicaciones <ChevronDown className="ml-1 w-4 h-4" />
              </Button>
            </div>

            <LocationsModal
              open={openLocs}
              onClose={() => setOpenLocs(false)}
              locations={locations}
              allLocations={allLocations}
              setAllLocations={setAllLocations}
              selectedLocs={selectedLocs}
              setSelectedLocs={setSelectedLocs}
            />
          </div>

          {/* Automático */}
          <div className="mt-5">
            <h2 className="font-semibold text-lg mb-3">Descuento Automático</h2>
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Reglas de descuento</div>
                  <div className="text-xs text-muted-foreground">Aplica automáticamente según horarios, alcance y/o rango de fechas.</div>
                </div>
                <Switch checked={automatic} onCheckedChange={setAutomatic} />
              </div>
            </div>

            {automatic && (
              <>
                {/* Scope */}
                <div className="space-y-2 py-4">
                  <Label>Aplicar a</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button variant={scope === 'all_items' ? 'selected' : 'outline'} onClick={() => setScope('all_items')}>Todos los ítems</Button>
                    <Button variant={scope === 'items' ? 'selected' : 'outline'} onClick={() => setScope('items')}>Ítems individuales</Button>
                    <Button variant={scope === 'categories' ? 'selected' : 'outline'} onClick={() => setScope('categories')}>Categorías</Button>
                  </div>

                  {scope === 'items' && (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-sm font-medium">Ítems seleccionados</div>
                      <SelectedChips items={selectedItems} onRemove={(id) => setSelectedItems(prev => prev.filter(x => x.id !== id))} />
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setOpenItemsModal(true)}>Agregar ítems</Button>
                    </div>
                  )}

                  {scope === 'categories' && (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-sm font-medium">Categorías seleccionadas</div>
                      <SelectedChips items={selectedCats} onRemove={(id) => setSelectedCats(prev => prev.filter(x => x.id !== id))} />
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setOpenCatsModal(true)}>Agregar categorías</Button>
                    </div>
                  )}
                </div>

                {/* Calendario semanal */}
                <div className="rounded-md mb-5 space-y-3">
                  <h2 className="font-semibold text-lg mt-2">Calendario de descuento</h2>
                  <div className="border overflow-hidden rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">Programar días habilitados</div>
                        <div className="text-xs text-muted-foreground">Define días y franjas horarias en las que se activa el descuento.</div>
                      </div>
                      <Switch checked={useWeeklySchedule} onCheckedChange={(v) => {
                        setUseWeeklySchedule(v);
                        if (!v) setWeek(weekdaysLabels.map(() => ({ enabled: false, start: "00:00", end: "23:59" })));
                      }} />
                    </div>

                    {useWeeklySchedule && (
                      <div className="mt-4">
                        {weekdaysLabels.map((d, idx) => (
                          <div key={idx} className="border-t py-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium">{d}</div>
                              <Switch
                                checked={week[idx].enabled}
                                onCheckedChange={(v) => {
                                  const next = [...week]; next[idx].enabled = v; setWeek(next);
                                }}
                              />
                            </div>
                            {week[idx].enabled && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Inicio</Label>
                                  <Input type="time" value={hhmmToInput(week[idx].start)}
                                    onChange={(e) => { const next = [...week]; next[idx].start = e.target.value; setWeek(next); }} />
                                </div>
                                <div>
                                  <Label className="text-xs">Fin</Label>
                                  <Input type="time" value={hhmmToInput(week[idx].end)}
                                    onChange={(e) => { const next = [...week]; next[idx].end = e.target.value; setWeek(next); }} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rango de fechas */}
                <div className="rounded-md space-y-3">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">Rango de fechas</div>
                        <div className="text-xs text-muted-foreground">Limita el descuento a un periodo específico (campaña).</div>
                      </div>
                      <Switch checked={useDateRange} onCheckedChange={(v) => {
                        setUseDateRange(v);
                        if (!v) { setDateStart(""); setTimeStart("00:00"); setDateEnd(""); setTimeEnd("00:00"); setStartEnabled(true); setEndEnabled(true); }
                      }} />
                    </div>

                    {useDateRange && (
                      <div className="flex flex-col gap-3 mt-5">
                        <div className="flex gap-4 items-end">
                          <div className="flex w-full items-center gap-3">
                            <div className="flex items-center gap-2 ml-2">
                              <Switch checked={startEnabled} onCheckedChange={(v) => {
                                setStartEnabled(v);
                                if (v && !dateStart) { setDateStart(nowLocalISODate()); setTimeStart(nowHHmm()); }
                                if (!v) { setDateStart(""); setTimeStart("00:00"); }
                              }} />
                            </div>
                            <div className="min-w-[100px]">
                              <Label>Fecha inicio</Label>
                            </div>
                            <Input className="justify-end" type="date" value={dateStart} disabled={!startEnabled}
                              onChange={(e) => setDateStart(e.target.value)} />
                            <Input className="max-w-[120px]" type="time" value={timeStart} disabled={!startEnabled}
                              onChange={(e) => setTimeStart(e.target.value)} />

                          </div>
                        </div>

                        <div className="flex gap-4 items-end">
                          <div className="flex w-full items-center gap-3">
                            <div className="flex items-center gap-2 ml-2">
                              <Switch checked={endEnabled} onCheckedChange={(v) => {
                                setEndEnabled(v);
                                if (v && !dateEnd) { setDateEnd(dateStart || nowLocalISODate()); }
                                if (!v) { setDateEnd(""); setTimeEnd("23:59"); }
                              }} />
                            </div>
                            <div className="min-w-[100px]">
                              <Label>Fecha fin</Label>
                            </div>
                            <Input className="justify-end" type="date" value={dateEnd} disabled={!endEnabled}
                              onChange={(e) => setDateEnd(e.target.value)} />
                            <Input className="max-w-[120px]" type="time" value={timeEnd} disabled={!endEnabled}
                              onChange={(e) => setTimeEnd(e.target.value)} />

                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mínimo de compra */}
                <div className="space-y-2 pt-6">
                  <h2 className="font-semibold text-lg">Mínimo de compra</h2>
                  <Label>Monto $ (opcional)</Label>
                  <Input type="number" step="0.01" value={minimumSpend ?? ""}
                    onChange={(e) => setMinimumSpend(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Ej: 50.00" />
                </div>
              </>
            )}
          </div>

          {/* Estado */}
          <div className="mt-5">
            <h2 className="font-semibold text-lg mb-3">Estado</h2>
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Activo</div>
                  <div className="text-xs text-muted-foreground">Controla si el descuento está disponible</div>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-5 w-full m-auto max-w-3xl">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={persist}>{isEdit ? "Guardar cambios" : "Crear descuento"}</Button>
        </DialogFooter>

        {/* Pickers */}
        <ItemPickerModal
          open={openItemsModal}
          onClose={() => setOpenItemsModal(false)}
          organizationId={organizationId!}
          selected={selectedItems}
          setSelected={setSelectedItems}
          title="Seleccionar ítems"
        />
        <CategoryPickerModal
          open={openCatsModal}
          onClose={() => setOpenCatsModal(false)}
          organizationId={organizationId!}
          selected={selectedCats}
          setSelected={setSelectedCats}
          title="Seleccionar categorías"
        />
      </DialogContent>
    </Dialog>
  );
}

export default function DiscountsPage() {
  const { org } = useEnvironment();
  const supabase = getSupabaseBrowser();
  const organizationId = org?.id;

  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<{ activo: boolean; inactivo: boolean }>({ activo: true, inactivo: false });

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [deleting, setDeleting] = useState<Discount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function fetchData() {
    if (!organizationId) return;
    try {
      setLoading(true);

      // 1) Descuentos
      const { data: list, error } = await supabase
        .from("discounts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (list ?? []).map((d: any) => d.id);
      // Si no hay ids, evitamos .in() vacíos
      if (ids.length === 0) {
        setRows([]);
        return;
      }

      // 2) Contar ubicaciones
      const { data: locs } = await supabase
        .from("discount_locations")
        .select("discount_id")
        .in("discount_id", ids);

      const mapLocCount = new Map<string, number>();
      (locs ?? []).forEach((x: any) => {
        mapLocCount.set(x.discount_id, (mapLocCount.get(x.discount_id) || 0) + 1);
      });

      // 3) Contar items
      const { data: di } = await supabase
        .from("discount_items")
        .select("discount_id")
        .in("discount_id", ids);

      const itemsCount = new Map<string, number>();
      (di ?? []).forEach((r: any) => itemsCount.set(r.discount_id, (itemsCount.get(r.discount_id) || 0) + 1));

      // 4) Contar categorías
      const { data: dc } = await supabase
        .from("discount_item_categories")
        .select("discount_id")
        .in("discount_id", ids);

      const catsCount = new Map<string, number>();
      (dc ?? []).forEach((r: any) => catsCount.set(r.discount_id, (catsCount.get(r.discount_id) || 0) + 1));

      // 5) Saber si tiene calendario semanal
      const { data: wkAll } = await supabase
        .from("discount_weekly_schedules")
        .select("discount_id")
        .in("discount_id", ids);

      const hasWeekly = new Set((wkAll ?? []).map((r: any) => r.discount_id));

      // 6) Rango de fechas
      const { data: ranges } = await supabase
  .from("discount_date_ranges")
  .select("discount_id,start_date,start_time,end_date,end_time,start_enabled,end_enabled")
  .in("discount_id", ids);

      const rangeById = new Map<string, any>();
      (ranges ?? []).forEach((r: any) => rangeById.set(r.discount_id, r));

      // 7) Construir filas enriquecidas y scope_summary
      const enriched: DiscountRow[] = (list ?? []).map((d: any) => {
        const ic = itemsCount.get(d.id) || 0;
        const cc = catsCount.get(d.id) || 0;

        let scope_summary = "Todos los ítems";
        if (d.scope === "items") scope_summary = `${ic} ítem(s)`;
        if (d.scope === "categories") scope_summary = `${cc} categoría(s)`;

        return {
          ...d,
          locations_count: mapLocCount.get(d.id) || 0,
          items_count: ic,
          categories_count: cc,
          has_weekly: hasWeekly.has(d.id),
          range: rangeById.get(d.id) ?? null,
          scope_summary,
        };
      });

      setRows(enriched);
    } catch (err: any) {
      toast.error(err?.message || "Error cargando descuentos");
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
    if (q) list = list.filter(r => r.name.toLowerCase().includes(q));
    if (status.activo && !status.inactivo) list = list.filter(r => r.is_active);
    if (!status.activo && status.inactivo) list = list.filter(r => !r.is_active);
    return list;
  }, [rows, query, status]);

  const openCreate = () => { setEditing(null); setOpenModal(true); };
  const openEdit = (d: Discount) => { setEditing(d); setOpenModal(true); };
  const onSaved = () => { setOpenModal(false); fetchData(); };

  async function deleteDiscount(d: Discount) {
    if (!organizationId) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("discounts")
        .delete()
        .eq("id", d.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
      toast.success("Descuento eliminado");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "No se pudo eliminar");
    } finally {
      setIsDeleting(false);
      setDeleting(null);
    }
  }

  function amountBadge(d: DiscountRow) {
    if (d.amount_type === "percent") return `${d.amount}%`;
    return `$${Number(d.amount).toFixed(2)}`;
  }


  function optionsSummary(d: DiscountRow) {
    const parts: string[] = [];

    if (d.scope_summary) parts.push(d.scope_summary);

    if (d.automatic && d.has_weekly) {
      parts.push("Con calendario semanal");
    }

    if (d.automatic && d.range) {
      parts.push(prettyRange(d.range));
    }

    if (parts.length === 0) return "Sin reglas adicionales";
    return parts.join(" · ");
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Descuentos</h1>
          <p className="text-sm text-muted-foreground">Crea y administra tus reglas de descuentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} title="Recargar">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </Button>
          <Button onClick={openCreate} size="lg" className="px-3" title="Crear descuento">
            <Plus className="w-4 h-4 mr-2" /> Nuevo descuento
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="md:flex-1 max-w-xl">
          <Label className="sr-only">Buscar</Label>
          <Input
            className="rounded-xl"
            placeholder="Buscar por nombre"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            title="Filtra por nombre"
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
              <TableHead>Nombre del descuento</TableHead>
              <TableHead>Estado</TableHead>

              <TableHead className="w-[140px]">Ubicaciones</TableHead>
              <TableHead>Opciones</TableHead>
              <TableHead className="w-[100px] text-right">Monto</TableHead>
              <TableHead className="w-[140px]"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando…
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="py-8 text-center text-sm text-muted-foreground">No hay descuentos</div>
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.map(d => (
              <TableRow key={d.id}>
                {/* Nombre + badges compactos */}

                <TableCell className="align-center">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate" title={d.name}>
                        {d.automatic ? d.name : d.discount_code || d.name}
                      </span>
                      {!d.automatic && d.discount_code && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(d.discount_code ?? '');
                            toast.success("Código copiado");
                          }}
                          title="Copiar código"
                          className="px-2 py-1"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      
                    </div>
                    
                  </div>
                </TableCell>

                <TableCell>
                  {d.is_active ? (
                        <Badge variant="secondary" className="shrink-0">Activo</Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0">Inactivo</Badge>
                      )}
                </TableCell>

                {/* Ubicaciones */}
                <TableCell className="align-center">
                  {d.locations_count === 0 ? "Todas" : `${d.locations_count} sucursal(es)`}
                </TableCell>

                {/* Opciones reales */}
                <TableCell title={optionsSummary(d)} className="align-center text-sm text-muted-foreground max-w-[200px] truncate">
                  {optionsSummary(d)}
                </TableCell>

                {/* Monto */}
                <TableCell className="align-center text-right font-medium">
                  {amountBadge(d)}
                </TableCell>

                {/* Acciones */}
                <TableCell className="align-center">
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

          <TableCaption className="pb-2">{filtered.length} descuentos</TableCaption>
        </Table>
      </div>

      {/* Modal Crear/Editar (ya lo tienes implementado en otro archivo/arriba) */}
      <DiscountModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        organizationId={organizationId}
        editing={editing}
        onSaved={onSaved}
      />

      {/* Confirm simple */}
      {deleting && (
        <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
          <DialogContent className="gap-0">
            <DialogHeader>
              <DialogTitle>Eliminar descuento</DialogTitle>
            </DialogHeader>
            <div className="text-sm px-6 mb-6">Vas a eliminar <b>{deleting.name}</b>. Esta acción no se puede deshacer.</div>
            <DialogFooter className="px-6 pb-6">
              <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button className="bg-destructive hover:bg-destructive/90" onClick={() => deleteDiscount(deleting)}>
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}