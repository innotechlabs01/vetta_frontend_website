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
import { Plus, Pencil, RefreshCcw, Loader2, Trash2, Eye, EyeOff, ChevronDown, Calendar, MapPin } from "lucide-react";

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
};

type DiscountRow = Discount & {
  locations_count?: number;
  scope_summary?: string;
};

type Location = { id: string; name: string };

const weekdaysLabels = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

function hhmmToInput(v?: string) {
  // espera "HH:MM" y devuelve lo mismo para <input type="time">
  return v ?? "00:00";
}

function buildScopeSummary(d: DiscountRow, itemsCount?: number, catsCount?: number) {
  if (d.scope === "all_items") return "Todos los ítems";
  if (d.scope === "items") return `${itemsCount ?? 0} ítem(s)`;
  return `${catsCount ?? 0} categoría(s)`;
}

/** Modal Crear/Editar */
function DiscountModal({
  open,
  onClose,
  organizationId,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
  editing?: Discount | null;
  onSaved: () => void;
}) {
  const supabase = getSupabaseBrowser();
  const isEdit = !!editing?.id;

  // Campos base
  const [name, setName] = useState(editing?.name ?? "");
  const [amountType, setAmountType] = useState<"percent"|"fixed">(editing?.amount_type ?? "percent");
  const [amount, setAmount] = useState<number>(editing?.amount ?? 0);
  const [automatic, setAutomatic] = useState<boolean>(editing?.automatic ?? false);
  const [minimumSpend, setMinimumSpend] = useState<number | "">(editing?.minimum_spend ?? "");
  const [isActive, setIsActive] = useState<boolean>(editing?.is_active ?? true);

  // Scope
  const [scope, setScope] = useState<"all_items"|"items"|"categories">(editing?.scope ?? "all_items");
  const [selectedItems, setSelectedItems] = useState<{id:string; name:string}[]>([]);
  const [selectedCats, setSelectedCats] = useState<{id:string; name:string}[]>([]);

  // Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState(true);
  const [selectedLocs, setSelectedLocs] = useState<Set<string>>(new Set());
  const [openLocs, setOpenLocs] = useState(false);

  // Schedule semanal (array de 7 días opcionalmente con rango)
  type DaySlot = { enabled: boolean; start: string; end: string };
  const [week, setWeek] = useState<DaySlot[]>(
    weekdaysLabels.map(() => ({ enabled: false, start: "00:00", end: "23:59" }))
  );

  // Date range
  const [dateStart, setDateStart] = useState<string>("");          // YYYY-MM-DD
  const [timeStart, setTimeStart] = useState<string>("00:00");     // HH:MM
  const [dateEnd, setDateEnd] = useState<string>("");              // YYYY-MM-DD
  const [timeEnd, setTimeEnd] = useState<string>("00:00");         // HH:MM

  // Carga inicial
  useEffect(() => {
    if (!open || !organizationId) return;
    (async () => {
      // reset base
      setName(editing?.name ?? "");
      setAmountType((editing?.amount_type as any) ?? "percent");
      setAmount(editing?.amount ?? 0);
      setAutomatic(editing?.automatic ?? false);
      setMinimumSpend(editing?.minimum_spend ?? "");
      setIsActive(editing?.is_active ?? true);
      setScope((editing?.scope as any) ?? "all_items");

      // ubics
      const { data: locs } = await supabase
        .from("locations")
        .select("id,name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      setLocations((locs as Location[]) ?? []);

      // Edición: cargar todo lo relacionado
      if (isEdit && editing?.id) {
        const [locsRes, weekRes, rangeRes, itemsRes, catsRes] = await Promise.all([
          supabase.from("discount_locations").select("location_id").eq("discount_id", editing.id),
          supabase.from("discount_weekly_schedules").select("weekday,start_time,end_time").eq("discount_id", editing.id),
          supabase.from("discount_date_ranges").select("start_date,start_time,end_date,end_time").eq("discount_id", editing.id).maybeSingle(),
          supabase.from("discount_items").select("item_id, /* join name si la tienes */").eq("discount_id", editing.id),
          supabase.from("discount_item_categories").select("category_id").eq("discount_id", editing.id),
        ]);

        // Locations
        const locIds = new Set<string>((locsRes.data ?? []).map((r:any)=>r.location_id));
        if (locIds.size === 0) { setAllLocations(true); setSelectedLocs(new Set()); }
        else { setAllLocations(false); setSelectedLocs(locIds); }

        // Semana
        const wk = weekdaysLabels.map((_, idx) => {
          const r = (weekRes.data ?? []).find((x:any)=>x.weekday===idx);
          if (!r) return { enabled:false, start:"00:00", end:"23:59" };
          return { enabled:true, start: (r.start_time as string).slice(0,5), end: (r.end_time as string).slice(0,5) };
        });
        setWeek(wk);

        // Rango fecha
        if (rangeRes.data) {
          setDateStart(rangeRes.data.start_date ?? "");
          setTimeStart((rangeRes.data.start_time ?? "00:00").slice(0,5));
          setDateEnd(rangeRes.data.end_date ?? "");
          setTimeEnd((rangeRes.data.end_time ?? "00:00").slice(0,5));
        } else {
          setDateStart(""); setTimeStart("00:00"); setDateEnd(""); setTimeEnd("00:00");
        }

        // Scope picks (si quieres nombres, haz JOIN en tus vistas o vuelca luego)
        setSelectedItems((itemsRes.data ?? []).map((r:any)=>({ id:r.item_id, name: r.item_id })));
        setSelectedCats((catsRes.data ?? []).map((r:any)=>({ id:r.category_id, name: r.category_id })));
      } else {
        // Modo crear
        setAllLocations(true);
        setSelectedLocs(new Set());
        setWeek(weekdaysLabels.map(()=>({enabled:false,start:"00:00", end:"23:59"})));
        setDateStart(""); setTimeStart("00:00"); setDateEnd(""); setTimeEnd("00:00");
        setSelectedItems([]); setSelectedCats([]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizationId, editing?.id]);

  async function persist() {
    try {
      if (!organizationId) throw new Error("Falta negocio");
      if (!name.trim()) return toast.error("El nombre es obligatorio");
      if (amountType === "percent" && (amount < 0 || amount > 100)) {
        return toast.error("El porcentaje debe estar entre 0 y 100");
      }

      let discountId = editing?.id as string | undefined;

      // upsert discount
      if (isEdit && discountId) {
        const { error } = await supabase
          .from("discounts")
          .update({
            name: name.trim(),
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

      // Locations: borrar e insertar
      await supabase.from("discount_locations")
        .delete()
        .eq("discount_id", discountId);

      const locIdsToInsert = allLocations ? [] : Array.from(selectedLocs);
      if (locIdsToInsert.length) {
        const payload = locIdsToInsert.map((locId)=>({
          organization_id: organizationId,
          discount_id: discountId!,
          location_id: locId,
        }));
        const { error } = await supabase.from("discount_locations").insert(payload);
        if (error) throw error;
      }

      // Weekly schedules: borrar e insertar (solo si automatic=true)
      await supabase.from("discount_weekly_schedules")
        .delete()
        .eq("discount_id", discountId);

      if (automatic) {
        const wkPayload = week
          .map((d, i)=> d.enabled ? ({
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

      // Date range: borrar e insertar (si automatic=true y hay fechas)
      await supabase.from("discount_date_ranges").delete().eq("discount_id", discountId);
      if (automatic && dateStart) {
        const payload = {
          organization_id: organizationId,
          discount_id: discountId!,
          start_date: dateStart,
          start_time: (timeStart || "00:00") + ":00",
          end_date: dateEnd || dateStart,
          end_time: (timeEnd || "23:59") + ":00",
        };
        const { error } = await supabase.from("discount_date_ranges").insert(payload);
        if (error) throw error;
      }

      // Scope items/categories
      await supabase.from("discount_items").delete().eq("discount_id", discountId);
      await supabase.from("discount_item_categories").delete().eq("discount_id", discountId);

      if (scope === "items" && selectedItems.length) {
        const payload = selectedItems.map(it => ({
          organization_id: organizationId,
          discount_id: discountId!,
          item_id: it.id,
        }));
        const { error } = await supabase.from("discount_items").insert(payload);
        if (error) throw error;
      }
      if (scope === "categories" && selectedCats.length) {
        const payload = selectedCats.map(ct => ({
          organization_id: organizationId,
          discount_id: discountId!,
          category_id: ct.id,
        }));
        const { error } = await supabase.from("discount_item_categories").insert(payload);
        if (error) throw error;
      }

      toast.success("Descuento guardado");
      onSaved();
      onClose();
    } catch (err:any) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v)=> (v ? null : onClose())}>
      <DialogContent className="h-screen max-w-screen sm:rounded-none gap-4  mb-10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Editar descuento" : "Nuevo descuento"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-8 mx-auto max-w-4xl min-w-4xl mb-5">
          {/* Nombre */}
          <div className="space-y-2 min-w-full">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ej: Compra 1" />
          </div>

          {/* Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Tipo de monto</Label>
              <div className="flex">
                <select
                  className="w-full border rounded-md px-2 py-2 bg-background"
                  value={amountType}
                  onChange={(e)=> setAmountType(e.target.value as any)}
                >
                  <option value="percent">Porcentaje (%)</option>
                  <option value="fixed">Monto ($)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{amountType === "percent" ? "Porcentaje (%)" : "Monto ($)"}</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e)=>setAmount(Number(e.target.value || 0))}
                placeholder={amountType === "percent" ? "10" : "5.00"}
              />
            </div>
          </div>

          {/* Locations resumen + botón */}
          <div className="space-y-2">
            <Label>Ubicaciones</Label>
            <div className="rounded-md border p-3 flex items-center justify-between">
              <div className="text-sm">
                {allLocations ? (
                  <>
                    <div className="font-medium flex items-center gap-2">
                      Todas las ubicaciones
                    </div>
                    <div className="text-xs text-muted-foreground">El descuento aplica en todos los locales</div>
                  </>
                ) : (
                  <>
                    <div className="font-medium">{selectedLocs.size} seleccionadas</div>
                    <div className="text-xs text-muted-foreground">Limitado a las ubicaciones seleccionadas</div>
                  </>
                )}
              </div>
              <Button variant="ghost" onClick={()=>setOpenLocs(true)}>
                Editar ubicaciones <ChevronDown className="ml-1 w-4 h-4" />
              </Button>
            </div>

            <LocationsModal
              open={openLocs}
              onClose={()=>setOpenLocs(false)}
              locations={locations}
              allLocations={allLocations}
              setAllLocations={setAllLocations}
              selectedLocs={selectedLocs}
              setSelectedLocs={setSelectedLocs}
            />
          </div>

          {/* Automatic */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Descuento automático</div>
                <div className="text-xs text-muted-foreground">
                  Aplica automáticamente según horarios, cantidades o alcance.
                </div>
              </div>
              <Switch checked={automatic} onCheckedChange={setAutomatic}/>
            </div>

            {automatic && (
              <div className="space-y-4">
                {/* Scope */}
                <div className="space-y-2">
                  <Label>Aplicar a</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      variant={scope==='all_items' ? 'default':'outline'}
                      onClick={()=>setScope('all_items')}
                    >
                      Todos los ítems
                    </Button>
                    <Button
                      variant={scope==='items' ? 'default':'outline'}
                      onClick={()=>setScope('items')}
                    >
                      Ítems individuales
                    </Button>
                    <Button
                      variant={scope==='categories' ? 'default':'outline'}
                      onClick={()=>setScope('categories')}
                    >
                      Categorías
                    </Button>
                  </div>

                  {scope==='items' && (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-sm font-medium">Ítems seleccionados</div>
                      {/* TODO: integra tu picker de productos */}
                      <div className="flex flex-wrap gap-2">
                        {selectedItems.map(it=>(
                          <Badge key={it.id} variant="secondary">{it.name}</Badge>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">Agregar ítems</Button>
                    </div>
                  )}

                  {scope==='categories' && (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-sm font-medium">Categorías seleccionadas</div>
                      {/* TODO: integra tu picker de categorías */}
                      <div className="flex flex-wrap gap-2">
                        {selectedCats.map(ct=>(
                          <Badge key={ct.id} variant="secondary">{ct.name}</Badge>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">Agregar categorías</Button>
                    </div>
                  )}
                </div>

                {/* Schedule semanal */}
                <div className="rounded-md mb-5 space-y-3">
                  <div className="flex items-center gap-2 mt-4">
                    <Calendar className="w-4 h-4" />
                    <div className="font-semibold text-lg ">Horario semanal</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {weekdaysLabels.map((d, idx)=>(
                      <div key={idx} className="rounded-md border px-3 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">{d}</div>
                          <Switch
                            checked={week[idx].enabled}
                            onCheckedChange={(v)=> {
                              const next=[...week]; next[idx].enabled = v; setWeek(next);
                            }}
                          />
                        </div>
                        {week[idx].enabled && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Inicio</Label>
                              <Input
                                type="time"
                                value={hhmmToInput(week[idx].start)}
                                onChange={(e)=> { const next=[...week]; next[idx].start=e.target.value; setWeek(next);}}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Fin</Label>
                              <Input
                                type="time"
                                value={hhmmToInput(week[idx].end)}
                                onChange={(e)=> { const next=[...week]; next[idx].end=e.target.value; setWeek(next);}}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rango de fechas */}
                <div className="rounded-md space-y-3">
                  <div className="font-semibold text-lg mt-4">Rango de fechas (opcional)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Fecha inicio</Label>
                      <Input type="date" value={dateStart} onChange={(e)=>setDateStart(e.target.value)} />
                      <Label className="text-xs mt-1">Hora inicio</Label>
                      <Input type="time" value={timeStart} onChange={(e)=>setTimeStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Fecha fin</Label>
                      <Input type="date" value={dateEnd} onChange={(e)=>setDateEnd(e.target.value)} />
                      <Label className="text-xs mt-1">Hora fin</Label>
                      <Input type="time" value={timeEnd} onChange={(e)=>setTimeEnd(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Mínimo de compra */}
                <div className="space-y-2">
                  <Label>Mínimo de compra (opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={minimumSpend ?? ""}
                    onChange={(e)=> setMinimumSpend(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Ej: 50.00"
                  />
                </div>
              </div>
            )}

            {/* Activo / Visible */}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Activo</div>
                <div className="text-xs text-muted-foreground">Controla si el descuento está disponible</div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive}/>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-5 w-full m-auto max-w-4xl px-5 ">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={persist}>{isEdit ? "Guardar cambios" : "Crear descuento"}</Button>
        </DialogFooter>
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
      const { data: list, error } = await supabase
        .from("discounts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // contar locations
      const { data: locs } = await supabase
        .from("discount_locations")
        .select("discount_id")
        .in("discount_id", (list ?? []).map((d:any)=>d.id));

      const mapLocCount = new Map<string, number>();
      (locs ?? []).forEach((x:any)=>{
        mapLocCount.set(x.discount_id, (mapLocCount.get(x.discount_id) || 0) + 1);
      });

      const rows: DiscountRow[] = (list ?? []).map((d:any)=>({
        ...d,
        locations_count: mapLocCount.get(d.id) || 0,
      }));

      setRows(rows);
    } catch (err:any) {
      toast.error(err?.message || "Error cargando descuentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [organizationId]);

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
      const { error } = await supabase.from("discounts").delete().eq("id", d.id).eq("organization_id", organizationId);
      if (error) throw error;
      toast.success("Descuento eliminado");
      fetchData();
    } catch (err:any) {
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
    // ejemplo: "1 ítem, Lunes 12:00-23:59, Empieza 08/29/2025"
    // Para un resumen real, consulta schedules y rangos; aquí mostramos ejemplo tipo UI pedida.
    const base = d.scope === "all_items" ? "Todos los ítems" : (d.scope === "items" ? "1 ítem" : "1 categoría");
    return `${base}, Lunes de 12:00-23:59${""}`;
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
              <TableHead className="w-[140px]">Ubicaciones</TableHead>
              <TableHead>Opciones</TableHead>
              <TableHead className="w-[100px] text-right">Monto</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
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
                <TableCell className="align-top">
                  <div className="font-medium truncate max-w-[240px]" title={d.name}>
                    {d.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {d.is_active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}
                    {" "}
                    {d.automatic ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Eye className="w-3 h-3" /> Automático</span> : <span className="inline-flex items-center gap-1 text-muted-foreground"><EyeOff className="w-3 h-3" /> Manual</span>}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  {d.locations_count === 0 ? "All locations" : `${d.locations_count} locales`}
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {/* Puedes renderizar un resumen real consultando schedules y rango. */}
                  {optionsSummary(d)}
                </TableCell>
                <TableCell className="align-top text-right font-medium">
                  {amountBadge(d)}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" className="p-0 h-auto" onClick={()=>openEdit(d)} title="Editar">
                      <div className="p-2 px-3"><Pencil className="w-4 h-5" /></div>
                    </Button>
                    <Button variant="outline" size="icon" title="Eliminar" onClick={()=>setDeleting(d)}>
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

      {/* Modal Crear/Editar */}
      <DiscountModal
        open={openModal}
        onClose={()=>setOpenModal(false)}
        organizationId={organizationId}
        editing={editing}
        onSaved={onSaved}
      />

      {/* Confirm simple */}
      {deleting && (
        <Dialog open={!!deleting} onOpenChange={(v)=> !v && setDeleting(null)}>
          <DialogContent className="gap-0">
            <DialogHeader>
              <DialogTitle>Eliminar descuento</DialogTitle>
            </DialogHeader>
            <div className="text-sm px-6 mb-6">Vas a eliminar <b>{deleting.name}</b>. Esta acción no se puede deshacer.</div>
            <DialogFooter className="px-6 pb-6">
              <Button variant="outline" onClick={()=>setDeleting(null)}>Cancelar</Button>
              <Button className="bg-destructive hover:bg-destructive/90" onClick={()=>deleteDiscount(deleting)}>
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}