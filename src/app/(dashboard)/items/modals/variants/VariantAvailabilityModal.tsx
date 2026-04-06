"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";

type LocationOption = {
  id: string;
  name: string;
};

export type AvailabilityConfig = {
  allLocations: boolean;
  selectedLocationIds: Set<string>;
  lowStockThresholds: Record<string, string>;
};

type VariantAvailabilityModalProps = {
  open: boolean;
  title: string;
  description: string;
  locations: LocationOption[];
  initialConfig: AvailabilityConfig;
  onClose: () => void;
  onSave: (config: AvailabilityConfig) => void;
};

export function VariantAvailabilityModal({
  open,
  title,
  description,
  locations,
  initialConfig,
  onClose,
  onSave,
}: VariantAvailabilityModalProps) {
  const [query, setQuery] = useState("");
  const [tmpAll, setTmpAll] = useState(initialConfig.allLocations);
  const [tmpSelected, setTmpSelected] = useState<Set<string>>(
    new Set(initialConfig.selectedLocationIds)
  );
  const [thresholds, setThresholds] = useState<Record<string, string>>(
    { ...initialConfig.lowStockThresholds }
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTmpAll(initialConfig.allLocations);
    setTmpSelected(new Set(initialConfig.selectedLocationIds));
    setThresholds({ ...initialConfig.lowStockThresholds });
  }, [initialConfig, open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return locations;
    return locations.filter((loc) =>
      loc.name.toLowerCase().includes(needle)
    );
  }, [locations, query]);

  const toggleSelection = (locationId: string) => {
    setTmpSelected((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  const handleApply = () => {
    onSave({
      allLocations: tmpAll,
      selectedLocationIds: tmpAll ? new Set() : new Set(tmpSelected),
      lowStockThresholds: { ...thresholds },
    });
  };

  const selectedCount = tmpAll ? locations.length : tmpSelected.size;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="space-y-5 px-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1 text-sm">
              <p className="font-medium">Todas las ubicaciones</p>
              <p className="text-xs text-muted-foreground">
                Control centralizado. Activa esta opción si no necesitas overrides.
              </p>
            </div>
            <Switch checked={tmpAll} onCheckedChange={setTmpAll} />
          </div>

          <div>
            <Label htmlFor="location-search" className="text-xs uppercase text-muted-foreground">
              Buscar sucursal
            </Label>
            <Input
              id="location-search"
              placeholder="Escribe el nombre de la sucursal"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-1"
            />
          </div>

          <div className="max-h-[320px] divide-y overflow-auto rounded-lg border">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Sin resultados.
              </div>
            ) : (
              filtered.map((location) => {
                const checked = tmpAll || tmpSelected.has(location.id);
                return (
                  <div
                    key={location.id}
                    className="flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{location.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {checked ? "Disponible" : "Desactivado"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={checked}
                          disabled={tmpAll}
                          onCheckedChange={() => toggleSelection(location.id)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {tmpAll ? "Todas activas" : "Activar"}
                        </span>
                      </div>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="Low stock"
                        className="w-full sm:w-32"
                        value={thresholds[location.id] ?? ""}
                        onChange={(event) =>
                          setThresholds((prev) => ({
                            ...prev,
                            [location.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedCount} ubicaciones activas.
          </p>
        </div>

        <DialogFooter className="px-4 pb-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleApply}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
