// src/app/(dashboard)/organization/dashboard/page.tsx
"use client";

import { useEnvironment } from "@/context/EnvironmentContext";
import { useOrganizationAnalytics, type LocationPerformance } from "@/hooks/useOrganizationAnalytics";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Activity 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OrganizationDashboardPage() {
  const { org, hasOrganizationLevelAccess, isAdmin } = useEnvironment();
  const { metrics, locationPerformance, loading, error, refresh } = useOrganizationAnalytics(org?.id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Check access permissions
  if (!hasOrganizationLevelAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">
              No tienes acceso a este dashboard. Contacta al administrador de tu organización.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Selecciona una organización para ver sus métricas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("es-CO").format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 5) return "text-green-600";
    if (value < -5) return "text-red-600";
    return "text-gray-500";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de {org.name}</h1>
          <p className="text-gray-500">Vista consolidada de todas las sucursales</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-red-700">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ventas Hoy
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.revenueToday || 0)}
            </div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(metrics?.comparisonVsYesterday || 0)}`}>
              {getTrendIcon(metrics?.comparisonVsYesterday || 0)}
              <span>vs ayer</span>
              <span className="font-medium">
                {formatPercentage(metrics?.comparisonVsYesterday || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pedidos Hoy
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(metrics?.ordersToday || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNumber(metrics?.ordersThisWeek || 0)} esta semana
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ticket Promedio
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.averageTicket || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              por transacción
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(metrics?.totalCustomers || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics?.newCustomersToday || 0} nuevos hoy
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4">
            <div className="text-sm text-blue-600 font-medium">Esta Semana</div>
            <div className="text-xl font-bold text-blue-900">
              {formatCurrency(metrics?.revenueThisWeek || 0)}
            </div>
            <div className="text-xs text-blue-600">
              {formatNumber(metrics?.ordersThisWeek || 0)} pedidos
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="pt-4">
            <div className="text-sm text-purple-600 font-medium">Este Mes</div>
            <div className="text-xl font-bold text-purple-900">
              {formatCurrency(metrics?.revenueThisMonth || 0)}
            </div>
            <div className="text-xs text-purple-600">
              {formatNumber(metrics?.ordersThisMonth || 0)} pedidos
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-100">
          <CardContent className="pt-4">
            <div className="text-sm text-gray-600 font-medium">Total Histórico</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </div>
            <div className="text-xs text-gray-600">
              {formatNumber(metrics?.totalOrders || 0)} pedidos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Sucursal</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-4">Cargando...</p>
          ) : locationPerformance.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay datos de sucursales</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Sucursal</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Ventas</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Pedidos</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Ticket Prom.</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Cajeros Act.</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Tendencia</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">vs Ayer</th>
                  </tr>
                </thead>
                <tbody>
                  {locationPerformance.map((location: LocationPerformance) => (
                    <tr key={location.locationId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{location.locationName}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(location.revenue)}</td>
                      <td className="py-3 px-4 text-right">{location.orders}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(location.averageTicket)}</td>
                      <td className="py-3 px-4 text-right">{location.activeCashiers}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={
                          location.performanceTrend === "up" ? "default" :
                          location.performanceTrend === "down" ? "destructive" :
                          "secondary"
                        }>
                          {location.performanceTrend === "up" ? "↑" :
                           location.performanceTrend === "down" ? "↓" : "→"}
                        </Badge>
                      </td>
                      <td className={`py-3 px-4 text-right ${getTrendColor(location.comparisonVsYesterday)}`}>
                        {formatPercentage(location.comparisonVsYesterday)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(locationPerformance.reduce((sum, l) => sum + l.revenue, 0))}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {locationPerformance.reduce((sum, l) => sum + l.orders, 0)}
                    </td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right">
                      {locationPerformance.reduce((sum, l) => sum + l.activeCashiers, 0)}
                    </td>
                    <td className="py-3 px-4 text-center">-</td>
                    <td className="py-3 px-4 text-right">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
