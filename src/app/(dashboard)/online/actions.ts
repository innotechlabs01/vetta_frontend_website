"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { QrContext, QrContextPayload } from "@/types/database.types";

const ONLINE_PATH = "/online/qr-codes";

async function getCurrentOrgId() {
  const cookieStore = await cookies();
  const orgId = cookieStore.get("org_id")?.value;
  if (!orgId) throw new Error("No hay organización seleccionada");
  return orgId;
}

export async function saveQrContextAction(payload: QrContextPayload) {
  try {
    const supabase = await createClient();
    const orgId = await getCurrentOrgId();

    const tableNumber =
      payload.mode === "TABLE"
        ? (payload.table_number || "").trim() || null
        : null;

    if (payload.mode === "TABLE" && !tableNumber) {
      throw new Error("El número de mesa es requerido para el modo Mesa");
    }

    const baseData = {
      location_id: payload.location_id,
      mode: payload.mode,
      table_number: tableNumber,
      extra_data: payload.extra_data ?? null,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    let row: QrContext | null = null;

    if (payload.id) {
      const { data, error } = await supabase
        .from("qr_contexts")
        .update(baseData)
        .eq("id", payload.id)
        .eq("organization_id", orgId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      row = data as QrContext;
    } else {
      const { data, error } = await supabase
        .from("qr_contexts")
        .insert({
          ...baseData,
          organization_id: orgId,
          visits: 0,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      row = data as QrContext;
    }

    revalidatePath(ONLINE_PATH);
    return { data: row, error: null };
  } catch (e: any) {
    return {
      data: null,
      error: e?.message || "No se pudo guardar el QR",
    };
  }
}

export async function toggleQrContextActiveAction(id: string, isActive: boolean) {
  try {
    const supabase = await createClient();
    const orgId = await getCurrentOrgId();

    const { data, error } = await supabase
      .from("qr_contexts")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(ONLINE_PATH);
    return { data: data as QrContext, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || "No se pudo actualizar el estado" };
  }
}

export async function incrementQrVisitsAction(id: string, amount = 1) {
  try {
    const supabase = await createClient();
    const orgId = await getCurrentOrgId();

    const { data: existing, error: fetchError } = await supabase
      .from("qr_contexts")
      .select("visits")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const nextVisits = (existing?.visits ?? 0) + amount;

    const { data, error } = await supabase
      .from("qr_contexts")
      .update({ visits: nextVisits, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(ONLINE_PATH);
    return { data: data as QrContext, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || "No se pudo actualizar las visitas" };
  }
}
