"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type {
  CashShiftSummary,
  CashMovementAggregate,
  CashMovementDetail,
  PosOption,
  ServiceChannelConfig,
  ServiceChannelStatusConfig,
  ServiceChannelStatus,
} from "./types";
import { ServiceChannelStatusSwitch } from "@/components/ServiceChannelStatusSwitch";
import {
  currency,
  formatShiftTimestamp,
  formatRate,
  formatIncTypeLabel,
  formatCashMovementReason,
  round2,
} from "./utils";

type PortalModalProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
};

function PortalModal({ open, onClose, children }: PortalModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !open) return null;

  const handleBackdropClick = () => {
    if (onClose) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleBackdropClick} />
      <div className="relative z-10">{children}</div>
    </div>,
    document.body,
  );
}

export type CashShiftOpenModalProps = {
  open: boolean;
  submitting: boolean;
  onSubmit: (payload: {
    amount: number;
    posId: string | null;
    note: string;
    channels: ServiceChannelStatusConfig;
  }) => Promise<void> | void;
  onClose?: () => void;
  posOptions: PosOption[];
  loadingOptions: boolean;
  error: string | null;
  defaultPosId?: string | null;
  defaultNote?: string;
  defaultAmount?: number | null;
  defaultChannels?: ServiceChannelStatusConfig;
  organizationChannelConfig?: ServiceChannelConfig;
};

export function CashShiftOpenModal({
  open,
  submitting,
  onSubmit,
  onClose,
  posOptions,
  loadingOptions,
  error,
  defaultPosId,
  defaultNote,
  defaultAmount = null,
  defaultChannels,
  organizationChannelConfig,
}: CashShiftOpenModalProps) {
  const router = useRouter();
  const amountId = useId();
  const posSelectId = useId();
  const noteId = useId();
  const amountRef = useRef<HTMLInputElement | null>(null);

  const [amount, setAmount] = useState("");
  const [selectedPosId, setSelectedPosId] = useState<string>("");
  const [note, setNote] = useState("");
  const [channels, setChannels] = useState<ServiceChannelStatusConfig>({
    pickup: "inactive",
    delivery: "inactive",
    national_shipping: "inactive",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initialAmount =
      defaultAmount != null && Number.isFinite(defaultAmount)
        ? String(round2(defaultAmount))
        : "0";
    setAmount(initialAmount);
    setSelectedPosId(defaultPosId ?? "");
    setNote(defaultNote ?? "");
    setChannels(
      defaultChannels ?? {
        pickup: "inactive",
        delivery: "inactive",
        national_shipping: "inactive",
      },
    );
    setLocalError(null);
    requestAnimationFrame(() => amountRef.current?.focus());
  }, [
    open,
    defaultAmount,
    defaultPosId,
    defaultNote,
    defaultChannels,
    organizationChannelConfig?.pickup,
    organizationChannelConfig?.delivery,
    organizationChannelConfig?.national_shipping,
  ]);

  useEffect(() => {
    if (!open) return;
    const preferredDefault =
      defaultPosId && posOptions.some((option) => option.id === defaultPosId)
        ? defaultPosId
        : null;
    const fallbackPosId = preferredDefault ?? posOptions[0]?.id ?? "";

    if (!fallbackPosId) return;

    const selectionExists = posOptions.some((option) => option.id === selectedPosId);
    if (!selectedPosId || !selectionExists) {
      setSelectedPosId(fallbackPosId);
    }
  }, [open, posOptions, defaultPosId, selectedPosId]);

  const parsedAmount = useMemo(() => {
    const value = Number(amount.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(value) ? value : NaN;
  }, [amount]);

  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount >= 0;

  const handleCancel = () => {
    const initialAmount =
      defaultAmount != null && Number.isFinite(defaultAmount)
        ? String(round2(defaultAmount))
        : "0";
    setAmount(initialAmount);
    setSelectedPosId(defaultPosId ?? "");
    setNote(defaultNote ?? "");
    setChannels(
      defaultChannels ?? {
        pickup: organizationChannelConfig?.pickup ? "active" : "inactive",
        delivery: organizationChannelConfig?.delivery ? "active" : "inactive",
        national_shipping: organizationChannelConfig?.national_shipping ? "active" : "inactive",
      },
    );
    setLocalError(null);

    router.push("/sales");
    if (onClose) onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitting) {
      setLocalError("Ingresa un monto valido mayor o igual a 0.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({
        amount: round2(parsedAmount),
        posId: selectedPosId || null,
        note: note.trim(),
        channels,
      });
    } catch (submitError: any) {
      const message = submitError?.message ?? "No se pudo abrir el turno";
      setLocalError(message);
    }
  };

  return (
    <PortalModal open={open} onClose={onClose}>
      <div className="w-[min(520px,100%)] max-h-[calc(100svh-1.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-800">Abrir turno</h2>
          <p className="mt-1 text-sm text-gray-500">
            Registra el monto inicial en caja y, si aplica, selecciona el POS a utilizar.
          </p>
        </div>
        <form className="px-6 py-5 space-y-5 overflow-y-auto" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor={amountId} className="text-sm font-medium text-gray-700">
              Monto de apertura
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
                $
              </span>
              <input
                id={amountId}
                ref={amountRef}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                inputMode="decimal"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={posSelectId} className="text-sm font-medium text-gray-700">
              POS asignado (opcional)
            </label>
            <select
              id={posSelectId}
              value={selectedPosId}
              onChange={(event) => setSelectedPosId(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingOptions}
            >
              <option value="">Sin asignar</option>
              {posOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.code ? ` (${option.code})` : ""}
                  {option.locationName ? ` - ${option.locationName}` : ""}
                </option>
              ))}
            </select>
            {loadingOptions && (
              <p className="text-xs text-gray-500">Cargando lista de POS.</p>
            )}
          </div>



          <div className="space-y-2">
            <label htmlFor={noteId} className="text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              id={noteId}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones del turno"
            />
          </div>

          {(localError || error) && (
            <p className="text-sm text-red-600">{localError ?? error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Creando..." : "Abrir turno"}
            </button>
          </div>
        </form>
      </div>
    </PortalModal>
  );
}

export type CashShiftSummaryModalProps = {
  open: boolean;
  summary: CashShiftSummary | null;
  onClose: () => void;
  onRequestCloseShift: (payload: { countedAmount: number; note: string }) => Promise<void> | void;
  isClosing: boolean;
  isPrinting: boolean;
  onPrint: () => Promise<void>;
  canCloseShift: boolean;
  cashierName: string;
  organizationName?: string;
  posLabel?: string | null;
  locationLabel?: string | null;
  onOpenDeliverySummary?: () => void;
  hasDeliveries?: boolean;
};

export function CashShiftSummaryModal({
  open,
  summary,
  onClose,
  onRequestCloseShift,
  isClosing,
  isPrinting,
  onPrint,
  canCloseShift,
  cashierName,
  organizationName,
  posLabel,
  locationLabel,
  onOpenDeliverySummary,
  hasDeliveries,
}: CashShiftSummaryModalProps) {
  const countedId = useId();
  const noteId = useId();
  const countedInputRef = useRef<HTMLInputElement | null>(null);

  const [countedInput, setCountedInput] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const defaultCounted =
      summary && summary.countedClosingAmount > 0
        ? summary.countedClosingAmount
        : summary?.expectedClosingCash ?? 0;
    setCountedInput(summary ? String(round2(defaultCounted)) : "");
    setNote(summary?.notes ?? "");
    setLocalError(null);
    if (canCloseShift) {
      requestAnimationFrame(() => countedInputRef.current?.focus());
    }
  }, [open, summary, canCloseShift]);

  const parsedCounted = useMemo(() => {
    if (!countedInput?.length) return NaN;
    const normalized = Number(countedInput.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : NaN;
  }, [countedInput]);

  const expectedCash = summary?.expectedClosingCash ?? 0;
  const difference = Number.isFinite(parsedCounted)
    ? round2(parsedCounted - expectedCash)
    : NaN;

  const differenceClass =
    Number.isFinite(difference) && difference !== 0
      ? difference > 0
        ? "text-red-600"
        : "text-green-600"
      : "text-gray-600";

  const cashMovementsNet = summary?.cashMovementsNet ?? null;
  const netIntent =
    cashMovementsNet != null
      ? cashMovementsNet > 0
        ? "in"
        : cashMovementsNet < 0
          ? "out"
          : "neutral"
      : "neutral";

  const totalPayments = summary
    ? round2(
        summary.totalPayments ??
          ((summary.totalCash ?? 0) +
            (summary.totalCard ?? 0) +
            (summary.totalBold ?? 0) +
            (summary.totalNequi ?? 0) +
            (summary.totalTransfer ?? 0) +
            (summary.totalOthers ?? 0)),
      )
    : 0;

  const movementAggregates: CashMovementAggregate[] = summary?.movementAggregates ?? [];
  const movementDetails: CashMovementDetail[] = summary?.movements ?? [];

  const statusLabel =
    summary?.status === "closed"
      ? "Cerrado"
      : summary?.status === "archived"
        ? "Archivado"
        : "Abierto";

  const statusChipClass =
    summary?.status === "closed"
      ? "bg-gray-100 text-gray-600"
      : summary?.status === "archived"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  const canSubmit =
    canCloseShift && Number.isFinite(parsedCounted) && parsedCounted >= 0 && summary != null;

  const formatNoteText = (value: string | null | undefined) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed.length) return "";
    return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!summary) {
      setLocalError("No hay informacion de turno para cerrar.");
      return;
    }
    if (!canSubmit) {
      setLocalError("Registra el conteo final para cerrar el turno.");
      return;
    }
    setLocalError(null);
    try {
      try {
        await onPrint();
      } catch (printError) {
        console.error("No se pudo imprimir el resumen antes de cerrar:", printError);
      }

      await onRequestCloseShift({
        countedAmount: round2(parsedCounted),
        note: note.trim(),
      });
      onClose();
    } catch (submitError: any) {
      const message = submitError?.message ?? "No se pudo cerrar el turno";
      setLocalError(message);
    }
  };

  const renderMetric = (
    label: string,
    value: number,
    options?: {
      highlight?: boolean;
      helper?: string;
      intent?: "in" | "out" | "neutral";
    },
  ) => {
    const helper = options?.helper ?? null;
    const highlight = options?.highlight ?? false;
    const intent = options?.intent ?? "neutral";
    const valueClass =
      intent === "in"
        ? "text-emerald-600"
        : intent === "out"
          ? "text-red-600"
          : highlight
            ? "text-blue-600"
            : "text-gray-800";
    const cardClass = highlight
      ? "border border-blue-200 bg-blue-50"
      : "border border-gray-100 bg-white";
    return (
      <div>
        <div className={`flex items-center justify-between rounded-xl`}>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className={`text-sm font-semibold ${valueClass}`}>
            ${" "}{currency(value)}
          </p>
        </div>
        {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
      </div>
    );
  };

  return (
    <PortalModal open={open} onClose={onClose}>
      <div className="w-full max-w-[720px] max-h-[calc(100svh-1.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col">
        <div className="border-b border-gray-100 px-6 py-5 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Resumen del turno</h2>
              <p className="text-sm text-gray-500">
                {organizationName ?? "Organizacion"} · {cashierName}
              </p>
              {summary && (
                <p className="text-xs text-gray-500">
                  {formatShiftTimestamp(summary.openedAt)} 
                  {summary.closedAt ? ` · Cierre: ${formatShiftTimestamp(summary.closedAt)}` : ""}
                  {(posLabel || locationLabel) && (
                    <span className="mt-1 text-xs text-gray-500">
                      &nbsp;·&nbsp;
                      {posLabel ? `${posLabel}` : ""}
                      {posLabel && locationLabel ? " · " : ""}
                      {locationLabel ?? ""}
                    </span>
                  )}
                </p>
              )}
              
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusChipClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 pt-3 space-y-5 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {renderMetric("Monto de apertura", summary?.openingAmount ?? 0)}
            {renderMetric("Ventas en efectivo", summary?.totalCash ?? 0)}
            {renderMetric("Ingresos a caja", summary?.cashIn ?? 0, { intent: "in" })}
            {renderMetric("Retiros de caja", summary?.cashOut ?? 0, { intent: "out" })}
            {renderMetric("Movimientos netos", cashMovementsNet ?? 0, { intent: netIntent })}
            {renderMetric("Total acumulado", totalPayments, { highlight: true })}
            {renderMetric("Esperado en caja", expectedCash, {
              highlight: true
            })}
          </div>
          {movementDetails.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Movimientos registrados
              </p>
              <div className="flex flex-col pr-1">
                {movementDetails.map((movement) => {
                  const intentClass =
                    movement.direction === "in"
                      ? "text-emerald-600"
                      : movement.direction === "out"
                        ? "text-red-600"
                        : "text-gray-700";
                  const directionLabel = movement.direction === "in" ? "Ingreso" : "Salida";
                  const timestampDisplay = formatShiftTimestamp(movement.createdAt);
                  const primaryText =
                    formatNoteText(movement.note) ||
                    movement.reasonLabel ||
                    directionLabel;

                  return (
                    <div
                      key={movement.id}
                      className="border-t last:border-b pt-2 pb-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {primaryText}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {directionLabel} · {timestampDisplay}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold ${intentClass}`}>
                          {movement.direction === "in" ? "+" : "-"}
                          {" $ "}{currency(movement.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pagos por metodo
            </p>
            <div className="mt-3 flex flex-col gap-0">
              <div className="flex items-center justify-between rounded-lg bg-white text-sm">
                <span className="text-gray-600">Tarjeta</span>
                <span className="font-medium text-gray-800">${" "}{currency(summary?.totalCard ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white text-sm">
                <span className="text-gray-600">Bold</span>
                <span className="font-medium text-gray-800">${" "}{currency(summary?.totalBold ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white text-sm">
                <span className="text-gray-600">Transferencia</span>
                <span className="font-medium text-gray-800">${" "}{currency(summary?.totalTransfer ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white text-sm">
                <span className="text-gray-600">Nequi</span>
                <span className="font-medium text-gray-800">${" "}{currency(summary?.totalNequi ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white text-sm">
                <span className="text-gray-600">Otros</span>
                <span className="font-medium text-gray-800">${" "}{currency(summary?.totalOthers ?? 0)}</span>
              </div>
            </div>
          </div>

          {renderMetric("Total acumulado", totalPayments, {highlight:true})}

          <div className="space-y-3">
            <div>
              <label htmlFor={countedId} className="text-sm font-medium text-gray-700">
                Conteo real en caja
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
                  $
                </span>
                <input
                  id={countedId}
                  ref={countedInputRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={countedInput}
                  onChange={(event) => setCountedInput(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresa el conteo final"
                  inputMode="decimal"
                  disabled={!canCloseShift}
                />
              </div>
              <p className={`mt-1 text-sm ${differenceClass}`}>
                Diferencia: {" "}
                {Number.isFinite(difference) ? `$ ${currency(Math.abs(difference))}` : "-"}
                {Number.isFinite(difference) && difference !== 0
                  ? difference > 0
                    ? " (sobra)"
                    : " (falta)"
                  : ""}
              </p>
            </div>

            <div>
              <label htmlFor={noteId} className="text-sm font-medium text-gray-700">
                Notas del turno
              </label>
              <textarea
                id={noteId}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones o incidencias del turno"
              />
            </div>
          </div>

          {localError && (
            <p className="text-sm text-red-600">{localError}</p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
              onClick={onClose}
              disabled={isClosing}
            >
              Salir
            </button>
            {onOpenDeliverySummary && (
              <button
                type="button"
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  hasDeliveries
                    ? "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
                    : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (hasDeliveries && onOpenDeliverySummary) {
                    onOpenDeliverySummary();
                  }
                }}
                disabled={!hasDeliveries}
              >
                📦 Resumen de Domicilios
              </button>
            )}
            <button
              type="button"
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
              onClick={() => {
                void onPrint();
              }}
              disabled={isPrinting || !summary}
            >
              {isPrinting ? "Imprimiendo..." : "Imprimir resumen"}
            </button>
            {canCloseShift ? (
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                disabled={isClosing || !canSubmit}
              >
                {isClosing ? "Cerrando..." : "Cerrar turno"}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium text-gray-600"
                disabled
              >
                Turno cerrado
              </button>
            )}
          </div>
        </form>
      </div>
    </PortalModal>
  );
}
export type CashMovementModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { amount: number; direction: "in" | "out"; note: string }) => Promise<void> | void;
  submitting: boolean;
  expectedCash?: number;
};

export function CashMovementModal({
  open,
  onClose,
  onSubmit,
  submitting,
  expectedCash,
}: CashMovementModalProps) {
  const amountId = useId();
  const noteId = useId();
  const amountRef = useRef<HTMLInputElement | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDirection("in");
    setAmount("");
    setNote("");
    setLocalError(null);
    requestAnimationFrame(() => amountRef.current?.focus());
  }, [open]);

  const parsedAmount = useMemo(() => {
    if (!amount.length) return NaN;
    const normalized = Number(
      amount.replace(/\s+/g, "").replace(",", "."),
    );
    return Number.isFinite(normalized) ? normalized : NaN;
  }, [amount]);

  const noteIsValid = note.trim().length > 0;
  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0 && noteIsValid;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setLocalError("Ingresa un monto valido mayor a 0.");
      return;
    }
    if (!noteIsValid) {
      setLocalError("Describe el motivo del movimiento en la nota.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({
        amount: round2(parsedAmount),
        direction,
        note: note.trim(),
      });
    } catch (submitError: any) {
      const message = submitError?.message ?? "No se pudo registrar el movimiento";
      setLocalError(message);
    }
  };

  const directionButtonClass = (value: "in" | "out") => {
    const isActive = direction === value;
    if (value === "in") {
      return `flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-green-200 text-green-800 shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-green-100"
      }`;
    }
    return `flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-red-200 text-red-800 shadow-sm"
        : "bg-gray-100 text-gray-600 hover:bg-red-100"
    }`;
  };

  return (
    <PortalModal open={open} onClose={onClose}>
      <div className="w-[min(520px,100%)] max-h-[calc(100svh-1.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-800">Movimiento de caja</h2>
          <p className="mt-1 text-sm text-gray-500">
            Registra ingresos o retiros de efectivo en tu turno actual.
          </p>
        </div>
        <form className="px-6 py-5 space-y-5 overflow-y-auto" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <button
              type="button"
              className={directionButtonClass("in")}
              onClick={() => {
                setDirection("in");
                requestAnimationFrame(() => amountRef.current?.focus());
              }}
            >
              Ingreso
            </button>
            <button
              type="button"
              className={directionButtonClass("out")}
              onClick={() => {
                setDirection("out");
                requestAnimationFrame(() => amountRef.current?.focus());
              }}
            >
              Salida
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor={amountId} className="text-sm font-medium text-gray-700">
              Monto
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
                $
              </span>
              <input
                id={amountId}
                ref={amountRef}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                inputMode="decimal"
                required
              />
            </div>
            {typeof expectedCash === "number" && Number.isFinite(expectedCash) && (
              <p className="text-xs text-gray-500">
                Efectivo esperado en caja: ${" "}{currency(expectedCash)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor={noteId} className="text-sm font-medium text-gray-700">
              Notas
            </label>
            <textarea
              id={noteId}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Retiro para gastos menores"
              required
            />
          </div>

          {localError && (
            <p className="text-sm text-red-600">{localError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Guardando..." : "Registrar movimiento"}
            </button>
          </div>
        </form>
      </div>
    </PortalModal>
  );
}

export type DeliverySummaryModalProps = {
  open: boolean;
  onClose: () => void;
  onGoToDrivers?: () => void;
  summary: {
    totalDeliverySales: number;
    totalDriverCommissions: number;
    totalTips: number;
    netProfit: number;
    orderCount: number;
  } | null;
  loading: boolean;
  locationLabel?: string | null;
  dateRange?: { start: string; end: string } | null;
};

export function DeliverySummaryModal({
  open,
  onClose,
  onGoToDrivers,
  summary,
  loading,
  locationLabel,
  dateRange,
}: DeliverySummaryModalProps) {
  const formatCurrency = (value: number) => currency(value);
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const hasDeliveries = summary && summary.orderCount > 0;

  return (
    <PortalModal open={open} onClose={onClose}>
      <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Resumen de Domicilios</h2>
              <p className="text-sm text-gray-500">
                {locationLabel || "Sucursal"} · {dateRange ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}` : "Hoy"}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : !hasDeliveries ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500">No hay domiciliarios registrados en este turno</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ventas por Domicilio</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDeliverySales)}</p>
                  <p className="mt-1 text-xs text-gray-500">{summary.orderCount} {summary.orderCount === 1 ? 'pedido' : 'pedidos'}</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Comisiones Drivers</p>
                  <p className="mt-1 text-2xl font-bold text-orange-600">{formatCurrency(summary.totalDriverCommissions)}</p>
                  <p className="mt-1 text-xs text-orange-600">
                    {summary.totalDeliverySales > 0 
                      ? `${((summary.totalDriverCommissions / summary.totalDeliverySales) * 100).toFixed(1)}% de ventas`
                      : '0% de ventas'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border-2 border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Ganancia Neta (Domicilios)</p>
                    <p className="text-xs text-blue-600">Ventas - Comisiones</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{formatCurrency(summary.netProfit)}</p>
                </div>
              </div>

              {summary.totalTips > 0 && (
                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Total Propinas</p>
                      <p className="text-xs text-green-600">Para los domiciliarios</p>
                    </div>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalTips)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Resumen financiero del día</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ingresos totales por delivery</span>
                  <span className="font-medium text-gray-900">{formatCurrency(summary.totalDeliverySales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo de domiciliarios</span>
                  <span className="font-medium text-red-600">-{formatCurrency(summary.totalDriverCommissions)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="font-medium text-gray-800">Ganancia neta</span>
                  <span className="font-bold text-green-600">{formatCurrency(summary.netProfit)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            onClick={onClose}
          >
            Cerrar
          </button>
          {hasDeliveries && onGoToDrivers && (
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              onClick={onGoToDrivers}
            >
              Ver domiciliarios
            </button>
          )}
        </div>
      </div>
    </PortalModal>
  );
}
