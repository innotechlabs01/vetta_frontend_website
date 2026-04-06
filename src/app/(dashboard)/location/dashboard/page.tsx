// src/app/(dashboard)/location/dashboard/page.tsx
"use client";

import { useEnvironment } from "@/context/EnvironmentContext";
import { useLocationAnalytics } from "@/hooks/useLocationAnalytics";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign, 
  ShoppingCart, 
  Clock,
  Package,
  AlertCircle
} from "lucide-react";

export default function LocationDashboardPage() {
  const { 
    org, 
    currentLocationId, 
    locationAccess, 
    hasLocationLevelAccess,
    organizationLocations 
  } = useEnvironment();
  
  const { metrics, loading, error, refresh } = useLocationAnalytics(currentLocationId ?? undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Get current location info
  const currentLocation = organizationLocations.find(loc => loc.id === currentLocationId);

  if (!hasLocationLevelAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">
              No tienes acceso a ninguna sucursal. Contacta al administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentLocationId || !currentLocation) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500 mb-4">
              Selecciona una sucursal para ver su dashboard operativo.
            </p>
            {organizationLocations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Sucursales disponibles:</p>
                {organizationLocations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => window.location.href = `/api/location/select?location=${loc.id}`}
                    className="block w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg"
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            )}
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{currentLocation.name}</h1>
            <Badge variant="outline">Sucursal</Badge>
          </div>
          <p className="text-gray-500">Dashboard operativo del día</p>
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

      {/* Today's Performance Cards */}
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
              {metrics?.ordersYesterday || 0} ayer
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ticket Promedio
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.averageTicket || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              vs {formatCurrency(metrics?.averageTicketYesterday || 0)} ayer
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Efectivo en Caja
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.cashInDrawer || 0)}
            </div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${metrics?.difference && Math.abs(metrics.difference) > 100 ? 'text-red-600' : 'text-gray-500'}`}>
              {metrics?.difference && Math.abs(metrics.difference) > 100 && (
                <AlertCircle className="h-3 w-3" />
              )}
              <span>
                Diferencia: {formatCurrency(metrics?.difference || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">vs Semana Pasada</span>
            </div>
            <div className={`text-xl font-bold mt-1 ${getTrendColor(metrics?.comparisonVsLastWeek || 0)}`}>
              {formatPercentage(metrics?.comparisonVsLastWeek || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-600 font-medium">vs Mes Pasado</span>
            </div>
            <div className={`text-xl font-bold mt-1 ${getTrendColor(metrics?.comparisonVsLastMonth || 0)}`}>
              {formatPercentage(metrics?.comparisonVsLastMonth || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-600 font-medium">Tendencia del Día</span>
            </div>
            <div className="text-xl font-bold mt-1 text-orange-900">
              {(metrics?.comparisonVsYesterday || 0) > 0 ? "Positive" : 
               (metrics?.comparisonVsYesterday || 0) < 0 ? "Bajando" : "Estable"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos Más Vendidos Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!metrics?.topProducts || metrics.topProducts.length === 0) ? (
            <p className="text-gray-500 text-center py-4">No hay ventas aún hoy</p>
          ) : (
            <div className="space-y-3">
              {metrics.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.revenue)}</div>
                    <div className="text-xs text-gray-500">{product.quantity} unidades</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hourly Sales Chart (Text-based for now) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ventas por Hora
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!metrics?.hourlySales || metrics.hourlySales.length === 0) ? (
            <p className="text-gray-500 text-center py-4">No hay datos de ventas por hora</p>
          ) : (
            <div className="space-y-2">
              {metrics.hourlySales.map(hourData => {
                const maxRevenue = Math.max(...metrics.hourlySales.map(h => h.revenue));
                const percentage = maxRevenue > 0 ? (hourData.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={hourData.hour} className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 w-16">
                      {hourData.hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-24 text-right">
                      {formatCurrency(hourData.revenue)}
                    </span>
                    <span className="text-xs text-gray-500 w-12">
                      {hourData.orders} ped.
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
