import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { createPortal } from "react-dom";
import { LocationPicker } from "@/components/LocationPicker";
import { LocationStatusBadge, ScheduledPickupValidator } from "@/components/LocationStatusBadge";

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "tel"
  | "select"
  | "datetime-local"
  | "date";

export interface FieldOption { value: string; label: string }

export interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: FieldOption[];
}

export interface OrderType {
  id: string;
  label: string;
  icon?: React.ReactNode;
  requires: string[];
}

export interface DeliveryMethodSelectorProps {
  availableOrderTypes: OrderType[];
  getFieldConfig: (fieldId: string) => FieldConfig;
  onAddAddress?: () => void;
  onChange?: (payload: {
    orderTypeId: string | null;
    orderFields: Record<string, string>;
  }) => void;
  onAddressChange?: (address: {
    label: string;
    line1: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
    phone?: string;
    recipient_name?: string;
    neighborhood?: string;
  } | null) => void;

  defaultOrderTypeId?: string | null;
  defaultFields?: Record<string, string>;
  optionalFieldsByType?: Record<string, string[]>;
  organizationId?: string;
  locationId?: string;
}

const FIELD_CTA_MESSAGES: Record<string, string> = {
  numero_mesa: "Seleccionar mesa",
  direccion: "Completar direccion",
  direccion_completa: "Completar direccion",
  numero_habitacion: "Completar habitacion",
};

export default function DeliveryMethodSelector({
  availableOrderTypes,
  getFieldConfig,
  onAddAddress,
  onChange,
  onAddressChange,
  defaultOrderTypeId = null,
  defaultFields = {},
  optionalFieldsByType = {},
  organizationId,
  locationId,
}: DeliveryMethodSelectorProps) {
  // estado visual para errores y UI
  const [orderFieldErrors, setOrderFieldErrors] = useState<string[]>([]);

  // dropdown del tipo
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeSelectRef = useRef<HTMLDivElement | null>(null);

  // modal de campos
  const [fieldsModalOpen, setFieldsModalOpen] = useState(false);

  // estado para dirección seleccionada (geolocalización)
  const [selectedAddress, setSelectedAddress] = useState<{
    label: string;
    line1: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
    phone?: string;
    recipient_name?: string;
    neighborhood?: string;
  } | null>(null);

  // asegurar render en cliente antes del portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const orderTypeId = defaultOrderTypeId ?? null;
  const orderFields = defaultFields;

  const activeOrderType = useMemo(
    () => availableOrderTypes.find((t) => t.id === orderTypeId) || null,
    [orderTypeId, availableOrderTypes]
  );
  const optionalFieldIds = useMemo(
    () => (orderTypeId ? optionalFieldsByType[orderTypeId] ?? [] : []),
    [optionalFieldsByType, orderTypeId]
  );
  const isOptionalField = useCallback(
    (fieldId: string) => optionalFieldIds.includes(fieldId),
    [optionalFieldIds]
  );
  const requiredFieldIds = useMemo(
    () => activeOrderType?.requires ?? [],
    [activeOrderType]
  );
  const enforcedFieldIds = useMemo(
    () => requiredFieldIds.filter((fieldId) => !isOptionalField(fieldId)),
    [requiredFieldIds, isOptionalField]
  );
  const autoCloseOnMesaSelect = useMemo(
    () => enforcedFieldIds.length === 1 && enforcedFieldIds[0] === "numero_mesa",
    [enforcedFieldIds]
  );

  useEffect(() => {
    setOrderFieldErrors([]);
  }, [orderTypeId]);

  useEffect(() => {
    setOrderFieldErrors((prev) => prev.filter((fieldId) => enforcedFieldIds.includes(fieldId)));
  }, [enforcedFieldIds]);

  // Limpiar dirección cuando cambia el tipo de orden
  useEffect(() => {
    setSelectedAddress(null);
  }, [orderTypeId]);

  // Handler para cambio de dirección
  const handleAddressChange = useCallback((address: typeof selectedAddress) => {
    setSelectedAddress(address);
    onAddressChange?.(address);
    
    // También actualizar orderFields con la dirección
    if (address) {
      const addressFieldId = enforcedFieldIds.find(id => 
        id === 'direccion' || id === 'direccion_completa'
      );
      if (addressFieldId) {
        onChange?.({
          orderTypeId,
          orderFields: {
            ...defaultFields,
            [addressFieldId]: address.label,
          },
        });
      }
    }
  }, [onAddressChange, onChange, orderTypeId, defaultFields, enforcedFieldIds]);

  // cerrar menú al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!typeMenuOpen) return;
      const target = e.target as Node;
      if (typeSelectRef.current && !typeSelectRef.current.contains(target)) {
        setTypeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [typeMenuOpen]);

  // helpers
  const toggleTypeMenu = () => setTypeMenuOpen((p) => !p);
  const handleFakeSelectKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    toggle: () => void
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const emitChange = useCallback(
    (nextType: string | null, nextFields: Record<string, string>) => {
      onChange?.({
        orderTypeId: nextType,
        orderFields: nextFields,
      });
    },
    [onChange]
  );

  const computeFieldsForType = useCallback(
    (typeId: string, current: Record<string, string>) => {
      const orderType = availableOrderTypes.find((t) => t.id === typeId);
      if (!orderType) {
        return current;
      }
      const requiredIds = orderType.requires ?? [];
      const optionalIds = optionalFieldsByType[typeId] ?? [];
      const fieldIds = new Set<string>([...requiredIds, ...optionalIds]);
      if (fieldIds.size === 0) {
        return {};
      }
      const next: Record<string, string> = {};
      fieldIds.forEach((fid) => {
        const existing = current[fid];
        next[fid] = typeof existing === "string" ? existing : "";
      });
      return next;
    },
    [availableOrderTypes, optionalFieldsByType]
  );

  const handleSelectType = (id: string) => {
    setTypeMenuOpen(false);
    if (id === orderTypeId) return;
    setOrderFieldErrors([]);
    const nextFields = computeFieldsForType(id, orderFields);
    emitChange(id, nextFields);
  };

  const validateRequiredFields = () => {
    const missing: string[] = [];
    for (const fid of enforcedFieldIds) {
      const val = (orderFields[fid] ?? "").trim();
      if (!val) missing.push(fid);
    }
    setOrderFieldErrors(missing);
    return missing.length === 0;
  };

  const handleSaveFields = () => {
    if (!validateRequiredFields()) return;
    setFieldsModalOpen(false);
  };

  const handleOrderFieldChange = (fieldId: string, v: string) => {
    const currentValue = orderFields[fieldId] ?? "";
    if (currentValue === v) return;
    const next = { ...orderFields, [fieldId]: v };
    emitChange(orderTypeId, next);
    if (orderFieldErrors.includes(fieldId)) {
      setOrderFieldErrors((errs) => errs.filter((f) => f !== fieldId));
    }
  };

  const typeLabel =
    activeOrderType ? (
      <span className="inline-flex items-center gap-2">
        <span className="text-lg">{activeOrderType.icon}</span>
        <span className="truncate">{activeOrderType.label}</span>
      </span>
    ) : (
      "Selecciona tipo de orden"
    );

  const fieldSummaries = useMemo(
    () =>
      requiredFieldIds
        .map((fieldId) => {
          const raw = (orderFields[fieldId] ?? "").trim();
          if (!raw) return null;
          const cfg = getFieldConfig(fieldId);
          const label = cfg.label ?? fieldId;
          let display = raw;
          if (cfg.type === "select" && cfg.options) {
            const option = cfg.options.find((opt) => opt.value === raw);
            if (option) display = option.label;
          }
          return { fieldId, label, display };
        })
        .filter((entry): entry is { fieldId: string; label: string; display: string } => Boolean(entry)),
    [requiredFieldIds, orderFields, getFieldConfig]
  );
  const requirementSummaryText = useMemo(
    () =>
      fieldSummaries
        .map((entry) => `${entry.label.slice(0,3)}: ${entry.display}`)
        .join(" • "),
    [fieldSummaries]
  );
  const requirementButtonText = useMemo(() => {
    if (!orderTypeId) return "Completar datos";
    if (requirementSummaryText) return requirementSummaryText;

    const missingFieldId = enforcedFieldIds.find((fieldId) => !(orderFields[fieldId] ?? "").trim());
    if (missingFieldId) {
      const customMessage = FIELD_CTA_MESSAGES[missingFieldId];
      if (customMessage) return customMessage;

      const cfg = getFieldConfig(missingFieldId);
      const baseLabel = (cfg.label ?? missingFieldId).toLowerCase();
      if (cfg.type === "select" && cfg.options) {
        return `Seleccionar ${baseLabel}`;
      }
      return `Completar ${baseLabel}`;
    }

    if (requiredFieldIds.length === 0) {
      return "Sin datos requeridos";
    }

    return "Completar datos";
  }, [orderTypeId, requirementSummaryText, requiredFieldIds, enforcedFieldIds, orderFields, getFieldConfig]);

  return (
    <div className="grid gap-4">
      {/* Fila con: dropdown de tipo (izq) + botón para abrir modal (der) */}
      <div className="grid grid-cols-2 gap-3">
        <div ref={typeSelectRef} className="relative">
          <div
            role="button"
            tabIndex={0}
            onClick={toggleTypeMenu}
            onKeyDown={(e) => handleFakeSelectKeyDown(e, toggleTypeMenu)}
            className="flex items-center justify-between rounded-xl bg-white px-3 py-3 text-sm border cursor-pointer"
          >
            {typeLabel}
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>

          {typeMenuOpen && (
            <div className="absolute left-0 top-full z-10 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-md">
              {availableOrderTypes.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  Configura los tipos de orden en la organización.
                </div>
              ) : (
                availableOrderTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectType(t.id)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="text-lg">{t.icon}</span>
                      <span className="truncate">{t.label}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-stretch">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setFieldsModalOpen(true)}
            disabled={!orderTypeId}
            title={!orderTypeId ? "Selecciona un tipo de orden primero" : "Abrir datos requeridos"}
          >
            <div className="truncate text-left">
              <span className=" truncate text-sm font-medium text-gray-700">
                {requirementButtonText}
              </span>
            </div>
            <div className="ml-2 flex h-5 w-5 items-center justify-center text-gray-500">
              <ChevronDown className="h-4 w-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Modal de campos requeridos */}
      {fieldsModalOpen && mounted && typeof document !== "undefined"
        ? createPortal(
            (
              <div className="fixed inset-0 z-[10000000000] flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/30"
                  onClick={() => setFieldsModalOpen(false)}
                />
                <div className="relative  z-10 max-h-[calc(100svh-60px)] w-full max-w-lg rounded-2xl border bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {activeOrderType ? `Datos ${activeOrderType.label}` : "Datos requeridos"}
                    </h3>
                    <button
                      type="button"
                      className="rounded-full p-1 hover:bg-gray-100"
                      onClick={() => setFieldsModalOpen(false)}
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="mt-3 grid pb-3 max-h-[calc(100svh-182px)] overflow-y-auto gap-3">
                    {requiredFieldIds.length === 0 && (
                      <div className="text-xs text-gray-500">
                        Este tipo de orden no requiere datos adicionales.
                      </div>
                    )}

                    {requiredFieldIds.map((fieldId) => {
                      const cfg = getFieldConfig(fieldId);
                      const value = orderFields[fieldId] ?? "";
                      const hasError = orderFieldErrors.includes(fieldId);
                      const optional = isOptionalField(fieldId);
                      const baseClass = `w-full rounded-xl border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        hasError ? "border-red-500" : "border-gray-200"
                      }`;

                      if (fieldId === "numero_mesa" && cfg.options) {
                        return (
                          <div key={fieldId} className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              {cfg.label}
                              {optional ? " (opcional)" : ""}
                            </label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {cfg.options.map((opt) => {
                                const isSelected = value === opt.value;
                                const optionClass = `rounded-xl border px-3 py-2 text-sm transition ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-100 text-blue-700"
                                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                                }`;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className={optionClass}
                                    onClick={() => {
                                      handleOrderFieldChange(fieldId, opt.value);
                                      if (autoCloseOnMesaSelect) {
                                        setFieldsModalOpen(false);
                                      }
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                            {hasError && (
                              <p className="text-[11px] text-red-600">Este campo es requerido.</p>
                            )}
                          </div>
                        );
                      }

                      if (cfg.type === "select" && cfg.options) {
                        return (
                          <div key={fieldId} className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              {cfg.label}
                              {optional ? " (opcional)" : ""}
                            </label>
                            <select
                              className={baseClass}
                              value={value}
                              onChange={(e) => handleOrderFieldChange(fieldId, e.target.value)}
                            >
                              {cfg.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            {hasError && (
                              <p className="text-[11px] text-red-600">Este campo es requerido.</p>
                            )}
                          </div>
                        );
                      }

                      // Usar LocationPicker para campos de dirección
                      const isAddressField = fieldId === "direccion" || fieldId === "direccion_completa";
                      
                      if (isAddressField && organizationId) {
                        return (
                          <div key={fieldId} className="space-y-2">
                            <label className="text-xs font-medium text-gray-600">
                              {cfg.label}
                              {optional ? " (opcional)" : ""}
                            </label>
                            <LocationPicker
                              value={selectedAddress}
                              onChange={handleAddressChange}
                              organizationId={organizationId}
                              locationId={locationId}
                            />
                            {hasError && (
                              <p className="text-[11px] text-red-600">Este campo es requerido.</p>
                            )}
                          </div>
                        );
                      }

                      // Validar fecha y hora de recogida programada
                      const isScheduledPickup = fieldId === "fecha_hora_recogida";
                      
                      if (isScheduledPickup && organizationId && locationId) {
                        const scheduledDate = value ? new Date(value) : null;
                        return (
                          <div key={fieldId} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-gray-600">
                                {cfg.label}
                                {optional ? " (opcional)" : ""}
                              </label>
                              {locationId && (
                                <LocationStatusBadge 
                                  locationId={locationId}
                                  size="sm"
                                  showFullStatus={false}
                                />
                              )}
                            </div>
                            <input
                              type={cfg.type ?? "text"}
                              className={baseClass}
                              value={value}
                              onChange={(e) => handleOrderFieldChange(fieldId, e.target.value)}
                              placeholder={cfg.placeholder}
                            />
                            {scheduledDate && scheduledDate > new Date() && (
                              <ScheduledPickupValidator
                                locationId={locationId}
                                scheduledTime={scheduledDate}
                                serviceChannel="pickup"
                              />
                            )}
                            {hasError && (
                              <p className="text-[11px] text-red-600">Este campo es requerido.</p>
                            )}
                          </div>
                        );
                      }
                    })}
                    <div className="h-2"></div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setFieldsModalOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                      onClick={handleSaveFields}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            ),
            document.body
          )
        : null}
    </div>
  );
}
