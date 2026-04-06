"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useEnvironment } from "@/context/EnvironmentContext";
import { useActiveShift } from "@/context/ActiveShiftContext";
import { useDrivers, useDriverStats } from "@/hooks/useDrivers";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Edit, Trash2, Bike, Car, BikeIcon, Search } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const vehicleIcons: Record<string, any> = {
  moto: Bike,
  carro: Car,
  bicicleta: BikeIcon,
};

const statusColors: Record<string, string> = {
  available: "bg-green-500",
  busy: "bg-yellow-500",
  offline: "bg-gray-500",
};

export default function DriversPage() {
  const { org } = useEnvironment();
  const orgId = org?.id;
  const supabase = getSupabaseBrowser();
  const searchParams = useSearchParams();
  const { activeShift } = useActiveShift();
  
  // Determinar qué location_id usar
  const urlLocationId = searchParams.get("location_id");
  const activeShiftLocationId = activeShift.hasOpenShift ? activeShift.locationId : null;
  const locationToUse = urlLocationId || activeShiftLocationId || null;

  const { drivers, loading, fetchDrivers, deleteDriver } = useDrivers(supabase, orgId ?? null);
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(locationToUse);
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!orgId) return;
      const { data } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name");
      if (data) setLocations(data);
    };
    fetchLocations();
  }, [orgId, supabase]);

  useEffect(() => {
    if (orgId) {
      fetchDrivers(locationToUse ?? undefined);
    }
  }, [orgId, locationToUse]);

  // Actualizar cuando cambia la ubicación del shift activo
  useEffect(() => {
    if (activeShiftLocationId !== null) {
      setSelectedLocationId(activeShiftLocationId);
      fetchDrivers(activeShiftLocationId);
    } else if (!urlLocationId) {
      setSelectedLocationId(null);
      fetchDrivers(undefined);
    }
  }, [activeShiftLocationId, urlLocationId]);

  const filteredDrivers = drivers.filter((d) =>
    d.name?.toLowerCase().includes(q.toLowerCase()) ||
    d.phone?.includes(q) ||
    d.vehicle_plate?.toLowerCase().includes(q.toLowerCase())
  );

  const handleDelete = async (driverId: string) => {
    try {
      await deleteDriver(driverId);
    } catch (err) {
      console.error("Error deleting driver:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const stats = {
    total: drivers.length,
    active: drivers.filter((d) => d.is_active).length,
    available: drivers.filter((d) => d.status === "available").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Domiciliarios</h1>
          <p className="text-muted-foreground">Gestiona los domiciliarios de tu negocio</p>
        </div>
        <Link href="/settings/drivers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Domiciliario
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Domiciliarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.available}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono o placa..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        {activeShift.hasOpenShift ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-md text-sm">
            <span>📦 Caja abierta:</span>
            <span className="font-medium">{activeShift.locationName || "Sin ubicación"}</span>
          </div>
        ) : (
          <select
            value={selectedLocationId ?? ""}
            onChange={(e) => {
              const newValue = e.target.value || null;
              console.log("Location changed to:", newValue);
              setSelectedLocationId(newValue);
              fetchDrivers(newValue ?? undefined);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas las ubicaciones</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        )}
        <Button variant="outline" onClick={() => fetchDrivers(selectedLocationId ?? undefined)}>
          <Loader2 className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Simultáneos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredDrivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay domiciliarios registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredDrivers.map((driver) => {
                const VehicleIcon = vehicleIcons[driver.vehicle_type || "moto"];
                return (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.phone || "—"}</TableCell>
                    <TableCell>{driver.location_name || "Todas"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {VehicleIcon && <VehicleIcon className="h-4 w-4" />}
                        <span className="capitalize">{driver.vehicle_type || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="uppercase">{driver.vehicle_plate || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusColors[driver.status]}`} />
                        <span className="capitalize">{driver.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.commission_value ? (
                        <Badge variant="outline">
                          {driver.commission_type === "fixed" ? "$" : "%"}{" "}
                          {driver.commission_value}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{driver.max_simultaneous_orders || 1}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/settings/drivers/${driver.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar domiciliarios?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará el domiciliario y todos sus datos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(driver.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                {deletingId === driver.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Eliminar"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
