"use client";

import { Boxes, Plus, Trash2 } from "lucide-react";
import type {
  ProductVariantDraft,
  VariantInventoryDraft,
} from "../../types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type WarehouseOption = {
  id: string;
  name: string;
  locationName?: string | null;
};

type VariantInventoryModalProps = {
  open: boolean;
  variant: ProductVariantDraft | null;
  rows: VariantInventoryDraft[];
  warehouses: WarehouseOption[];
  onClose: () => void;
  onAddRow: () => void;
  onRowChange: (
    rowId: string,
    field: keyof VariantInventoryDraft,
    value: string
  ) => void;
  onRemoveRow: (rowId: string) => void;
};

export function VariantInventoryModal({
  open,
  variant,
  rows,
  warehouses,
  onClose,
  onAddRow,
  onRowChange,
  onRemoveRow,
}: VariantInventoryModalProps) {
  const emptyState = !rows.length;
  const noWarehouses = warehouses.length === 0;

  const title = variant
    ? `Inventario de ${variant.name || "variante"}`
    : "Inventario de la variante";

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-muted-foreground" />
            Administración de inventario
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Registra los lotes por bodega para controlar disponibilidad,
            vencimientos y costo unitario.
          </p>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
        </DialogHeader>

        <div className="overflow-y-auto px-4 pb-2">
          {noWarehouses ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Crea una bodega antes de registrar inventario. Puedes hacerlo en
              <strong className="ml-1 font-semibold">Inventario → Bodegas</strong>.
            </div>
          ) : null}

          {emptyState ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aún no registras inventario para esta variante.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="grid gap-3 rounded-xl md:grid-cols-[minmax(0,220px)_repeat(4,minmax(0,160px))_auto]"
                >
                    <div className="space-y-1">
                      {index === 0 ? (
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Bodega
                        </Label>
                      ) : null}
                      <Select
                        value={row.warehouse_id ?? ""}
                        onValueChange={(value) =>
                          onRowChange(row.id, "warehouse_id", value)
                        }
                        disabled={noWarehouses}
                      >
                        <SelectTrigger className="w-full text-left">
                          <SelectValue placeholder="Selecciona una bodega" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              <span className="flex flex-col text-left">
                                <span>{warehouse.name}</span>
                                {warehouse.locationName ? (
                                  <span className="text-xs text-muted-foreground">
                                    {warehouse.locationName}
                                  </span>
                                ) : null}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      {index === 0 ? (
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Código / lote
                        </Label>
                      ) : null}
                      <Input
                        placeholder="Ej: L2024-01"
                        value={row.batch_code}
                        onChange={(event) =>
                          onRowChange(row.id, "batch_code", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      {index === 0 ? (
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Vence
                        </Label>
                      ) : null}
                      <Input
                        type="date"
                        value={row.expiration_date ?? ""}
                        onChange={(event) =>
                          onRowChange(row.id, "expiration_date", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      {index === 0 ? (
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Cantidad
                        </Label>
                      ) : null}
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity_units}
                        onChange={(event) =>
                          onRowChange(row.id, "quantity_units", event.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      {index === 0 ? (
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Costo unitario
                        </Label>
                      ) : null}
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unit_cost}
                        onChange={(event) =>
                          onRowChange(row.id, "unit_cost", event.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-start justify-end pt-4">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 text-destructive"
                        onClick={() => onRemoveRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex pb-4 px-4 flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cerrar
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={onAddRow}
              disabled={noWarehouses || !variant}
            >
              <Plus className="h-4 w-4" />
              Registrar inventario
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
