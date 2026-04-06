"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
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

type PosTerminal = {
  id: string;
  organization_id: string;
  location_id: string | null;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_online: boolean;
  last_online_at: string | null;
  current_cashier_id: string | null;
  device_uuid: string | null;
  ip_address: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LocationOption = { id: string; name: string };

const TERMINAL_SELECT_COLUMNS =
  "id, organization_id, location_id, code, name, description, is_active, is_online, last_online_at, current_cashier_id, device_uuid, ip_address, created_at, updated_at";

function formatLastOnline(value: string | null) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

type PosTerminalModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  organizationId: string | null;
  terminal: PosTerminal | null;
  locations: LocationOption[];
};

function PosTerminalModal({
  open,
  onClose,
  onSaved,
  organizationId,
  terminal,
  locations,
}: PosTerminalModalProps) {
  const supabase = getSupabaseBrowser();
  const isEdit = Boolean(terminal?.id);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState<string>("none");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(terminal?.code ?? "");
    setName(terminal?.name ?? "");
    setDescription(terminal?.description ?? "");
    setLocationId(terminal?.location_id ?? "none");
    setIsActive(terminal?.is_active ?? true);
  }, [open, terminal]);

  const handleSubmit = useCallback(async () => {
    if (!organizationId) {
      toast.error("Organización no encontrada.");
      return;
    }

    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedCode) {
      toast.error("El código del terminal es obligatorio.");
      return;
    }
    if (!trimmedName) {
      toast.error("El nombre del terminal es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: trimmedCode,
        name: trimmedName,
        description: trimmedDescription ? trimmedDescription : null,
        location_id: locationId === "none" ? null : locationId,
        is_active: isActive,
      };

      if (isEdit && terminal) {
        const { error } = await supabase
          .from("pos_terminals")
          .update(payload)
          .eq("id", terminal.id)
          .eq("organization_id", organizationId)
          .select(TERMINAL_SELECT_COLUMNS)
          .single();

        if (error) throw error;
        toast.success("Terminal actualizada.");
        await Promise.resolve(onSaved());
      } else {
        const { error } = await supabase
          .from("pos_terminals")
          .insert([{ ...payload, organization_id: organizationId }])
          .select(TERMINAL_SELECT_COLUMNS)
          .single();

        if (error) throw error;
        toast.success("Terminal creada.");
        await Promise.resolve(onSaved());
      }

      onClose();
    } catch (error: any) {
      const message =
        error?.message?.includes("duplicate key") || error?.code === "23505"
          ? "Ya existe un terminal con este código."
          : error?.message ?? "No se pudo guardar el terminal.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [
    code,
    description,
    isActive,
    isEdit,
    locationId,
    name,
    onClose,
    onSaved,
    organizationId,
    supabase,
    terminal,
  ]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar terminal POS" : "Nuevo terminal POS"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="terminal-name">Nombre</Label>
              <Input
                id="terminal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Caja principal"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="terminal-code">Código</Label>
              <Input
                id="terminal-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="POS-01"
              />
              <p className="text-xs text-muted-foreground">
                Usa un identificador corto. Debe ser único dentro de la organización.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="terminal-location">Sucursal asignada</Label>
              <Select value={locationId} onValueChange={(value) => setLocationId(value)}>
                <SelectTrigger id="terminal-location">
                  <SelectValue placeholder="Selecciona sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin sucursal</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="terminal-description">Descripción</Label>
              <Textarea
                id="terminal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notas internas sobre este terminal."
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Terminal activa</p>
              <p className="text-xs text-muted-foreground">
                Controla si el terminal puede usarse para registrar ventas.
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
            {isEdit ? "Guardar cambios" : "Crear terminal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PosTerminalsPage() {
  const supabase = getSupabaseBrowser();
  const { org } = useEnvironment();
  const organizationId = org?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PosTerminal | null>(null);

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((loc) => map.set(loc.id, loc.name));
    return map;
  }, [locations]);

  const fetchTerminals = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!organizationId) {
        setTerminals([]);
        if (mode === "initial") setLoading(false);
        if (mode === "refresh") setRefreshing(false);
        return;
      }

      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);

      try {
        const { data, error } = await supabase
          .from("pos_terminals")
          .select(TERMINAL_SELECT_COLUMNS)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTerminals((data as PosTerminal[]) ?? []);
      } catch (error: any) {
        toast.error(error?.message ?? "Error cargando terminales.");
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
    fetchTerminals("initial");
  }, [fetchLocations, fetchTerminals]);

  const filteredTerminals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return terminals;

    return terminals.filter((terminal) => {
      const locationName = terminal.location_id ? locationMap.get(terminal.location_id) ?? "" : "";
      return (
        terminal.name.toLowerCase().includes(query) ||
        terminal.code.toLowerCase().includes(query) ||
        (terminal.description ?? "").toLowerCase().includes(query) ||
        locationName.toLowerCase().includes(query)
      );
    });
  }, [locationMap, search, terminals]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSaved = useCallback(async () => {
    await fetchTerminals("refresh");
  }, [fetchTerminals]);

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">POS Terminales</h1>
          <p className="text-sm text-muted-foreground">
            Administra los terminales físicos usados para cobrar en mostrador.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void fetchTerminals("refresh")}
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
            Nuevo terminal
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, código o sucursal"
          className="max-w-md"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[220px]">Terminal</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Conectividad</TableHead>
              <TableHead>Última conexión</TableHead>
              <TableHead className="w-[80px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando terminales...
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && filteredTerminals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {search
                      ? "No encontramos terminales con ese criterio."
                      : "Aún no tienes terminales POS registrados."}
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading &&
              filteredTerminals.map((terminal) => {
                const locationName = terminal.location_id
                  ? locationMap.get(terminal.location_id) ?? "Sucursal no encontrada"
                  : "Sin sucursal";

                return (
                  <TableRow key={terminal.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium leading-tight text-gray-900">{terminal.name}</div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{terminal.code}</div>
                        {terminal.description ? (
                          <div className="text-xs text-muted-foreground">{terminal.description}</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{locationName}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          terminal.is_active
                            ? "border-transparent bg-emerald-100 text-emerald-700"
                            : "border-transparent bg-gray-200 text-gray-600"
                        }
                      >
                        {terminal.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        <Badge
                          className={
                            terminal.is_online
                              ? "border-transparent bg-emerald-100 text-emerald-700"
                              : "border-transparent bg-gray-200 text-gray-600"
                          }
                        >
                          {terminal.is_online ? "En línea" : "Sin conexión"}
                        </Badge>
                        {terminal.ip_address ? (
                          <span className="text-xs text-muted-foreground">IP: {terminal.ip_address}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatLastOnline(terminal.last_online_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(terminal);
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

      <PosTerminalModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        organizationId={organizationId}
        terminal={editing}
        locations={locations}
      />
    </div>
  );
}
