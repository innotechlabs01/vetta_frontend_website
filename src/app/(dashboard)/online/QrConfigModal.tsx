"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { LocationLite, QrContext, QrContextPayload, QrMode } from "@/types/database.types";

const MODE_OPTIONS: Array<{ value: QrMode; label: string; description: string; requiresTable?: boolean }> = [
  { value: "SIN_FILA", label: "Sin fila", description: "QR para ordenar sin esperar en fila" },
  { value: "TABLE", label: "Mesas", description: "Asocia un número de mesa", requiresTable: true },
  { value: "PICKUP", label: "Pickup", description: "Pedidos para recoger" },
];

type FormState = QrContextPayload & { note?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: QrContextPayload) => Promise<void> | void;
  locations: LocationLite[];
  editing?: QrContext | null;
  saving?: boolean;
};

export default function QrConfigModal({ open, onClose, onSubmit, locations, editing, saving }: Props) {
  const firstLocationId = locations[0]?.id ?? "";
  const hasLocations = locations.length > 0;
  const singleLocation = locations.length === 1 ? locations[0] : null;
  const editingLocationExists = editing?.location_id && locations.some((loc) => loc.id === editing.location_id);
  const resolvedLocationId = editingLocationExists ? editing?.location_id : firstLocationId;

  const [form, setForm] = useState<FormState>({
    id: editing?.id,
    location_id: resolvedLocationId,
    mode: (editing?.mode as QrMode) || "SIN_FILA",
    table_number: editing?.table_number,
    extra_data: editing?.extra_data ?? null,
    is_active: editing?.is_active ?? true,
    note: typeof editing?.extra_data === "object" && editing?.extra_data?.note ? String((editing.extra_data as any).note) : "",
  });

  useEffect(() => {
    const locationId =
      (editing?.location_id && locations.some((loc) => loc.id === editing.location_id))
        ? editing.location_id
        : locations[0]?.id ?? "";

    setForm({
      id: editing?.id,
      location_id: locationId,
      mode: (editing?.mode as QrMode) || "SIN_FILA",
      table_number: editing?.table_number,
      extra_data: editing?.extra_data ?? null,
      is_active: editing?.is_active ?? true,
      note: typeof editing?.extra_data === "object" && editing?.extra_data?.note ? String((editing.extra_data as any).note) : "",
    });
  }, [editing, locations, open]);

  const requiresTable = useMemo(
    () => MODE_OPTIONS.find((opt) => opt.value === form.mode)?.requiresTable,
    [form.mode]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.location_id) {
      toast.error("Selecciona una sucursal");
      return;
    }

    if (requiresTable && !form.table_number?.trim()) {
      toast.error("El número de mesa es obligatorio para este modo");
      return;
    }

    const nextExtra = form.note
      ? { ...(typeof form.extra_data === "object" && form.extra_data ? form.extra_data : {}), note: form.note }
      : null;

    const payload: QrContextPayload = {
      id: form.id,
      location_id: form.location_id,
      mode: form.mode,
      table_number: requiresTable ? (form.table_number || "").trim() : null,
      extra_data: nextExtra,
      is_active: form.is_active ?? true,
    };

    await onSubmit(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pb-0">
          <DialogTitle>{editing ? "Editar QR" : "Nuevo QR"}</DialogTitle>
          <DialogDescription>Configura el contexto del código QR.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1">
            <Label htmlFor="location">Sucursal</Label>
            {!hasLocations ? (
              <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm text-gray-600">
                <span>No hay sucursales disponibles.</span>
                <a href="/settings/locations" className="text-blue-600 hover:underline">
                  Crear sucursal
                </a>
              </div>
            ) : (
              <>
                <select
                  id="location"
                  value={form.location_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, location_id: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.city ? ` · ${loc.city}` : ""}
                    </option>
                  ))}
                </select>
                {singleLocation && (
                  <p className="text-xs text-gray-500">
                    Seleccionamos tu única sucursal: {singleLocation.name}
                    {singleLocation.city ? ` · ${singleLocation.city}` : ""}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="mode">Modo</Label>
            <select
              id="mode"
              value={form.mode}
              onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value as QrMode }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              {MODE_OPTIONS.find((opt) => opt.value === form.mode)?.description}
            </p>
          </div>

          {requiresTable && (
            <div className="space-y-1">
              <Label htmlFor="table_number">Número de mesa</Label>
              <Input
                id="table_number"
                value={form.table_number || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, table_number: e.target.value }))}
                placeholder="Ej: A12"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="note">Nota o datos extra (opcional)</Label>
            <Textarea
              id="note"
              rows={3}
              value={form.note || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Ej: Preferencias, instrucciones especiales..."
            />
          </div>

          <div className="flex mt-6 items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Activo</p>
              <p className="text-xs text-gray-500">Controla si el QR está disponible.</p>
            </div>
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear QR"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
