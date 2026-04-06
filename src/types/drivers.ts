export type VehicleType = 'moto' | 'carro' | 'bicicleta';

export type DriverStatus = 'available' | 'busy' | 'offline';

export type CommissionType = 'fixed' | 'percentage';

export interface Driver {
  id: string;
  organization_id: string;
  name: string;
  phone?: string;
  location_id?: string;
  location_name?: string;
  vehicle_type?: VehicleType;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  is_active: boolean;
  status: DriverStatus;
  max_simultaneous_orders: number;
  created_at: string;
  updated_at: string;
}

export interface DriverWithCommission extends Driver {
  commission_type?: CommissionType;
  commission_value?: number;
}

export interface DriverCommission {
  id: string;
  driver_id: string;
  commission_type: CommissionType;
  commission_value: number;
  created_at: string;
}

export interface DriverEarning {
  id: string;
  driver_id: string;
  delivery_order_id?: string;
  order_number?: number;
  base_amount?: number;
  commission_amount: number;
  tip: number;
  total_amount: number;
  created_at: string;
}

export interface DeliveryTip {
  id: string;
  order_id?: string;
  driver_id?: string;
  amount: number;
  created_at: string;
}

export interface DriverStats {
  total_orders: number;
  total_earnings: number;
  total_commissions: number;
  total_tips: number;
  average_per_delivery: number;
}

export interface CreateDriverInput {
  organization_id: string;
  name: string;
  phone?: string;
  location_id?: string;
  vehicle_type?: VehicleType;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  is_active?: boolean;
  status?: DriverStatus;
  max_simultaneous_orders?: number;
}

export interface UpdateDriverInput extends Partial<CreateDriverInput> {
  id: string;
}

export interface CreateCommissionInput {
  driver_id: string;
  commission_type: CommissionType;
  commission_value: number;
}
