'use client';

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MiniCategory } from "../types";
import { X } from "lucide-react";

type CategoryPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  allCategories: MiniCategory[];
  value: string[];
  onChange: (ids: string[]) => void;
};

export function CategoryPickerDialog({
  open,
  onClose,
  allCategories,
  value,
  onChange,
}: CategoryPickerDialogProps) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term
      ? allCategories.filter((category) =>
          category.name.toLowerCase().includes(term)
        )
      : allCategories;
  }, [q, allCategories]);

  const toggle = (id: string) => {
    onChange(
      value.includes(id)
        ? value.filter((currentId) => currentId !== id)
        : [...value, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Seleccionar categorías</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-5">
          <Input
            placeholder="Buscar categoría…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <div className="max-h-72 overflow-auto space-y-1 pr-1">
            {filtered.length ? (
              filtered.map((category) => (
                <label key={category.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={value.includes(category.id)}
                    onChange={() => toggle(category.id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Sin resultados</div>
            )}
          </div>

          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-2">
              {value.map((id) => {
                const category = allCategories.find((item) => item.id === id);
                if (!category) return null;
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1">
                    {category.name}
                    <button className="ml-1" onClick={() => toggle(id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : null}
        </div>

        <DialogFooter className="pb-4 px-4">
          <Button variant="outline" onClick={onClose}>
            Hecho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
