/**
 * Utilidades para validación de geometría y cobertura de delivery
 * Incluye: punto en polígono, distancias, validación de direcciones
 */

import type { Coordinates, ShippingAddress, DeliveryValidationResult, LocationCoverageZone } from '@/types/delivery';

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param from Coordenadas de inicio
 * @param to Coordenadas de destino
 * @returns Distancia en kilómetros
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Verifica si un punto está dentro de un polígono usando el algoritmo Ray Casting
 * @param point Coordenadas del punto a verificar
 * @param polygon Array de coordenadas del polígono (mínimo 3 puntos)
 * @returns true si el punto está dentro del polígono
 */
export function isPointInPolygon(
  point: Coordinates,
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  if (polygon.length < 3) {
    console.warn('Polygon debe tener al menos 3 puntos');
    return false;
  }

  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Valida que una dirección tenga los campos mínimos requeridos
 * @param address Dirección a validar
 * @returns Array de errores (vacío si válido)
 */
export function validateAddressStructure(address: Partial<ShippingAddress>): string[] {
  const errors: string[] = [];

  if (!address.street || address.street.trim().length === 0) {
    errors.push('Calle es requerida');
  }

  if (!address.number || address.number.trim().length === 0) {
    errors.push('Número de calle es requerido');
  }

  if (!address.city || address.city.trim().length === 0) {
    errors.push('Ciudad es requerida');
  }

  if (!address.province || address.province.trim().length === 0) {
    errors.push('Departamento/Provincia es requerido');
  }

  if (!address.postal_code || address.postal_code.trim().length === 0) {
    errors.push('Código postal es requerido');
  }

  return errors;
}

/**
 * Formatea una dirección en string legible
 * @param address Dirección a formatear
 * @returns String con dirección formateada
 */
export function formatAddress(address: ShippingAddress): string {
  const parts: string[] = [];

  if (address.street) parts.push(address.street);
  if (address.number) parts.push(address.number);
  if (address.apartment) parts.push(`Apt ${address.apartment}`);
  if (address.neighborhood) parts.push(`${address.neighborhood}`);
  if (address.city) parts.push(address.city);
  if (address.province) parts.push(address.province);
  if (address.postal_code) parts.push(address.postal_code);

  return parts.join(', ');
}

/**
 * Valida si un punto está dentro de una zona de cobertura
 * @param point Coordenadas del punto a verificar
 * @param zones Array de zonas de cobertura
 * @returns Objeto con zona encontrada (si aplica) y errores
 */
export function validatePointInCoverageZone(
  point: Coordinates,
  zones: LocationCoverageZone[]
): {
  valid: boolean;
  zone?: LocationCoverageZone;
  error?: string;
} {
  // Filtrar zonas activas
  const activeZones = zones.filter((z) => z.is_active);

  if (activeZones.length === 0) {
    return {
      valid: false,
      error: 'No hay zonas de cobertura activas',
    };
  }

  // Buscar zona que contenga el punto
  for (const zone of activeZones) {
    if (isPointInPolygon(point, zone.path)) {
      return {
        valid: true,
        zone,
      };
    }
  }

  return {
    valid: false,
    error: 'La dirección está fuera de las zonas de cobertura',
  };
}

/**
 * Valida si un código postal coincide con reglas de servicio
 * @param postalCode Código postal a validar
 * @param postalPatterns Array de patrones válidos
 * @returns true si coincide con algún patrón
 */
export function validatePostalCodePattern(
  postalCode: string,
  postalPatterns: string[]
): boolean {
  if (postalPatterns.length === 0) return true; // Si no hay restricciones, acepta

  return postalPatterns.some((pattern) => {
    if (pattern.includes('*')) {
      // Patrón wildcard: "050*" coincide con "050001"
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return regex.test(postalCode);
    }
    // Coincidencia exacta
    return postalCode === pattern;
  });
}

/**
 * Valida si una dirección está en un rango de códigos postales específicos
 * @param address Dirección a validar
 * @param allowedPostalPrefixes Array de prefijos permitidos
 * @returns true si el código postal está permitido
 */
export function validatePostalCodeRestrictions(
  address: ShippingAddress,
  allowedPostalPrefixes: string[]
): { valid: boolean; error?: string } {
  if (!address.postal_code) {
    return { valid: false, error: 'Código postal es requerido' };
  }

  if (allowedPostalPrefixes.length === 0) {
    return { valid: true };
  }

  const isValid = allowedPostalPrefixes.some((prefix) =>
    address.postal_code!.startsWith(prefix)
  );

  if (!isValid) {
    return {
      valid: false,
      error: `Código postal ${address.postal_code} no está en zona de servicio`,
    };
  }

  return { valid: true };
}

/**
 * Normaliza una dirección (trim, mayúsculas, etc)
 * @param address Dirección a normalizar
 * @returns Dirección normalizada
 */
export function normalizeAddress(address: Partial<ShippingAddress>): ShippingAddress {
  return {
    street: (address.street || '').trim(),
    number: (address.number || '').trim(),
    apartment: address.apartment ? address.apartment.trim() : undefined,
    city: (address.city || '').trim(),
    province: (address.province || '').trim(),
    postal_code: (address.postal_code || '').trim(),
    country: address.country || 'Colombia',
    neighborhood: address.neighborhood ? address.neighborhood.trim() : undefined,
    instructions: address.instructions ? address.instructions.trim() : undefined,
    phone: address.phone ? address.phone.trim() : undefined,
    name: address.name ? address.name.trim() : undefined,
    place_id: address.place_id,
    formatted_address: address.formatted_address,
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

/**
 * Valida si una dirección tiene coordenadas válidas
 * @param address Dirección a validar
 * @returns true si tiene lat/lng válidas
 */
export function hasValidCoordinates(address: ShippingAddress): boolean {
  return (
    typeof address.latitude === 'number' &&
    typeof address.longitude === 'number' &&
    address.latitude >= -90 &&
    address.latitude <= 90 &&
    address.longitude >= -180 &&
    address.longitude <= 180
  );
}

/**
 * Extrae coordenadas de una dirección
 * @param address Dirección
 * @returns Objeto Coordinates o null
 */
export function extractCoordinates(address: ShippingAddress): Coordinates | null {
  if (!hasValidCoordinates(address)) {
    return null;
  }

  return {
    latitude: address.latitude!,
    longitude: address.longitude!,
  };
}

/**
 * Compara dos direcciones para ver si son esencialmente iguales
 * @param addr1 Primera dirección
 * @param addr2 Segunda dirección
 * @returns true si son iguales
 */
export function addressesAreEqual(
  addr1: ShippingAddress,
  addr2: ShippingAddress
): boolean {
  return (
    addr1.street.toLowerCase() === addr2.street.toLowerCase() &&
    addr1.number === addr2.number &&
    addr1.apartment === addr2.apartment &&
    addr1.city.toLowerCase() === addr2.city.toLowerCase() &&
    addr1.postal_code === addr2.postal_code
  );
}
