import type { Metadata } from "next";
import { DownloadButton } from "@/components/reports/DownloadButton";

export const metadata: Metadata = {
  title: "Informe de transacciones",
};

const transactions = [
  { receipt: "2026-01-20-001", agent: "FA", time: "1:12", type: "SELL", currency: "AUD", amount: 700, rate: 0.714011, subUsd: 500, fee: 5, totalUsd: 505, reference: "WALK IN", identification: "" },
  { receipt: "2026-01-20-002", agent: "FA", time: "1:13", type: "BUY", currency: "EUR", amount: 500, rate: 1.088896, subUsd: 544, fee: -5, totalUsd: 539, reference: "WALK IN", identification: "" },
  { receipt: "2026-01-20-003", agent: "FA", time: "2:31", type: "BUY", currency: "EUR", amount: 200, rate: 1.088896, subUsd: 217, fee: 0, totalUsd: 217, reference: "WALK IN", identification: "REVIEW" },
  { receipt: "2026-01-20-004", agent: "FA", time: "2:52", type: "BUY", currency: "EUR", amount: 245, rate: 1.088896, subUsd: 266, fee: -5, totalUsd: 261, reference: "WALK IN", identification: "" },
  { receipt: "2026-01-20-005", agent: "FA", time: "3:08", type: "SELL", currency: "GBP", amount: 350, rate: 1.284911, subUsd: 449, fee: 4, totalUsd: 453, reference: "WALK IN", identification: "" },
];

const numberFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rateFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const formatMoney = (value: number) => `${value < 0 ? "-" : ""}$${numberFormat.format(Math.abs(value))}`;
const formatNumber = (value: number) => numberFormat.format(value);

const totals = transactions.reduce((acc, row) => ({ subUsd: acc.subUsd + row.subUsd, totalUsd: acc.totalUsd + row.totalUsd, fees: acc.fees + row.fee }), { subUsd: 0, totalUsd: 0, fees: 0 });
const avgTicket = transactions.length ? totals.totalUsd / transactions.length : 0;

const kpis = [
  { label: "Total transacciones", value: transactions.length.toString(), helper: "Registros del corte" },
  { label: "Volumen USD", value: formatMoney(totals.subUsd), helper: "Subtotal en USD" },
  { label: "Comisiones", value: formatMoney(totals.fees), helper: "Neto del periodo" },
  { label: "Ticket promedio", value: formatMoney(avgTicket), helper: "Promedio por operación" },
];

export default function TransactionsReportPage() {
  return (
    <div className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Informe de transacciones</h1>
          <p className="text-sm text-gray-500">Datos de ejemplo (01/20/2026)</p>
        </div>
        <DownloadButton
          filename="transacciones"
          sheetName="Transacciones"
          data={transactions.map((row) => ({
            Receipt: row.receipt, Agente: row.agent, Hora: row.time, Tipo: row.type,
            Moneda: row.currency, Monto: row.amount, Tasa: row.rate,
            "Sub USD": row.subUsd, Comisión: row.fee, "Total USD": row.totalUsd,
            Referencia: row.reference, Identificacion: row.identification,
          }))}
        />
      </div>

      <div className="mt-1 text-xs text-gray-400">Actualizado 01/20/2026 - 3:15 PM</div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase text-gray-500">{kpi.label}</div>
            <div className="mt-2 text-xl font-semibold text-gray-900">{kpi.value}</div>
            <div className="mt-1 text-xs text-gray-400">{kpi.helper}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Transacciones</h2>
            <p className="text-xs text-gray-500">Tabla ejemplo preparada para agregar nuevas filas.</p>
          </div>
          <div className="text-xs text-gray-400">Total: {transactions.length}</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1180px] w-full text-xs">
            <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Receipt</th>
                <th className="px-3 py-2 text-left font-semibold">Agente</th>
                <th className="px-3 py-2 text-left font-semibold">Hora</th>
                <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                <th className="px-3 py-2 text-left font-semibold">Moneda</th>
                <th className="px-3 py-2 text-right font-semibold">Monto</th>
                <th className="px-3 py-2 text-right font-semibold">Tasa</th>
                <th className="px-3 py-2 text-right font-semibold">Sub USD</th>
                <th className="px-3 py-2 text-right font-semibold">Comisión</th>
                <th className="px-3 py-2 text-right font-semibold">Total USD</th>
                <th className="px-3 py-2 text-left font-semibold">Referencia</th>
                <th className="px-3 py-2 text-left font-semibold">Identificación</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.receipt} className="border-b border-gray-100 text-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900">{row.receipt}</td>
                  <td className="px-3 py-2">{row.agent}</td>
                  <td className="px-3 py-2">{row.time}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.type === "BUY" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.currency}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.amount)}</td>
                  <td className="px-3 py-2 text-right">{rateFormat.format(row.rate)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(row.subUsd)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${row.fee < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatMoney(row.fee)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatMoney(row.totalUsd)}</td>
                  <td className="px-3 py-2">{row.reference}</td>
                  <td className="px-3 py-2 text-gray-500">{row.identification || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
