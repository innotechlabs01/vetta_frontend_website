'use client';

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MiniModifierSet } from "../types";
import { X } from "lucide-react";

type ModifierSetPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  allModifierSets: MiniModifierSet[];
  value: string[];
  onChange: (ids: string[]) => void;
};

export function ModifierSetPickerDialog({
  open,
  onClose,
  allModifierSets,
  value,
  onChange,
}: ModifierSetPickerDialogProps) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allModifierSets;
    return allModifierSets.filter((set) => {
      const name = set.name.toLowerCase();
      const display = (set.display_name ?? "").toLowerCase();
      return name.includes(term) || display.includes(term);
    });
  }, [q, allModifierSets]);

  const toggle = (id: string) => {
    onChange(
      value.includes(id)
        ? value.filter((currentId) => currentId !== id)
        : [...value, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Seleccionar conjuntos de modificadores</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Buscar conjunto..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <div className="max-h-72 overflow-auto space-y-2 pr-1">
            {filtered.length ? (
              filtered.map((set) => (
                <label
                  key={set.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={value.includes(set.id)}
                    onChange={() => toggle(set.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{set.name}</span>
                      {!set.is_active ? (
                        <Badge variant="outline">Inactivo</Badge>
                      ) : null}
                      {set.require_selection ? (
                        <Badge variant="secondary">Obligatorio</Badge>
                      ) : null}
                    </div>
                    {set.display_name ? (
                      <div className="text-xs text-muted-foreground">
                        {set.display_name}
                      </div>
                    ) : null}
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Min {set.min_selections ?? 0}
                      {set.max_selections != null
                        ? ` · Max ${set.max_selections}`
                        : ""}
                    </div>
                  </div>
                </label>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Sin resultados</div>
            )}
          </div>

          {value.length ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {value.map((id) => {
                const set = allModifierSets.find((item) => item.id === id);
                if (!set) return null;
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1">
                    {set.display_name || set.name}
                    <button className="ml-1" onClick={() => toggle(id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hecho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
