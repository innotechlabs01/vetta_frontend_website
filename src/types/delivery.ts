/**
 * Tipos para el sistema de delivery
 * Define la estructura de direcciones, metadata de entrega y validaciones
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ShippingAddress {
  // Información básica de dirección
  street: string;           // Calle/Avenida
  number: string;           // Número de calle
  apartment?: string;       // Apto, local, suite, etc
  
  // Ubicación geográfica
  city: string;             // Ciudad
  province: string;         // Departamento/Provincia
  postal_code: string;      // Código postal
  country?: string;         // País (opcional, default: Colombia)
  
  // Coordenadas GPS
  latitude?: number;        // Latitud
  longitude?: number;       // Longitud
  
  // Información adicional
  neighborhood?: string;    // Barrio/Localidad
  instructions?: string;    // Instrucciones de entrega (Ej: "Timbre a la izquierda")
  phone?: string;          // Teléfono del destinatario
  name?: string;           // Nombre de quien recibe
  
  // Metadata técnica
  place_id?: string;       // Google Place ID (si fue buscado en Places)
  formatted_address?: string; // Dirección formateada por Google
}

export interface DeliveryMetadata {
  // Información de origen
  origin_location_id: string;  // UUID de sucursal origen
  
  // Información de zona de cobertura
  coverage_zone_id?: string;   // UUID de zona de cobertura asignada
  coverage_zone_name?: string; // Nombre de zona (ej: "zona 1")
  
  // Costos y tiempos
  estimated_delivery_time_minutes?: number; // Tiempo estimado
  logistics_cost?: number;                  // Costo de envío
  
  // Asignación de conductor
  assigned_driver_id?: string;  // UUID del conductor asignado
  
  // Tiempos de proceso
  pickup_time?: string;         // ISO timestamp cuando se recoge la orden
  delivery_time?: string;       // ISO timestamp cuando se entrega
  
  // Coordenadas de destino (denormalizado para rápido acceso)
  destination_coordinates?: Coordinates;
  
  // Historial de estado
  status_history?: Array<{
    status: string;            // Estado (ej: OUT_FOR_DELIVERY)
    timestamp: string;         // ISO timestamp
    notes?: string;           // Notas del estado
    location?: Coordinates;   // Ubicación GPS en ese momento (tracking)
  }>;
  
  // Observaciones y razones de no entrega
  delivery_failure_reason?: string;  // Razón si no se puede entregar
  delivery_failure_notes?: string;   // Notas adicionales
  
  // Metadata adicional
  special_instructions?: string; // Instrucciones especiales del sistema
  requires_signature?: boolean;  // Requiere firma
  is_fragile?: boolean;         // Paquete frágil
}

export interface DeliveryValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    coverage_zone_id?: string;
    coverage_zone_name?: string;
    estimated_time_minutes?: number;
    logistics_cost?: number;
  };
}

export interface LocationCoverageZone {
  id: string;
  location_id: string;
  name: string;
  path: Array<{ lat: number; lng: number }>;  // Polígono de cobertura
  is_active: boolean;
  logistics_cost: number;
  delivery_time_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface LocationServiceZone {
  id: string;
  location_id: string;
  service_channel: 'delivery' | 'pickup' | 'national_shipping';
  enabled: boolean;
  city?: string;
  postal_prefix?: string;  // Prefijo de código postal
  text_pattern?: string;   // Patrón regex para buscar en dirección
  created_at: string;
  updated_at: string;
}

// Enums
export enum DeliveryStatus {
  NEW = 'NEW',
  SCHEDULED_FOR_DELIVERY = 'SCHEDULED_FOR_DELIVERY',
  PREPARING = 'PREPARING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  RETURNED = 'RETURNED',
  CANCELED = 'CANCELED',
}

export enum DeliveryFailureReason {
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',
  CUSTOMER_UNAVAILABLE = 'CUSTOMER_UNAVAILABLE',
  CUSTOMER_REFUSED = 'CUSTOMER_REFUSED',
  TRAFFIC_DELAY = 'TRAFFIC_DELAY',
  VEHICLE_ISSUE = 'VEHICLE_ISSUE',
  WEATHER = 'WEATHER',
  SECURITY_ISSUE = 'SECURITY_ISSUE',
  OTHER = 'OTHER',
}
