'use client';

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProductItemType } from "../types";
import type { ReactNode } from "react";

export type ItemTypeOption = {
  key: ProductItemType;
  title: string;
  subtitle: string;
  icon: ReactNode;
};

type ItemTypeDialogProps = {
  open: boolean;
  onClose: () => void;
  value: ProductItemType;
  onChange: (value: ProductItemType) => void;
  options: ItemTypeOption[];
};

export function ItemTypeDialog({
  open,
  onClose,
  value,
  onChange,
  options,
}: ItemTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cambiar tipo de ítem</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-6">
          {options.map((opt) => {
            const active = value === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  onClose();
                }}
                className={`w-full text-left border rounded-xl p-3 flex items-start gap-3 hover:bg-muted/60 ${
                  active ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="mt-0.5">{opt.icon}</div>
                <div className="flex-1">
                  <div className="font-medium">
                    {opt.title}{" "}
                    {active ? <Badge className="ml-2">Actual</Badge> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {opt.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="pb-6 px-6">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
