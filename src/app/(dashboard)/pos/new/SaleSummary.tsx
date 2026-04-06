"use client";

import CustomerRow from "./Customer";
import OrderTypeSelector, { type FieldConfig as OTFieldConfig } from "./DeliveryMethod";
import type { DBCustomer } from "@/types/customers";
import type {
  CartLine,
  DraftSummary,
  DBProduct,
  SelectedLineModifier,
  LineComputation,
} from "./types";

type OrderTypeOptionLite = {
  id: string;
  label: string;
  icon: string;
  requires: string[];
};

type CartSummary = {
  subtotal: number;
  ivaTotal: number;
  incTotal: number;
  taxTotal: number;
  total: number;
  breakdown: { label: string; amount: number }[];
};

type SaleSummaryProps = {
  activeDraft: DraftSummary | null;
  customers: DBCustomer[];
  customersLoading: boolean;
  selectedCustomer: DBCustomer | null;
  setSelectedCustomerId: (id: string | null) => void;
  customerDisplayName: (customer: Partial<DBCustomer> | null) => string;
  fetchCustomers: () => Promise<void>;
  organizationId: string | null;
  supabase: any;
  orderTypeOptions: OrderTypeOptionLite[];
  getFieldConfig: (fieldId: string) => OTFieldConfig;
  orderType: string | null;
  orderFields: Record<string, string>;
  optionalFieldsByType: Record<string, string[]>;
  onOrderTypeChange: (payload: {
    orderTypeId: string | null;
    orderFields: Record<string, string>;
    addressId?: string | null;
  }) => void;
  cart: CartLine[];
  computeLineTotals: (
    product: DBProduct,
    qty: number,
    modifiers: SelectedLineModifier[]
  ) => LineComputation;
  handleOpenLineComments: (line: CartLine) => void;
  removeLine: (id: string) => void;
  decrementLine: (id: string) => void;
  incrementLine: (id: string) => void;
  cartSummary: CartSummary;
  tipAmount: number;
  tipPercentage: number;
  formatRate: (rate: number) => string;
  totalDue: number;
  handleCancelDraft: () => void | Promise<void>;
  openPayModal: () => void;
  savingSale: boolean;
  currency: (value: number) => string;
  isRestaurantBusiness: boolean;
  printKitchenTicket: () => void;
  printingKitchen: boolean;
  printPrebill: () => void;
  printingPrebill: boolean;
};

export default function SaleSummary({
  activeDraft,
  customers,
  customersLoading,
  selectedCustomer,
  setSelectedCustomerId,
  customerDisplayName,
  fetchCustomers,
  organizationId,
  supabase,
  orderTypeOptions,
  getFieldConfig,
  orderType,
  orderFields,
  optionalFieldsByType,
  onOrderTypeChange,
  cart,
  computeLineTotals,
  handleOpenLineComments,
  removeLine,
  decrementLine,
  incrementLine,
  cartSummary,
  tipAmount,
  tipPercentage,
  formatRate,
  totalDue,
  handleCancelDraft,
  openPayModal,
  savingSale,
  currency,
  isRestaurantBusiness,
  printKitchenTicket,
  printingKitchen,
  printPrebill,
  printingPrebill,
}: SaleSummaryProps) {
  return (
    <aside
      className=" 
          h-[calc(100svh-24px)] flex flex-col
          bg-gray-100 mt-3 min-w-[450px] w-[450px] xl:max-w-[450px] rounded-2xl border p-4 space-y-3 sticky top-6 "
    >
      <div className="flex items-start gap-4">
        
        <CustomerRow
          customers={customers}
          customersLoading={customersLoading}
          selectedCustomer={selectedCustomer ?? undefined}
          setSelectedCustomerId={(id) => setSelectedCustomerId(id)}
          customerDisplayName={(customer) => customerDisplayName(customer)}
          fetchCustomers={fetchCustomers}
          organizationId={organizationId ?? undefined}
          supabase={supabase}
        />
      </div>
      <OrderTypeSelector
        availableOrderTypes={orderTypeOptions}
        getFieldConfig={getFieldConfig}
        onAddAddress={() => {}}
        defaultOrderTypeId={orderType}
        defaultFields={orderFields}
        optionalFieldsByType={optionalFieldsByType}
        onChange={onOrderTypeChange}
      />
      {/* Lista del carrito */}
      <div className="flex-1 group overflow-y-auto">
        <ul className="divide-y  rounded-xl bg-white ">
          {cart.length === 0 && (
            <li className="p-3 text-sm text-gray-500 text-center">Agrega productos.</li>
          )}
          {cart.map((line) => {
            const totals = computeLineTotals(line.product, line.qty, line.modifiers);
            return (
              <li key={line.id} className="px-3 py-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium leading-tight truncate" title={line.product.name}>
                    {line.product.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenLineComments(line)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Personalizar
                    </button>
                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                {line.modifiers.length ? (
                  <div className="pl-1 text-xs text-gray-500 space-y-0.5">
                    {line.modifiers.map((mod) => (
                      <div
                        key={`${line.id}-${mod.modifierId}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          <span className="font-medium">
                            {mod.modifierSetDisplayName ?? mod.modifierSetName}
                          </span>
                          {": "}
                          {mod.modifierDisplayName ?? mod.modifierName}
                        </span>
                        {mod.modifierPriceDelta !== 0 ? (
                          <span className="whitespace-nowrap">
                            {mod.modifierPriceDelta > 0 ? "+" : "-"}${" "}
                            {currency(Math.abs(mod.modifierPriceDelta))}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {line.comment ? (
                  <div className="pl-1 text-xs text-gray-600 whitespace-pre-line">
                    {line.comment}
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementLine(line.id)}
                      className="h-7 w-7 grid place-items-center rounded-lg border"
                    >
                      -
                    </button>
                    <span className="min-w-[1.5rem] text-center">{line.qty}</span>
                    <button
                      onClick={() => incrementLine(line.id)}
                      className="h-7 w-7 grid place-items-center rounded-lg border"
                    >
                      +
                    </button>
                  </div>
                  <div className="font-medium">${" "}{currency(totals.total)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Totales */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${" "}{currency(cartSummary.subtotal)}</span>
        </div>
        {tipAmount > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>{`Servicio ${formatRate(tipPercentage)}%`}</span>
            <span>${" "}{currency(tipAmount)}</span>
          </div>
        )}
        {cartSummary.breakdown.map((entry) => (
          <div key={entry.label} className="flex justify-between text-gray-600">
            <span>{entry.label}</span>
            <span>${" "}{currency(entry.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold text-lg pt-2">
          <span>Total</span>
          <span>${" "}{currency(totalDue)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <button
            className="bg-gray-200 px-4 py-3 text-sm rounded-full disabled:opacity-50"
            onClick={handleCancelDraft}
            disabled={!activeDraft || activeDraft.status !== "DRAFT" || savingSale}
          >
            Anular Borrador
          </button>
          <button
            className="flex-1 rounded-full bg-blue-600 text-white px-4 py-3 text-sm font-medium hover:brightness-110 disabled:opacity-50"
            disabled={cart.length === 0 || !activeDraft || savingSale}
            onClick={openPayModal}
          >
            Confirmar venta
          </button>
        </div>
        {isRestaurantBusiness && (
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 min-w-0 inline-flex items-center justify-center truncate rounded-full border border-blue-600 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              disabled={cart.length === 0 || !activeDraft || savingSale || printingKitchen}
              onClick={printKitchenTicket}
            >
              {printingKitchen ? "Enviando comanda..." : "Imprimir comanda"}
            </button>
            <button
              type="button"
              className="flex-1 min-w-0 inline-flex items-center justify-center truncate rounded-full border border-blue-600 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              disabled={cart.length === 0 || !activeDraft || savingSale || printingPrebill}
              onClick={printPrebill}
            >
              {printingPrebill ? "Imprimiendo precuenta..." : "Imprimir precuenta"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
