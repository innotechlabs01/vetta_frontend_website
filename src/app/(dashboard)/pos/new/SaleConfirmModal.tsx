"use client";

import { Trash2 } from "lucide-react";
import type { RefObject } from "react";
import AnimatedHeight from "./AnimatedHeight";
import CurrencyInput from "./CurrencyInput";
import type {
  PaymentDraft,
  PaymentMethod,
  PrimaryPaymentOption,
} from "./types";

type CartSummary = {
  subtotal: number;
  ivaTotal: number;
  incTotal: number;
  taxTotal: number;
  total: number;
  breakdown: { label: string; amount: number }[];
};

type PaymentAnalysisEntry = {
  draft: PaymentDraft;
  amount: number;
  received: number;
  change: number;
};

type PaymentAnalysis = {
  entries: PaymentAnalysisEntry[];
  totalAssigned: number;
  totalReceived: number;
  totalChange: number;
  missingAmount: number;
  hasInvalidAmount: boolean;
  cashShortage: boolean;
};

type PaymentMethodOption = { value: PaymentMethod; label: string };
type PrimaryPaymentOptionConfig = {
  value: PrimaryPaymentOption;
  label: string;
  icon: string;
};

type SaleConfirmModalProps = {
  mode: "sale" | "purchase";
  isOpen: boolean;
  paymentStage: "method" | "details";
  cartSummary: CartSummary;
  tipAmount: number;
  tipPercentage: number;
  setTipPercentage: (value: number) => void;
  tipChoices: readonly number[];
  formatRate: (rate: number) => string;
  currency: (value: number) => string;
  totalDue: number;
  primaryPaymentOptions: PrimaryPaymentOptionConfig[];
  primaryPaymentOption: PrimaryPaymentOption | null;
  onSelectPrimaryPayment: (option: PrimaryPaymentOption) => void;
  paymentDrafts: PaymentDraft[];
  paymentEntryInfo: Map<string, PaymentAnalysisEntry>;
  updatePaymentDraft: (id: string, updates: Partial<PaymentDraft>) => void;
  paymentMethodOptions: PaymentMethodOption[];
  combinedFirstAmountRef: RefObject<HTMLInputElement>;
  singleCashReceivedRef: RefObject<HTMLInputElement>;
  singleReferenceRef: RefObject<HTMLInputElement>;
  addCombinedPaymentDraft: () => void;
  removePaymentDraft: (id: string) => void;
  paymentMethodLabels: Record<PaymentMethod, string>;
  round2: (value: number) => number;
  hasCashEntry: boolean;
  paymentAnalysis: PaymentAnalysis;
  paymentBalanceOk: boolean;
  paymentMissingAbs: number;
  paymentIsShort: boolean;
  paymentIsOver: boolean;
  openCashDrawer: boolean;
  printReceipt: boolean;
  setOpenCashDrawer: (value: boolean) => void;
  onTogglePrintReceipt: (value: boolean) => void;
  resetPaymentFlow: () => void;
  savingSale: boolean;
  finalizeAndPrint: () => void;
  canFinalizePayment: boolean;
  onClose: () => void;
  confirmLabel?: string;
};

export default function SaleConfirmModal({
  mode,
  isOpen,
  paymentStage,
  cartSummary,
  tipAmount,
  tipPercentage,
  setTipPercentage,
  tipChoices,
  formatRate,
  currency,
  totalDue,
  primaryPaymentOptions,
  primaryPaymentOption,
  onSelectPrimaryPayment,
  paymentDrafts,
  paymentEntryInfo,
  updatePaymentDraft,
  paymentMethodOptions,
  combinedFirstAmountRef,
  singleCashReceivedRef,
  singleReferenceRef,
  addCombinedPaymentDraft,
  removePaymentDraft,
  paymentMethodLabels,
  round2,
  hasCashEntry,
  paymentAnalysis,
  paymentBalanceOk,
  paymentMissingAbs,
  paymentIsShort,
  paymentIsOver,
  openCashDrawer,
  printReceipt,
  setOpenCashDrawer,
  onTogglePrintReceipt,
  resetPaymentFlow,
  savingSale,
  finalizeAndPrint,
  canFinalizePayment,
  onClose,
  confirmLabel,
}: SaleConfirmModalProps) {
  if (!isOpen) return null;

  const isPurchase = mode === "purchase";
  const finalizeLabel =
    confirmLabel ?? (isPurchase ? "Registrar compra" : "Finalizar e imprimir");
  const totalTitle = isPurchase ? "Total a entregar" : "Total a cobrar";
  const normalizedChangeAmount = Math.max(0, paymentAnalysis.totalChange);
  const shouldShowChangeSummary =
    paymentStage === "details" &&
    (normalizedChangeAmount > 0 || hasCashEntry || primaryPaymentOption === "cash");
  const changeSummaryClass = normalizedChangeAmount > 0 ? "text-emerald-600" : "text-gray-500";

  const summarySection = (
    <div className="rounded-xl  bg-gray-100 p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>${" "}{currency(cartSummary.subtotal)}</span>
      </div>
      {tipAmount > 0 && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>{`Servicio ${formatRate(tipPercentage)}%`}</span>
          <span>${" "}{currency(tipAmount)}</span>
        </div>
      )}
      {cartSummary.breakdown.length === 0 ? (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Impuestos</span>
          <span>${" "}{currency(cartSummary.taxTotal)}</span>
        </div>
      ) : (
        cartSummary.breakdown.map((entry) => (
          <div key={`modal-${entry.label}`} className="flex justify-between text-sm text-gray-600">
            <span>{entry.label}</span>
            <span>${" "}{currency(entry.amount)}</span>
          </div>
        ))
      )}
      <div className="flex justify-between pt-1 text-base font-semibold">
        <span>{totalTitle}</span>
        <span>${" "}{currency(totalDue)}</span>
      </div>
      {shouldShowChangeSummary && (
        <div className={`flex justify-between pt-2 text-sm font-semibold ${changeSummaryClass}`}>
          <span>Cambio</span>
          <span>${" "}{currency(normalizedChangeAmount)}</span>
        </div>
      )}
    </div>
  );

  const tipSection = (
    <div className="rounded-xl py-3 ">
      <p className="text-xs uppercase tracking-wide text-gray-500">
        Propina sugerida, {formatRate(tipPercentage)}%
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tipChoices.map((value) => {
          const isSelected = tipPercentage === value;
          const amount = value === 0 ? 0 : round2(cartSummary.subtotal * (value / 100));
          const label = value === 0 ? "Sin propina" : `${value}% (${currency(amount)})`;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTipPercentage(value)}
              className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                isSelected
                  ? "border-blue-600 bg-blue-200 text-blue-900"
                  : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const methodSection = (
    <div>
      <div className="mt-2 flex flex-wrap gap-3 justify-center">
        {primaryPaymentOptions.map((option) => {
          const active = primaryPaymentOption === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelectPrimaryPayment(option.value)}
              className={`min-w-[150px] rounded-2xl border px-5 py-4 text-base font-medium transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg" aria-hidden="true">{option.icon}</span>
                <span>{option.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100000] grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {paymentStage === "method"
                ? isPurchase
                  ? "Selecciona cómo entregar el pago"
                  : "Selecciona método de pago"
                : "Detalle del pago"}
            </h3>
            <p className="text-sm text-gray-500">
              {paymentStage === "method"
                ? isPurchase
                  ? "Elige la forma en la que saldrá el dinero hacia el cliente."
                  : "Elige la forma de pago para completar la venta."
                : isPurchase
                  ? "Registra las salidas de dinero antes de finalizar."
                  : "Registra los pagos recibidos antes de finalizar."}
            </p>
          </div>
          
          <button
            className="rounded-lg border px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-50"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <AnimatedHeight className="mt-5">
          <div className="space-y-4">
            {paymentStage === "method" ? (
              <>
                {methodSection}
                {!isPurchase ? tipSection : null}
                {summarySection}
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    className="rounded-xl border px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                {primaryPaymentOption === "combined" ? (
                  <div className="space-y-3">
                  <div className="justify-between flex items-center" >
                    <span>
                      <span className="text-sm text-gray-500">
                        Pago Combinado:
                      </span>
                      <button
                        type="button"
                        className="text-sm font-medium text-blue-600 hover:underline ml-4"
                        onClick={resetPaymentFlow}
                      >
                        Cambiar método
                      </button>
                    </span>
                    <div className="text-right">

                    {paymentAnalysis.hasInvalidAmount && (
                      <p className="text-xs text-red-600">
                        Ingresa montos mayores a cero para cada método seleccionado.
                      </p>
                    )}
                    {!paymentBalanceOk && (
                      <p className="text-xs text-amber-600">
                        Ajusta los montos hasta igualar el total de la operación.
                        <span className="block">
                          {paymentIsShort
                            ? `Faltan $ ${currency(paymentMissingAbs)} por asignar.`
                            : paymentIsOver
                              ? `Has asignado $ ${currency(paymentMissingAbs)} de más.`
                              : null}
                        </span>
                      </p>
                    )}
                    {paymentAnalysis.cashShortage && (
                      <p className="text-xs text-red-600">
                        El efectivo recibido debe ser igual o mayor al monto en efectivo.
                      </p>
                    )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl bg-gray-100">
                    <div className="grid grid-cols-[minmax(140px,1fr)_minmax(160px,1fr)_minmax(220px,1.3fr)_80px_60px] items-center  px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <span>Método</span>
                      <span>Monto</span>
                      <span>Detalle</span>
                      <span className="text-right">% operación</span>
                      <span className="text-right pr-2">Acción</span>
                    </div>
                    {paymentDrafts.map((entry, index) => {
                      const info = paymentEntryInfo.get(entry.id);
                      const percentage =
                        totalDue > 0 && info
                          ? Math.max(0, Math.min(100, round2((info.amount / totalDue) * 100)))
                          : 0;

                      return (
                        <div
                          key={entry.id}
                          className="grid grid-cols-[minmax(140px,1fr)_minmax(160px,1fr)_minmax(220px,1.3fr)_80px_60px] items-start gap-3 px-3 py-1 last:pb-4 text-sm"
                        >
                          <div>
                            <select
                              value={entry.method}
                              onChange={(event) =>
                                updatePaymentDraft(entry.id, {
                                  method: event.target.value as PaymentMethod,
                                })
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {paymentMethodOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <CurrencyInput
                              value={entry.amount}
                              onValueChange={(next) =>
                                updatePaymentDraft(entry.id, {
                                  amount: next,
                                })
                              }
                              placeholder="0.00"
                              ref={index === 0 ? combinedFirstAmountRef : undefined}
                            />
                          </div>
                          <div className="space-y-1">
                            {entry.method === "cash" ? (
                              <>
                                <CurrencyInput
                                  value={entry.received ?? ""}
                                  onValueChange={(next) =>
                                    updatePaymentDraft(entry.id, {
                                      received: next,
                                    })
                                  }
                                  placeholder="0.00"
                                />
                                
                              </>
                            ) : (
                              <input
                                type="text"
                                value={entry.reference ?? ""}
                                onChange={(event) =>
                                  updatePaymentDraft(entry.id, { reference: event.target.value })
                                }
                                placeholder="Voucher, comprobante o ID de transacción"
                                aria-label="Referencia del pago (opcional)"
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-end text-xs text-gray-500">
                            {totalDue > 0 && info ? `${percentage.toFixed(1)}%` : "—"}
                          </div>
                          <div className="flex items-center justify-end pr-4">
                            {paymentDrafts.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removePaymentDraft(entry.id)}
                                className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100"
                                title="Eliminar pago"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addCombinedPaymentDraft}
                    className="w-full rounded-xl border border-dashed border-blue-300 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    Agregar método
                  </button>
                </div>
              ) : (
                (() => {
                  const entry = paymentDrafts[0];
                  const info = entry ? paymentEntryInfo.get(entry.id) : null;
                  if (!entry) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border bg-gray-50 px-3 py-2">
                        <span className="text-sm font-medium text-gray-600">
                          {paymentMethodLabels[entry.method]}
                          <button
                            type="button"
                            className="text-sm font-medium text-blue-600 hover:underline ml-4"
                            onClick={resetPaymentFlow}
                          >
                            Cambiar método
                          </button>
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          ${" "}{currency(info?.amount ?? totalDue)}
                        </span>
                      </div>
                      {entry.method === "cash" ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Dinero recibido</label>
                          <CurrencyInput
                            value={entry.received ?? ""}
                            onValueChange={(next) =>
                              updatePaymentDraft(entry.id, {
                                received: next,
                              })
                            }
                            placeholder="0.00"
                            ref={singleCashReceivedRef}
                          />
                          
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {entry.method === "card"
                              ? "Referencia / Voucher (opcional)"
                              : "Referencia del pago (opcional)"}
                          </label>
                          <input
                            type="text"
                            value={entry.reference ?? ""}
                            onChange={(event) =>
                              updatePaymentDraft(entry.id, { reference: event.target.value })
                            }
                            placeholder={
                              entry.method === "card"
                                ? "Últimos 4, voucher o ref. POS"
                                : "ID de transacción o comprobante"
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            ref={singleReferenceRef}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {hasCashEntry && (
                <div className="flex items-center justify-between rounded-xl text-sm">
                  <span className="text-gray-500" >Abrir cajón al finalizar</span>
                  <label className="flex cursor-pointer select-none items-center gap-2">
                    <span className="text-xs text-gray-600">{openCashDrawer ? "Sí" : "No"}</span>
                    <input
                      type="checkbox"
                      checked={openCashDrawer}
                      onChange={(event) => setOpenCashDrawer(event.target.checked)}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </label>
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl text-sm">
                <span className="text-gray-500">Imprimir ticket</span>
                <label className="flex cursor-pointer select-none items-center gap-2">
                  <span className="text-xs text-gray-600">{printReceipt ? "Sí" : "No"}</span>
                  <input
                    type="checkbox"
                    checked={printReceipt}
                    onChange={(event) => onTogglePrintReceipt(event.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />
                </label>
              </div>
              {tipSection}
              {summarySection}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:underline"
                  onClick={resetPaymentFlow}
                >
                  Cambiar método de pago
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-xl border px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                    onClick={onClose}
                    disabled={savingSale}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                    onClick={finalizeAndPrint}
                    disabled={!canFinalizePayment || savingSale}
                  >
                    {savingSale ? "Procesando…" : finalizeLabel}
                  </button>
                </div>
              </div>
              </>
            )}
          </div>
        </AnimatedHeight>
      </div>
    </div>
  );
}
