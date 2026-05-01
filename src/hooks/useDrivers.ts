"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type {
  Driver,
  DriverWithCommission,
  DriverStats,
  DriverEarning,
  CreateDriverInput,
  UpdateDriverInput,
  CreateCommissionInput
} from "@/types/drivers";
import { validateDriver } from "@/utils/driver-validation";

export function useDrivers(supabase: any, organizationId: string | null) {
  const [drivers, setDrivers] = useState<DriverWithCommission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async (locationId?: string) => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("drivers")
        .select(`
          *,
          location:locations(name),
          driver_commissions(commission_type, commission_value)
        `)
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped = (data || []).map((d: any) => ({
        ...d,
        location_name: d.location?.name,
        commission_type: d.driver_commissions?.[0]?.commission_type,
        commission_value: d.driver_commissions?.[0]?.commission_value,
        max_simultaneous_orders: d.max_simultaneous_orders || 1,
      }));

      setDrivers(mapped);
    } catch (err: any) {
      setError(err.message);
      toast.error("Error al cargar domiciliarios");
    } finally {
      setLoading(false);
    }
  }, [supabase, organizationId]);

  const createDriver = useCallback(async (input: CreateDriverInput, commission?: CreateCommissionInput) => {
    setLoading(true);
    try {
      // Validar antes de crear
      const validation = await validateDriver({
        organizationId: organizationId ?? "",
        input,
        supabase
      });
      
      if (!validation.valid) {
        // Mostrar todos los errores de validación
        validation.errors.forEach(error => toast.error(error));
        throw new Error(validation.errors.join(", "));
      }
      
      // Mostrar warnings si los hay
      validation.warnings.forEach(warning => toast.warning(warning));

      const inputWithDefault = {
        ...input,
        max_simultaneous_orders: input.max_simultaneous_orders || 1,
      };
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert(inputWithDefault)
        .select()
        .single();

      if (driverError) throw driverError;

      if (commission) {
        const { error: commissionError } = await supabase
          .from("driver_commissions")
          .insert({
            driver_id: driverData.id,
            commission_type: commission.commission_type,
            commission_value: commission.commission_value,
          });

        if (commissionError) throw commissionError;
      }

      toast.success("Domiciliario creado exitosamente");
      await fetchDrivers();
      return driverData;
    } catch (err: any) {
      // Si ya es un error de validación, no mostrar toast genérico
      if (!err.message?.includes("Error al crear domiciliarios")) {
        toast.error(err.message || "Error al crear domiciliarios");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchDrivers]);

  const updateDriver = useCallback(async (input: UpdateDriverInput, commission?: CreateCommissionInput) => {
    setLoading(true);
    try {
      const { id, ...updateData } = input;
      
      // Ensure name is not undefined for validation
      if (updateData.name === undefined) {
        delete updateData.name;
      }
      
      // Validar antes de actualizar
      const validation = await validateDriver({
        organizationId: organizationId ?? "",
        input: updateData as any, // Cast to avoid type issues temporarily
        driverId: id,
        supabase
      });
      
      if (!validation.valid) {
        // Mostrar todos los errores de validación
        validation.errors.forEach(error => toast.error(error));
        throw new Error(validation.errors.join(", "));
      }
      
      // Mostrar warnings si los hay
      validation.warnings.forEach(warning => toast.warning(warning));

      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          ...updateData,
          max_simultaneous_orders: input.max_simultaneous_orders || 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) throw updateError;

      if (commission) {
        await supabase
          .from("driver_commissions")
          .upsert({
            driver_id: id,
            commission_type: commission.commission_type,
            commission_value: commission.commission_value,
          }, { onConflict: 'driver_id' });
      }

      toast.success("Domiciliario actualizado exitosamente");
      await fetchDrivers();
    } catch (err: any) {
      // Si ya es un error de validación, no mostrar toast genérico
      if (!err.message?.includes("Error al actualizar domiciliarios")) {
        toast.error(err.message || "Error al actualizar domiciliarios");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchDrivers]);

  const deleteDriver = useCallback(async (driverId: string) => {
    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driverId);

      if (deleteError) throw deleteError;

      toast.success("Domiciliario eliminado exitosamente");
      await fetchDrivers();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar domiciliarios");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchDrivers]);

  return {
    drivers,
    loading,
    error,
    fetchDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
  };
}

export function useDriverStats(supabase: any, driverId: string | null) {
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [earnings, setEarnings] = useState<DriverEarning[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!driverId) return;

    setLoading(true);
    try {
      const { data: earningsData, error: earningsError } = await supabase
        .from("driver_earnings")
        .select(`
          *,
          delivery_order:sales(order_number)
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (earningsError) throw earningsError;

      const mapped = (earningsData || []).map((e: any) => ({
        ...e,
        order_number: e.delivery_order?.order_number,
      }));

      setEarnings(mapped);

      const totals = mapped.reduce((acc: any, e: DriverEarning) => ({
        total_orders: acc.total_orders + 1,
        total_commissions: acc.total_commissions + (e.commission_amount || 0),
        total_tips: acc.total_tips + (e.tip || 0),
        total_earnings: acc.total_earnings + (e.total_amount || 0),
      }), { total_orders: 0, total_commissions: 0, total_tips: 0, total_earnings: 0 });

      setStats({
        ...totals,
        average_per_delivery: totals.total_orders > 0
          ? totals.total_earnings / totals.total_orders
          : 0,
      });
    } catch (err) {
      console.error("Error fetching driver stats:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, driverId]);

  return { stats, earnings, loading, fetchStats };
}
