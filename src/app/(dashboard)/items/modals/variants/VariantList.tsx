"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Boxes,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
  Undo2,
} from "lucide-react";
import type { ProductVariantDraft } from "../../types";

type VariantListProps = {
  variants: ProductVariantDraft[];
  availabilityByVariant: Record<string, string>;
  inventoryByVariant: Record<string, number>;
  generatedFromLabel?: string | null;
  onBulkAdd: () => void;
  onManualAdd: () => void;
  onEdit: (variantId: string) => void;
  onToggleActive: (variantId: string) => void;
  onSetDefault: (variantId: string) => void;
  onToggleDeletion: (variantId: string) => void;
  onFieldChange: (
    variantId: string,
    field: "name" | "sku" | "gtin" | "price" | "weight_grams",
    value: string
  ) => void;
  onOpenAvailability: (variantId: string) => void;
  onOpenInventory: (variantId: string) => void;
  onAssignImage: (variantId: string) => void;
};

export function VariantList({
  variants,
  availabilityByVariant,
  inventoryByVariant,
  generatedFromLabel,
  onBulkAdd,
  onManualAdd,
  onEdit,
  onToggleActive,
  onSetDefault,
  onToggleDeletion,
  onFieldChange,
  onOpenAvailability,
  onOpenInventory,
  onAssignImage,
}: VariantListProps) {
  const ordered = [...variants].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (b.isDefault && !a.isDefault) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Variantes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onManualAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar variante
          </Button>
          <Button size="sm" onClick={onBulkAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar variantes
          </Button>
        </div>
      </div>

      {ordered.length ? (
        <div className="max-w-full overflow-x-auto">
          <div className=" space-y-2">
            <div className="grid grid-cols-[minmax(0,280px)_minmax(0,140px)_minmax(0,140px)_repeat(3,minmax(0,140px))_minmax(0,220px)_minmax(0,240px)] gap-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div>Variante</div>
              <div>Precio</div>
              <div>Inventario</div>
              <div>SKU</div>
              <div>GTIN</div>
              <div>Peso envío (g)</div>
              <div>Disponibilidad</div>
              <div className="text-right">Acciones</div>
            </div>
            {ordered.map((variant) => {
              const totalInventory = inventoryByVariant[variant.id] ?? 0;
              const inventoryLabel =
                totalInventory > 0
                  ? `${totalInventory.toLocaleString("es-CO")} uds`
                  : "Sin registros";

              return (
                <div
                  key={variant.id}
                  className={cn(
                    "grid grid-cols-[minmax(0,280px)_minmax(0,140px)_minmax(0,140px)_repeat(3,minmax(0,140px))_minmax(0,220px)_minmax(0,240px)] items-center gap-3 text-sm",
                    variant.markedForDeletion ? "bg-destructive/5" : ""
                  )}
                >
                <div className="flex items-center max-w-[280px]">
                  <Input
                    value={variant.name}
                    onChange={(event) =>
                      onFieldChange(variant.id, "name", event.target.value)
                    }
                    placeholder="Nombre de la variante"
                    disabled={variant.markedForDeletion}
                    className="h-10 w-full"
                  />
                </div>

                <div className="flex items-center max-w-[160px]">
                  <Input
                    value={variant.price}
                    onChange={(event) =>
                      onFieldChange(variant.id, "price", event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="0"
                    disabled={variant.markedForDeletion}
                    className="h-10 w-full"
                  />
                </div>

                <div className="flex items-center max-w-[160px]">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-start gap-2 text-left font-normal"
                    onClick={() => onOpenInventory(variant.id)}
                    disabled={variant.markedForDeletion}
                  >
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{inventoryLabel}</span>
                  </Button>
                </div>

                <div className="flex items-center max-w-[160px]">
                  <Input
                    value={variant.sku}
                    onChange={(event) =>
                      onFieldChange(variant.id, "sku", event.target.value)
                    }
                    placeholder="SKU interno"
                    disabled={variant.markedForDeletion}
                    className="h-10 w-full"
                  />
                </div>

                <div className="flex items-center max-w-[160px]">
                  <Input
                    value={variant.gtin}
                    onChange={(event) =>
                      onFieldChange(variant.id, "gtin", event.target.value)
                    }
                    placeholder="7701234567890"
                    disabled={variant.markedForDeletion}
                    className="h-10 w-full"
                  />
                </div>

                <div className="flex items-center max-w-[160px]">
                  <Input
                    value={variant.weight_grams}
                    inputMode="decimal"
                    onChange={(event) =>
                      onFieldChange(variant.id, "weight_grams", event.target.value)
                    }
                    placeholder="0"
                    disabled={variant.markedForDeletion}
                    className="h-10 w-full"
                  />
                </div>

                <div className="flex items-center max-w-[220px]">
                  <Button
                    type="button"
                    variant="outline"
                  className="h-10 w-full justify-start gap-2 text-left font-normal"
                    onClick={() => onOpenAvailability(variant.id)}
                    disabled={variant.markedForDeletion}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      {availabilityByVariant[variant.id] ?? "Todas las ubicaciones"}
                    </span>
                  </Button>
                </div>

                <div className="flex max-w-[240px] flex-row items-center justify-end gap-2">
                  <Switch
                    aria-label="Activar variante"
                    checked={variant.isActive}
                    onCheckedChange={() => onToggleActive(variant.id)}
                    disabled={variant.markedForDeletion}
                  />

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onAssignImage(variant.id)}
                    title="Asignar imagen"
                    disabled={variant.markedForDeletion}
                    className="h-10 w-10"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(variant.id)}
                    title="Editar detalles"
                    disabled={variant.markedForDeletion}
                    className="h-10 w-10"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!variant.isDefault ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onSetDefault(variant.id)}
                      title="Marcar como principal"
                      disabled={variant.markedForDeletion}
                      className="h-10 w-10"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    size="icon"
                    variant={variant.markedForDeletion ? "outline" : "ghost"}
                    onClick={() => onToggleDeletion(variant.id)}
                    title={
                      variant.markedForDeletion ? "Restaurar variante" : "Eliminar variante"
                    }
                    className="h-10 w-10"
                  >
                    {variant.markedForDeletion ? (
                      <Undo2 className="h-4 w-4" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          <p className="mb-3">Aún no has creado variantes.</p>
          <Button size="sm" onClick={onBulkAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Crear con sets de opciones
          </Button>
        </div>
      )}
    </div>
  );
}
