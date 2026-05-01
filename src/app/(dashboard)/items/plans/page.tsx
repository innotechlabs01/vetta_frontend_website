// app/(dashboard)/catalog/subscriptions/page.tsx
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
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Pencil, RefreshCcw, Loader2, Trash2, Settings2
} from "lucide-react";

import ItemPickerModal, { MiniRef as MiniItemRef } from "../discounts/itemPickerModal";
import CategoryPickerModal, { MiniRef as MiniCatRef } from "../discounts/CategoryPickerModal";
import SelectedChips from "../discounts/SelectedChips";

/* =======================
   Tipos
======================= */
type Plan = {
  id: string;
  organization_id: string;
  name: string;               // uso interno
  description: string | null;
  is_active: boolean;

  scope: "all_items" | "items" | "categories";

  shipping_discount_type: "free" | "percent" | "fixed" | null;
  shipping_discount_value: number | null;

  created_at: string | null;
  updated_at: string | null;
};

type PlanRow = Plan & {
  items_count?: number;
  categories_count?: number;
  freq_count?: number;
  scope_summary?: string;
};

type IntervalUnit = "day" | "week" | "month";
type BillingAnchor = "purchase_date" | "day_of_month" | "weekday";
type EndType = "never" | "on_date" | "after_cycles";
type DiscountType = "percent" | "fixed" | null;

type LocalFreqOption = {
  id?: string; // solo para edición local
  label: string;
  interval_unit: IntervalUnit;
  interval_count: number;

  billing_anchor: BillingAnchor;
  billing_anchor_value?: number | null; // day 1-31 or weekday 0-6

  start_offset_days: number;

  end_type: EndType;
  end_after_cycles?: number | null;
  end_on_date?: string | null; // ISO

  discount_type: DiscountType;
  discount_value?: number | null;

  pause_allowed: boolean;
  pause_limit_days?: number | null;

  is_active: boolean;
};

/* =======================
   Helpers UI
======================= */
const unitLabel: Record<IntervalUnit, string> = {
  day: "Días",
  week: "Semanas",
  month: "Meses",
};
const weekdayMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/* =======================
   Modal Secundario: Opción de Frecuencia
   (SIN CAMBIOS funcionales vs. tu versión previa)
======================= */
function FrequencyOptionModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: LocalFreqOption | null;
  onSave: (opt: LocalFreqOption) => void;
}) {
  const [state, setState] = useState<LocalFreqOption>(() => initial ?? {
    label: "Mensual",
    interval_unit: "month",
    interval_count: 1,
    billing_anchor: "purchase_date",
    billing_anchor_value: null,
    start_offset_days: 0,
    end_type: "never",
    end_after_cycles: null,
    end_on_date: null,
    discount_type: null,
    discount_value: null,
    pause_allowed: false,
    pause_limit_days: null,
    is_active: true,
  });

  // === Presets (frecuencia) ===
  const presetMap: Record<string, { unit: IntervalUnit; count: number; label: string }> = {
    diaria: { unit: "day", count: 1, label: "Diaria" },
    semanal: { unit: "week", count: 1, label: "Semanal" },
    mensual: { unit: "month", count: 1, label: "Mensual" },
    trimestral: { unit: "month", count: 3, label: "Trimestral" },
    semestral: { unit: "month", count: 6, label: "Semestral" },
    anual: { unit: "month", count: 12, label: "Anual" },
  };
  const resolvePresetKey = (s: LocalFreqOption) => {
    if (s.interval_unit === "day" && s.interval_count === 1) return "diaria";
    if (s.interval_unit === "week" && s.interval_count === 1) return "semanal";
    if (s.interval_unit === "month" && s.interval_count === 1) return "mensual";
    if (s.interval_unit === "month" && s.interval_count === 3) return "trimestral";
    if (s.interval_unit === "month" && s.interval_count === 6) return "semestral";
    if (s.interval_unit === "month" && s.interval_count === 12) return "anual";
    return "mensual";
  };

  useEffect(() => {
    if (open) {
      setState(initial ?? {
        label: "Mensual",
        interval_unit: "month",
        interval_count: 1,
        billing_anchor: "purchase_date",
        billing_anchor_value: null,
        start_offset_days: 0,
        end_type: "never",
        end_after_cycles: null,
        end_on_date: null,
        discount_type: null,
        discount_value: null,
        pause_allowed: false,
        pause_limit_days: null,
        is_active: true,
      });
    }
  }, [open, initial]);

  const isMonthly = state.interval_unit === "month" && state.interval_count > 0;
  const discountEnabled = state.discount_type !== null;

  // Guardar (label se deriva del preset)
  const canSave =
    state.interval_count > 0 &&
    (state.discount_type === null || (state.discount_value ?? 0) >= 0) &&
    (state.end_type !== "after_cycles" || (state.end_after_cycles ?? 0) > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-3xl max-h-[90svh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Opción de frecuencia</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 px-6 mb-3">
          {/* FILA 1 — Frecuencia (select de presets) */}
          <div className="space-y-2">
            <Label>Frecuencia</Label>
            <select
              className="w-full border rounded-md px-2 py-3 bg-background"
              value={resolvePresetKey(state)}
              onChange={(e) => {
                const k = e.target.value as keyof typeof presetMap;
                const p = presetMap[k];
                setState((s) => ({
                  ...s,
                  label: p.label,
                  interval_unit: p.unit,
                  interval_count: p.count,
                  billing_anchor: k === "mensual" ? s.billing_anchor : "purchase_date",
                  billing_anchor_value: k === "mensual" ? s.billing_anchor_value : null,
                }));
              }}
            >
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          {/* FILA 2 — Fecha de cobro (responsive: 100% / 50-50) */}
          <div className="space-y-2">
            <Label>Fecha de cobro</Label>
            {/* Caso 1: ).replace(bxe2x80x9d, bFecha de inicio de la suscripción” → ancho completo */}
            {(!isMonthly || state.billing_anchor !== "day_of_month") && (
              <select
                className="w-full border rounded-md px-2 py-3 bg-background"
                value={isMonthly ? state.billing_anchor : "purchase_date"}
                onChange={(e) => {
                  const val = e.target.value as BillingAnchor;
                  const nextAnchor = (val === "day_of_month" && isMonthly) ? "day_of_month" : "purchase_date";
                  setState((s) => ({
                    ...s,
                    billing_anchor: nextAnchor,
                    billing_anchor_value: nextAnchor === "day_of_month" ? (s.billing_anchor_value ?? 1) : null,
                  }));
                }}
              >
                <option value="purchase_date">Fecha de inicio de la suscripción</option>
                <option value="day_of_month" disabled={!isMonthly}>Día específico del mes</option>
              </select>
            )}

            {/* Caso 2: ).replace(bxe2x80x9d, bDía específico del mes” → 50/50 (select + input) */}
            {isMonthly && state.billing_anchor === "day_of_month" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  className="w-full border rounded-md px-2 py-3 bg-background"
                  value="day_of_month"
                  onChange={(e) => {
                    const isDOM = e.target.value === "day_of_month";
                    setState((s) => ({
                      ...s,
                      billing_anchor: isDOM ? "day_of_month" : "purchase_date",
                      billing_anchor_value: isDOM ? (s.billing_anchor_value ?? 1) : null,
                    }));
                  }}
                >
                  <option value="purchase_date">Fecha de inicio de la suscripción</option>
                  <option value="day_of_month">Día específico del mes</option>
                </select>

                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={state.billing_anchor_value ?? 1}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      billing_anchor_value: Math.min(31, Math.max(1, Number(e.target.value || 1))),
                    }))
                  }
                  placeholder="1..31"
                />
              </div>
            )}
          </div>

          {/* FILA 3 — La suscripción finaliza (responsive: 100% / 50-50) */}
          <div className="space-y-2">
            <Label>La suscripción finaliza</Label>

            {/* Caso 1: Nunca → ancho completo */}
            {state.end_type === "never" && (
              <select
                className="w-full border rounded-md px-2 py-3 bg-background"
                value="never"
                onChange={(e) => {
                  const et = e.target.value as EndType;
                  setState((s) => ({
                    ...s,
                    end_type: et,
                    end_after_cycles: et === "after_cycles" ? (s.end_after_cycles ?? 12) : null,
                    end_on_date: et === "on_date" ? (s.end_on_date ?? new Date().toISOString().slice(0, 10)) : null,
                  }));
                }}
              >
                <option value="never">Nunca</option>
                <option value="after_cycles">Después de N ciclos</option>
                <option value="on_date">En fecha</option>
              </select>
            )}

            {/* Caso 2: after_cycles / on_date → dos columnas */}
            {state.end_type !== "never" && (
              <div className="grid md:grid-cols-2 gap-3">
                <select
                  className="w-full border rounded-md px-2 py-3 bg-background"
                  value={state.end_type}
                  onChange={(e) => {
                    const et = e.target.value as EndType;
                    setState((s) => ({
                      ...s,
                      end_type: et,
                      end_after_cycles: et === "after_cycles" ? (s.end_after_cycles ?? 12) : null,
                      end_on_date: et === "on_date" ? (s.end_on_date ?? new Date().toISOString().slice(0, 10)) : null,
                    }));
                  }}
                >
                  <option value="never">Nunca</option>
                  <option value="after_cycles">Después de N ciclos</option>
                  <option value="on_date">En fecha</option>
                </select>

                {state.end_type === "after_cycles" && (
                  <Input
                    type="number"
                    min={1}
                    value={state.end_after_cycles ?? 12}
                    onChange={(e) =>
                      setState((s) => ({ ...s, end_after_cycles: Math.max(1, Number(e.target.value || 1)) }))
                    }
                    placeholder="Número de ciclos"
                  />
                )}

                {state.end_type === "on_date" && (
                  <Input
                    type="date"
                    value={state.end_on_date ?? new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setState((s) => ({ ...s, end_on_date: e.target.value }))}
                  />
                )}
              </div>
            )}
          </div>

          {/* DESCUENTO — Título + switch; al activar, muestra fila de campos */}
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Descuento</div>
              <Switch
                checked={discountEnabled}
                onCheckedChange={(v) => {
                  if (v) {
                    setState((s) => ({ ...s, discount_type: "percent", discount_value: s.discount_value ?? 0 }));
                  } else {
                    setState((s) => ({ ...s, discount_type: null, discount_value: null }));
                  }
                }}
              />
            </div>

            {discountEnabled && (
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="w-full border rounded-md px-2 py-3 bg-background"
                    value={state.discount_type ?? "percent"}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        discount_type: e.target.value as DiscountType,
                        discount_value: s.discount_value ?? 0,
                      }))
                    }
                  >
                    <option value="percent">Porcentaje (%)</option>
                    <option value="fixed">Monto ($)</option>
                  </select>
                </div>

                <div>
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={state.discount_value ?? 0}
                    onChange={(e) =>
                      setState((s) => ({ ...s, discount_value: Math.max(0, Number(e.target.value || 0)) }))
                    }
                  />
                </div>

              </div>
            )}
          </div>

          <div>

            {/* SEPARADOR H3 bg-gray-100 */}
            <h3 className="w-full  text-lg font-semibold mb-3 mt-5">
              Configuraciones adicionales
            </h3>

            {/* PAUSAS */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Permitir pausar</div>
                  <div className="text-xs text-muted-foreground">
                    Los clientes podrán pausar sus suscripciones a este plan.
                  </div>
                </div>
                <Switch
                  checked={state.pause_allowed}
                  onCheckedChange={(v) =>
                    setState((s) => ({
                      ...s,
                      pause_allowed: v,
                      pause_limit_days: v ? s.pause_limit_days ?? null : null,
                    }))
                  }
                />
              </div>

              {state.pause_allowed && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={state.pause_limit_days == null ? "selected" : "outline"}
                    onClick={() => setState((s) => ({ ...s, pause_limit_days: null }))}
                  >
                    Sin límite
                  </Button>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={state.pause_limit_days ?? ""}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          pause_limit_days:
                            e.target.value === "" ? null : Math.max(1, Number(e.target.value || 1)),
                        }))
                      }
                      placeholder="Días"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!canSave}
            onClick={() => { if (canSave) onSave(state); }}
          >
            Guardar opción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =======================
   Modal Principal Plan (ACTUALIZADO)
======================= */
function PlanModal({
  open,
  onClose,
  organizationId,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
  editing?: Plan | null;
  onSaved: () => void;
}) {
  const supabase = getSupabaseBrowser();
  const isEdit = !!editing?.id;

  // Campos base
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [isActive, setIsActive] = useState<boolean>(editing?.is_active ?? true);

  // Alcance
  const [scope, setScope] = useState<"all_items" | "items" | "categories">(editing?.scope ?? "items");

  // Items/Categorías
  const [selectedItems, setSelectedItems] = useState<MiniItemRef[]>([]);
  const [openItemsModal, setOpenItemsModal] = useState(false);
  const [selectedCats, setSelectedCats] = useState<MiniCatRef[]>([]);
  const [openCatsModal, setOpenCatsModal] = useState(false);

  // Frecuencias
  const [freqs, setFreqs] = useState<LocalFreqOption[]>([]);
  const [openFreqModal, setOpenFreqModal] = useState(false);
  const [editingFreqIdx, setEditingFreqIdx] = useState<number | null>(null);

  // Descuento de envío
  const [shipType, setShipType] = useState<"free" | "percent" | "fixed" | null>(editing?.shipping_discount_type ?? null);
  const [shipValue, setShipValue] = useState<number | "">(editing?.shipping_discount_value ?? "");

  useEffect(() => {
    if (!open || !organizationId) return;
    (async () => {
      // Reset base
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setIsActive(editing?.is_active ?? true);
      setScope((editing?.scope as any) ?? "items");
      setShipType(editing?.shipping_discount_type ?? null);
      setShipValue(editing?.shipping_discount_value ?? "");

      setSelectedItems([]);
      setSelectedCats([]);
      setFreqs([]);
      setEditingFreqIdx(null);

      if (isEdit && editing?.id) {
        // Cargar items, categorías y frecuencias existentes
        const [itemsRes, catsRes, freqRes] = await Promise.all([
          supabase.from("subscription_plan_items")
            .select("item_id, products:products ( id, name )")
            .eq("plan_id", editing.id),
          supabase.from("subscription_plan_categories")
            .select("category_id, category:product_categories ( id, name )")
            .eq("plan_id", editing.id),
          supabase.from("subscription_frequency_options")
            .select("*")
            .eq("plan_id", editing.id)
            .order("created_at", { ascending: true }),
        ]);

        if (itemsRes.error) console.error(itemsRes.error);
        if (catsRes.error) console.error(catsRes.error);
        if (freqRes.error) console.error(freqRes.error);

        setSelectedItems((itemsRes.data ?? []).map((r: any) => ({ id: r.item_id, name: r.products?.name ?? r.item_id })));
        setSelectedCats((catsRes.data ?? []).map((r: any) => ({ id: r.category_id, name: r.category?.name ?? r.category_id })));

        const mapFreqs: LocalFreqOption[] = (freqRes.data ?? []).map((r: any) => ({
          id: r.id,
          label: r.label,
          interval_unit: r.interval_unit,
          interval_count: r.interval_count,
          billing_anchor: r.billing_anchor,
          billing_anchor_value: r.billing_anchor_value,
          start_offset_days: r.start_offset_days,
          end_type: r.end_type,
          end_after_cycles: r.end_after_cycles,
          end_on_date: r.end_on_date,
          discount_type: r.discount_type,
          discount_value: r.discount_value,
          pause_allowed: r.pause_allowed,
          pause_limit_days: r.pause_limit_days,
          is_active: r.is_active,
        }));
        setFreqs(mapFreqs);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizationId, editing?.id]);

  function freqSummary(f: LocalFreqOption) {
    const base = `Cada ${f.interval_count} ${unitLabel[f.interval_unit].toLowerCase()}`;
    const anc =
      f.billing_anchor === "purchase_date"
        ? "desde la compra"
        : f.billing_anchor === "day_of_month"
          ? `día ${f.billing_anchor_value} del mes`
          : weekdayMap[f.billing_anchor_value ?? 1];
    const disc = f.discount_type
      ? (f.discount_type === "percent" ? `${f.discount_value ?? 0}% off` : `$${Number(f.discount_value ?? 0).toFixed(2)} off`)
      : "sin descuento";
    const end =
      f.end_type === "never" ? "sin fin" :
        f.end_type === "after_cycles" ? `termina tras ${f.end_after_cycles} ciclos` :
          `termina el ${f.end_on_date}`;
    return `${base} · anclaje: ${anc} · ${disc} · ${end}`;
  }

  function shippingSummary() {
    if (!shipType) return "Sin descuento de envío";
    if (shipType === "free") return "Envío gratis";
    if (shipType === "percent") return `Envío ${shipValue || 0}% off`;
    return `Envío -$${Number(shipValue || 0).toFixed(2)}`;
  }

  async function persist() {
    try {
      if (!organizationId) throw new Error("Falta negocio");
      if (!name.trim()) return toast.error("El nombre del plan es obligatorio");

      // Validaciones shipping
      if (shipType && shipType !== "free") {
        const val = Number(shipValue || 0);
        if (val < 0) return toast.error("El valor de descuento de envío debe ser >= 0");
        if (shipType === "percent" && val > 100) return toast.error("El % de envío no puede ser mayor a 100");
      }

      let planId = editing?.id as string | undefined;

      const ship_payload = {
        shipping_discount_type: shipType,
        shipping_discount_value: shipType ? (shipType === "free" ? null : Number(shipValue || 0)) : null,
      };

      if (isEdit && planId) {
        const { error } = await supabase
          .from("subscription_plans")
          .update({
            name: name.trim(),
            description: description?.trim() || null,
            is_active: isActive,
            scope,
            ...ship_payload,
          })
          .eq("id", planId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("subscription_plans")
          .insert([{
            organization_id: organizationId,
            name: name.trim(),
            description: description?.trim() || null,
            is_active: isActive,
            scope,
            ...ship_payload,
          }])
          .select("id")
          .single();
        if (error) throw error;
        planId = data?.id;
      }
      if (!planId) throw new Error("No se pudo obtener el ID del plan");

      // Items/Categorías según scope
      await supabase.from("subscription_plan_items").delete().eq("plan_id", planId);
      await supabase.from("subscription_plan_categories").delete().eq("plan_id", planId);

      if (scope === "items" && selectedItems.length) {
        const payload = selectedItems.map(it => ({
          plan_id: planId!, item_id: it.id, organization_id: organizationId
        }));
        const { error } = await supabase.from("subscription_plan_items").insert(payload);
        if (error) throw error;
      }
      if (scope === "categories" && selectedCats.length) {
        const payload = selectedCats.map(ct => ({
          plan_id: planId!, category_id: ct.id, organization_id: organizationId
        }));
        const { error } = await supabase.from("subscription_plan_categories").insert(payload);
        if (error) throw error;
      }

      // Frecuencias
      await supabase.from("subscription_frequency_options").delete().eq("plan_id", planId);
      if (freqs.length) {
        const payload = freqs.map(f => ({
          plan_id: planId!,
          organization_id: organizationId,
          label: f.label,
          interval_unit: f.interval_unit,
          interval_count: f.interval_count,
          billing_anchor: f.billing_anchor,
          billing_anchor_value: f.billing_anchor === "purchase_date" ? null : (f.billing_anchor_value ?? null),
          start_offset_days: f.start_offset_days,
          end_type: f.end_type,
          end_after_cycles: f.end_type === "after_cycles" ? f.end_after_cycles : null,
          end_on_date: f.end_type === "on_date" ? f.end_on_date : null,
          discount_type: f.discount_type,
          discount_value: f.discount_type ? (f.discount_value ?? 0) : null,
          pause_allowed: f.pause_allowed,
          pause_limit_days: f.pause_allowed ? (f.pause_limit_days ?? null) : null,
          is_active: f.is_active,
        }));
        const { error } = await supabase.from("subscription_frequency_options").insert(payload);
        if (error) throw error;
      }

      toast.success("Plan guardado");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar el plan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="h-screen flex flex-col max-w-screen sm:rounded-none gap-4 pb-10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Editar plan de suscripción" : "Nuevo plan de suscripción"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 mx-auto max-w-3xl min-w-[48rem] mb-5">
          {/* 1) Nombre */}
          <div className="space-y-2">
            <Label>Nombre del plan</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pharmacy PRO 10% Off"
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Input
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas internas del plan"
            />
          </div>

          {/* 2) Alcance del plan (igual UX que descuentos) */}
          <div className="space-y-2">
            <div className="font-medium text-xl">Alcance del Plan</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant={scope === 'all_items' ? 'selected' : 'outline'} onClick={() => setScope('all_items')}>
                Toda la tienda
              </Button>
              <Button variant={scope === 'items' ? 'selected' : 'outline'} onClick={() => setScope('items')}>
                Ítems individuales
              </Button>
              <Button variant={scope === 'categories' ? 'selected' : 'outline'} onClick={() => setScope('categories')}>
                Categorías
              </Button>
            </div>
            {/* Ítems */}
          {scope === "items" && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Ítems</div>
                  <div className="text-xs text-muted-foreground">
                    Selecciona los ítems del catálogo que usarán este plan si se compran como suscripción.
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpenItemsModal(true)}>
                  Asignar ítems
                </Button>
              </div>

              <SelectedChips
                items={selectedItems}
                onRemove={(id) => setSelectedItems(prev => prev.filter(x => x.id !== id))}
              />
            </div>
          )}

          {/* Categorías */}
          {scope === "categories" && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Categorías</div>
                  <div className="text-xs text-muted-foreground">
                    Los ítems de estas categorías heredarán las opciones de este plan.
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpenCatsModal(true)}>
                  Asignar categorías
                </Button>
              </div>

              <SelectedChips
                items={selectedCats}
                onRemove={(id) => setSelectedCats(prev => prev.filter(x => x.id !== id))}
              />
            </div>
          )}
          </div>

          

          {/* 3) Opciones de frecuencia */}
          <div className="rounded-md mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="mb-3">
                <div className="font-medium text-xl">Opciones de frecuencia</div>
                <div className="text-xs text-muted-foreground">
                  Agrega una o más opciones. Ej: semanal, quincenal o mensual.
                </div>
              </div>
              <Button variant='outline' size='sm' onClick={() => { setEditingFreqIdx(null); setOpenFreqModal(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Agregar opción
              </Button>
            </div>

            {freqs.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin opciones agregadas</div>
            ) : (
              <div className="space-y-2">
                {freqs.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between border rounded-md p-3">
                    <div className="text-sm">
                      <div className="font-medium">{f.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {freqSummary(f)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={f.is_active ? "secondary" : "outline"}>
                        {f.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      <Button variant="outline" size="icon" title="Editar" onClick={() => { setEditingFreqIdx(idx); setOpenFreqModal(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Eliminar" onClick={() => {
                        setFreqs(prev => prev.filter((_, i) => i !== idx));
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descuento de envío */}
          <div className="rounded-md mt-4 space-y-2">
            <div className="font-medium text-xl mb-3">Otros Beneficios</div>

            {/* === Descuento de envío (con switch) === */}
            {(() => {
              const shipEnabled = shipType !== null;

              return (
                <div className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium text-base">Descuento de envío</div>
                      <div className="text-xs text-muted-foreground">
                        Aplica un beneficio de envío a las suscripciones de este plan.
                      </div>
                    </div>
                    <Switch
                      checked={shipEnabled}
                      onCheckedChange={(v) => {
                        if (v) {
                          // Activa con valor por defecto "free"
                          setShipType("free");
                          setShipValue("");
                        } else {
                          // Desactiva y limpia valores
                          setShipType(null);
                          setShipValue("");
                        }
                      }}
                    />
                  </div>

                  {/* Contenido dinámico (solo visible si está activado) */}
                  {shipEnabled && (
                    <>
                      {/* Si es "gratis": fila a 100% */}
                      {shipType === "free" && (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label>Tipo de descuento</Label>
                            <select
                              className="w-full border rounded-md px-2 py-2 bg-background"
                              value={shipType ?? ""}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                setShipType(val as any);
                                if (val === "free" || val === "") setShipValue("");
                              }}
                            >
                              <option value="free">Envío gratis</option>
                              <option value="percent">Porcentaje (%)</option>
                              <option value="fixed">Monto ($)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Si requiere segundo parámetro: 50/50 */}
                      {(shipType === "percent" || shipType === "fixed") && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Tipo de descuento</Label>
                            <select
                              className="w-full border rounded-md px-2 py-3 bg-background"
                              value={shipType ?? ""}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                setShipType(val as any);
                                if (val === "free" || val === "") setShipValue("");
                              }}
                            >
                              <option value="percent">Porcentaje (%)</option>
                              <option value="fixed">Monto ($)</option>
                              <option value="free">Envío gratis</option>
                            </select>
                          </div>

                          <div>
                            <Label>{shipType === "percent" ? "Porcentaje (%)" : "Monto ($)"}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={shipValue}
                              onChange={(e) =>
                                setShipValue(e.target.value === "" ? "" : Number(e.target.value))
                              }
                              placeholder={shipType === "percent" ? "10" : "5000"}
                            />
                          </div>
                        </div>
                      )}

                      {/* Resumen corto */}
                      <div className="text-xs text-muted-foreground">
                        {shipType === "free"
                          ? "Envío gratis"
                          : shipType === "percent"
                            ? `Envío ${Number(shipValue || 0)}% off`
                            : shipType === "fixed"
                              ? `Envío -$${Number(shipValue || 0).toFixed(2)}`
                              : "Sin descuento de envío"}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Estado */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Estado</div>
                <div className="text-xs text-muted-foreground">Controla si el plan está disponible</div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-5 w-full m-auto max-w-3xl">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={persist}>{isEdit ? "Guardar cambios" : "Crear plan"}</Button>
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

        <FrequencyOptionModal
          open={openFreqModal}
          onClose={() => setOpenFreqModal(false)}
          initial={editingFreqIdx != null ? freqs[editingFreqIdx] : null}
          onSave={(opt) => {
            if (editingFreqIdx != null) {
              setFreqs(prev => prev.map((x, i) => (i === editingFreqIdx ? opt : x)));
            } else {
              setFreqs(prev => [...prev, opt]);
            }
            setOpenFreqModal(false);
            setEditingFreqIdx(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/* =======================
   Página: Lista de Planes (ACTUALIZADA)
======================= */
export default function SubscriptionsPage() {
  const { org } = useEnvironment();
  const supabase = getSupabaseBrowser();
  const organizationId = org?.id;

  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<{ activo: boolean; inactivo: boolean }>({ activo: true, inactivo: false });

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function scopeSummary(p: PlanRow) {
    if (p.scope === "all_items") return "Toda la tienda";
    if (p.scope === "items") return `${p.items_count ?? 0} ítem(s)`;
    return `${p.categories_count ?? 0} categoría(s)`;
  }

  async function fetchData() {
    if (!organizationId) return;
    try {
      setLoading(true);

      // 1) Planes
      const { data: list, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (list ?? []).map((d: any) => d.id);
      if (ids.length === 0) {
        setRows([]);
        return;
      }

      // 2) Contar items
      const { data: pi } = await supabase
        .from("subscription_plan_items")
        .select("plan_id")
        .in("plan_id", ids);
      const itemsCount = new Map<string, number>();
      (pi ?? []).forEach((r: any) => itemsCount.set(r.plan_id, (itemsCount.get(r.plan_id) || 0) + 1));

      // 3) Contar categorías
      const { data: pc } = await supabase
        .from("subscription_plan_categories")
        .select("plan_id")
        .in("plan_id", ids);
      const catsCount = new Map<string, number>();
      (pc ?? []).forEach((r: any) => catsCount.set(r.plan_id, (catsCount.get(r.plan_id) || 0) + 1));

      // 4) Contar opciones de frecuencia
      const { data: fo } = await supabase
        .from("subscription_frequency_options")
        .select("plan_id")
        .in("plan_id", ids);
      const freqCount = new Map<string, number>();
      (fo ?? []).forEach((r: any) => freqCount.set(r.plan_id, (freqCount.get(r.plan_id) || 0) + 1));

      // 5) Construir filas
      const enriched: PlanRow[] = (list ?? []).map((p: any) => ({
        ...p,
        items_count: itemsCount.get(p.id) || 0,
        categories_count: catsCount.get(p.id) || 0,
        freq_count: freqCount.get(p.id) || 0,
      }));

      setRows(enriched);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error cargando planes");
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
  const openEdit = (p: Plan) => { setEditing(p); setOpenModal(true); };
  const onSaved = () => { setOpenModal(false); fetchData(); };

  async function deletePlan(p: Plan) {
    if (!organizationId) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", p.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
      toast.success("Plan eliminado");
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
          <h1 className="text-2xl font-semibold tracking-tight">Planes de suscripción</h1>
          <p className="text-sm text-muted-foreground">Configura planes, alcance, ítems/categorías, frecuencia y envío</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} title="Recargar">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </Button>
          <Button onClick={openCreate} size="lg" className="px-3" title="Crear plan">
            <Plus className="w-4 h-4 mr-2" /> Nuevo plan
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
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Alcance</TableHead>
              <TableHead className="w-[120px]">Frecuencias</TableHead>
              <TableHead className="w-[200px]">Envío</TableHead>
              <TableHead className="w-[140px]"></TableHead>
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
                  <div className="py-8 text-center text-sm text-muted-foreground">No hay planes</div>
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                  </div>
                </TableCell>

                <TableCell>
                  {p.is_active ? (
                    <Badge variant="secondary" className="shrink-0">Activo</Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">Inactivo</Badge>
                  )}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {scopeSummary(p)}
                </TableCell>

                <TableCell>{p.freq_count ?? 0} opción(es)</TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {!p.shipping_discount_type ? "—" :
                    p.shipping_discount_type === "free" ? "Envío gratis" :
                      p.shipping_discount_type === "percent" ? `${p.shipping_discount_value ?? 0}% off` :
                        `$${Number(p.shipping_discount_value ?? 0).toFixed(2)} off`}
                </TableCell>

                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" className="p-0 h-auto" onClick={() => openEdit(p)} title="Editar">
                      <div className="p-2 px-3"><Pencil className="w-4 h-5" /></div>
                    </Button>
                    <Button variant="outline" size="icon" title="Eliminar" onClick={() => setDeleting(p)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableCaption className="pb-2">{filtered.length} planes</TableCaption>
        </Table>
      </div>

      {/* Modal Crear/Editar */}
      <PlanModal
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
              <DialogTitle>Eliminar plan</DialogTitle>
            </DialogHeader>
            <div className="text-sm px-6 mb-6">Vas a eliminar <b>{deleting.name}</b>. Esta acción no se puede deshacer.</div>
            <DialogFooter className="px-6 pb-6">
              <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button className="bg-destructive hover:bg-destructive/90" onClick={() => deletePlan(deleting)}>
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}