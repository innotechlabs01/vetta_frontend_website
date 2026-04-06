"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Loader2, PencilLine, Plus } from "lucide-react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import CustomerModal from "@/components/customers/CustomerModal";
import CustomerDetailModal from "@/components/customers/CustomerDetailModal";
import type { DBCustomer } from "@/types/customers";

const CUSTOMER_COLUMNS =
  "id, organization_id, name, email, phone, address, id_type, id_number, is_loyal, notes, loyalty_points, loyalty_level_id, last_purchase_date, created_at, updated_at, created_by, birthday, last_purchase_location, zone, external_provider, external_user_id, daily_limit_usd, kyc_id_document_url, kyc_signature_url";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function displayName(c: DBCustomer) {
  const name = c.name?.trim();
  return name && name.length > 0 ? name : "Cliente";
}

function documentLabel(c?: DBCustomer | null) {
  if (!c) return "Sin identificación";
  if (c.id_type && c.id_number) return `${c.id_type}: ${c.id_number}`;
  if (c.email) return c.email;
  if (c.phone) return c.phone;
  return "Sin identificación";
}

function hasFakeOfacAlert(customer?: DBCustomer | null): boolean {
  if (!customer) return false;
  const seed = `${customer.id_number ?? ""}${customer.phone ?? ""}${customer.id}`;
  if (!seed.trim()) return false;
  let score = 0;
  for (let index = 0; index < seed.length; index += 1) {
    score += seed.charCodeAt(index) * (index + 1);
  }
  return score % 13 === 0;
}

export default function CustomersPage() {
  const { org } = useEnvironment();
  const organizationId = org?.id ?? null;
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCustomer, setModalCustomer] = useState<DBCustomer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  useEffect(() => {
    if (detailOpen && detailCustomerId && !customers.find((c) => c.id === detailCustomerId)) {
      setDetailOpen(false);
      setDetailCustomerId(null);
    }
  }, [customers, detailCustomerId, detailOpen]);

  const detailCustomer = detailCustomerId
    ? customers.find((c) => c.id === detailCustomerId) ?? null
    : null;
  const detailModalOpen = detailOpen && Boolean(detailCustomer);

  const fetchCustomers = useCallback(async () => {
    if (!organizationId) {
      setCustomers([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("customers")
        .select(CUSTOMER_COLUMNS)
        .eq("organization_id", organizationId)
        .order("name", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setCustomers((data || []) as DBCustomer[]);
    } catch (err: any) {
      console.error("Error cargando clientes:", err);
      setError(err?.message ?? "No fue posible cargar los clientes.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      const haystack = [
        displayName(c),
        c.id_type,
        c.id_number,
        c.email,
        c.phone,
        c.address,
        c.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [customers, search]);

  const selected = selectedId ? customers.find((c) => c.id === selectedId) ?? null : null;

  const total = customers.length;
  const fidelizados = customers.filter((c) => Boolean(c.is_loyal)).length;
  const conPuntos = customers.filter((c) => (c.loyalty_points ?? 0) > 0).length;
  const handleRowClick = (customer: DBCustomer) => {
    setSelectedId(customer.id);
    setDetailCustomerId(customer.id);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailCustomerId(null);
  };

  const handleOpenCreate = () => {
    setModalCustomer(null);
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selected) return;
    setModalCustomer(selected);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleSaved = async (customer: DBCustomer) => {
    await fetchCustomers();
    setSelectedId(customer.id);
  };

  return (
    <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-10">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <div className="flex-1" />
            <button
              onClick={handleOpenCreate}
              disabled={!organizationId}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Crear cliente
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, documento, teléfono o email..."
              className="w-full rounded-xl border px-3 py-2 text-sm bg-gray-100"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-xl border overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-medium">Nombre</th>
                  <th className="p-3 text-left font-medium">Documento</th>
                  <th className="p-3 text-left font-medium">Teléfono</th>
                  <th className="p-3 text-left font-medium">Email</th>
                  <th className="p-3 text-left font-medium">Daily limit</th>
                  <th className="p-3 text-center font-medium">OFAC</th>
                  <th className="p-3 text-center font-medium">Cuenta online</th>
                  <th className="p-3 text-center font-medium">Fidelizado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const isSelected = selectedId === c.id;
                  const hasLinkedAccount = Boolean(c.external_user_id);
                  const ofacAlert = hasFakeOfacAlert(c);
                  return (
                    <tr
                      key={c.id}
                      className={`border-t cursor-pointer hover:bg-gray-100 ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={() => handleRowClick(c)}
                    >
                      <td className="p-3 font-medium">{displayName(c)}</td>
                      <td className="p-3 text-xs text-gray-600">{documentLabel(c)}</td>
                      <td className="p-3">{c.phone ?? "-"}</td>
                      <td className="p-3">{c.email ?? "-"}</td>
                      <td className="p-3">
                        {typeof c.daily_limit_usd === "number"
                          ? usdFormatter.format(c.daily_limit_usd)
                          : "-"}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                            ofacAlert
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {ofacAlert ? "Alerta fake" : "OK"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                            hasLinkedAccount
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-gray-50 text-gray-500"
                          }`}
                        >
                          <Link className={`h-4 w-4 ${hasLinkedAccount ? "text-emerald-600" : "text-gray-400"}`} />
                          <span>{hasLinkedAccount ? "Conectado" : "Sin cuenta"}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">{c.is_loyal ? "Sí" : "No"}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500">
                      Sin resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="sticky top-6 h-fit w-full rounded-2xl bg-white">
          {!selected ? (
            <div className="space-y-4">
              <MetricCard
                label="Clientes"
                value={total.toString()}
                sub={organizationId ? "Total registrados" : "Conéctate a una organización"}
              />
              <MetricCard
                label="Fidelizados"
                value={fidelizados.toString()}
                sub={`${Math.round((fidelizados / Math.max(1, total)) * 100)}% de la base`}
              />
              <MetricCard
                label="Con puntos"
                value={conPuntos.toString()}
                sub={`${Math.round((conPuntos / Math.max(1, total)) * 100)}% con saldo`}
              />
            </div>
          ) : (
            <div className="space-y-4 border p-4 rounded-2xl">
              {hasFakeOfacAlert(selected) ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Alerta OFAC : revisar documentación del cliente.
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">Cliente</div>
                  <h2 className="text-lg font-semibold leading-tight">{displayName(selected)}</h2>
                  <div className="mt-1 text-sm text-gray-600">
                    {selected.email ?? ""}
                    {selected.email && selected.phone ? " · " : ""}
                    {selected.phone ?? ""}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{documentLabel(selected)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenEdit}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-gray-100 text-gray-600 hover:bg-gray-200"
                    title="Editar"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-gray-100"
                    title="Cerrar detalle"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <InfoRow label="Notas" value={selected.notes || "Sin notas"} />
                <InfoRow
                  label="Programa de lealtad"
                  value={selected.is_loyal ? "Activo" : "No participa"}
                />
                <InfoRow
                  label="Puntos acumulados"
                  value={(selected.loyalty_points ?? 0).toString()}
                />
                <InfoRow
                  label="Daily limit (USD)"
                  value={
                    typeof selected.daily_limit_usd === "number"
                      ? usdFormatter.format(selected.daily_limit_usd)
                      : "Sin límite personalizado"
                  }
                />
                <InfoRow
                  label="Última compra"
                  value={selected.last_purchase_date ? new Date(selected.last_purchase_date).toLocaleString() : "Sin registros"}
                />
                <InfoRow
                  label="Dirección"
                  value={selected.address || "Sin dirección"}
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      <CustomerModal
        open={modalOpen}
        onClose={handleModalClose}
        supabase={supabase}
        organizationId={organizationId ?? undefined}
        initialCustomer={modalCustomer}
        onSaved={handleSaved}
        showLoyaltyControls={Boolean(modalCustomer)}
      />
      <CustomerDetailModal
        open={detailModalOpen}
        customer={detailCustomer}
        onClose={handleDetailClose}
      />
    </main>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm text-gray-700">{value}</div>
    </div>
  );
}
