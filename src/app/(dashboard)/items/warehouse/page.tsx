"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WarehouseModal, type WarehouseRecord } from "../modals/warehouseModal";

type Option = { id: string; name: string };

export default function WarehousesPage() {
  const { org } = useEnvironment();
  const organizationId = org?.id || null;
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<WarehouseRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadWarehouses = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("warehouses")
        .select(
          "id, organization_id, name, description, location_id, created_at, updated_at, location:locations(id, name)"
        )
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const rows =
        (data || []).map((row: any) => {
          const locationRecord = Array.isArray(row.location)
            ? row.location[0]
            : row.location;
          return {
            id: row.id,
            organization_id: row.organization_id,
            name: row.name,
            description: row.description ?? null,
            location_id: row.location_id,
            created_at: row.created_at ?? null,
            updated_at: row.updated_at ?? null,
            location_name: locationRecord?.name ?? null,
          };
        }) ?? [];
      setWarehouses(rows);
    } catch (err: any) {
      toast.error(err?.message || "No se pudieron cargar las bodegas");
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (error) throw error;
      setLocations((data || []) as Option[]);
    } catch (err: any) {
      toast.error(err?.message || "No se pudieron cargar las sucursales");
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    loadWarehouses();
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filteredWarehouses = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return warehouses;
    return warehouses.filter((wh) => {
      const nameMatch = wh.name?.toLowerCase().includes(term);
      const branchMatch = wh.location_name?.toLowerCase().includes(term);
      return Boolean(nameMatch || branchMatch);
    });
  }, [warehouses, query]);

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const openEdit = (warehouse: WarehouseRecord) => {
    setEditing(warehouse);
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
  };

  const handleSaved = (warehouse: WarehouseRecord) => {
    setWarehouses((prev) => {
      const index = prev.findIndex((row) => row.id === warehouse.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = warehouse;
        return next;
      }
      return [warehouse, ...prev];
    });
    closeModal();
  };

  const handleDeleted = (id: string) => {
    setWarehouses((prev) => prev.filter((row) => row.id !== id));
  };

  const deleteWarehouse = async (warehouse: WarehouseRecord) => {
    if (!organizationId) return;
    const confirmDelete = window.confirm(
      `¿Eliminar la bodega "${warehouse.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(warehouse.id);
      const { error } = await supabase
        .from("warehouses")
        .delete()
        .eq("id", warehouse.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
      toast.success("Bodega eliminada");
      handleDeleted(warehouse.id);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo eliminar la bodega");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 px-10 pt-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Bodegas</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las bodegas por sucursal para controlar tu inventario.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
            <div className="flex w-full items-center gap-2 md:max-w-sm">
              <Input
                placeholder="Buscar bodegas o sucursales..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={loadWarehouses}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Button onClick={openCreate} disabled={!organizationId || !locations.length}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva bodega
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando bodegas...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredWarehouses.length ? (
              filteredWarehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell>{warehouse.location_name || "Sin sucursal"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {warehouse.description || "—"}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(warehouse)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWarehouse(warehouse)}
                      disabled={deletingId === warehouse.id}
                    >
                      {deletingId === warehouse.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {query
                    ? "No se encontraron bodegas que coincidan con tu búsqueda."
                    : "Aún no hay bodegas registradas. Crea la primera para comenzar."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <WarehouseModal
        open={openModal}
        onClose={closeModal}
        onSaved={handleSaved}
        organizationId={organizationId}
        warehouse={editing}
        locations={locations}
      />
    </div>
  );
}
