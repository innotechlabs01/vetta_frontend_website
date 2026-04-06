"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DBCustomer } from "@/types/customers";

const SELECT_COLUMNS =
  "id, organization_id, name, email, phone, address, id_type, id_number, is_loyal, notes, loyalty_points, loyalty_level_id, last_purchase_date, created_at, updated_at, created_by, daily_limit_usd, kyc_id_document_url, kyc_signature_url";

const ID_TYPES = ["CC", "TI", "CE", "NIT", "PA", "RC"] as const;
const DEFAULT_COUNTRY_CODE = "+57";
const COUNTRY_OPTIONS = [
  { value: "+57", label: "+57" },
  { value: "+58", label: "+58" },
  { value: "+1", label: "+1" },
  { value: "+52", label: "+52" },
  { value: "+54", label: "+54" },
  { value: "+56", label: "+56" },
  { value: "+51", label: "+51" },
  { value: "+593", label: "+593" },
  { value: "+591", label: "+591" },
  { value: "+505", label: "+505" },
  { value: "+507", label: "+507" },
];

type FormState = {
  name: string;
  id_type: string;
  id_number: string;
  email: string;
  phone: string;
  phoneCountry: string;
  address: string;
  notes: string;
  is_loyal: boolean;
  loyalty_points: number;
  daily_limit_usd: string;
  kyc_id_document_url: string;
  kyc_signature_url: string;
};

const emptyForm: FormState = {
  name: "",
  id_type: "CC",
  id_number: "",
  email: "",
  phone: "",
  phoneCountry: DEFAULT_COUNTRY_CODE,
  address: "",
  notes: "",
  is_loyal: false,
  loyalty_points: 0,
  daily_limit_usd: "",
  kyc_id_document_url: "",
  kyc_signature_url: "",
};

function parsePhoneWithCountry(
  phone: string | null | undefined,
): { country: string; number: string } {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) return { country: DEFAULT_COUNTRY_CODE, number: "" };
  if (!trimmed.startsWith("+")) {
    return { country: DEFAULT_COUNTRY_CODE, number: trimmed };
  }
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    return { country: match[1], number: match[2].trim() };
  }
  return { country: DEFAULT_COUNTRY_CODE, number: trimmed.replace(/^\+/, "").trim() };
}

function buildFullPhone(country: string, phoneNumber: string) {
  const countryPart = country.trim() || DEFAULT_COUNTRY_CODE;
  const phonePart = phoneNumber.trim();
  if (!phonePart) return "";
  return `${countryPart} ${phonePart}`.trim();
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

type CustomerModalProps = {
  open: boolean;
  onClose: () => void;
  supabase: any;
  organizationId?: string;
  initialCustomer?: DBCustomer | null;
  initialPhone?: string;
  initialName?: string;
  onSaved?: (customer: DBCustomer) => void;
  onExistingCustomerSelect?: (customer: DBCustomer) => void;
  title?: string;
  requireIdNumber?: boolean;
  showLoyaltyControls?: boolean;
};

export default function CustomerModal({
  open,
  onClose,
  supabase,
  organizationId,
  initialCustomer,
  initialPhone,
  initialName,
  onSaved,
  onExistingCustomerSelect,
  title,
  requireIdNumber = true,
  showLoyaltyControls = true,
}: CustomerModalProps) {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedCustomer, setMatchedCustomer] = useState<DBCustomer | null>(null);
  const [uploadingIdDoc, setUploadingIdDoc] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const lastCheckedPhoneRef = useRef("");
  const lastToastedPhoneRef = useRef("");
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const prevPhoneDigitsCountRef = useRef(0);
  const hasSyncedPhoneLengthRef = useRef(false);

  const isEditing = Boolean(initialCustomer?.id);
  const effectiveTitle = title ?? (isEditing ? "Editar cliente" : "Nuevo cliente");
  const editingCustomerId = initialCustomer?.id ?? null;
  const editingCustomerPhone = initialCustomer?.phone ?? null;

  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalNode(document.body);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialCustomer) {
      const parsedPhone = parsePhoneWithCountry(initialCustomer.phone);
      setForm({
        name: initialCustomer.name ?? "",
        id_type: initialCustomer.id_type ?? "",
        id_number: initialCustomer.id_number ?? "",
        email: initialCustomer.email ?? "",
        phone: parsedPhone.number,
        phoneCountry: parsedPhone.country,
        address: initialCustomer.address ?? "",
        notes: initialCustomer.notes ?? "",
        is_loyal: Boolean(initialCustomer.is_loyal),
        loyalty_points: Number(initialCustomer.loyalty_points ?? 0),
        daily_limit_usd:
          initialCustomer.daily_limit_usd != null
            ? String(initialCustomer.daily_limit_usd)
            : "",
        kyc_id_document_url: initialCustomer.kyc_id_document_url ?? "",
        kyc_signature_url: initialCustomer.kyc_signature_url ?? "",
      });
    } else {
      const parsedSeed = initialPhone ? parsePhoneWithCountry(initialPhone) : null;
      setForm({
        ...emptyForm,
        name: initialName ?? "",
        phone: parsedSeed ? parsedSeed.number : "",
        phoneCountry: parsedSeed ? parsedSeed.country : emptyForm.phoneCountry,
      });
    }
    setMatchedCustomer(null);
    lastCheckedPhoneRef.current = "";
    lastToastedPhoneRef.current = "";
    setError(null);
  }, [open, initialCustomer, initialPhone, initialName]);

  useEffect(() => {
    setMatchedCustomer(null);
    lastCheckedPhoneRef.current = "";
    lastToastedPhoneRef.current = "";
  }, [form.phone, form.phoneCountry]);

  const handlePhoneBlur = useCallback(async () => {
    const trimmedPhone = form.phone.trim();
    if (!organizationId || !trimmedPhone) {
      setMatchedCustomer(null);
      return;
    }
    const normalized = buildFullPhone(form.phoneCountry, trimmedPhone);
    if (!normalized) {
      setMatchedCustomer(null);
      return;
    }
    if (editingCustomerPhone && editingCustomerPhone === normalized) {
      setMatchedCustomer(null);
      return;
    }
    if (lastCheckedPhoneRef.current === normalized) {
      return;
    }
    lastCheckedPhoneRef.current = normalized;
    try {
      const { data, error } = await supabase
        .from("customers")
        .select(SELECT_COLUMNS)
        .eq("organization_id", organizationId)
        .eq("phone", normalized)
        .limit(1);
      if (error) {
        throw error;
      }
      const match = (data ?? [])[0] as DBCustomer | undefined;
      if (match && match.id !== editingCustomerId) {
        setMatchedCustomer(match);
        if (lastToastedPhoneRef.current !== normalized) {
          toast("Cliente ya existe con ese teléfono");
          lastToastedPhoneRef.current = normalized;
        }
      } else {
        setMatchedCustomer(null);
      }
    } catch (err) {
      console.error("Error buscando cliente existente por teléfono", err);
      setMatchedCustomer(null);
    }
  }, [form.phone, form.phoneCountry, editingCustomerId, editingCustomerPhone, organizationId, supabase]);

  const handleSelectExistingCustomer = () => {
    if (!matchedCustomer) return;
    onExistingCustomerSelect?.(matchedCustomer);
    setMatchedCustomer(null);
    onClose();
  };

  const uploadCustomerDocument = useCallback(
    async (kind: "id" | "signature", file: File) => {
      if (!organizationId) {
        setError("No hay organización activa para cargar archivos.");
        return;
      }
      const setLoading = kind === "id" ? setUploadingIdDoc : setUploadingSignature;
      const targetField = kind === "id" ? "kyc_id_document_url" : "kyc_signature_url";
      setLoading(true);
      setError(null);
      try {
        const safeName = sanitizeFileName(file.name || `${kind}-${Date.now()}`);
        const path = `${organizationId}/${kind}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("customer-documents")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("customer-documents").getPublicUrl(path);
        const publicUrl = data?.publicUrl ?? "";
        if (!publicUrl) throw new Error("No se pudo obtener URL pública del archivo.");
        setForm((prev) => ({ ...prev, [targetField]: publicUrl }));
        toast.success(kind === "id" ? "Documento de identidad cargado" : "Firma cargada");
      } catch (err: any) {
        console.error("Error cargando documento del cliente", err);
        setError(err?.message ?? "No fue posible cargar el archivo.");
      } finally {
        setLoading(false);
      }
    },
    [organizationId, supabase]
  );

  const trimmedName = form.name.trim();
  const trimmedPhone = form.phone.trim();
  const trimmedCountryCode = (form.phoneCountry || DEFAULT_COUNTRY_CODE).trim();
  const combinedPhone = buildFullPhone(trimmedCountryCode, trimmedPhone);
  const trimmedIdNumber = form.id_number.trim();
  const requiresIdNumber = requireIdNumber && Boolean(form.id_type);
  const effectiveName = trimmedName || combinedPhone;
  const phoneDigits = useMemo(() => form.phone.replace(/\D/g, ""), [form.phone]);

  const handleNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
  };

  const handlePhoneChange = (value: string) => {
    setForm((prev) => ({ ...prev, phone: value }));
  };

  const handlePhoneCountryChange = (value: string) => {
    setForm((prev) => ({ ...prev, phoneCountry: value }));
  };

  const countryOptions = useMemo(() => {
    if (COUNTRY_OPTIONS.some((option) => option.value === form.phoneCountry)) {
      return COUNTRY_OPTIONS;
    }
    if (!form.phoneCountry) return COUNTRY_OPTIONS;
    return [...COUNTRY_OPTIONS, { value: form.phoneCountry, label: form.phoneCountry }];
  }, [form.phoneCountry]);
  const disableSave =
    saving ||
    !organizationId ||
    effectiveName.length === 0 ||
    trimmedPhone.length === 0 ||
    (requiresIdNumber && trimmedIdNumber.length === 0);

  useEffect(() => {
    if (!open) {
      hasSyncedPhoneLengthRef.current = false;
      prevPhoneDigitsCountRef.current = 0;
      return;
    }

    if (!hasSyncedPhoneLengthRef.current) {
      hasSyncedPhoneLengthRef.current = true;
      prevPhoneDigitsCountRef.current = phoneDigits.length;
      return;
    }

    const prevCount = prevPhoneDigitsCountRef.current;
    const currentCount = phoneDigits.length;
    prevPhoneDigitsCountRef.current = currentCount;

    if (
      form.phoneCountry === "+57" &&
      prevCount < 10 &&
      currentCount >= 10 &&
      phoneInputRef.current &&
      document.activeElement === phoneInputRef.current
    ) {
      nameInputRef.current?.focus();
    }
  }, [form.phoneCountry, open, phoneDigits]);

  if (!open || !portalNode) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200] grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="relative w-full max-w-2xl rounded-2xl border bg-white shadow-xl">
        <div className="flex items-center justify-between  px-5 py-4">
          <h3 className="text-lg font-semibold">{effectiveTitle}</h3>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={saving}
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[75vh] overflow-auto px-5 pt-0 pb-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium">Teléfono *</label>
                  <div className="mt-1 grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                    <select
                      className="rounded-xl border px-3 py-2 text-sm"
                      value={form.phoneCountry}
                      onChange={(e) => handlePhoneCountryChange(e.target.value)}
                    >
                      {countryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      ref={phoneInputRef}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={form.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="3001234567"
                      inputMode="tel"
                      autoFocus
                      required
                      onBlur={() => void handlePhoneBlur()}
                    />
                  </div>
                  {matchedCustomer ? (
                    <div className="mt-1 text-xs text-blue-600">
                  <span className="text-muted-foreground">Cliente ya existe (</span>
                  <button
                    type="button"
                    className="underline text-blue-600"
                    onClick={handleSelectExistingCustomer}
                  >
                    seleccionar
                  </button>
                  <span className="text-muted-foreground">)</span>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium">Nombre *</label>
                  <input
                    ref={nameInputRef}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
                <div>
                  <label className="text-sm font-medium">Correo</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="correo@dominio.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de ID</label>
                  <select
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.id_type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, id_type: e.target.value }))
                    }
                  >
                    <option value="">Sin documento</option>
                    {ID_TYPES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Número de ID</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.id_number}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, id_number: e.target.value }))
                    }
                    placeholder="Ej: 123456789"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Dirección</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Calle 123 #45-67"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notas</label>
                <textarea
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Detalles adicionales, preferencias, etc."
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Daily limit (USD)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.daily_limit_usd}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, daily_limit_usd: e.target.value }))
                    }
                    placeholder="Ej: 1000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Documento de ID</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="w-full rounded-xl border px-2 py-2 text-xs"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void uploadCustomerDocument("id", file);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  {uploadingIdDoc ? (
                    <p className="mt-1 text-xs text-gray-500">Cargando...</p>
                  ) : null}
                  {form.kyc_id_document_url ? (
                    <a
                      href={form.kyc_id_document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 underline"
                    >
                      Ver archivo
                    </a>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium">Firma</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="w-full rounded-xl border px-2 py-2 text-xs"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void uploadCustomerDocument("signature", file);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  {uploadingSignature ? (
                    <p className="mt-1 text-xs text-gray-500">Cargando...</p>
                  ) : null}
                  {form.kyc_signature_url ? (
                    <a
                      href={form.kyc_signature_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 underline"
                    >
                      Ver archivo
                    </a>
                  ) : null}
                </div>
              </div>

              {showLoyaltyControls ? (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_loyal}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, is_loyal: e.target.checked }))
                      }
                    />
                    <span>¿Cliente leal?</span>
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <label className="font-medium" htmlFor="loyalty_points">
                      Puntos
                    </label>
                    <input
                      id="loyalty_points"
                      type="number"
                      min={0}
                      className="w-24 rounded-xl border px-3 py-2 text-sm"
                      value={Number.isNaN(form.loyalty_points) ? "" : form.loyalty_points}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setForm((prev) => ({
                          ...prev,
                          loyalty_points: Number.isNaN(value) ? 0 : Math.max(0, value),
                        }));
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => !saving && onClose()}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
                  disabled={disableSave}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>,
    portalNode
  );

  async function handleSubmit() {
    if (disableSave || !organizationId) return;
    setSaving(true);
    setError(null);

    const rawDailyLimit = form.daily_limit_usd.trim();
    const parsedDailyLimit = rawDailyLimit.length ? Number(rawDailyLimit) : null;
    if (parsedDailyLimit != null && (!Number.isFinite(parsedDailyLimit) || parsedDailyLimit < 0)) {
      setSaving(false);
      setError("El daily limit debe ser un número válido mayor o igual a 0.");
      return;
    }

    const payload = {
      organization_id: organizationId,
      name: effectiveName,
      email: form.email.trim() || null,
      phone: combinedPhone || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      id_type: form.id_type || null,
      id_number: trimmedIdNumber || null,
      is_loyal: form.is_loyal,
      loyalty_points: form.loyalty_points || 0,
      daily_limit_usd: parsedDailyLimit,
      kyc_id_document_url: form.kyc_id_document_url.trim() || null,
      kyc_signature_url: form.kyc_signature_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      let data: DBCustomer | null = null;
      if (isEditing && initialCustomer) {
        const { data: updated, error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", initialCustomer.id)
          .select(SELECT_COLUMNS)
          .single();
        if (error) throw error;
        data = updated as DBCustomer;
      } else {
        const { data: inserted, error } = await supabase
          .from("customers")
          .insert(payload)
          .select(SELECT_COLUMNS)
          .single();
        if (error) throw error;
        data = inserted as DBCustomer;
      }

      if (data) {
        onSaved?.(data);
        onClose();
      }
    } catch (err: any) {
      const message = err?.message || "No fue posible guardar el cliente.";
      setError(message);
      console.error("Error guardando cliente:", err);
    } finally {
      setSaving(false);
    }
  }

  if (!open || !portalNode) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200] grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="relative w-full max-w-2xl rounded-2xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold">{effectiveTitle}</h3>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={saving}
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[75vh] overflow-auto px-5 py-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="text-sm font-medium">Teléfono *</label>
                <div className="mt-1 grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <select
                    className="rounded-xl border px-3 py-2 text-sm"
                    value={form.phoneCountry}
                    onChange={(e) => handlePhoneCountryChange(e.target.value)}
                  >
                    {countryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="3001234567"
                    inputMode="tel"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Nombre *</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
              <div>
                <label className="text-sm font-medium">Correo</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="correo@dominio.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de ID</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.id_type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, id_type: e.target.value }))
                  }
                >
                  <option value="">Sin documento</option>
                  {ID_TYPES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Número de ID</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.id_number}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, id_number: e.target.value }))
                  }
                  placeholder="Ej: 123456789"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Dirección</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Calle 123 #45-67"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notas</label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Detalles adicionales, preferencias, etc."
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_loyal}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_loyal: e.target.checked }))
                  }
                />
                <span>¿Cliente leal?</span>
              </label>
              <div className="flex items-center gap-2 text-sm">
                <label className="font-medium" htmlFor="loyalty_points">
                  Puntos
                </label>
                <input
                  id="loyalty_points"
                  type="number"
                  min={0}
                  className="w-24 rounded-xl border px-3 py-2 text-sm"
                  value={Number.isNaN(form.loyalty_points) ? "" : form.loyalty_points}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      loyalty_points: Number.isNaN(value) ? 0 : Math.max(0, value),
                    }));
                  }}
                />
              </div>
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
                onClick={() => !saving && onClose()}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
                disabled={disableSave}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
