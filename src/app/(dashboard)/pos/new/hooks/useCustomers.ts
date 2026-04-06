"use client";

import { useCallback, useMemo, useState } from "react";
import type { DBCustomer } from "@/types/customers";

type UseCustomersOptions = {
  organizationId: string | null;
  supabase: any;
};

type UseCustomersResult = {
  customers: DBCustomer[];
  customersLoading: boolean;
  selectedCustomer: DBCustomer | null;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  fetchCustomers: () => Promise<void>;
};

export function useCustomers({
  organizationId,
  supabase,
}: UseCustomersOptions): UseCustomersResult {
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const fetchCustomers = useCallback(async () => {
    if (!organizationId) {
      setCustomers([]);
      return;
    }

    try {
      setCustomersLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, organization_id, name, email, phone, address, id_type, id_number, is_loyal, created_at, updated_at, created_by, notes, loyalty_points, loyalty_level_id, last_purchase_date, daily_limit_usd, kyc_id_document_url, kyc_signature_url",
        )
        .eq("organization_id", organizationId)
        .order("name", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      setCustomers((data ?? []) as DBCustomer[]);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setCustomersLoading(false);
    }
  }, [organizationId, supabase]);

  return {
    customers,
    customersLoading,
    selectedCustomer,
    selectedCustomerId,
    setSelectedCustomerId,
    fetchCustomers,
  };
}
