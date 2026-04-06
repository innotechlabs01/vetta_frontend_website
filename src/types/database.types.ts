export type QrMode = "TABLE" | "SIN_FILA" | "PICKUP" | "DELIVERY" | string;

export type QrContextPayload = {
  id?: string;
  location_id: string;
  mode: QrMode;
  table_number?: string | null;
  extra_data?: Record<string, any> | null;
  is_active?: boolean;
};

export type QrContext = {
  id: string;
  organization_id: string;
  location_id: string;
  mode: QrMode;
  table_number: string | null;
  extra_data: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  visits: number | null;
};

export type LocationLite = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
};
