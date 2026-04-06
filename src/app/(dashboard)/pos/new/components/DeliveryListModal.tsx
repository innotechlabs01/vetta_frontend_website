"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";

interface DeliveryOrder {
  id: string;
  order_number: number | null;
  created_at: string;
  status: string;
  shipping_address: {
    line1?: string;
    recipient_name?: string;
  } | null;
  customers?: {
    name: string;
    phone: string;
  }[];
}

interface DeliveryListModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  locationId: string;
}

export default function DeliveryListModal({ isOpen, onClose, organizationId, locationId }: DeliveryListModalProps) {
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && organizationId && locationId) {
      loadDeliveries();
    }
  }, [isOpen, organizationId, locationId]);

  const loadDeliveries = async () => {
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from("sales")
      .select(`
        id,
        order_number,
        created_at,
        status,
        shipping_address,
        customers(name, phone)
      `)
      .eq("organization_id", organizationId)
      .eq("store_id", locationId)
      .eq("order_type", "DELIVERY_LOCAL")
      .in("status", ["NEW", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando domicilios:", error);
    }

    setDeliveries(data || []);
    setLoading(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "NEW":
        return { label: "Nuevo", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "🔵" };
      case "PREPARING":
        return { label: "Preparando", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "👨‍🍳" };
      case "READY_FOR_PICKUP":
        return { label: "Listo", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "✅" };
      case "OUT_FOR_DELIVERY":
        return { label: "En camino", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "🚚" };
      default:
        return { label: status, color: "bg-gray-50 text-gray-700 border-gray-200", icon: "📋" };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-orange-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Domicilios Pendientes</h3>
              <p className="text-sm text-gray-500">
                {loading ? "Cargando..." : `${deliveries.length} pedido${deliveries.length !== 1 ? 's' : ''} activo${deliveries.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              <span className="text-gray-500">Cargando domicilios...</span>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-1">No hay domicilios pendientes</h4>
              <p className="text-sm text-gray-500">Todos los pedidos han sido entregados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((delivery) => {
                const statusConfig = getStatusConfig(delivery.status);
                return (
                  <div
                    key={delivery.id}
                    className="group border border-gray-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition-all bg-white"
                  >
                    {/* Header de la card */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          #{delivery.order_number || "N/A"}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusConfig.color}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(delivery.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Info del cliente */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">
                          {delivery.customers?.[0]?.name || "Sin nombre"}
                        </span>
                      </div>

                      {delivery.customers?.[0]?.phone && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-sm text-gray-600">
                            {delivery.customers[0].phone}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm text-gray-600 line-clamp-2">
                          {delivery.shipping_address?.line1 || "Sin dirección"}
                        </span>
                      </div>
                    </div>

                    {/* Fecha completa */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-xs text-gray-400">
                        {new Date(delivery.created_at).toLocaleDateString('es-CO', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <button className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                        Ver detalles →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
