// app/components/CategoryPickerModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { ChevronDown, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { toast } from "sonner";

export type MiniRef = { id: string; name: string };

type CategoryPickerModalProps = {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  selected: MiniRef[];
  setSelected: (next: MiniRef[]) => void;
  title?: string;
  pageSize?: number;
};

export default function CategoryPickerModal({
  open, onClose, organizationId, selected, setSelected, title="Seleccionar categorías", pageSize=12
}: CategoryPickerModalProps) {
  const supabase = getSupabaseBrowser();
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<MiniRef[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectedIds = useMemo(()=> new Set(selected.map(s=>s.id)), [selected]);

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
        // Ajusta a tu tabla de categorías
        let req = supabase
          .from("product_categories")
          .select("id, name, is_active", { count: "exact" })
          .eq("organization_id", organizationId)
          .order("name", { ascending: true })
          .range(from, to);

        if (query.trim()) req = req.ilike("name", `%${query.trim()}%`);
        const { data, error, count } = await req;
        if (error) throw error;

        setCats((data ?? []).map((r:any)=> ({ id: r.id, name: r.name })));
        setTotal(count ?? 0);
      } catch (e:any) {
        toast.error(e?.message || "No se pudieron cargar categorías");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizationId, page, query]);

  function toggleCheck(cat: MiniRef) {
    if (selectedIds.has(cat.id)) {
      setSelected(selected.filter(s => s.id !== cat.id));
    } else {
      setSelected([...selected, cat]);
    }
  }

  function selectVisible() {
    const map = new Map(selected.map(s => [s.id, s]));
    cats.forEach(c => map.set(c.id, c));
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
            <Layers className="w-4 h-4" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar categorías"
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

          <div className="flex flex-col rounded-lg border overflow-hidden ">
            {cats.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center col-span-full">Sin resultados</div>
            )}
            {cats.map((c) => {
              const checked = selectedIds.has(c.id);
              return (
                <label key={c.id} className="hover:bg-gray-100 flex w-full items-center justify-between border-b  px-3 py-2">
                  <span className="truncate text-sm" title={c.name}>{c.name}</span>
                  <Switch checked={checked} onCheckedChange={()=> toggleCheck(c)} />
                </label>
              );
            })}
          </div>

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