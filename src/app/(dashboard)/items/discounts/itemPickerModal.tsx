// app/components/ItemPickerModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { ChevronDown, Package } from "lucide-react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { toast } from "sonner";

export type MiniRef = { id: string; name: string };

type ItemPickerModalProps = {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  selected: MiniRef[];                   // seleccionados actuales
  setSelected: (next: MiniRef[]) => void;
  title?: string;
  pageSize?: number;
};

export default function ItemPickerModal({
  open, onClose, organizationId, selected, setSelected, title = "Seleccionar ítems", pageSize = 12,
}: ItemPickerModalProps) {
  const supabase = getSupabaseBrowser();
  const [query, setQuery] = useState("");
  const [isOnlyActive, setIsOnlyActive] = useState(true);

  const [items, setItems] = useState<MiniRef[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectedIds = useMemo(() => new Set(selected.map(s => s.id)), [selected]);

  useEffect(() => {
    if (!open || !organizationId) return;
    setQuery("");
    setPage(1);
  }, [open, organizationId]);

  useEffect(() => {
    if (!open || !organizationId) return;
    (async () => {
      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        // Ajusta el nombre de tu tabla y columnas (aquí asumo "products")
        let req = supabase
          .from("products")
          .select("id, name, is_available", { count: "exact" })
          .eq("organization_id", organizationId)
          .order("name", { ascending: true })
          .range(from, to);

        if (query.trim()) req = req.ilike("name", `%${query.trim()}%`);
        if (isOnlyActive) req = req.eq("is_available", true);

        const { data, error, count } = await req;
        if (error) throw error;

        setItems((data ?? []).map((r: any) => ({ id: r.id, name: r.name })));
        setTotal(count ?? 0);
      } catch (e: any) {
        toast.error(e?.message || "No se pudieron cargar los ítems");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizationId, page, query, isOnlyActive]);

  function toggleCheck(it: MiniRef) {
    if (selectedIds.has(it.id)) {
      setSelected(selected.filter(s => s.id !== it.id));
    } else {
      setSelected([...selected, it]);
    }
  }

  function selectVisible() {
    const map = new Map(selected.map(s => [s.id, s]));
    items.forEach(it => map.set(it.id, it));
    setSelected(Array.from(map.values()));
  }

  function clearAll() {
    setSelected([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v)=> (v ? null : onClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar ítems por nombre"
              value={query}
              onChange={(e)=> { setPage(1); setQuery(e.target.value); }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1">
                  <ChevronDown className="w-4 h-4" />
                  Acciones
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={selectVisible}
                >
                  Seleccionar visibles
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={clearAll}
                >
                  Limpiar selección
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="text-sm">
              <div className="font-medium">Solo activos</div>
              <div className="text-xs text-muted-foreground">Filtra por ítems disponibles</div>
            </div>
            <Switch checked={isOnlyActive} onCheckedChange={setIsOnlyActive}/>
          </div>

          {/* Grid de resultados */}
          <div className="flex flex-col rounded-lg border overflow-hidden ">
            {items.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center col-span-full">Sin resultados</div>
            )}
            {items.map((it) => {
              const checked = selectedIds.has(it.id);
              return (
                <label key={it.id} className="flex w-full items-center justify-between border-b px-3 py-2">
                  <span className="truncate text-sm" title={it.name}>{it.name}</span>
                  <Switch checked={checked} onCheckedChange={()=> toggleCheck(it)} />
                </label>
              );
            })}
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between text-sm">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>Siguiente</Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={onClose}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}