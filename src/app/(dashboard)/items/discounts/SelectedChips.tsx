// app/components/SelectedChips.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export type MiniRef = { id: string; name: string };

export default function SelectedChips({
  items, onRemove,
}: { items: MiniRef[]; onRemove: (id: string)=>void }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(it => (
        <Badge key={it.id} variant="secondary" className="flex items-center gap-2">
          <span className="truncate max-w-[200px]" title={it.name}>{it.name}</span>
          <button className="opacity-70 hover:opacity-100" onClick={()=> onRemove(it.id)} title="Quitar">
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}