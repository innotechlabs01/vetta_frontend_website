"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import { usePrinterContext } from "@/context/PrinterContext";
import { getPrinterLabel, normalizePrinterConfig, type PrinterConfig } from "@/utils/printer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

type PrintZone = {
  id: string;
  organization_id: string;
  location_id: string;
  name: string;
  description: string | null;
  printer_config: PrinterConfig | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type LocationOption = { id: string; name: string };

const ZONE_SELECT_COLUMNS =
  "id, organization_id, location_id, name, description, printer_config, is_active, created_at, updated_at";

function getPrinterDetails(printer: PrinterConfig | null) {
  if (!printer) return "";
  const portName = typeof printer.portName === "string" ? printer.portName : null;
  const driverName = typeof printer.driverName === "string" ? printer.driverName : null;
  const host = typeof printer.host === "string" ? printer.host : null;
  const mode = typeof printer.mode === "string" ? printer.mode.toUpperCase() : null;
  const parts = [host, portName, mode, driverName].filter(Boolean);
  return parts.join(" • ");
}

type PrintZoneModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  organizationId: string | null;
  zone: PrintZone | null;
  locations: LocationOption[];
};

function PrintZoneModal({
  open,
  onClose,
  onSaved,
  organizationId,
  zone,
  locations,
}: PrintZoneModalProps) {
  const supabase = getSupabaseBrowser();
  const isEdit = Boolean(zone?.id);
  const {
    printers,
    loading: printersLoading,
    error: printersError,
    hasBridge,
    refresh,
  } = usePrinterContext();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState<string>("none");
  const [isActive, setIsActive] = useState(true);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);
  const [printerName, setPrinterName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(zone?.name ?? "");
    setDescription(zone?.description ?? "");
    setLocationId(zone?.location_id ?? "none");
    setIsActive(zone?.is_active ?? true);
    const normalizedPrinter = normalizePrinterConfig(zone?.printer_config ?? null);
    setPrinterConfig(normalizedPrinter);
    setPrinterName(normalizedPrinter?.name ?? "");
  }, [open, zone]);

  const storedPrinter = useMemo(() => {
    if (!printerConfig?.name) return null;
    const exists = printers.some((printer) => printer.name === printerConfig.name);
    return exists ? null : printerConfig;
  }, [printerConfig, printers]);

  const handleSubmit = useCallback(async () => {
    if (!organizationId) {
      toast.error("Organizacion no encontrada.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedPrinterName = printerName.trim();
    const normalizedPrinter = normalizePrinterConfig(
      printerConfig ?? (trimmedPrinterName ? { name: trimmedPrinterName } : null),
    );

    if (!trimmedName) {
      toast.error("El nombre de la zona es obligatorio.");
      return;
    }
    if (!locationId || locationId === "none") {
      toast.error("Selecciona una sucursal.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        description: trimmedDescription ? trimmedDescription : null,
        location_id: locationId,
        is_active: isActive,
        printer_config: normalizedPrinter,
      };

      if (isEdit && zone) {
        const { error } = await supabase
          .from("pos_print_zones")
          .update(payload)
          .eq("id", zone.id)
          .eq("organization_id", organizationId)
          .select(ZONE_SELECT_COLUMNS)
          .single();

        if (error) throw error;
        toast.success("Zona actualizada.");
        await Promise.resolve(onSaved());
      } else {
        const { error } = await supabase
          .from("pos_print_zones")
          .insert([{ ...payload, organization_id: organizationId }])
          .select(ZONE_SELECT_COLUMNS)
          .single();

        if (error) throw error;
        toast.success("Zona creada.");
        await Promise.resolve(onSaved());
      }

      onClose();
    } catch (error: any) {
      toast.error(error?.message ?? "No se pudo guardar la zona.");
    } finally {
      setSaving(false);
    }
  }, [
    description,
    isActive,
    isEdit,
    locationId,
    name,
    onClose,
    onSaved,
    organizationId,
    printerConfig,
    printerName,
    supabase,
    zone,
  ]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar zona de impresion" : "Nueva zona de impresion"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="zone-name">Nombre</Label>
              <Input
                id="zone-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zona cocina"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zone-location">Sucursal asignada</Label>
              <Select value={locationId} onValueChange={(value) => setLocationId(value)}>
                <SelectTrigger id="zone-location">
                  <SelectValue placeholder="Selecciona sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Selecciona sucursal
                  </SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Impresora</Label>
              {hasBridge ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={printerName || "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setPrinterName("");
                          setPrinterConfig(null);
                          return;
                        }
                        const selected = printers.find((printer) => printer.name === value) ?? null;
                        setPrinterName(value);
                        setPrinterConfig(selected ?? { name: value });
                      }}
                    >
                      <SelectTrigger id="zone-printer">
                        <SelectValue placeholder="Selecciona impresora" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin impresora</SelectItem>
                        {storedPrinter ? (
                          <SelectItem value={storedPrinter.name}>
                            {getPrinterLabel(storedPrinter)} (guardada)
                          </SelectItem>
                        ) : null}
                        {printers.map((printer) => (
                          <SelectItem key={printer.name} value={printer.name}>
                            {getPrinterLabel(printer)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void refresh()}
                      disabled={printersLoading}
                    >
                      {printersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
                    </Button>
                  </div>
                  {printersError ? (
                    <p className="text-xs text-red-600">{printersError}</p>
                  ) : null}
                  {printerConfig ? (
                    <p className="text-xs text-muted-foreground">
                      Seleccion actual: {getPrinterLabel(printerConfig)}
                      {getPrinterDetails(printerConfig) ? ` • ${getPrinterDetails(printerConfig)}` : ""}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={printerName}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPrinterName(next);
                      setPrinterConfig(next.trim() ? { name: next.trim() } : null);
                    }}
                    placeholder="Nombre de impresora"
                  />
                  <p className="text-xs text-muted-foreground">
                    La lista de impresoras solo esta disponible en la app de escritorio.
                  </p>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zone-description">Descripcion</Label>
              <Textarea
                id="zone-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notas internas sobre esta zona."
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Zona activa</p>
              <p className="text-xs text-muted-foreground">
                Controla si esta zona puede recibir impresiones automaticas.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} />
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Guardar cambios" : "Crear zona"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PrintZonesPage() {
  const supabase = getSupabaseBrowser();
  const { org } = useEnvironment();
  const organizationId = org?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [zones, setZones] = useState<PrintZone[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrintZone | null>(null);

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((loc) => map.set(loc.id, loc.name));
    return map;
  }, [locations]);

  const fetchZones = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!organizationId) {
        setZones([]);
        if (mode === "initial") setLoading(false);
        if (mode === "refresh") setRefreshing(false);
        return;
      }

      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);

      try {
        const { data, error } = await supabase
          .from("pos_print_zones")
          .select(ZONE_SELECT_COLUMNS)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        const mapped = (data as PrintZone[] | null)?.map((row) => ({
          ...row,
          printer_config: normalizePrinterConfig(row.printer_config ?? null),
        }));
        setZones(mapped ?? []);
      } catch (error: any) {
        toast.error(error?.message ?? "Error cargando zonas.");
      } finally {
        if (mode === "initial") setLoading(false);
        if (mode === "refresh") setRefreshing(false);
      }
    },
    [organizationId, supabase],
  );

  const fetchLocations = useCallback(async () => {
    if (!organizationId) {
      setLocations([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id,name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (error) throw error;
      setLocations((data as LocationOption[]) ?? []);
    } catch (error: any) {
      toast.error(error?.message ?? "Error cargando sucursales.");
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    fetchLocations();
    fetchZones("initial");
  }, [fetchLocations, fetchZones]);

  const filteredZones = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return zones;

    return zones.filter((zone) => {
      const locationName = zone.location_id ? locationMap.get(zone.location_id) ?? "" : "";
      const printerLabel = getPrinterLabel(zone.printer_config ?? null);
      return (
        zone.name.toLowerCase().includes(query) ||
        (zone.description ?? "").toLowerCase().includes(query) ||
        locationName.toLowerCase().includes(query) ||
        printerLabel.toLowerCase().includes(query)
      );
    });
  }, [locationMap, search, zones]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSaved = useCallback(async () => {
    await fetchZones("refresh");
  }, [fetchZones]);

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Zonas de impresion</h1>
          <p className="text-sm text-muted-foreground">
            Asigna impresoras por zona para imprimir automaticamente comandas al pasar pedidos a preparacion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void fetchZones("refresh")}
            disabled={loading || refreshing}
          >
            {loading || refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            disabled={!organizationId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva zona
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, impresora o sucursal"
          className="max-w-md"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[240px]">Zona</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Impresora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando zonas...
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && filteredZones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {search ? "No encontramos zonas con ese criterio." : "Aun no tienes zonas registradas."}
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading &&
              filteredZones.map((zone) => {
                const locationName = zone.location_id
                  ? locationMap.get(zone.location_id) ?? "Sucursal no encontrada"
                  : "Sin sucursal";
                const printerLabel = getPrinterLabel(zone.printer_config ?? null);
                const printerDetails = getPrinterDetails(zone.printer_config ?? null);

                return (
                  <TableRow key={zone.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium leading-tight text-gray-900">{zone.name}</div>
                        {zone.description ? (
                          <div className="text-xs text-muted-foreground">{zone.description}</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{locationName}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>{printerLabel}</div>
                        {printerDetails ? (
                          <div className="text-xs text-muted-foreground">{printerDetails}</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          zone.is_active
                            ? "border-transparent bg-emerald-100 text-emerald-700"
                            : "border-transparent bg-gray-200 text-gray-600"
                        }
                      >
                        {zone.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(zone);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <PrintZoneModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        organizationId={organizationId}
        zone={editing}
        locations={locations}
      />
    </div>
  );
}
