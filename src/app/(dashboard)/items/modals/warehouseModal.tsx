"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type WarehouseRecord = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  location_id: string;
  created_at: string | null;
  updated_at: string | null;
  location_name: string | null;
};

type Option = { id: string; name: string };

type WarehouseModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (warehouse: WarehouseRecord) => void;
  organizationId: string | null;
  warehouse: WarehouseRecord | null;
  locations: Option[];
};

export function WarehouseModal({
  open,
  onClose,
  onSaved,
  organizationId,
  warehouse,
  locations,
}: WarehouseModalProps) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const isEdit = Boolean(warehouse?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(warehouse?.name ?? "");
    setDescription(warehouse?.description ?? "");
    if (warehouse?.location_id) {
      setLocationId(warehouse.location_id);
    } else if (locations.length) {
      setLocationId(locations[0].id);
    } else {
      setLocationId("");
    }
  }, [open, warehouse?.id, warehouse?.name, warehouse?.description, warehouse?.location_id, locations]);

  const canSubmit =
    Boolean(organizationId) &&
    Boolean(name.trim()) &&
    Boolean(locationId) &&
    !saving;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organizationId) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (!locationId) {
      toast.error("Selecciona una sucursal para la bodega.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        organization_id: organizationId,
        name: trimmedName,
        description: description.trim() ? description.trim() : null,
        location_id: locationId,
      };

      const query = isEdit && warehouse?.id
        ? supabase
            .from("warehouses")
            .update({
              name: payload.name,
              description: payload.description,
              location_id: payload.location_id,
            })
            .eq("id", warehouse.id)
            .eq("organization_id", organizationId)
            .select(
              "id, organization_id, name, description, location_id, created_at, updated_at, location:locations(id, name)"
            )
            .single()
        : supabase
            .from("warehouses")
            .insert([payload])
            .select(
              "id, organization_id, name, description, location_id, created_at, updated_at, location:locations(id, name)"
            )
            .single();

      const { data, error } = await query;
      if (error) throw error;

      const locationRecord = Array.isArray(data.location)
        ? data.location[0]
        : data.location;

      const saved: WarehouseRecord = {
        id: data.id,
        organization_id: data.organization_id,
        name: data.name,
        description: data.description ?? null,
        location_id: data.location_id,
        created_at: data.created_at ?? null,
        updated_at: data.updated_at ?? null,
        location_name: locationRecord?.name ?? null,
      };

      toast.success(isEdit ? "Bodega actualizada" : "Bodega creada");
      onSaved(saved);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo guardar la bodega");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-w-md pb-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar bodega" : "Nueva bodega"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Define el nombre, la sucursal asociada y una descripción opcional.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 px-5">
          <div className="space-y-2">
            <Label htmlFor="warehouse-name">Nombre</Label>
            <Input
              id="warehouse-name"
              placeholder="Ej. Bodega principal"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Select
              value={locationId}
              onValueChange={setLocationId}
              disabled={saving || !locations.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sucursal" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!locations.length && (
              <p className="text-xs text-muted-foreground">
                Debes crear al menos una sucursal antes de registrar bodegas.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="warehouse-description">Descripción</Label>
            <Textarea
              id="warehouse-description"
              placeholder="Detalles, notas o ubicación física"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
