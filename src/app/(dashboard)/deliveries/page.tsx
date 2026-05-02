// app/(dashboard)/deliveries/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useEnvironment } from "@/context/EnvironmentContext";
import { createClient } from "@/utils/supabase/client";
import { Bike, Package, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Types
type DeliveryOrder = {
  id: string;
  invoice_number: string | null;
  created_at: string;
  status: string;
  total: number;
  payment_method: string | null;
  customerName: string;
  shipping_address: any;
  delivery_metadata: any;
  driver_name?: string;
};

const DELIVERY_STATUSES = [
  { value: "NEW", label: "Nuevo", color: "bg-blue-100 text-blue-800", icon: Clock },
  { value: "PREPARING", label: "Preparando", color: "bg-yellow-100 text-yellow-800", icon: Package },
  { value: "OUT_FOR_DELIVERY", label: "En camino", color: "bg-purple-100 text-purple-800", icon: Bike },
  { value: "DELIVERED", label: "Entregado", color: "bg-green-100 text-green-800", icon: CheckCircle },
  { value: "DELIVERY_FAILED", label: "Fallido", color: "bg-red-100 text-red-800", icon: AlertCircle },
];

export default function DeliveriesPage() {
  const { org, locationAccess, currentLocationId, hasOrganizationLevelAccess, isAdmin } = useEnvironment();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    if (!org?.id) {
      console.log("No org.id, stopping");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          created_at,
          status,
          total,
          payment_method,
          customer:customers(name),
          shipping_address,
          delivery_metadata
        `)
        .eq("organization_id", org.id)
        .eq("order_type", "DELIVERY_LOCAL")
        .order("created_at", { ascending: false });

      // If user has a specific location selected (and is not admin/owner), filter by it
      if (currentLocationId && !hasOrganizationLevelAccess) {
        query = query.eq("location_id", currentLocationId);
      }
      // Otherwise, admins/owners see ALL deliveries (no location filter)

      const { data, error } = await query;
      
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Deliveries fetched:", data?.length || 0);

      const formattedOrders: DeliveryOrder[] = (data || []).map((order: any) => ({
        id: order.id,
        invoice_number: order.invoice_number,
        created_at: order.created_at,
        status: order.status,
        total: order.total,
        payment_method: order.payment_method,
        customerName: order.customer?.name || "Sin cliente",
        shipping_address: order.shipping_address,
        delivery_metadata: order.delivery_metadata,
        driver_name: order.delivery_metadata?.assigned_driver_name,
      }));

      setOrders(formattedOrders);
    } catch (err: any) {
      console.error("Error fetching deliveries:", err);
      toast.error("Error al cargar domicilios: " + (err.message || err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, org?.id, currentLocationId, hasOrganizationLevelAccess]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const getStatusConfig = (status: string) => {
    return DELIVERY_STATUSES.find((s) => s.value === status) || DELIVERY_STATUSES[0];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAddress = (shippingAddress: any) => {
    if (!shippingAddress) return "Sin dirección";
    const parts = [];
    if (shippingAddress.street) parts.push(shippingAddress.street);
    if (shippingAddress.number) parts.push(`#${shippingAddress.number}`);
    if (shippingAddress.neighborhood) parts.push(shippingAddress.neighborhood);
    return parts.join(" ") || "Dirección inválida";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando domicilios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domicilios</h1>
          <p className="text-gray-600 mt-1">
            Gestiona las entregas de tu turno
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total del turno"
          value={orders.length.toString()}
          icon={Bike}
          color="blue"
        />
        <StatCard
          title="En preparación"
          value={orders.filter((o) => o.status === "PREPARING").length.toString()}
          icon={Package}
          color="yellow"
        />
        <StatCard
          title="En camino"
          value={orders.filter((o) => o.status === "OUT_FOR_DELIVERY").length.toString()}
          icon={Bike}
          color="purple"
        />
        <StatCard
          title="Entregados"
          value={orders.filter((o) => o.status === "DELIVERED").length.toString()}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          Todos
        </Button>
        {DELIVERY_STATUSES.map((status) => (
          <Button
            key={status.value}
            variant={statusFilter === status.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status.value)}
          >
            {status.label}
          </Button>
        ))}
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Bike className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay domicilios en este turno</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">Pedido</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">Cliente</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">Dirección</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">Estado</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">Total</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">Hora</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusConfig = getStatusConfig(order.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Link
                          href={`/sales?id=${order.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {order.invoice_number || `#${order.id.slice(0, 8)}`}
                        </Link>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{order.customerName}</p>
                          {order.driver_name && (
                            <p className="text-xs text-gray-500">Driver: {order.driver_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                        {getAddress(order.shipping_address)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-gray-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {formatTime(order.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
