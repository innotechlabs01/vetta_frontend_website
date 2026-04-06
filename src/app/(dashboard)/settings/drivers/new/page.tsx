"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEnvironment } from "@/context/EnvironmentContext";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { createDriverAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, User, Phone, Car, DollarSign, ToggleLeft, Package } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { VehicleType, CommissionType } from "@/types/drivers";

export default function NewDriverPage() {
  const router = useRouter();
  const { org } = useEnvironment();
  const orgId = org?.id;
  const supabase = getSupabaseBrowser();

  const [isPending, startTransition] = useTransition();

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location_id: "",
    vehicle_type: "" as VehicleType | "",
    vehicle_plate: "",
    vehicle_brand: "",
    vehicle_model: "",
    is_active: true,
    status: "available" as "available" | "busy" | "offline",
    commission_type: "fixed" as CommissionType,
    commission_value: "",
    max_simultaneous_orders: 1,
  });

  useEffect(() => {
    async function fetchLocations() {
      if (!orgId) return;
      setLoadingLocations(true);
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");

      if (!error && data) {
        setLocations(data);
      }
      setLoadingLocations(false);
    }
    fetchLocations();
  }, [supabase, orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("No se encontró la organización");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    const driverInput = {
      organization_id: orgId,
      name: formData.name.trim(),
      phone: formData.phone || undefined,
      location_id: formData.location_id || undefined,
      vehicle_type: (formData.vehicle_type as VehicleType) || undefined,
      vehicle_plate: formData.vehicle_plate || undefined,
      vehicle_brand: formData.vehicle_brand || undefined,
      vehicle_model: formData.vehicle_model || undefined,
      is_active: formData.is_active,
      status: formData.status,
      max_simultaneous_orders: formData.max_simultaneous_orders,
    };

    const commission = formData.commission_value
      ? {
          commission_type: formData.commission_type,
          commission_value: parseFloat(formData.commission_value),
        }
      : undefined;

    startTransition(async () => {
      try {
        await createDriverAction(driverInput, commission);
        toast.success("Domiciliario creado exitosamente");
        router.refresh();
        router.push("/settings/drivers");
      } catch (err: any) {
        console.error("Error creating driver:", err);
        toast.error(err.message || "Error al crear domiciliarios");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/drivers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Domiciliario</h1>
          <p className="text-muted-foreground">Agrega un nuevo domiciliario a tu equipo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Información del Domiciliario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Nombre completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  placeholder="Número de teléfono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                Sucursal
              </Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                disabled={locations.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={locations.length === 0 ? "No hay sucursales disponibles" : "Selecciona una sucursal"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5" />
              Información del Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Tipo de vehículo</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_type: value as VehicleType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moto">Motocicleta</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_plate">Placa</Label>
                <Input
                  id="vehicle_plate"
                  placeholder="ABC-123"
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicle_brand">Marca</Label>
                <Input
                  id="vehicle_brand"
                  placeholder="Yamaha, Honda, etc."
                  value={formData.vehicle_brand}
                  onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_model">Modelo</Label>
                <Input
                  id="vehicle_model"
                  placeholder="Modelo del vehículo"
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Comisión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commission_type">Tipo de comisión</Label>
                <Select
                  value={formData.commission_type}
                  onValueChange={(value) => setFormData({ ...formData, commission_type: value as CommissionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fija ($)</SelectItem>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission_value">
                  Valor {formData.commission_type === "fixed" ? "($)" : "(%)"}
                </Label>
                <Input
                  id="commission_value"
                  type="number"
                  placeholder={formData.commission_type === "fixed" ? "3000" : "15"}
                  value={formData.commission_value}
                  onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ToggleLeft className="h-5 w-5" />
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
              />
              <Label htmlFor="is_active">Activo</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado inicial</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="busy">Ocupado</SelectItem>
                  <SelectItem value="offline">Desconectado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Límite de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="max_simultaneous_orders">Pedidos simultáneos máximos</Label>
              <Input
                id="max_simultaneous_orders"
                type="number"
                min="1"
                max="10"
                value={formData.max_simultaneous_orders}
                onChange={(e) => setFormData({ ...formData, max_simultaneous_orders: parseInt(e.target.value) || 1 })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-4">
          <Link href="/settings/drivers">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Creando..." : "Crear Domiciliario"}
          </Button>
        </div>
      </form>
    </div>
  );
}
