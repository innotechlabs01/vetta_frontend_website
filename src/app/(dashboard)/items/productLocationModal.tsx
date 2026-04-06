import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { Badge, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_available: boolean | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  item_type?: 'physical' | 'prepared_food' | 'digital' | 'medication' | 'other' | null;
};

export default  function ProductLocationsModal({
  open,
  onClose,
  organizationId,
  productId,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  productId: string;
}) {
  const supabase = getSupabaseBrowser();
  const [locs, setLocs] = useState<{ id: string; name: string }[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !organizationId || !productId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: L, error: Lerr } = await supabase
          .from('locations')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true });
        if (Lerr) throw Lerr;
        setLocs((L || []) as any);

        const { data: PL, error: PLerr } = await supabase
          .from('product_locations')
          .select('location_id, is_available')
          .eq('product_id', productId);
        if (PLerr) throw PLerr;
        setEnabled(new Set((PL || []).filter((r: any) => r.is_available).map((r: any) => r.location_id)));
      } catch (e: any) {
        toast.error(e?.message || 'No se pudo cargar ubicaciones del producto');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, organizationId, productId, supabase]);

  const toggle = (id: string) => {
    const n = new Set(enabled);
    n.has(id) ? n.delete(id) : n.add(id);
    setEnabled(n);
  };

  async function save() {
    try {
      setLoading(true);
      const rows = locs.map((l) => ({
        organization_id: organizationId,
        product_id: productId,
        location_id: l.id,
        is_available: enabled.has(l.id),
      }));
      const { error } = await supabase.from('product_locations').upsert(rows, { onConflict: 'product_id,location_id' });
      if (error) throw error;
      toast.success('Disponibilidad por ubicación (producto) actualizada');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-md gap-3">
        <DialogHeader>
          <DialogTitle>Ubicaciones del producto</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Controla en qué ubicaciones estará disponible este producto (configuración global, independiente de variantes).
          </p>
        </DialogHeader>
        <div className="border rounded-md max-h-[360px] overflow-auto divide-y">
          {locs.map((l) => (
            <label key={l.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{l.name}</span>
              <Switch checked={enabled.has(l.id)} onCheckedChange={() => toggle(l.id)} />
            </label>
          ))}
          {locs.length === 0 && <div className="p-6 text-sm text-muted-foreground">Sin ubicaciones</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}