// wizardModal.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { WizardState, defaultWizard } from "@/types";
import { stepTitles, items } from "@/data/wizard";
import { sideSteps } from "@/constants/steps";
import {
  StepReview,
  StepAudience,
  StepObjective,
  StepOfferAndMessage,
  StepSchedule,
} from "@/components/marketing/steps";
import { Stepper } from "@/components/marketing/stepper";
import { useEnvironment } from "@/context/EnvironmentContext";
import { Item } from "./steps/stepObjective";

/** Portal seguro para modales */
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** ===== Helper: ¿hay algo seleccionado en Audiencia? ===== */
type AudienceFilters = {
  location?: string[];
  categories?: string[];
  zones?: string[];
  lastPurchase?: string; // "24hr" | "1 semana" | "15 dias" | "todos"
  last_purchase_from_iso?: string;
  categoryPurchase?: string[];
  cart_interaction_days?: string;
};

function hasAudienceSelection(filters?: AudienceFilters): boolean {
  if (!filters) return false;
  if (filters.lastPurchase) return true;
  if (filters.last_purchase_from_iso) return true;
  if ((filters.location?.length ?? 0) > 0) return true;
  if ((filters.categories?.length ?? 0) > 0) return true;
  if ((filters.zones?.length ?? 0) > 0) return true;
  if ((filters.categoryPurchase?.length ?? 0) > 0) return true;
  if (Boolean(filters.cart_interaction_days)) return true;
  return false;
}

export function WizardModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (w: WizardState) => void;
}) {
  const [wz, setWz] = useState<WizardState>(defaultWizard);
  const [i, setI] = useState(0);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [objectiveId, setObjectiveId] = useState<Item["id"] | null>(null);
  const [uiWarning, setUiWarning] = useState<string | null>(null);

  const { org } = useEnvironment();
  const supabase = createClient();

  // ========= edición de nombre =========
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState<string>("");

  const startEditName = () => {
    setTempName(wz.name || "Nueva Campaña");
    setIsEditingName(true);
  };

  const commitName = () => {
    const name = tempName.trim();
    setWz((prev) => ({ ...prev, name: name.length ? name : "Nueva Campaña" }));
    setIsEditingName(false);
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setTempName("");
  };

  const onKeyDownName: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditName();
    }
  };
  // ====================================

  // OBTENER USER_ID AL MONTAR
  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }
    getUser();
  }, [supabase]);

  // ========= GUARDADO INCREMENTAL =========
  const saveDraft = useCallback(async () => {
    if (!campaignId) return;

    try {
      const campaignData = {
        name: wz.name || "Nueva Campaña",
        goal: wz.goal,
        audience_filters: wz.audience_filters,
        estimated_audience: wz.estimated_audience,
        offer_id: wz.offer_id,
        message_template: wz.message_template,
        channels: wz.channels,
        scheduled_at: wz.schedule?.scheduled_at || null,
        is_automated: wz.schedule?.is_automated || false,
        automation_config: wz.schedule?.automation_config || null,
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("campaigns")
        .update(campaignData)
        .eq("id", campaignId);

      if (error) throw error;
    
    } catch (error) {
      console.error("❌ Error guardando draft:", error);
    }
  }, [campaignId, supabase, wz]);

  // GUARDADO AUTOMÁTICO CON DEBOUNCE
  useEffect(() => {
    if (!open || !campaignId) return;
    const timer = setTimeout(() => {
      saveDraft();
    }, 800);
    return () => clearTimeout(timer);
  }, [campaignId, open, saveDraft]);

  const createInitialCampaign = useCallback(async () => {
    if (!userId) {
      console.error("❌ No hay usuario autenticado");
      return;
    }
    if (!org?.id) {
      console.error("❌ No hay organización seleccionada");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: "Nueva Campaña",
          goal: "engagement",
          status: "draft",
          created_by: userId,
          organization_id: org.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setCampaignId(data.id);
      setWz((prev) => ({ ...prev, id: data.id }));
    
    } catch (error) {
      console.error("❌ Error creando campaña inicial:", error);
    }
  }, [org?.id, supabase, userId]);

  // CREAR CAMPAÑA INICIAL AL ABRIR
  useEffect(() => {
    if (open && !campaignId && userId) {
      createInitialCampaign();
    }
  }, [campaignId, createInitialCampaign, open, userId]);

  const loadOffers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error loading offers:", error);
    }
  }, [supabase]);

  // CARGAR OFERTAS
  useEffect(() => {
    if (open) {
      loadOffers();
    }
  }, [loadOffers, open]);

  // ========= HANDLERS =========
  const handleSelectObjective = (item: Item) => {
    setObjectiveId(item.id);
    setWz((prev) => ({ ...prev, goal: item.goal }));
  
  };

  const handleUpdateAudience = (filters: any) => {
    setWz((prev) => ({
      ...prev,
      audience_filters: filters as AudienceFilters,
    }));
  };

  const handleUpdateOfferAndMessage = (data: any) => {
    setWz((prev) => ({
      ...prev,
      offer_id: data.offer_id,
      message_template: data.message_template,
      channels: data.channels,
    }));
  };

  const handleUpdateSchedule = (schedule: any) => {
    setWz((prev) => ({
      ...prev,
      schedule: schedule,
    }));
  };

  /** ===== Validación central ===== */
  const audienceOK = hasAudienceSelection(wz.audience_filters as AudienceFilters);

  function warn(msg: string) {
    setUiWarning(msg);
    setTimeout(() => setUiWarning(null), 2200);
  }

  // ========= NAVEGACIÓN =========
  function reset() {
    setWz(defaultWizard);
    setI(0);
    setCampaignId(null);
  }

  function nextStep() {
    // Bloquea el paso 1 (Audiencia) si no hay selección
    if (i === 1 && !audienceOK) {
      warn("Selecciona al menos una opción de audiencia para continuar.");
      return;
    }
    if (i < sideSteps.length - 1) {
      setI(i + 1);
    }
  }

  function prevStep() {
    if (i > 0) {
      setI(i - 1);
    }
  }

  // ========= PUBLICAR CAMPAÑA =========
  async function create() {
    if (!userId) {
      console.error("❌ No hay usuario autenticado");
      return;
    }
    if (!org?.id) {
      console.error("❌ No hay organización seleccionada");
      return;
    }

    try {
      setLoading(true);

      const status =
        wz.schedule?.type === "now"
          ? "active"
          : wz.schedule?.type === "scheduled"
          ? "scheduled"
          : "draft";

      const campaignData = {
        name: wz.name || "Nueva Campaña",
        goal: wz.goal,
        status,
        audience_filters: wz.audience_filters,
        estimated_audience: wz.estimated_audience,
        offer_id: wz.offer_id,
        message_template: wz.message_template,
        channels: wz.channels,
        scheduled_at: wz.schedule?.scheduled_at || null,
        is_automated: wz.schedule?.is_automated || false,
        automation_config: wz.schedule?.automation_config || null,
        organization_id: org.id,
      };

      if (campaignId) {
        const { error } = await supabase
          .from("campaigns")
          .update(campaignData)
          .eq("id", campaignId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("campaigns")
          .insert({
            ...campaignData,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;
        setCampaignId(data.id);
      }

      onCreate(wz);
      reset();
      onClose();
    } catch (error) {
      console.error("❌ Error publicando campaña:", error);
    } finally {
      setLoading(false);
    }
  }

  // BLOQUEO DE SCROLL
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // RENDERIZAR CONTENIDO DE CADA PASO
  const renderStepContent = () => {
    switch (i) {
      case 0:
        return (
          <StepObjective
            items={items}
            selectedId={objectiveId}
            handleSelect={handleSelectObjective}
          />
        );
      case 1:
        return (
          <StepAudience
            filters={wz.audience_filters as AudienceFilters}
            estimatedAudience={wz.estimated_audience}
            onUpdate={handleUpdateAudience}
          />
        );
      case 2:
        return (
          <StepOfferAndMessage
            offers={offers}
            selectedOfferId={wz.offer_id}
            messageTemplate={wz.message_template}
            channels={wz.channels}
            onUpdate={handleUpdateOfferAndMessage}
          />
        );
      case 3:
        return <StepSchedule schedule={wz.schedule} onUpdate={handleUpdateSchedule} />;
      case 4:
        return <StepReview campaign={wz} estimatedAudience={wz.estimated_audience} />;
      default:
        return null;
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1000] overflow-hidden overscroll-contain touch-none"
        aria-modal="true"
        role="dialog"
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full gap-5 bg-white shadow-2xl border-l flex items-stretch p-[20px] overflow-hidden">
          {/* SIDEBAR IZQUIERDO */}
          <div className="h-full w-[277px] p-5 flex flex-col rounded-[12px] bg-[#F6F6F6] gap-6 border overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              {/* ======== Título editable ======== */}
              {isEditingName ? (
                <input
                  autoFocus
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={onKeyDownName}
                  onBlur={commitName}
                  className="w-[170px] px-2 py-1 rounded-[8px] border bg-white text-[#333] text-[16px] font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre de la campaña"
                />
              ) : (
                <h2 className="text-[#333] font-semibold text-[20px] leading-normal truncate max-w-[190px]">
                  {wz.name || "Nueva Campaña"}
                </h2>
              )}

              <button
                onClick={isEditingName ? commitName : startEditName}
                className="bg-white p-1.5 rounded-[10px] border hover:bg-gray-50"
                title={isEditingName ? "Guardar nombre" : "Editar nombre"}
                aria-label={isEditingName ? "Guardar nombre" : "Editar nombre"}
              >
                {/* Ícono lápiz / check */}
                {isEditingName ? (
                  // Check
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <path d="M7.629 13.89L4.06 10.32L2.64 11.74L7.63 16.73L17.36 7L15.94 5.58L7.629 13.89Z" fill="#666666" />
                  </svg>
                ) : (
                  // Pencil
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <g clipPath="url(#clip0_1799_73)">
                      <path d="M0.488333 7.9662C0.175751 8.27869 9.43957e-05 8.70254 0 9.14453L0 9.99995H0.855417C1.29741 9.99986 1.72126 9.8242 2.03375 9.51162L7.59333 3.95203L6.04792 2.40662L0.488333 7.9662Z" fill="#666666" />
                      <path d="M9.64363 0.356277C9.54217 0.254709 9.42168 0.174134 9.28906 0.119159C9.15644 0.0641848 9.01428 0.0358887 8.87071 0.0358887C8.72715 0.0358887 8.58499 0.0641848 8.45237 0.119159C8.31975 0.174134 8.19926 0.254709 8.0978 0.356277L6.63696 1.81753L8.18238 3.36294L9.64363 1.90211C9.7452 1.80065 9.82577 1.68016 9.88075 1.54754C9.93572 1.41492 9.96402 1.27276 9.96402 1.12919C9.96402 0.985629 9.93572 0.843472 9.88075 0.710849C9.82577 0.578227 9.7452 0.45774 9.64363 0.356277Z" fill="#666666" />
                    </g>
                    <defs><clipPath id="clip0_1799_73"><rect width="10" height="10" fill="white" /></clipPath></defs>
                  </svg>
                )}
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto">
              <Stepper
                steps={sideSteps}
                current={i}
                onSelect={(idx) => {
                  // Bloquea saltos a pasos > 1 si no hay selección en Audiencia
                  if (idx > 1 && !audienceOK) {
                    setUiWarning("Selecciona al menos una opción de audiencia para continuar.");
                    setTimeout(() => setUiWarning(null), 2200);
                    return;
                  }
                  setI(idx);
                }}
              />
            </div>
          </div>

          {/* CONTENIDO DERECHO */}
          <div className="flex flex-col h-full flex-1 min-w-0 rounded overflow-hidden">
            {/* Header sticky */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur">
              <div className="w-full py-5 px-4 flex justify-between items-center">
                <div className="flex flex-col justify-center items-start gap-1.5">
                  <p className="text-[#333] text-[20px] font-bold leading-normal">{stepTitles[i].title}</p>
                  <p className="text-[#333] text-base leading-normal">{stepTitles[i].subtitle}</p>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center p-3 rounded-full bg-[#F6F6F6] hover:bg-gray-200 transition"
                  aria-label="Cerrar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <g clipPath="url(#clip0_1739_372)">
                      <path d="M8.23742 7.00022L13.7439 1.49438C14.0857 1.15257 14.0857 0.598385 13.7439 0.256602C13.4021 -0.0852084 12.8479 -0.0852084 12.5061 0.256602L7.00022 5.76302L1.49438 0.256602C1.15257 -0.0852084 0.598385 -0.0852084 0.256602 0.256602C-0.0851811 0.598412 -0.0852084 1.15259 0.256602 1.49438L5.76302 7.00022L0.256602 12.5061C-0.0852084 12.8479 -0.0852084 13.4021 0.256602 13.7439C0.598412 14.0857 1.15259 14.0857 1.49438 13.7439L7.00022 8.23742L12.5061 13.7439C12.8479 14.0857 13.4021 14.0857 13.7438 13.7439C14.0857 13.4021 14.0857 12.8479 13.7438 12.5061L8.23742 7.00022Z" fill="black" />
                    </g>
                    <defs><clipPath id="clip0_1739_372"><rect width="14" height="14" fill="white" /></clipPath></defs>
                  </svg>
                </button>
              </div>
              {/* Aviso simple */}
              {uiWarning && (
                <div className="mx-4 -mt-2 mb-2 rounded-md bg-yellow-50 text-yellow-800 text-sm px-3 py-2 border border-yellow-200">
                  {uiWarning}
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] px-2.5 py-3">
              {renderStepContent()}

              {/* Botones de navegación */}
              <div className="mx-auto w-[90%] md:w-[70%] flex justify-between py-4">
                {i > 0 && (
                  <button
                    onClick={prevStep}
                    disabled={loading}
                    className="py-[11px] px-[16px] rounded-[50px] border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                )}

                <div className="ml-auto">
                  {i < sideSteps.length - 1 ? (
                    <button
                      onClick={nextStep}
                      disabled={loading || (i === 1 && !audienceOK)}
                      className={`py-[11px] px-[16px] rounded-[50px] text-white disabled:opacity-50 ${
                        loading || (i === 1 && !audienceOK)
                          ? "bg-[#9dbcf9] cursor-not-allowed"
                          : "bg-[#1265F7] hover:bg-blue-700"
                      }`}
                      title={i === 1 && !audienceOK ? "Selecciona al menos una opción para continuar" : ""}
                    >
                      Siguiente
                    </button>
                  ) : (
                    <button
                      onClick={create}
                      disabled={loading}
                      className="py-[11px] px-[16px] rounded-[50px] bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? "Publicando..." : "Publicar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
