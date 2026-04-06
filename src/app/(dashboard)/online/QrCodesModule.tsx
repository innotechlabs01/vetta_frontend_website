"use client";

import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import type { LocationLite, QrContext, QrContextPayload } from "@/types/database.types";
import QrConfigModal from "./QrConfigModal";
import {
  incrementQrVisitsAction,
  saveQrContextAction,
  toggleQrContextActiveAction,
} from "./actions";
import { Download, Edit3, ExternalLink, Link2, MapPin, Pause, Play, Plus, QrCode, RefreshCcw, Sparkles } from "lucide-react";

type Props = {
  orgId: string;
  orgSlug: string | null;
  locations: LocationLite[];
  initialQrContexts: QrContext[];
};

const MODE_LABELS: Record<string, { label: string; hint: string }> = {
  SIN_FILA: { label: "Sin fila", hint: "Ordena sin esperar" },
  TABLE: { label: "Mesas", hint: "Asigna por mesa" },
  PICKUP: { label: "Pickup", hint: "Recoge en tienda" },
};

const statusClass = (active: boolean) =>
  active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";

export default function QrCodesModule({ orgId, orgSlug, locations, initialQrContexts }: Props) {
  const [qrList, setQrList] = useState<QrContext[]>(initialQrContexts);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<QrContext | null>(null);
  const [saving, setSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const baseDomain = useMemo(
    () => (orgSlug ? `${orgSlug}.recompry.site` : "recompry.site"),
    [orgSlug]
  );

  const locationMap = useMemo(() => {
    const map = new Map<string, LocationLite>();
    locations.forEach((loc) => map.set(loc.id, loc));
    return map;
  }, [locations]);

  const stats = useMemo(() => {
    const totalVisits = qrList.reduce((sum, item) => sum + (item.visits ?? 0), 0);
    const active = qrList.filter((item) => item.is_active).length;
    return { totalVisits, active, total: qrList.length };
  }, [qrList]);

  const buildQrUrl = (qr: QrContext) => {
    const params = new URLSearchParams({ location: qr.location_id, mode: qr.mode });
    if (qr.table_number) params.set("table", qr.table_number);
    return `https://${baseDomain}/qr/${qr.id}?${params.toString()}`;
  };

  const handleSave = async (payload: QrContextPayload) => {
    try {
      setSaving(true);
      const { data, error } = await saveQrContextAction(payload);
      if (error || !data) throw new Error(error || "No se pudo guardar");

      setQrList((prev) => {
        const exists = prev.some((row) => row.id === data.id);
        return exists ? prev.map((row) => (row.id === data.id ? data : row)) : [data, ...prev];
      });

      toast.success(payload.id ? "QR actualizado" : "QR creado");
      setOpenModal(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar el QR");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: QrContext) => {
    try {
      setMutatingId(row.id);
      const { data, error } = await toggleQrContextActiveAction(row.id, !row.is_active);
      if (error || !data) throw new Error(error || "No se pudo actualizar el estado");

      setQrList((prev) => prev.map((item) => (item.id === row.id ? data : item)));
      toast.success(!row.is_active ? "QR activado" : "QR desactivado");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar el QR");
    } finally {
      setMutatingId(null);
    }
  };

  const handleIncrement = async (row: QrContext) => {
    try {
      setMutatingId(row.id);
      const { data, error } = await incrementQrVisitsAction(row.id);
      if (error || !data) throw new Error(error || "No se pudo registrar la visita");
      setQrList((prev) => prev.map((item) => (item.id === row.id ? data : item)));
    } catch (e: any) {
      toast.error(e?.message || "No se pudo registrar la visita");
    } finally {
      setMutatingId(null);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("qr_contexts")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      setQrList((data as QrContext[]) || []);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar la lista");
    } finally {
      setRefreshing(false);
    }
  };

  const modeInfo = (mode: string) => MODE_LABELS[mode] || { label: mode, hint: "" };

  const handleDownload = (qr: QrContext) => {
    const canvas = document.getElementById(`qr-canvas-${qr.id}`);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      toast.error("No se pudo preparar la descarga del QR");
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    const loc = locationMap.get(qr.location_id);
    const baseName = `${loc?.name ?? "qr"}-${qr.table_number ? `mesa-${qr.table_number}` : qr.mode}`;
    const safeName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${safeName || "codigo"}.png`;
    link.click();
  };

  return (
    <div className="w-full">
      

      <div className="flex items-center justify-between mb-6 py-6 px-[28px]">
        <div className="flex items-center gap-3 ">
          <div className="h-12  w-12 grid place-items-center rounded-xl border bg-white shadow-sm">
            <QrCode className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">QR Codes</h1>
            <p className="text-sm text-gray-600">Genera códigos por sucursal, modo y mesa.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => { setOpenModal(true); setEditing(null); }}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo QR
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-5 px-[100px]">
        <StatCard title="QRs activos" value={stats.active} tone="emerald" />
        <StatCard title="Visitas totales" value={stats.totalVisits} tone="blue" />
        <StatCard title="QRs creados" value={stats.total} tone="slate" />
      </div>

      {qrList.length === 0 ? (
        <div className="space-y-4 px-[100px]">
        

        <div className="rounded-2xl border border-dashed bg-white p-10 text-center ">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-lg font-semibold text-gray-900">Aún no tienes QR Codes</p>
          <p className="text-sm text-gray-600">Crea tu primer QR para empezar a recibir pedidos.</p>
          <Button className="mt-4" onClick={() => { setOpenModal(true); setEditing(null); }}>
            <Plus className="w-4 h-4 mr-2" /> Crear QR
          </Button>
        </div>
        </div>

      ) : (
        <div className="space-y-4 px-[100px]">
          {qrList.map((qr) => {
            const loc = locationMap.get(qr.location_id);
            const info = modeInfo(qr.mode);
            const visits = qr.visits ?? 0;
            const url = buildQrUrl(qr);

            return (
              <div key={qr.id} className="flex flex-col gap-4 rounded-2xl  bg-white p-4 shadow-sm hover:shadow-md transition-shadow md:flex-row">
                <div className="flex aspect-square items-center justify-center rounded-xl border bg-gray-50 p-3 md:w-46">
                  <QRCodeCanvas id={`qr-canvas-${qr.id}`} value={url} size={100} className="mx-auto" />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                        {loc?.name || "Sucursal sin nombre"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {loc?.city || loc?.address ? `${loc?.city ?? ""} ${loc?.address ?? ""}`.trim() : "Sin dirección"}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge className={statusClass(qr.is_active)}>{qr.is_active ? "Activo" : "Pausado"}</Badge>
                        <span className="text-xs text-gray-500">{info.label}</span>
                        {info.hint && <span className="text-xs text-gray-400">· {info.hint}</span>}
                      </div>
                      
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase text-gray-500">Visitas</p>
                      <p className="text-2xl font-bold text-gray-900">{visits}</p>
                      <div className="flex flex-wrap gap-2">
                        <div className=" mt-4 flex items-center gap-2">

                    <Button size="sm" variant="secondary" onClick={() => { setEditing(qr); setOpenModal(true); }}>
                      <Edit3 className="w-4 h-4 mr-2" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(qr)}
                      disabled={mutatingId === qr.id}
                      className={qr.is_active ? "!text-amber-700 border-amber-200" : ""}
                    >
                      {qr.is_active ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {qr.is_active ? "Pausar" : "Activar"}
                    </Button>
                        </div>

                  </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                    {qr.table_number && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        Mesa {qr.table_number}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {loc?.name || "Sucursal"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(url)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Link2 className="w-4 h-4" /> Copiar link
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(qr)}
                      className="inline-flex items-center gap-1 text-gray-700 hover:underline"
                    >
                      <Download className="w-4 h-4" /> Descargar
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-gray-700 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" /> Abrir
                    </a>
                  </div>

                  {qr.extra_data?.note && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Nota:</span> {(qr.extra_data as any).note}
                    </p>
                  )}

                  
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QrConfigModal
        open={openModal}
        onClose={() => { setOpenModal(false); setEditing(null); }}
        onSubmit={(payload) => handleSave({ ...payload, id: editing?.id })}
        locations={locations}
        editing={editing}
        saving={saving}
      />
    </div>
  );
}

function StatCard({ title, value, tone }: { title: string; value: number; tone: "emerald" | "blue" | "slate" }) {
  const toneClasses: Record<"emerald" | "blue" | "slate", string> = {
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    slate: "text-slate-700",
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs uppercase text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}
