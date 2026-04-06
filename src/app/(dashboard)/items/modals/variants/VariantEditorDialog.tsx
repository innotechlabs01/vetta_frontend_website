"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { ProductVariantDraft } from "../../types";

type VariantEditorDialogProps = {
  open: boolean;
  variant: ProductVariantDraft | null;
  onClose: () => void;
  onSave: (variant: ProductVariantDraft) => void;
  disableDefaultToggle?: boolean;
};

export function VariantEditorDialog({
  open,
  variant,
  onClose,
  onSave,
  disableDefaultToggle = false,
}: VariantEditorDialogProps) {
  const [local, setLocal] = useState<ProductVariantDraft | null>(variant);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocal(variant);
    setError(null);
  }, [variant]);

  const title = useMemo(() => {
    if (!variant?.id) return "Nueva variante";
    return variant.isNew ? "Nueva variante" : "Editar variante";
  }, [variant]);

  const handleSave = () => {
    if (!local) return;
    if (!local.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    const next: ProductVariantDraft = {
      ...local,
      name: local.name.trim(),
      sku: local.sku.trim(),
      gtin: local.gtin.trim(),
      price: local.price.trim(),
      weight_grams: local.weight_grams.trim(),
      options: { ...(local.options ?? {}) },
    };

    setError(null);
    onSave(next);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {local ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={local.name}
                onChange={(event) =>
                  setLocal((prev) =>
                    prev ? { ...prev, name: event.target.value } : prev
                  )
                }
                placeholder="Variante principal"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={local.sku}
                  onChange={(event) =>
                    setLocal((prev) =>
                      prev ? { ...prev, sku: event.target.value } : prev
                    )
                  }
                  placeholder="SKU interno"
                />
              </div>
              <div className="space-y-2">
                <Label>Código de barras / GTIN</Label>
                <Input
                  value={local.gtin}
                  onChange={(event) =>
                    setLocal((prev) =>
                      prev ? { ...prev, gtin: event.target.value } : prev
                    )
                  }
                  placeholder="7701234567890"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Precio</Label>
                <Input
                  value={local.price}
                  inputMode="decimal"
                  onChange={(event) =>
                    setLocal((prev) =>
                      prev ? { ...prev, price: event.target.value } : prev
                    )
                  }
                  placeholder="25000"
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (g)</Label>
                <Input
                  value={local.weight_grams}
                  inputMode="decimal"
                  onChange={(event) =>
                    setLocal((prev) =>
                      prev ? { ...prev, weight_grams: event.target.value } : prev
                    )
                  }
                  placeholder="100"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="variant-default"
                  checked={local.isDefault}
                  onCheckedChange={(checked) =>
                    setLocal((prev) =>
                      prev && !disableDefaultToggle
                        ? { ...prev, isDefault: checked }
                        : prev
                    )
                  }
                  disabled={disableDefaultToggle}
                />
                <Label htmlFor="variant-default" className="cursor-pointer">
                  Marcar como variante principal
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="variant-active"
                  checked={local.isActive}
                  onCheckedChange={(checked) =>
                    setLocal((prev) =>
                      prev ? { ...prev, isActive: checked } : prev
                    )
                  }
                />
                <Label htmlFor="variant-active" className="cursor-pointer">
                  Variante activa
                </Label>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar variante</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
