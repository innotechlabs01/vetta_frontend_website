// Paso 3: Oferta y Mensaje — con DESPLEGABLE de productos
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import { WhatsAppPreview } from "../whatsapp/whatsAppPreview";
import { promotionTypes } from "@/data/wizard";
import SmsPreview from "../sms/smsPreview";

interface Offer {
  id: string;
  name: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  code?: string;
}

interface Product {
  id: string;
  name: string;
}

interface MessageTemplate {
  title?: string;
  message: string;
  button_text?: string;
  button_secondary_text?: string;
}

interface StepOfferAndMessageProps {
  offers: Offer[];
  selectedOfferId: string | null;
  messageTemplate: string | MessageTemplate | null;
  channels: string[];
  onUpdate: (data: {
    offer_id: string | null;
    product_id?: string | null;
    message_template: MessageTemplate;
    channels: string[];
    promotion_type: string;
  }) => void;
}

/* ----------------- helpers ----------------- */
const parseMessageTemplate = (template: string | MessageTemplate | null): MessageTemplate => {
  if (!template) {
    return {
      title: "🎉 ¡Lanzamiento especial en Evapharma!",
      message:
        "👉 Solo por tiempo limitado: recibe 50% de descuento en tu recompra de lanzamiento. Haz clic abajo y activa tu oferta exclusiva:",
      button_text: "Activar descuento",
      button_secondary_text: "Ver productos",
    };
  }
  if (typeof template === "string") {
    try {
      return JSON.parse(template);
    } catch {
      return {
        title: "🎉 ¡Lanzamiento especial en Evapharma!",
        message: template,
        button_text: "Activar descuento",
        button_secondary_text: "Ver productos",
      };
    }
  }
  return template;
};

// Normaliza ids de tipo (producto/s, cupon/cupón, etc.)
function normalizeType(id: string | undefined | null) {
  const v = (id ?? "").toLowerCase().trim();
  if (["producto", "productos", "product", "products"].includes(v)) return "productos";
  if (["cupon", "cupón", "coupon", "coupons"].includes(v)) return "cupon";
  return v;
}

/* ----------------- componente ----------------- */
export const StepOfferAndMessage: React.FC<StepOfferAndMessageProps> = ({
  offers,
  selectedOfferId,
  messageTemplate,
  channels,
  onUpdate,
}) => {
  const supabase = useMemo(() => createClient(), []);
  const { org } = useEnvironment();

  // estado base
  const [promotionType, setPromotionType] = useState<string>("cupon");
  const normType = normalizeType(promotionType);
  const isProducts = normType === "productos";

  // oferta (cuando NO es productos)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  // template por WhatsApp y SMS independientes
  const [waTemplate, setWaTemplate] = useState<MessageTemplate>(() =>
    parseMessageTemplate(messageTemplate)
  );
  const [smsMessage, setSmsMessage] = useState<string>(
    typeof messageTemplate === "string" ? messageTemplate : messageTemplate?.message || ""
  );

  // productos (cuando SÍ es productos)
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Estado para el dropdown personalizado
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  /* ---------- precargar oferta si viene id ---------- */
  useEffect(() => {
    if (selectedOfferId && offers.length > 0) {
      const offer = offers.find((o) => o.id === selectedOfferId);
      if (offer) setSelectedOffer(offer);
    }
  }, [selectedOfferId, offers]);

  /* ---------- cargar productos cuando eliges "Productos" ---------- */
  useEffect(() => {
    let active = true;
    if (!isProducts || !org?.id) return;

    (async () => {
      try {
        setProductsLoading(true);
        setProductsError(null);

        const { data, error } = await supabase
          .from("products")
          .select("id,name,organization_id")
          .eq("organization_id", org.id)
          .order("name", { ascending: true })
          .limit(500);

        if (error) throw error;
        if (!active) return;

        setProducts((data ?? []).map((p) => ({ id: p.id, name: p.name })));
      } catch (e: any) {
        if (active) setProductsError(e?.message ?? "Error cargando productos");
      } finally {
        if (active) setProductsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isProducts, org?.id, supabase]);

  /* ---------- cerrar dropdown al hacer clic fuera ---------- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------- handlers ---------- */
  const handleSelectPromotionType = (type: string) => {
    setPromotionType(type);
    const normalized = normalizeType(type);
    if (normalized === "productos") {
      setSelectedOffer(null);
    } else {
      setSelectedProductId(null);
    }
  };

  const handleSelectOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    const pctOrAmt = offer.discount_percentage ?? offer.discount_amount ?? "";
    setWaTemplate((prev) => ({
      ...prev,
      message: `👉 Solo por tiempo limitado: recibe ${pctOrAmt}% de descuento en tu recompra. Activa tu oferta exclusiva abajo.`,
    }));
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setIsDropdownOpen(false);
    setWaTemplate((prev) => ({
      ...prev,
      message: `👀 Mira ${product.name} con una oferta especial. Toca el botón y aprovéchala ahora.`,
    }));
  };

  // Si no es productos y no hay oferta seleccionada, toma la primera (una vez)
  useEffect(() => {
    if (isProducts) return;
    if (!selectedOffer && offers.length > 0) handleSelectOffer(offers[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, isProducts]);

  /* ---------- onUpdate sin loops ---------- */
  const channelsKey = useMemo(() => JSON.stringify(channels ?? []), [channels]);

  const payload = useMemo(
    () => ({
      offer_id: isProducts ? null : selectedOffer?.id || null,
      product_id: isProducts ? selectedProductId ?? null : null,
      message_template: waTemplate,
      channels,
      promotion_type: normType,
    }),
    [isProducts, selectedOffer?.id, selectedProductId, waTemplate, channelsKey, normType]
  );

  const lastSentRef = useRef<string>("");
  useEffect(() => {
    const next = JSON.stringify(payload);
    if (next !== lastSentRef.current) {
      lastSentRef.current = next;
      onUpdate(payload);
    }
  }, [payload, onUpdate]);

  /* ---------- render ---------- */
  return (
    <div className="mx-auto w-full md:w-[90%] space-y-[34px] flex flex-col">
      {/* Tipo de promoción */}
      <div className="flex flex-col gap-[13px]">
        <p className="text-[#333] font-inter text-[18px] font-semibold leading-normal not-italic">
          ¿Qué quieres promocionar?
        </p>
        <div className="flex gap-2.5 flex-wrap">
          {promotionTypes.map((type) => {
            const active = normalizeType(type.id) === normType;
            return (
              <button
                key={type.id}
                onClick={() => handleSelectPromotionType(type.id)}
                className={`rounded-[50px] px-4 py-2 text-sm font-normal transition-colors whitespace-nowrap ${
                  active
                    ? "border border-[#1265F7] bg-[#DFEBF9] text-[#053FC8]"
                    : "bg-[#EAEAEA] text-[#333] hover:bg-gray-300"
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cupones (cuando NO es productos) */}
      {!isProducts && (
        <div className="flex flex-col">
          <p className="text-[#333] font-inter text-[18px] font-semibold leading-normal not-italic">
            Selecciona el cupón:
          </p>

          {offers.length > 0 ? (
            <div className="flex flex-col gap-2 mt-3">
              {offers.map((offer) => {
                const active = selectedOffer?.id === offer.id;
                return (
                  <div
                    key={offer.id}
                    onClick={() => handleSelectOffer(offer)}
                    className={`flex gap-[16px] border p-4 rounded-[12px] cursor-pointer transition-all ${
                      active ? "border-[#1265F7] bg-blue-50" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex flex-col items-start gap-[2px] flex-[1_0_0]">
                      <p className="text-black font-inter text-base font-semibold leading-normal not-italic">
                        {offer.name || offer.code}
                      </p>
                      <p className="text-[#666] font-inter text-sm font-normal leading-normal not-italic">
                        {offer.description}
                      </p>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="19"
                      height="18"
                      viewBox="0 0 19 18"
                      fill="none"
                      className={`transition-transform ${active ? "rotate-180" : ""}`}
                    >
                      <path
                        d="M14.5325 6.15752C14.4628 6.08722 14.3798 6.03143 14.2884 5.99335C14.197 5.95527 14.099 5.93567 14 5.93567C13.901 5.93567 13.803 5.95527 13.7116 5.99335C13.6202 6.03143 13.5372 6.08722 13.4675 6.15752L10.0325 9.59252C9.96278 9.66281 9.87983 9.71861 9.78843 9.75669C9.69704 9.79476 9.59901 9.81437 9.5 9.81437C9.40099 9.81437 9.30296 9.79476 9.21157 9.75669C9.12017 9.71861 9.03722 9.66281 8.9675 9.59252L5.5325 6.15752C5.46278 6.08722 5.37983 6.03143 5.28843 5.99335C5.19704 5.95527 5.09901 5.93567 5 5.93567C4.90099 5.93567 4.80296 5.95527 4.71157 5.99335C4.62017 6.03143 4.53722 6.08722 4.4675 6.15752C4.32781 6.29804 4.2494 6.48813 4.2494 6.68627C4.2494 6.88441 4.32781 7.0745 4.4675 7.21502L7.91 10.6575C8.33188 11.0789 8.90375 11.3155 9.5 11.3155C10.0963 11.3155 10.6681 11.0789 11.09 10.6575L14.5325 7.21502C14.6722 7.0745 14.7506 6.88441 14.7506 6.68627Z"
                        fill="black"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 mt-3">No hay ofertas disponibles</p>
          )}
        </div>
      )}

      {/* Productos (DESPLEGABLE MEJORADO) */}
      {isProducts && (
        <div className="flex flex-col">
          <p className="text-[#333] font-inter text-[18px] font-semibold leading-normal not-italic mb-3">
            Selecciona el producto:
          </p>

          <div className="relative w-full  " ref={dropdownRef}>
            {/* Trigger Button */}
            <button
              onClick={() => !productsLoading && !productsError && setIsDropdownOpen(!isDropdownOpen)}
              disabled={productsLoading || !!productsError}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-[12px] border transition-all ${
                isDropdownOpen
                  ? "border-[#1265F7] bg-blue-50 ring-2 ring-[#1265F7]/20"
                  : "border-gray-200 bg-white hover:border-gray-300"
              } ${productsLoading || productsError ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-[14px] font-semibold text-[#333] leading-tight truncate w-full">
                  {productsLoading
                    ? "Cargando productos..."
                    : productsError
                    ? "Error al cargar"
                    : selectedProduct
                    ? selectedProduct.name
                    : "Selecciona un producto"}
                </span>
                <span className="text-[12px] text-[#666] mt-0.5">
                  {productsLoading
                    ? "Por favor espera"
                    : productsError
                    ? "Intenta de nuevo"
                    : products.length > 0
                    ? `${products.length} productos disponibles`
                    : "No hay productos"}
                </span>
              </div>

              {/* Chevron Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className={`flex-shrink-0 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="#666"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && products.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-[12px] shadow-lg max-h-[300px] overflow-y-auto">
                {products.map((product, index) => {
                  const isSelected = selectedProductId === product.id;
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-[#1265F7]"
                          : "hover:bg-gray-50 text-[#333]"
                      } ${index === 0 ? "rounded-t-[12px]" : ""} ${
                        index === products.length - 1 ? "rounded-b-[12px]" : "border-b border-gray-100"
                      }`}
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[14px] font-medium leading-tight truncate">
                          {product.name}
                        </span>
                        <span className="text-[12px] text-[#666] mt-0.5">
                          Disponible en todas las tiendas
                        </span>
                      </div>

                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="flex-shrink-0"
                        >
                          <path
                            d="M20 6L9 17L4 12"
                            stroke="#1265F7"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Error Message */}
            {productsError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {productsError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp */}
      <WhatsAppPreview template={waTemplate} setTemplate={setWaTemplate} />

      {/* SMS */}
      <SmsPreview message={smsMessage} setMessage={setSmsMessage} />
    </div>
  );
};