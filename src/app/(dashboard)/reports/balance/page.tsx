import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { DownloadButton } from "@/components/reports/DownloadButton";

export const metadata: Metadata = {
  title: "Balance de monedas",
};

const balanceRows = [
  { productName: "USD", name: "United States Dollar", currency: "USD", initial: 8374, transact: -512, final: 7862, actualUsd: 1, buyPct: 7, sellPct: 7, buyRate: 1, sellRate: 1, notes: "" },
  { productName: "AUD", name: "Australian Dollar", currency: "AUD", initial: 1105, transact: -700, final: 405, actualUsd: 0.6673, buyPct: 7, sellPct: 7, buyRate: 0.620589, sellRate: 0.714011, notes: "" },
  { productName: "EUR", name: "Euro", currency: "EUR", initial: 365, transact: 945, final: 1310, actualUsd: 1.1584, buyPct: 6, sellPct: 5, buyRate: 1.088896, sellRate: 1.21632, notes: "" },
  { productName: "GBP", name: "UK Pound Sterling", currency: "GBP", initial: 2325, transact: 0, final: 2325, actualUsd: 1.3352, buyPct: 6.5, sellPct: 5, buyRate: 1.248412, sellRate: 1.40196, notes: "" },
  { productName: "MXN", name: "Mexican Peso", currency: "MXN", initial: 23760, transact: 0, final: 23760, actualUsd: 0.05666, buyPct: 3.5, sellPct: 6, buyRate: 0.054677, sellRate: 0.06006, notes: "" },
];

const numberFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rateFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const formatNumber = (value: number) => numberFormat.format(value);
const formatPercent = (value: number) => `${value.toFixed(2)}%`;
const formatUsdRate = (value: number) => `$${rateFormat.format(value)}`;

const balanceCards = balanceRows.map((row) => {
  const variationPct = row.initial ? (row.transact / row.initial) * 100 : 0;
  return { code: row.productName, name: row.name, balance: row.final, variationPct };
});

const euroRateDetail = balanceRows.find((row) => row.currency === "EUR") ?? null;

export default function BalanceReportPage() {
  return (
    <div className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Balance de monedas</h1>
          <p className="text-sm text-gray-500">Datos de ejemplo (01/20/2026)</p>
        </div>
        <DownloadButton
          filename="balance"
          sheetName="Balance"
          data={balanceRows.map((row) => ({
            Producto: row.productName, Nombre: row.name, Moneda: row.currency,
            Inicial: row.initial, Movimientos: row.transact, Final: row.final,
            "Actual USD": row.actualUsd, "Compra %": row.buyPct, "Venta %": row.sellPct,
            "Tasa compra": row.buyRate, "Tasa venta": row.sellRate, Notas: row.notes,
          }))}
        />
      </div>

      <div className="mt-5 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 pb-2">
          {balanceCards.map((card) => {
            const isUp = card.variationPct >= 0;
            const ArrowIcon = isUp ? ArrowUpRight : ArrowDownRight;
            const variationValue = Math.abs(card.variationPct);
            return (
              <div key={card.code} className="min-w-[200px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">{card.name}</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(card.balance)} {card.code}</div>
                <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  <ArrowIcon className="h-3 w-3" />
                  {variationValue.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {euroRateDetail ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Detalle tasa actual (EUR / moneda local)</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[11px] uppercase text-gray-500">Actual</div>
              <div className="text-sm font-semibold text-gray-900">{formatUsdRate(euroRateDetail.actualUsd)}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[11px] uppercase text-gray-500">Buy rate</div>
              <div className="text-sm font-semibold text-emerald-700">{rateFormat.format(euroRateDetail.buyRate)}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[11px] uppercase text-gray-500">Sale rate</div>
              <div className="text-sm font-semibold text-blue-700">{rateFormat.format(euroRateDetail.sellRate)}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Balance por moneda</h2>
            <p className="text-xs text-gray-500">Producto = moneda. Tabla lista para agregar filas.</p>
          </div>
          <div className="text-xs text-gray-400">Total monedas: {balanceRows.length}</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full text-xs">
            <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Producto</th>
                <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                <th className="px-3 py-2 text-left font-semibold">Moneda</th>
                <th className="px-3 py-2 text-right font-semibold">Inicial</th>
                <th className="px-3 py-2 text-right font-semibold">Movimientos</th>
                <th className="px-3 py-2 text-right font-semibold">Final</th>
                <th className="px-3 py-2 text-right font-semibold">Actual USD</th>
                <th className="px-3 py-2 text-right font-semibold">Compra %</th>
                <th className="px-3 py-2 text-right font-semibold">Venta %</th>
                <th className="px-3 py-2 text-right font-semibold">Tasa compra</th>
                <th className="px-3 py-2 text-right font-semibold">Tasa venta</th>
                <th className="px-3 py-2 text-left font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody>
              {balanceRows.map((row) => (
                <tr key={row.productName} className="border-b border-gray-100 text-gray-700">
                  <td className="px-3 py-2 font-semibold text-gray-900">{row.productName}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.currency}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.initial)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${row.transact < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatNumber(row.transact)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatNumber(row.final)}</td>
                  <td className="px-3 py-2 text-right">{formatUsdRate(row.actualUsd)}</td>
                  <td className="px-3 py-2 text-right">{formatPercent(row.buyPct)}</td>
                  <td className="px-3 py-2 text-right">{formatPercent(row.sellPct)}</td>
                  <td className="px-3 py-2 text-right">{rateFormat.format(row.buyRate)}</td>
                  <td className="px-3 py-2 text-right">{rateFormat.format(row.sellRate)}</td>
                  <td className="px-3 py-2 text-gray-500">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
