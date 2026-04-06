"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  CashShift,
  CashShiftSummary,
  CashMovementAggregate,
  CashMovementDetail,
  PosOption,
  ServiceChannelConfig,
  ServiceChannelStatusConfig,
  ServiceChannelStatus,
} from "../types";
import { currency, round2, parseNumeric, formatCashMovementReason } from "../utils";
import { useDeliverySummary } from "./useDeliverySummary";
import { useActiveShift } from "@/context/ActiveShiftContext";
import {
  CashShiftOpenModal,
  CashShiftSummaryModal,
  CashMovementModal,
  DeliverySummaryModal,
} from "../CashShiftModals";

type UseCashShiftOptions = {
  organizationId: string | null;
  supabase: any;
  userId: string | null | undefined;
  userEmail?: string | null;
  profileName?: string | null;
  orgName?: string | null;
  buildPrinterPayload: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  onShiftOpen?: (locationId: string, locationName: string, shiftId: string) => void;
  onShiftClose?: () => void;
};

type UseCashShiftResult = {
  activeShift: CashShift | null;
  shiftSummary: CashShiftSummary | null;
  shiftAmountLabel: string;
  shiftLoading: boolean;
  organizationChannels: ServiceChannelConfig;
  shiftChannels: ServiceChannelConfig;
  shiftChannelStatuses: ServiceChannelStatusConfig;
  handleOpenCashMovementModal: () => void;
  handleShiftSummaryButton: () => void;
  handleUpdateChannelStatus: (channel: keyof ServiceChannelStatusConfig, status: ServiceChannelStatus) => Promise<void>;
  modals: React.ReactNode;
  refreshShiftSummary: () => Promise<CashShiftSummary | null>;
};

type ShiftSummaryResponse = CashShiftSummary;
const DEFAULT_CHANNELS: ServiceChannelConfig = {
  pickup: true,
  delivery: true,
  national_shipping: true,
};

function normalizeCashShift(row: any): CashShift {
  if (!row) {
    throw new Error("Cash shift row is required");
  }
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    location_id: row.location_id ?? null,
    pos_id: row.pos_id ?? null,
    cashier_id: row.cashier_id ?? null,
    opened_by: row.opened_by ?? null,
    closed_by: row.closed_by ?? null,
    opened_at: row.opened_at ?? new Date().toISOString(),
    closed_at: row.closed_at ?? null,
    status: (row.status ?? "open") as CashShift["status"],
    opening_amount: parseNumeric(row.opening_amount ?? null),
    expected_closing_amount: parseNumeric(row.expected_closing_amount ?? null),
    counted_closing_amount: parseNumeric(row.counted_closing_amount ?? null),
    difference_amount: parseNumeric(row.difference_amount ?? null),
    total_cash: parseNumeric(row.total_cash ?? null),
    total_card: parseNumeric(row.total_card ?? null),
    total_bold: parseNumeric(row.total_bold ?? null),
    total_nequi: parseNumeric(row.total_nequi ?? null),
    total_transfer: parseNumeric(row.total_transfer ?? null),
    total_others: parseNumeric(row.total_others ?? null),
    notes: row.notes ?? null,
  };
}

function normalizeShiftSummary(
  row: any | null,
  shift?: Partial<CashShift> | null,
): ShiftSummaryResponse {
  const openingRaw =
    row?.opening_amount != null
      ? parseNumeric(row.opening_amount)
      : shift?.opening_amount != null
        ? parseNumeric(shift.opening_amount)
        : 0;

  const expectedRaw =
    row?.expected_closing_cash != null
      ? parseNumeric(row.expected_closing_cash)
      : shift?.expected_closing_amount != null
        ? parseNumeric(shift.expected_closing_amount)
        : openingRaw;

  const countedRaw =
    row?.counted_closing_amount != null
      ? parseNumeric(row.counted_closing_amount)
      : shift?.counted_closing_amount != null
        ? parseNumeric(shift.counted_closing_amount)
        : 0;

  let differenceRaw: number;
  if (row?.difference_amount != null) {
    differenceRaw = parseNumeric(row.difference_amount);
  } else {
    differenceRaw = countedRaw - expectedRaw;
  }

  const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0);

  const organizationId = row?.organization_id ?? shift?.organization_id ?? null;

  const totalCash = parseNumeric(row?.total_cash ?? shift?.total_cash ?? null);
  const totalCard = parseNumeric(row?.total_card ?? shift?.total_card ?? null);
  const totalBold = parseNumeric(row?.total_bold ?? shift?.total_bold ?? null);
  const totalNequi = parseNumeric(row?.total_nequi ?? shift?.total_nequi ?? null);
  const totalTransfer = parseNumeric(row?.total_transfer ?? shift?.total_transfer ?? null);
  const totalOthers = parseNumeric(row?.total_others ?? shift?.total_others ?? null);
  const cashIn = parseNumeric(row?.cash_in ?? null);
  const cashOut = parseNumeric(row?.cash_out ?? null);
  const cashMovementsNet = parseNumeric(row?.cash_movements_net ?? null);
  const totalPayments = round2(
    safeNumber(totalCash) +
    safeNumber(totalCard) +
    safeNumber(totalBold) +
    safeNumber(totalNequi) +
    safeNumber(totalTransfer) +
    safeNumber(totalOthers),
  );

  return {
    shiftId: String(row?.shift_id ?? shift?.id ?? ""),
    organizationId: organizationId ? String(organizationId) : null,
    locationId: row?.location_id ?? shift?.location_id ?? null,
    posId: row?.pos_id ?? shift?.pos_id ?? null,
    status: (row?.status ?? shift?.status ?? "open") as CashShiftSummary["status"],
    openedAt: row?.opened_at ?? shift?.opened_at ?? new Date().toISOString(),
    closedAt: row?.closed_at ?? shift?.closed_at ?? null,
    openingAmount: round2(safeNumber(openingRaw)),
    expectedClosingCash: round2(safeNumber(expectedRaw)),
    countedClosingAmount: round2(safeNumber(countedRaw)),
    differenceAmount: round2(safeNumber(differenceRaw)),
    totalCash,
    totalCard,
    totalBold,
    totalNequi,
    totalTransfer,
    totalOthers,
    totalPayments,
    cashIn,
    cashOut,
    cashMovementsNet,
    notes: shift?.notes ?? row?.notes ?? null,
    movementAggregates: [],
    movements: [],
  };
}

function parseMovementNotes(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split("|")
      .map((piece) => piece.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }
  return [];
}

function resolveOperationalOrderType(row: any): string | null {
  const normalize = (value: unknown) => {
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/[\s-]+/g, "_").toUpperCase();
    return normalized.length ? normalized : null;
  };

  const direct = normalize(row?.order_type);
  if (direct) return direct;

  const metaType =
    row?.delivery_metadata && typeof row.delivery_metadata === "object"
      ? (row.delivery_metadata as Record<string, unknown>).type
      : null;
  return normalize(metaType);
}

function isManagedOperationalOrderType(orderType: string | null): boolean {
  if (!orderType) return false;
  return (
    orderType === "SELF_SERVE" ||
    orderType === "SELF_SERVICE" ||
    orderType === "PICKUP" ||
    orderType === "DELIVERY" ||
    orderType === "DELIVERY_LOCAL" ||
    orderType === "SHIPMENT_NATIONAL" ||
    orderType === "NATIONAL_SHIPPING"
  );
}

function isClosedOperationalStatus(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  return (
    normalized === "COMPLETED" ||
    normalized === "DELIVERED" ||
    normalized === "PICKED_UP"
  );
}

export function useCashShift({
  organizationId,
  supabase,
  userId,
  userEmail,
  profileName,
  orgName,
  buildPrinterPayload,
  onShiftOpen,
  onShiftClose,
}: UseCashShiftOptions): UseCashShiftResult {
  const router = useRouter();
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [shiftSummary, setShiftSummary] = useState<CashShiftSummary | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [openingShift, setOpeningShift] = useState(false);
  const [closingShift, setClosingShift] = useState(false);
  const [isPrintingShift, setIsPrintingShift] = useState(false);
  const [posOptions, setPosOptions] = useState<PosOption[]>([]);
  const [loadingPosOptions, setLoadingPosOptions] = useState(false);
  const [pendingOpenShiftPrompt, setPendingOpenShiftPrompt] = useState(false);
  const [cashMovementModalOpen, setCashMovementModalOpen] = useState(false);
  const [savingCashMovement, setSavingCashMovement] = useState(false);
  const [deliverySummaryModalOpen, setDeliverySummaryModalOpen] = useState(false);
  const { summary: deliverySummary, loading: deliverySummaryLoading, fetchSummary } = useDeliverySummary();
  const { setActiveShift: setGlobalActiveShift, clearActiveShift: clearGlobalActiveShift } = useActiveShift();
  const [organizationChannels, setOrganizationChannels] = useState<ServiceChannelConfig>(
    DEFAULT_CHANNELS,
  );
  const [shiftChannels, setShiftChannels] = useState<ServiceChannelConfig>(DEFAULT_CHANNELS);
  const [shiftChannelStatuses, setShiftChannelStatuses] = useState<ServiceChannelStatusConfig>({
    pickup: "inactive",
    delivery: "inactive",
    national_shipping: "inactive",
  });

  const activeShiftRef = useRef<CashShift | null>(null);

  useEffect(() => {
    activeShiftRef.current = activeShift;
  }, [activeShift]);

  const posOptionsMap = useMemo(() => {
    const map = new Map<string, PosOption>();
    posOptions.forEach((option) => map.set(option.id, option));
    return map;
  }, [posOptions]);

  const cashierDisplayName = useMemo(() => {
    const name = profileName?.trim();
    if (name) return name;
    const email = userEmail?.trim();
    if (email) return email;
    return "Cajero";
  }, [profileName, userEmail]);

  const shiftDisplayAmount = useMemo(() => {
    if (shiftSummary && shiftSummary.status === "open") {
      return shiftSummary.expectedClosingCash;
    }
    if (activeShift && activeShift.status === "open") {
      const expected = activeShift.expected_closing_amount;
      return expected > 0 ? expected : activeShift.opening_amount;
    }
    return 0;
  }, [shiftSummary, activeShift]);

  const shiftAmountLabel = useMemo(() => {
    if (shiftLoading) return "…";
    return `$${currency(Math.max(shiftDisplayAmount, 0))}`;
  }, [shiftLoading, shiftDisplayAmount]);

  const loadPosOptions = useCallback(async () => {
    if (!organizationId) return;
    setLoadingPosOptions(true);
    try {
      const { data, error } = await supabase
        .from("pos_terminals")
        .select("id, name, code, location_id")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (error) throw error;

      const rows = data ?? [];
      const locationIds = Array.from(
        new Set(
          rows
            .map((row: any) => row.location_id)
            .filter((value: any): value is string => Boolean(value)),
        ),
      );

      let locationMap = new Map<string, string>();
      if (locationIds.length) {
        const { data: locations, error: locationError } = await supabase
          .from("locations")
          .select("id, name")
          .in("id", locationIds);
        if (!locationError && locations) {
          locationMap = new Map(locations.map((loc: any) => [loc.id, loc.name ?? ""]));
        }
      }

      const options: PosOption[] = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        code: row.code ?? null,
        locationId: row.location_id ?? null,
        locationName: row.location_id ? locationMap.get(row.location_id) ?? null : null,
      }));
      setPosOptions(options);
    } catch (error) {
      console.error("Error al cargar POS", error);
    } finally {
      setLoadingPosOptions(false);
    }
  }, [organizationId, supabase]);

  const fetchShiftSummary = useCallback(
    async (shiftId: string, baseShift?: CashShift | null) => {
      if (!organizationId || !shiftId) return null;
      const contextShift = baseShift ?? activeShiftRef.current ?? undefined;
      try {
        const { data, error } = await supabase
          .from("v_shift_summary")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("shift_id", shiftId)
          .maybeSingle();

        if (error) throw error;

        const summary = normalizeShiftSummary(data ?? null, contextShift);

        let movementAggregates: CashMovementAggregate[] = [];
        let movementDetails: CashMovementDetail[] = [];
        const { data: movementRows, error: movementError } = await supabase
          .from("v_shift_cash_movements")
          .select("reason, cash_in, cash_out, cash_movements_net, notes")
          .eq("organization_id", organizationId)
          .eq("shift_id", shiftId)
          .order("reason", { ascending: true });

        if (movementError) {
          console.error("Error al cargar movimientos del turno", movementError);
        } else if (Array.isArray(movementRows) && movementRows.length) {
          movementAggregates = movementRows
            .map((row: any) => {
              const reason: string | null =
                typeof row?.reason === "string" ? row.reason : null;
              const cashInValue = parseNumeric(row?.cash_in ?? null);
              const cashOutValue = parseNumeric(row?.cash_out ?? null);
              const netValue = parseNumeric(row?.cash_movements_net ?? null);
              const noteList = parseMovementNotes(row?.notes);
              return {
                reason: (reason ?? null) as CashMovementAggregate["reason"],
                reasonLabel: formatCashMovementReason(reason ?? null),
                cashIn: round2(cashInValue),
                cashOut: round2(cashOutValue),
                net: round2(netValue),
                notes: noteList,
              };
            })
            .filter(
              (entry) =>
                entry.cashIn !== 0 ||
                entry.cashOut !== 0 ||
                entry.net !== 0 ||
                entry.notes.length,
            );
        }

        const { data: movementListRows, error: movementListError } = await supabase
          .from("cash_movements")
          .select("id, direction, reason, amount, note, created_at, created_by")
          .eq("organization_id", organizationId)
          .eq("shift_id", shiftId)
          .order("created_at", { ascending: false });

        if (movementListError) {
          console.error("Error al listar movimientos de caja", movementListError);
        } else if (Array.isArray(movementListRows) && movementListRows.length) {
          movementDetails = movementListRows.map((row: any, index: number) => {
            const amountValue = parseNumeric(row?.amount ?? null);
            const reason: string | null =
              typeof row?.reason === "string" ? row.reason : null;
            return {
              id: row?.id ? String(row.id) : `movement-${index}`,
              direction: row?.direction === "out" ? "out" : "in",
              reason: (reason ?? null) as CashMovementDetail["reason"],
              reasonLabel: formatCashMovementReason(reason ?? null),
              amount: round2(amountValue),
              note: typeof row?.note === "string" && row.note.trim().length ? row.note.trim() : null,
              createdAt: row?.created_at ?? new Date().toISOString(),
              createdBy: row?.created_by ?? null,
            };
          });
        }

        const enrichedSummary: CashShiftSummary = {
          ...summary,
          movementAggregates,
          movements: movementDetails,
        };

        setShiftSummary(enrichedSummary);
        return enrichedSummary;
      } catch (error) {
        console.error("Error al cargar resumen del turno", error);
        const fallback = normalizeShiftSummary(null, contextShift);
        setShiftSummary(fallback);
        return fallback;
      }
    },
    [organizationId, supabase],
  );

  const fetchActiveShift = useCallback(async () => {
    if (!organizationId || !userId) return;
    setShiftLoading(true);
    setShiftError(null);
    try {
      const { data, error } = await supabase
        .from("cash_shifts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("cashier_id", userId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setActiveShift(null);
        setShiftSummary(null);
        setShiftChannels(organizationChannels);
        setShiftChannelStatuses({
          pickup: "inactive",
          delivery: "inactive",
          national_shipping: "inactive",
        });
        activeShiftRef.current = null;
        setOpenShiftModalOpen(true);
        return;
      }

      const normalized = normalizeCashShift(data);
      activeShiftRef.current = normalized;
      setActiveShift(normalized);

      if (normalized.location_id) {
        const posOption = posOptionsMap.get(normalized.pos_id ?? "");
        const locationName = posOption?.locationName ?? "";
        if (onShiftOpen) {
          onShiftOpen(normalized.location_id, locationName, normalized.id);
        } else {
          setGlobalActiveShift(normalized.location_id, locationName, normalized.id);
        }
      }
      setShiftChannels({
        pickup: data?.pickup_enabled ?? organizationChannels.pickup,
        delivery: data?.delivery_enabled ?? organizationChannels.delivery,
        national_shipping:
          data?.national_shipping_enabled ?? organizationChannels.national_shipping,
      });
      setShiftChannelStatuses({
        pickup: data?.pickup_status ?? "inactive",
        delivery: data?.delivery_status ?? "inactive",
        national_shipping: data?.national_shipping_status ?? "inactive",
      });
      setOpenShiftModalOpen(false);
      setShiftSummary((prev) =>
        prev && prev.shiftId === normalized.id ? prev : normalizeShiftSummary(null, normalized),
      );
      await fetchShiftSummary(normalized.id, normalized);
    } catch (error: any) {
      console.error("Error al obtener turno activo", error);
      setShiftError(error?.message ?? "No se pudo cargar el turno");
    } finally {
      setShiftLoading(false);
    }
  }, [organizationId, supabase, userId, fetchShiftSummary, organizationChannels]);

  const loadOrganizationChannels = useCallback(async () => {
    if (!organizationId) {
      setOrganizationChannels(DEFAULT_CHANNELS);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("organization_service_channels")
        .select("pickup_enabled, delivery_enabled, national_shipping_enabled")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) throw error;
      const next: ServiceChannelConfig = {
        pickup: data?.pickup_enabled ?? true,
        delivery: data?.delivery_enabled ?? true,
        national_shipping: data?.national_shipping_enabled ?? true,
      };
      setOrganizationChannels(next);
      setShiftChannels((prev) =>
        activeShiftRef.current ? prev : next
      );
    } catch (error) {
      console.error("Error cargando configuración de canales del comercio", error);
      setOrganizationChannels(DEFAULT_CHANNELS);
    }
  }, [organizationId, supabase]);

  const handleOpenShiftSubmit = useCallback(
    async ({
      amount,
      posId,
      note,
      channels,
    }: { amount: number; posId: string | null; note: string; channels: ServiceChannelStatusConfig }) => {
      if (!organizationId || !userId) {
        toast.error("Selecciona una organización válida");
        return;
      }
      setOpeningShift(true);
      setShiftError(null);
      try {
        const selectedPos = posId ? posOptionsMap.get(posId) : undefined;

        // 🔐 Validar que la sucursal esté abierta AHORA
        if (selectedPos?.locationId) {
          try {
            const { checkLocationSchedule } = await import("@/utils/schedule-validation");
            const scheduleCheck = await checkLocationSchedule(
              selectedPos.locationId,
              supabase,
              new Date()
            );
            console.log("scheduleCheck", scheduleCheck);
            if (!scheduleCheck.isOpen) {
              const reason = scheduleCheck.reason || "Sucursal cerrada";
              throw new Error(
                `No puedes abrir turno ahora: ${reason}. ` +
                (scheduleCheck.nextOpen
                  ? `Próxima apertura: ${new Date(scheduleCheck.nextOpen).toLocaleTimeString()}`
                  : "")
              );
            }
          } catch (scheduleError: any) {
            if (scheduleError.message.includes("No puedes abrir turno")) {
              throw scheduleError;
            }
            console.warn("No se pudo validar horarios:", scheduleError);
            // Si hay error en validación pero NO es de horarios, continuamos
          }
        }

        // Se mantienen habilitados si la organización los permite, independientemente de su estado inicial
        const effectiveChannels: ServiceChannelConfig = {
          pickup: !!organizationChannels.pickup,
          delivery: !!organizationChannels.delivery,
          national_shipping: !!organizationChannels.national_shipping,
        };


        const { data, error } = await supabase
          .from("cash_shifts")
          .insert({
            organization_id: organizationId,
            location_id: selectedPos?.locationId ?? null,
            pos_id: posId,
            cashier_id: userId,
            opened_by: userId,
            opening_amount: amount,
            expected_closing_amount: amount,
            notes: note.length ? note : null,
            pickup_enabled: effectiveChannels.pickup,
            delivery_enabled: effectiveChannels.delivery,
            national_shipping_enabled: effectiveChannels.national_shipping,
            pickup_status: channels.pickup,
            delivery_status: channels.delivery,
            national_shipping_status: channels.national_shipping,
          })
          .select("*")
          .single();

        if (error) throw error;

        const normalized = normalizeCashShift(data);
        activeShiftRef.current = normalized;
        setActiveShift(normalized);

        if (normalized.location_id) {
          const posOption = posOptionsMap.get(normalized.pos_id ?? "");
          const locationName = posOption?.locationName ?? "";
          if (onShiftOpen) {
            onShiftOpen(normalized.location_id, locationName, normalized.id);
          } else {
            setGlobalActiveShift(normalized.location_id, locationName, normalized.id);
          }
        }
        setShiftChannels(effectiveChannels);
        setShiftSummary(normalizeShiftSummary(null, normalized));
        setOpenShiftModalOpen(false);
        setPendingOpenShiftPrompt(false);
        toast.success("Turno abierto");
        await fetchShiftSummary(normalized.id, normalized);
      } catch (error: any) {
        console.error("Error al abrir turno", error);
        const message = error?.message ?? "No se pudo abrir el turno";
        setShiftError(message);
        toast.error(message);
      } finally {
        setOpeningShift(false);
      }
    },
    [organizationId, userId, supabase, posOptionsMap, fetchShiftSummary, organizationChannels],
  );

  // Limpiar borradores del turno al cerrar
  const cleanupShiftDrafts = useCallback(
    async (shiftId: string) => {
      if (!organizationId) return;

      const { error: deleteError } = await supabase
        .from("sales")
        .delete()
        .eq("organization_id", organizationId)
        .eq("shift_id", shiftId)
        .eq("status", "DRAFT");

      if (deleteError) {
        console.error("Error limpiando borradores del turno", deleteError);
      }
    },
    [organizationId, supabase]
  );

  const handleCloseShift = useCallback(
    async ({ countedAmount, note }: { countedAmount: number; note: string }) => {
      if (!shiftSummary || !organizationId) {
        toast.error("No hay turno activo");
        return;
      }
      setClosingShift(true);
      try {
        const openedAt = shiftSummary.openedAt ? new Date(shiftSummary.openedAt) : new Date();
        const startOfDay = new Date(openedAt);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const { data: sameDaySales, error: openOrdersError } = await supabase
          .from("sales")
          .select("id, order_number, invoice_number, status, order_type, delivery_metadata, created_at")
          .eq("organization_id", organizationId)
          .gte("created_at", startOfDay.toISOString())
          .lt("created_at", endOfDay.toISOString());

        if (openOrdersError) throw openOrdersError;

        const openOperationalOrders = (sameDaySales ?? []).filter((row: any) => {
          const orderType = resolveOperationalOrderType(row);
          if (!isManagedOperationalOrderType(orderType)) return false;
          const status = String(row?.status ?? "").toUpperCase();
          if (!status) return true;
          return !isClosedOperationalStatus(status);
        });

        if (openOperationalOrders.length > 0) {
          const sampleCodes = openOperationalOrders
            .slice(0, 5)
            .map((row: any) => {
              const invoice = String(row?.invoice_number ?? "").trim();
              if (invoice) return invoice;
              const orderNo = row?.order_number != null ? String(row.order_number) : "";
              if (orderNo) return `ORD-${orderNo.padStart(4, "0")}`;
              return String(row?.id ?? "").slice(0, 8).toUpperCase();
            })
            .join(", ");

          toast.error(
            `No se puede cerrar turno: hay ${openOperationalOrders.length} orden(es) abierta(s) en autogestión/recoger/domicilio. Revisa: ${sampleCodes}`,
            { duration: 8000 },
          );
          return;
        }

        const { data, error } = await supabase
          .from("cash_shifts")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            closed_by: userId ?? null,
            counted_closing_amount: countedAmount,
            expected_closing_amount: shiftSummary.expectedClosingCash,
            notes: note.length ? note : shiftSummary.notes,
            // Desactivate channels on close
            pickup_enabled: false,
            delivery_enabled: false,
            national_shipping_enabled: false,
            pickup_status: "inactive",
            delivery_status: "inactive",
            national_shipping_status: "inactive",
          })

          .eq("id", shiftSummary.shiftId)
          .select("*")
          .single();

        if (error) throw error;

        const normalized = normalizeCashShift(data);
        await fetchShiftSummary(normalized.id, normalized);

        // Limpiar borradores del turno
        await cleanupShiftDrafts(shiftSummary.shiftId);

        activeShiftRef.current = null;
        setActiveShift(null);
        setShiftChannels(organizationChannels);
        setPendingOpenShiftPrompt(true);

        if (onShiftClose) {
          onShiftClose();
        } else {
          clearGlobalActiveShift();
        }

        toast.success("Turno cerrado");
      } catch (error: any) {
        console.error("Error al cerrar turno", error);
        toast.error(error?.message ?? "No se pudo cerrar el turno");
      } finally {
        setClosingShift(false);
      }
    },
    [shiftSummary, organizationId, supabase, userId, fetchShiftSummary, organizationChannels, cleanupShiftDrafts],
  );

  const handleUpdateChannelStatus = useCallback(
    async (channel: keyof ServiceChannelStatusConfig, status: ServiceChannelStatus) => {
      if (!activeShift || !organizationId) {
        toast.error("No hay turno activo");
        return;
      }

      const newStatuses = { ...shiftChannelStatuses, [channel]: status };
      setShiftChannelStatuses(newStatuses);

      const newEnabled = {
        pickup: organizationChannels.pickup && newStatuses.pickup === "active",
        delivery: organizationChannels.delivery && newStatuses.delivery === "active",
        national_shipping: organizationChannels.national_shipping && newStatuses.national_shipping === "active",
      };
      setShiftChannels(newEnabled);

      try {
        const { error } = await supabase
          .from("cash_shifts")
          .update({
            pickup_enabled: newEnabled.pickup,
            delivery_enabled: newEnabled.delivery,
            national_shipping_enabled: newEnabled.national_shipping,
            pickup_status: newStatuses.pickup,
            delivery_status: newStatuses.delivery,
            national_shipping_status: newStatuses.national_shipping,
          })
          .eq("id", activeShift.id);

        if (error) throw error;
      } catch (error: any) {
        console.error("Error al actualizar estado del canal", error);
        setShiftChannelStatuses(shiftChannelStatuses);
        setShiftChannels({
          pickup: organizationChannels.pickup && shiftChannelStatuses.pickup === "active",
          delivery: organizationChannels.delivery && shiftChannelStatuses.delivery === "active",
          national_shipping: organizationChannels.national_shipping && shiftChannelStatuses.national_shipping === "active",
        });
        toast.error(error?.message ?? "No se pudo actualizar el estado del canal");
      }
    },
    [activeShift, organizationId, supabase, shiftChannelStatuses, organizationChannels],
  );

  const handleShiftSummaryButton = useCallback(() => {
    if (activeShift) {
      void fetchShiftSummary(activeShift.id, activeShift);
      if (organizationId && activeShift.location_id) {
        void fetchSummary(supabase, organizationId, activeShift.location_id, {
          start: activeShift.opened_at.split('T')[0],
          end: activeShift.closed_at ? activeShift.closed_at.split('T')[0] : new Date().toISOString().split('T')[0],
        });
      }
      setSummaryModalOpen(true);
      return;
    }
    if (shiftSummary) {
      setSummaryModalOpen(true);
      return;
    }
    setOpenShiftModalOpen(true);
  }, [activeShift, shiftSummary, fetchShiftSummary, fetchSummary, organizationId, supabase]);

  const handleSummaryModalClose = useCallback(() => {
    setSummaryModalOpen(false);
  }, []);

  const handleOpenCashMovementModal = useCallback(() => {
    if (!activeShift || activeShift.status !== "open") {
      toast.error("Abre un turno antes de registrar movimientos de caja");
      setOpenShiftModalOpen(true);
      return;
    }
    setCashMovementModalOpen(true);
  }, [activeShift]);

  const handleSubmitCashMovement = useCallback(
    async ({ amount, note, direction }: { amount: number; note: string; direction: "in" | "out" }) => {
      if (!organizationId || !activeShift) {
        toast.error("No hay turno activo");
        return;
      }
      setSavingCashMovement(true);
      try {
        await supabase.from("cash_movements").insert({
          organization_id: organizationId,
          location_id: activeShift.location_id,
          pos_id: activeShift.pos_id,
          shift_id: activeShift.id,
          cashier_id: userId ?? activeShift.cashier_id ?? null,
          created_by: userId ?? activeShift.opened_by ?? null,
          direction,
          amount: round2(amount),
          note: note.length ? note : null,
        });
        toast.success("Movimiento registrado");
        setCashMovementModalOpen(false);
        await fetchShiftSummary(activeShift.id, activeShift);
      } catch (error: any) {
        console.error("Error al registrar movimiento de caja", error);
        toast.error(error?.message ?? "No se pudo registrar el movimiento");
      } finally {
        setSavingCashMovement(false);
      }
    },
    [organizationId, activeShift, supabase, userId, fetchShiftSummary],
  );

  const handlePrintShiftSummary = useCallback(async () => {
    if (!shiftSummary) {
      toast.error("No hay resumen de turno disponible");
      return;
    }
    if (typeof window === "undefined" || !window.electron?.printDocument) {
      toast.error("Impresión no disponible en este dispositivo");
      return;
    }
    setIsPrintingShift(true);
    try {
      const printerPayload = buildPrinterPayload({ openCashDrawer: false });
      const posInfo = shiftSummary.posId ? posOptionsMap.get(shiftSummary.posId) : undefined;
      await window.electron.printDocument({
        type: "cashShift",
        data: {
          summary: shiftSummary,
          movementAggregates: shiftSummary.movementAggregates ?? [],
          movements: shiftSummary.movements ?? [],
          meta: {
            organizationName: orgName ?? "",
            cashierName: cashierDisplayName,
            posName: posInfo?.name ?? null,
            posCode: posInfo?.code ?? null,
            locationName: posInfo?.locationName ?? null,
          },
        },
        printer: printerPayload,
        renderOptions: {
          cut: true,
          openCashDrawer: false,
        },
      });
      toast.success("Resumen del turno enviado a impresión");
    } catch (error: any) {
      console.error("Error al imprimir resumen de turno", error);
      toast.error(error?.message ?? "No se pudo imprimir el turno");
    } finally {
      setIsPrintingShift(false);
    }
  }, [shiftSummary, buildPrinterPayload, posOptionsMap, orgName, cashierDisplayName]);

  useEffect(() => {
    if (!organizationId || !userId) return;
    loadOrganizationChannels();
  }, [organizationId, userId, loadOrganizationChannels]);

  useEffect(() => {
    if (!organizationId || !userId) return;
    fetchActiveShift();
  }, [organizationId, userId, fetchActiveShift]);

  useEffect(() => {
    if (!organizationId) return;
    if (openShiftModalOpen || summaryModalOpen) {
      loadPosOptions();
    }
  }, [organizationId, openShiftModalOpen, summaryModalOpen, loadPosOptions]);

  useEffect(() => {
    if (!organizationId) return;
    if (activeShift?.pos_id && !posOptionsMap.has(activeShift.pos_id)) {
      loadPosOptions();
    }
  }, [organizationId, activeShift?.pos_id, posOptionsMap, loadPosOptions]);

  useEffect(() => {
    if (!summaryModalOpen && pendingOpenShiftPrompt) {
      setPendingOpenShiftPrompt(false);
      setOpenShiftModalOpen(true);
    }
  }, [summaryModalOpen, pendingOpenShiftPrompt]);

  const shiftSummaryId = shiftSummary?.shiftId ?? null;

  const refreshShiftSummary = useCallback(async () => {
    const current = activeShiftRef.current;
    if (current) {
      return fetchShiftSummary(current.id, current);
    }
    if (shiftSummaryId) {
      return fetchShiftSummary(shiftSummaryId, null);
    }
    return null;
  }, [fetchShiftSummary, shiftSummaryId]);

  const summaryPosInfo = useMemo(() => {
    if (!shiftSummary?.posId) return null;
    const pos = posOptionsMap.get(shiftSummary.posId);
    if (!pos) return null;
    const labelParts: string[] = [];
    if (pos.name) labelParts.push(pos.name);
    if (pos.code) labelParts.push(`(${pos.code})`);
    return {
      label: labelParts.join(" ").trim() || pos.name,
      locationName: pos.locationName ?? null,
    };
  }, [shiftSummary, posOptionsMap]);

  const canCloseShift = shiftSummary?.status === "open";

  const modals = (
    <>
      <CashShiftOpenModal
        open={openShiftModalOpen}
        submitting={openingShift}
        onSubmit={({ amount, posId, note, channels }) =>
          handleOpenShiftSubmit({ amount, posId, note, channels })
        }
        onClose={activeShift ? () => setOpenShiftModalOpen(false) : undefined}
        posOptions={posOptions}
        loadingOptions={loadingPosOptions}
        error={shiftError}
        defaultPosId={activeShift?.pos_id ?? null}
        defaultNote={activeShift?.notes ?? ""}
        defaultAmount={activeShift?.opening_amount ?? null}
        defaultChannels={shiftChannelStatuses}
        organizationChannelConfig={organizationChannels}
      />

      <CashShiftSummaryModal
        open={summaryModalOpen}
        summary={shiftSummary}
        onClose={handleSummaryModalClose}
        onRequestCloseShift={handleCloseShift}
        isClosing={closingShift}
        isPrinting={isPrintingShift}
        onPrint={handlePrintShiftSummary}
        canCloseShift={Boolean(canCloseShift)}
        cashierName={cashierDisplayName}
        organizationName={orgName ?? undefined}
        posLabel={summaryPosInfo?.label ?? null}
        locationLabel={summaryPosInfo?.locationName ?? null}
        onOpenDeliverySummary={() => setDeliverySummaryModalOpen(true)}
        hasDeliveries={deliverySummary ? deliverySummary.orderCount > 0 : false}
      />

      <CashMovementModal
        open={cashMovementModalOpen}
        onClose={() => setCashMovementModalOpen(false)}
        onSubmit={handleSubmitCashMovement}
        submitting={savingCashMovement}
        expectedCash={shiftSummary?.expectedClosingCash ?? activeShift?.expected_closing_amount}
      />

      <DeliverySummaryModal
        open={deliverySummaryModalOpen}
        onClose={() => setDeliverySummaryModalOpen(false)}
        onGoToDrivers={() => {
          setDeliverySummaryModalOpen(false);
          setSummaryModalOpen(false);
          const locationId = activeShift?.location_id;
          if (locationId) {
            router.push(`/settings/drivers?location_id=${locationId}`);
          } else {
            router.push("/settings/drivers");
          }
        }}
        summary={deliverySummary}
        loading={deliverySummaryLoading}
        locationLabel={summaryPosInfo?.locationName ?? null}
        dateRange={activeShift ? {
          start: activeShift.opened_at.split('T')[0],
          end: activeShift.closed_at ? activeShift.closed_at.split('T')[0] : new Date().toISOString().split('T')[0],
        } : null}
      />
    </>
  );

  return {
    activeShift,
    shiftSummary,
    shiftAmountLabel,
    shiftLoading,
    organizationChannels,
    shiftChannels,
    shiftChannelStatuses,
    handleOpenCashMovementModal,
    handleShiftSummaryButton,
    handleUpdateChannelStatus,
    refreshShiftSummary,
    modals,
  };
}
