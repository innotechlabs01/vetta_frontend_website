"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEnvironment } from "@/context/EnvironmentContext";
import { useDrivers, useDriverStats } from "@/hooks/useDrivers";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Bike, Car, BikeIcon, DollarSign } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { org } = useEnvironment();
  const orgId = org?.id;
  const supabase = getSupabaseBrowser();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<any>(null);
  const [loadingDriver, setLoadingDriver] = useState(true);
  const { stats, earnings, loading: loadingStats, fetchStats } = useDriverStats(supabase, driverId);

  useEffect(() => {
    async function fetchDriver() {
      if (!driverId) return;
      setLoadingDriver(true);
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          *,
          location:locations(name),
          driver_commissions(commission_type, commission_value)
        `)
        .eq("id", driverId)
        .single();

      if (!error && data) {
        setDriver({
          ...data,
          location_name: data.location?.name,
          commission_type: data.driver_commissions?.[0]?.commission_type,
          commission_value: data.driver_commissions?.[0]?.commission_value,
        });
      }
      setLoadingDriver(false);
    }
    fetchDriver();
    fetchStats();
  }, [driverId, supabase, fetchStats]);

  if (loadingDriver) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Domiciliario no encontrado</p>
        <Link href="/settings/drivers">
          <Button variant="link" className="mt-2">
            Volver a la lista
          </Button>
        </Link>
      </div>
    );
  }

  const VehicleIcon = vehicleIcons[driver.vehicle_type || "moto"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/drivers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{driver.name}</h1>
          <p className="text-muted-foreground">Detalles del domiciliario</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Entregados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ganancias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.total_earnings || 0).toLocaleString("es-CO")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Propinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.total_tips || 0).toLocaleString("es-CO")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.average_per_delivery || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${statusColors[driver.status]}`} />
              <span className="capitalize font-medium">{driver.status}</span>
              {!driver.is_active && <Badge variant="destructive">Inactivo</Badge>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p>{driver.phone || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sucursal</p>
              <p>{driver.location_name || "Todas las sucursales"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Vehículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {VehicleIcon && <VehicleIcon className="h-5 w-5" />}
              <span className="capitalize">{driver.vehicle_type || "Sin vehículo"}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Placa</p>
              <p className="uppercase font-mono">{driver.vehicle_plate || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Marca / Modelo</p>
              <p>
                {driver.vehicle_brand || "—"} {driver.vehicle_model ? `/ ${driver.vehicle_model}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comisión</CardTitle>
          </CardHeader>
          <CardContent>
            {driver.commission_value ? (
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-lg font-bold">
                  {driver.commission_type === "fixed" ? "$" : "%"}
                  {driver.commission_value}{" "}
                  {driver.commission_type === "fixed" ? "por entrega" : "por entrega"}
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">Sin comisión configurada</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : earnings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay entregas registradas
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Propina</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell>
                      {new Date(earning.created_at).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>#{earning.order_number || earning.delivery_order_id?.slice(0, 8)}</TableCell>
                    <TableCell>${(earning.commission_amount || 0).toLocaleString("es-CO")}</TableCell>
                    <TableCell>${(earning.tip || 0).toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(earning.total_amount || 0).toLocaleString("es-CO")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
