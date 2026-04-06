"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "lucide-react";
import type { DBCustomer } from "@/types/customers";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SECTIONS = [
  { key: "general", label: "General y métricas", description: "Resumen rápido" },
  { key: "orders", label: "Pedidos", description: "Historial reciente" },
  { key: "addresses", label: "Direcciones", description: "Ubicaciones guardadas" },
  { key: "subscriptions", label: "Suscripciones", description: "Planes activos" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

type CustomerDetailModalProps = {
  open: boolean;
  customer: DBCustomer | null;
  onClose: () => void;
};

export default function CustomerDetailModal({
  open,
  customer,
  onClose,
}: CustomerDetailModalProps) {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("general");

  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalNode(document.body);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setActiveSection("general");
    }
  }, [open]);

  const orderRows = useMemo(() => {
    if (!customer || !customer.last_purchase_date) return [];
    return [
      {
        id: "last",
        label: "Última compra",
        date: formatDateLabel(customer.last_purchase_date),
        location: customer.last_purchase_location ?? "Sin ubicación",
        status: "Completado",
      },
    ];
  }, [customer]);

  const addressRows = useMemo(() => {
    if (!customer || !customer.address) return [];
    return [
      {
        id: "primary",
        alias: "Principal",
        address: customer.address,
        zone: customer.zone ?? "Sin zona",
      },
    ];
  }, [customer]);

  if (!open || !portalNode || !customer) return null;

  const name = getCustomerName(customer);
  const documentLabel = getCustomerDocumentLabel(customer);
  const contactLine = [customer.email, customer.phone].filter(Boolean).join(" · ");
  const hasOfacAlert = getFakeOfacAlert(customer);

  const renderSection = () => {
    switch (activeSection) {
      case "orders":
        return (
          <section className="space-y-4">
            <p className="text-sm text-gray-500">Pedidos más recientes</p>
            <div className="rounded-2xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-3 text-left font-medium">Pedido</th>
                    <th className="p-3 text-left font-medium">Fecha</th>
                    <th className="p-3 text-left font-medium">Ubicación</th>
                    <th className="p-3 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orderRows.length ? (
                    orderRows.map((row) => (
                      <tr key={row.id} className="border-t last:border-b">
                        <td className="p-3 font-medium">{row.label}</td>
                        <td className="p-3 text-sm text-gray-600">{row.date}</td>
                        <td className="p-3 text-sm text-gray-600">{row.location}</td>
                        <td className="p-3 text-sm">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-sm text-gray-500">
                        Sin pedidos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      case "addresses":
        return (
          <section className="space-y-4">
            <p className="text-sm text-gray-500">Direcciones guardadas</p>
            <div className="rounded-2xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-3 text-left font-medium">Alias</th>
                    <th className="p-3 text-left font-medium">Dirección</th>
                    <th className="p-3 text-left font-medium">Zona</th>
                  </tr>
                </thead>
                <tbody>
                  {addressRows.length ? (
                    addressRows.map((row) => (
                      <tr key={row.id} className="border-t last:border-b">
                        <td className="p-3 font-medium">{row.alias}</td>
                        <td className="p-3 text-sm text-gray-600">{row.address}</td>
                        <td className="p-3 text-sm text-gray-600">{row.zone}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-sm text-gray-500">
                        Sin direcciones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      case "subscriptions":
        return (
          <section className="space-y-4">
            <p className="text-sm text-gray-500">Suscripciones activas</p>
            <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500">
              Por ahora no hay planes asociados a este cliente.
            </div>
          </section>
        );
      case "general":
      default:
        return (
          <section className="space-y-6">
            {hasOfacAlert ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Alerta OFAC : revisar documentación antes de finalizar transacciones.
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailMetric
                label="Puntos"
                value={(customer.loyalty_points ?? 0).toString()}
                helper="Acumulados"
              />
              <DetailMetric
                label="Última compra"
                value={formatDateLabel(customer.last_purchase_date)}
                helper="Fecha"
              />
              <DetailMetric
                label="Creado"
                value={formatDateLabel(customer.created_at)}
                helper="Registrado"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InfoRow label="Correo" value={customer.email ?? "Sin correo"} />
              <InfoRow label="Teléfono" value={customer.phone ?? "Sin teléfono"} />
              <InfoRow label="Identificación" value={documentLabel} />
              <InfoRow
                label="Daily limit (USD)"
                value={
                  typeof customer.daily_limit_usd === "number"
                    ? usdFormatter.format(customer.daily_limit_usd)
                    : "Sin límite personalizado"
                }
              />
              <InfoRow label="Notas" value={customer.notes ?? "Sin notas"} />
              <InfoRow label="Zona" value={customer.zone ?? "Sin zona"} />
              <InfoRow
                label="Cumpleaños"
                value={customer.birthday ? formatBirthday(customer.birthday) : "Sin fecha"}
              />
              <InfoRow
                label="Documento ID"
                value={customer.kyc_id_document_url ? "Cargado" : "No cargado"}
              />
              <InfoRow
                label="Firma"
                value={customer.kyc_signature_url ? "Cargada" : "No cargada"}
              />
            </div>
          </section>
        );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1250] flex items-start justify-center overflow-hidden px-0 pb-6 pt-10">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative flex min-h-[calc(100vh-2.5rem)] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between gap-6 border-b bg-white px-6 py-4">
          <h3 className="max-w-3xl truncate text-2xl font-semibold text-slate-900">{name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            ✕
          </button>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <aside className="border-b bg-gray-50 p-4 md:border-b-0 md:w-60">
            <div className="sticky top-0 space-y-3">
              {SECTIONS.map(({ key, label, description }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  className={`flex w-full flex-col gap-1 rounded-2xl px-4 py-3 text-left text-sm transition ${
                    activeSection === key
                      ? "bg-white text-gray-900 shadow"
                      : "text-gray-600 hover:bg-white/60"
                  }`}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs text-gray-400">{description}</span>
                </button>
              ))}
            </div>
          </aside>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Estado</p>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                    customer.external_user_id
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                >
                  <Link
                    className={`h-4 w-4 ${customer.external_user_id ? "text-emerald-600" : "text-gray-400"}`}
                  />
                  <span>
                    {customer.external_user_id ? "Cuenta conectada" : "Sin cuenta vinculada"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6">{renderSection()}</div>
          </div>
        </div>
      </div>
    </div>,
    portalNode
  );
}

function DetailMetric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border bg-gray-50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      {helper ? <div className="text-xs text-gray-500">{helper}</div> : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function getCustomerName(customer?: DBCustomer | null) {
  const name = customer?.name?.trim();
  return name && name.length > 0 ? name : "Cliente";
}

function getCustomerDocumentLabel(customer?: DBCustomer | null) {
  if (!customer) return "Sin identificación";
  if (customer.id_type && customer.id_number) return `${customer.id_type}: ${customer.id_number}`;
  if (customer.email) return customer.email;
  if (customer.phone) return customer.phone;
  return "Sin identificación";
}

function formatDateLabel(value?: string | null) {
  if (!value) return "Sin registros";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin registros";
  return parsed.toLocaleString();
}

function formatBirthday(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleDateString();
}

function getFakeOfacAlert(customer?: DBCustomer | null): boolean {
  if (!customer) return false;
  const seed = `${customer.id_number ?? ""}${customer.phone ?? ""}${customer.id}`;
  if (!seed.trim()) return false;
  let score = 0;
  for (let index = 0; index < seed.length; index += 1) {
    score += seed.charCodeAt(index) * (index + 1);
  }
  return score % 13 === 0;
}
