"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Info,
  Users,
  Gift,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createLoyaltyRewardAction,
  updateLoyaltyRewardAction,
} from "@/app/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import Image from "next/image";
import ProductSelectorModal from "./ProductSelectorModal";
import { createPortal } from "react-dom";

// ------------------ Types ------------------
type Rounding = "none" | "floor" | "ceil" | "round";

type Tier = {
  id: string;
  name: string;
  color: string;
  threshold: number;
  multiplier: number;
  perks: string[];
};

type Reward = {
  id: string;
  name: string;
  cost: number;
  active: boolean;
};

interface LoyaltyModuleProps {
  initialRewards?: any[];
}

// ------------------ Labels ------------------
const CONDITION_LABELS: Record<string, string> = {
  min_order_value: "Compra mínima",
  min_orders_count: "A partir de X compras",
  first_buy: "Primera compra",
  specialDates: "Fecha especial",
};

const BENEFIT_LABELS: Record<string, string> = {
  percent_discount: "Descuento porcentual",
  fixed_discount: "Descuento fijo",
  free_shipping: "Envío gratis",
  free_product: "Producto gratis",
};

const SPECIAL_DATE_CARDS = [
  {
    id: "range",
    title: "Rango de fechas",
    description: "Define un periodo específico con fecha de inicio y fin.",
    badge: "Personalizado",
  },
  {
    id: "first_anniversary",
    title: "Primer aniversario como cliente",
    description: "Celebra cuando el cliente cumple su primer año contigo.",
  },
  {
    id: "first_month",
    title: "Primer mes como cliente",
    description: "Recompensa después de 30 días de la primera compra.",
  },
  {
    id: "christmas",
    title: "Navidad",
    description: "Campaña especial para la temporada navideña.",
  },
  {
    id: "halloween",
    title: "Halloween",
    description: "Promoción temática del 31 de octubre.",
  },
  {
    id: "mothers_day",
    title: "Día de las madres",
    description: "Reconoce a todas las mamás en su día.",
  },
  {
    id: "fathers_day",
    title: "Día del padre",
    description: "Celebra a los papás con una recompensa especial.",
  },
  {
    id: "mens_day",
    title: "Día del hombre",
    description: "Incentiva compras para esta fecha especial.",
  },
  {
    id: "womens_day",
    title: "Día de la mujer",
    description: "Aprovecha el 8 de marzo para fidelizar.",
  },
  {
    id: "childrens_day",
    title: "Día del niño",
    description: "Promociones pensadas para los más pequeños.",
  },
] as const;

const SPECIAL_DATE_LABELS = SPECIAL_DATE_CARDS.reduce<Record<string, string>>(
  (acc, card) => {
    acc[card.id] = card.title;
    return acc;
  },
  {}
);

const ITEMS_PER_PAGE = 5;

// ------------------ Helpers ------------------
function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function applyRounding(v: number, mode: Rounding) {
  if (mode === "floor") return Math.floor(v);
  if (mode === "ceil") return Math.ceil(v);
  if (mode === "round") return Math.round(v);
  return v;
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function dateToLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateTimeLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateToLocalInputValue(date);
}

function getDefaultRange() {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    start: dateToLocalInputValue(now),
    end: dateToLocalInputValue(end),
  };
}

function formatDateTimeLabel(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ------------------ Component ------------------
export default function LoyaltyModule({
  initialRewards = [],
}: LoyaltyModuleProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditmode, setIsEditMode] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { org } = useEnvironment();
  const organizationId = org?.id;
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productModalMode, setProductModalMode] = useState<
    "condition" | "benefit"
  >("condition");
  const [currentRewardPage, setCurrentRewardPage] = useState(1);

  const [products, setProducts] = useState<
    Array<{
      id: string;
      name: string;
      price: number | null;
      image_url: string | null;
    }>
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const totalRewardPages = Math.max(
    1,
    Math.ceil(initialRewards.length / ITEMS_PER_PAGE)
  );
  const paginatedRewards = useMemo(() => {
    const start = (currentRewardPage - 1) * ITEMS_PER_PAGE;
    return initialRewards.slice(start, start + ITEMS_PER_PAGE);
  }, [initialRewards, currentRewardPage]);
  const paginationRangeStart =
    initialRewards.length === 0
      ? 0
      : (currentRewardPage - 1) * ITEMS_PER_PAGE + 1;
  const paginationRangeEnd =
    initialRewards.length === 0
      ? 0
      : Math.min(currentRewardPage * ITEMS_PER_PAGE, initialRewards.length);

  useEffect(() => {
    setCurrentRewardPage((prev) =>
      Math.min(prev, Math.max(1, totalRewardPages))
    );
  }, [initialRewards.length, totalRewardPages]);

  useEffect(() => {
    async function loadProducts() {
      // No cargar si no hay organizationId
      if (!organizationId) {
        setProducts([]);
        return;
      }

      try {
        setLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, image_url, is_available")
          .eq("organization_id", organizationId)
          .eq("is_available", true)
          .order("name");

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error("Error cargando productos:", error);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, [supabase, organizationId]);

  const getProductName = (productId: string | null) => {
    if (!productId) return "N/A";
    const product = products.find((p) => p.id === productId);
    return product ? product.name : productId;
  };

  const initialFormState = {
    reward_id: "",
    name: "",
    description: "",
    condition_type: "",
    minimum_amount: "",
    minimum_quantity: "",
    special_event_type: "",
    special_range_start: "",
    special_range_end: "",
    benefit_type: "",
    benefit_value: "",
    product_id: "",
    product_ids: [] as string[],
    free_products_ids: [] as string[],
    free_products_quantity: "1",
    limit_type: "",
    user_limit: "",
    total_limit: "",
    valid_until: "",
    image_file: null as File | null,
    image_preview: "" as string,
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setCurrentStep(1);
    setErrors({});
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingRewardId(null);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Información básica
        if (!formData.name.trim()) {
          newErrors.name = "El título es requerido";
        }
        if (!formData.description.trim()) {
          newErrors.description = "La descripción es requerida";
        }
        break;

      case 2: // Condición
        if (!formData.condition_type) {
          newErrors.condition_type = "Selecciona un tipo de condición";
        }

        if (formData.condition_type === "specialDates") {
          if (!formData.special_event_type) {
            newErrors.special_event_type =
              "Selecciona una opción de fecha especial";
          }

          if (formData.special_event_type === "range") {
            if (!formData.special_range_start) {
              newErrors.special_range_start = "Ingresa la fecha inicial";
            }
            if (!formData.special_range_end) {
              newErrors.special_range_end = "Ingresa la fecha final";
            }
            if (
              formData.special_range_start &&
              formData.special_range_end &&
              new Date(formData.special_range_start) >
                new Date(formData.special_range_end)
            ) {
              newErrors.special_range_end =
                "La fecha final debe ser posterior a la inicial";
            }
          }
        }

        if (formData.condition_type === "min_order_value") {
          if (
            !formData.minimum_amount ||
            parseFloat(formData.minimum_amount) <= 0
          ) {
            newErrors.minimum_amount = "Ingresa un monto mínimo válido";
          }
        }

        if (
          formData.condition_type === "min_orders_count" ||
          formData.condition_type === "nth_order"
        ) {
          if (
            !formData.minimum_quantity ||
            parseInt(formData.minimum_quantity) <= 0
          ) {
            newErrors.minimum_quantity = "Ingresa una cantidad válida";
          }
        }
        break;

      case 3: // Beneficio
        if (!formData.benefit_type) {
          newErrors.benefit_type = "Selecciona un tipo de beneficio";
        }

        if (formData.benefit_type === "percent_discount") {
          const percent = parseFloat(formData.benefit_value);
          if (!formData.benefit_value || percent <= 0 || percent > 100) {
            newErrors.benefit_value = "Ingresa un porcentaje entre 1 y 100";
          }
        }

        if (formData.benefit_type === "fixed_discount") {
          if (
            !formData.benefit_value ||
            parseFloat(formData.benefit_value) <= 0
          ) {
            newErrors.benefit_value = "Ingresa un monto válido";
          }
        }

        if (formData.benefit_type === "free_product") {
          if (formData.free_products_ids.length === 0) {
            newErrors.free_products_ids = "Selecciona al menos un producto";
          }
          const quantity = parseInt(formData.free_products_quantity || "1");
          if (quantity > formData.free_products_ids.length) {
            newErrors.free_products_quantity =
              "La cantidad no puede ser mayor a los productos disponibles";
          }
        }
        break;

      case 4: // Alcance y límites
        if (!formData.limit_type) {
          newErrors.limit_type = "Selecciona un tipo de límite";
        }

        if (formData.limit_type === "time") {
          if (!formData.valid_until) {
            newErrors.valid_until = "Selecciona una fecha límite";
          } else {
            const selectedDate = new Date(formData.valid_until);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
              newErrors.valid_until = "La fecha debe ser futura";
            }
          }
        }

        if (formData.limit_type === "quantity") {
          if (formData.user_limit && parseInt(formData.user_limit) <= 0) {
            newErrors.user_limit = "El límite por usuario debe ser mayor a 0";
          }
          if (formData.total_limit && parseInt(formData.total_limit) <= 0) {
            newErrors.total_limit = "El límite total debe ser mayor a 0";
          }
          if (!formData.user_limit && !formData.total_limit) {
            newErrors.user_limit = "Debes especificar al menos un límite";
            newErrors.total_limit = "Debes especificar al menos un límite";
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "image_file") {
          if (value instanceof File) {
            formDataToSend.append("image_file", value);
          }
        } else if (key === "image_preview") {
          if (!formData.image_file && value) {
            formDataToSend.append("existing_image_url", value.toString());
          }
        } else if (key === "product_ids") {
          // SIEMPRE enviar estos arrays, incluso si están vacíos
          formDataToSend.append(key, JSON.stringify(value));
        } else if (key === "free_products_ids") {
          formDataToSend.append(key, JSON.stringify(value));
        } else if (key === "free_products_quantity") {
          formDataToSend.append(key, value ? value.toString() : "");
        } else if (key === "is_active") {
          formDataToSend.append("is_active", value ? "true" : "false");
        } else if (value !== null && value !== "") {
          formDataToSend.append(key, value.toString());
        }
      });

      if (isEditmode && editingRewardId) {
        formDataToSend.append("reward_id", editingRewardId);
        await updateLoyaltyRewardAction(formDataToSend);
      } else {
        await createLoyaltyRewardAction(formDataToSend);
      }

      resetForm();
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      alert(
        isEditmode
          ? "Error al actualizar la recompensa"
          : "Error al crear la recompensa"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
        <AlertCircle size={12} />
        <span>{message}</span>
      </div>
    );
  };

  const steps = [
    { id: 1, title: "Información básica", icon: <Info size={16} /> },
    { id: 2, title: "Condición", icon: <Users size={16} /> },
    { id: 3, title: "Beneficio", icon: <Gift size={16} /> },
    { id: 4, title: "Alcance y límites", icon: <Calendar size={16} /> },
    {
      id: 5,
      title: "Revisión y confirmación",
      icon: <CheckCircle2 size={16} />,
    },
  ];

  const handleEditReward = (reward: any) => {
    setIsEditMode(true);
    setEditingRewardId(reward.id);

    setFormData({
      reward_id: reward.id,
      name: reward.name,
      description: reward.description || "",
      condition_type: reward.condition_type || reward.reward_type || "",
      minimum_amount: reward.minimum_amount?.toString() || "",
      minimum_quantity: reward.minimum_quantity?.toString() || "",
      special_event_type: reward.special_event_type || "",
      special_range_start: toDateTimeLocalInput(reward.special_range_start),
      special_range_end: toDateTimeLocalInput(reward.special_range_end),
      benefit_type: reward.benefit_type || "",
      benefit_value: reward.benefit_value?.toString() || "",
      product_id: reward.product_id || "",
      product_ids: reward.product_ids || [],
      free_products_ids: reward.free_products_ids || [],
      free_products_quantity: reward.free_products_quantity?.toString() || "1",
      limit_type: reward.valid_until
        ? "time"
        : reward.user_limit || reward.total_limit
        ? "quantity"
        : "",
      user_limit: reward.user_limit?.toString() || "",
      total_limit: reward.total_limit?.toString() || "",
      valid_until: reward.valid_until ? reward.valid_until.split("T")[0] : "",
      image_file: null,
      image_preview: reward.image_url || "",
      is_active: reward.is_active ?? true,
    });

    setCurrentStep(5);
    setIsModalOpen(true);
  };

  const selectedSpecialEvent = formData.special_event_type;

  const handleConditionTypeChange = (value: string) => {
    updateFormData("condition_type", value);
    if (value === "specialDates") {
      if (!formData.special_event_type) {
        const { start, end } = getDefaultRange();
        updateFormData("special_event_type", "range");
        updateFormData("special_range_start", start);
        updateFormData("special_range_end", end);
      }
    } else {
      updateFormData("special_event_type", "");
      updateFormData("special_range_start", "");
      updateFormData("special_range_end", "");
    }
  };

  const handleSpecialEventSelect = (optionId: string) => {
    updateFormData("special_event_type", optionId);
    if (optionId === "range") {
      if (!formData.special_range_start || !formData.special_range_end) {
        const { start, end } = getDefaultRange();
        updateFormData("special_range_start", start);
        updateFormData("special_range_end", end);
      }
    } else {
      updateFormData("special_range_start", "");
      updateFormData("special_range_end", "");
    }
  };

  return (
    <main className="min-h-screen w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 grid place-items-center rounded-xl border bg-white">
          <Gift className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fidelización
          </h1>
          <p className="text-sm text-gray-600">
            Incentiva la recurrencia, aumenta el ticket promedio y premia la
            lealtad.
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:brightness-110"
        >
          + Nueva Recompensa
        </button>
      </div>

      <div className="xl:col-span-2">
        {/* Header Card */}
        <div className="bg-white rounded-lg mb-4">
          <div
            className="grid gap-2  font-regular text-gray-700"
            style={{ gridTemplateColumns: "108px repeat(10, minmax(0, 2fr))", fontSize: "12px"}}
          >
            <div>Nombre</div>
            <div>Tipo</div>
            <div>Monto.mín.</div>
            <div>Cant.mín.</div>
            <div>Beneficio</div>
            <div>Valor</div>
            <div>Producto</div>
            <div>Lím.usuario</div>
            <div>Lím.total</div>
            <div>Desde</div>
            <div>Hasta</div>
          </div>
        </div>

        {/* Rewards Cards */}
        <div className="space-y-3">
          {initialRewards.length === 0 ? (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No hay recompensas creadas
            </div>
          ) : (
            paginatedRewards.map((reward) => (
              <div
                key={reward.id}
                onClick={() => handleEditReward(reward)}
                className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
              >
                <div
                  className="grid gap-2 items-center text-sm"
                  style={{
                    gridTemplateColumns: "100px repeat(10, minmax(0, 1fr))",
                  }}
                >
                  {/* Nombre con badge de estado */}
                  <div>
                    <div className="flex items-center gap-3 min-w-0">
                      {reward.image_url && (
                        <Image
                          src={reward.image_url}
                          alt={reward.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-gray-900 font-medium truncate">
                          {reward.name}
                        </span>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full w-fit",
                            reward.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          )}
                        >
                          {reward.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resto de las columnas (sin cambios) */}
                  <div className="text-gray-600">
                    {CONDITION_LABELS[reward.condition_type || reward.reward_type] ||
                      reward.condition_type ||
                      reward.reward_type ||
                      "N/A"}
                  </div>
                  <div className="text-gray-600">
                    {reward.minimum_amount
                      ? `$${Number(reward.minimum_amount).toLocaleString()}`
                      : "N/A"}
                  </div>
                  <div className="text-gray-600">
                    {reward.minimum_quantity || "N/A"}
                  </div>
                  <div className="text-gray-600">
                    {BENEFIT_LABELS[reward.benefit_type] ||
                      reward.benefit_type ||
                      "N/A"}
                  </div>
                  <div className="text-gray-600">
                    {reward.benefit_value || "N/A"}
                  </div>
                  <div className="text-gray-600">
                    {reward.product_id ? (
                      <span className="inline-flex items-center gap-2">
                        {getProductName(reward.product_id)}
                        {products.find((p) => p.id === reward.product_id)
                          ?.image_url && (
                          <Image
                            src={
                              products.find((p) => p.id === reward.product_id)
                                ?.image_url!
                            }
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </div>
                  <div className="text-gray-600">
                    {reward.user_limit || "Sin límite"}
                  </div>
                  <div className="text-gray-600">
                    {reward.total_limit || "Sin límite"}
                  </div>
                  <div className="text-gray-600">
                    {reward.created_at
                      ? new Date(reward.created_at).toLocaleDateString()
                      : "N/A"}
                  </div>
                  <div className="text-gray-600">
                    {reward.valid_until
                      ? new Date(reward.valid_until).toLocaleDateString()
                      : "N/A"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {initialRewards.length > ITEMS_PER_PAGE && (
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-600">
              Mostrando {paginationRangeStart}-{paginationRangeEnd} de{" "}
              {initialRewards.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentRewardPage((prev) => Math.max(1, prev - 1))
                }
                disabled={currentRewardPage === 1}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm font-medium text-gray-700">
                Página {currentRewardPage} de {totalRewardPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentRewardPage((prev) =>
                    Math.min(totalRewardPages, prev + 1)
                  )
                }
                disabled={currentRewardPage === totalRewardPages}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Multi-Paso */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[50] bg-white">
            <div
              className="w-full h-full"
              style={{ animation: "slideUp 0.3s ease-out" }}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white">
                <div>
                  <h2 className="text-xl font-semibold">
                    {isEditmode ? "Editar Recompensa" : "Nueva Recompensa"}
                  </h2>
                  {!isEditmode && (
                    <p className="text-sm text-gray-600">
                      Paso {currentStep} de 5
                    </p>
                  )}
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Sidebar + Content */}
              <div className="flex h-[calc(100vh-73px)]">
                {/* Sidebar - Solo mostrar si NO está en modo edición */}
                {!isEditmode && (
                  <div className="w-80 border-r bg-gray-50 p-6 relative">
                    {/* Línea vertical centrada respecto a los íconos */}
                    <div
                      className="absolute left-[2.5rem] top-[2.5rem] w-[2px] bg-gray-200"
                      style={{
                        height: `calc((${steps.length - 1} * 3.5rem))`,
                      }}
                    />

                    <div className="space-y-6 relative">
                      {steps.map((step, index) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                          <div
                            key={step.id}
                            className="relative flex items-center gap-3"
                          >
                            {/* Icono circular */}
                            <div
                              className={cn(
                                "relative z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all duration-200",
                                isActive
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : isCompleted
                                  ? "border-blue-500 bg-blue-50 text-blue-600"
                                  : "border-gray-300 bg-white text-gray-400"
                              )}
                            >
                              {step.icon}
                            </div>

                            {/* Título del paso */}
                            <span
                              className={cn(
                                "text-sm font-medium transition-colors",
                                isActive
                                  ? "text-blue-700"
                                  : isCompleted
                                  ? "text-gray-700"
                                  : "text-gray-500"
                              )}
                            >
                              {step.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-2xl mx-auto">
                    {/* Paso 1 */}
                    {currentStep === 1 && (
                      <>
                        <h3 className="text-lg font-medium mb-1">
                          1. Información básica
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Define los datos principales de la recompensa
                        </p>

                        {/* Contenedor principal */}
                        <div className="flex gap-8 mb-10 items-start">
                          {/* Preview de imagen */}
                          <div>
                            <input
                              type="file"
                              id="imageUpload"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Guardar el archivo real
                                  updateFormData("image_file", file);

                                  // Crear preview para mostrar
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    updateFormData(
                                      "image_preview",
                                      reader.result as string
                                    );
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />

                            <label
                              htmlFor="imageUpload"
                              className="w-44 h-44 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 transition"
                            >
                              {formData.image_preview ? (
                                <Image
                                  src={formData.image_preview}
                                  alt="Preview"
                                  width={176}
                                  height={176}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <svg
                                  className="w-12 h-12 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                            </label>
                          </div>

                          {/* Campos de texto */}
                          <div className="flex-1 space-y-5">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Título
                              </label>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                  updateFormData("name", e.target.value)
                                }
                                placeholder="Envío gratis ≥ $50k"
                                className={cn(
                                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500",
                                  errors.name && "border-red-500"
                                )}
                              />
                              <ErrorMessage message={errors.name} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                              </label>
                              <textarea
                                value={formData.description}
                                onChange={(e) =>
                                  updateFormData("description", e.target.value)
                                }
                                placeholder="Gancho de envío gratis para el checkout"
                                rows={3}
                                className={cn(
                                  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none",
                                  errors.description && "border-red-500"
                                )}
                              />
                              <ErrorMessage message={errors.description} />
                            </div>
                          </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={resetForm}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:brightness-110 transition"
                          >
                            Siguiente
                          </button>
                        </div>
                      </>
                    )}

                    {/* Paso 2 */}
                    {currentStep === 2 && (
                      <>
                        <h3 className="text-lg font-medium mb-1">
                          2. Condición y Productos
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Establece cuándo se desbloquea la recompensa y qué
                          productos aplican
                        </p>
                        <div className="space-y-6 mb-8">
                          {/* Selector de Condición */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tipo de condición
                            </label>
                            <Select
                              value={formData.condition_type || undefined}
                              onValueChange={handleConditionTypeChange}
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-11 rounded-lg border-gray-300 text-sm",
                                  errors.condition_type &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              >
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="min_order_value">
                                  Compra mínima
                                </SelectItem>
                                <SelectItem value="min_orders_count">
                                  A partir de X compras
                                </SelectItem>
                                <SelectItem value="first_buy">
                                  Primera compra
                                </SelectItem>
                                <SelectItem value="specialDates">
                                  Fechas especial
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <ErrorMessage message={errors.condition_type} />
                          </div>

                          {formData.condition_type === "specialDates" && (
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-800">
                                  Rango de fechas
                                </p>
                                <p className="text-xs text-gray-500">
                                  Configura una vigencia personalizada con fecha
                                  de inicio y fin.
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSpecialEventSelect("range")
                                  }
                                  className={cn(
                                    "w-full text-left border rounded-xl p-4 transition-all duration-200 hover:shadow-sm",
                                    selectedSpecialEvent === "range"
                                      ? "border-blue-500 bg-blue-50/70"
                                      : "border-gray-200 bg-gray-50"
                                  )}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <span className="font-semibold text-gray-800">
                                        Rango de fechas
                                      </span>
                                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                      Personalizado
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Define el periodo exacto en el que la
                                    recompensa estará activa.
                                  </p>


                                   <div className="grid gap-4 sm:grid-cols-2 py-2">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Desde
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={formData.special_range_start}
                                        onChange={(e) =>
                                          updateFormData(
                                            "special_range_start",
                                            e.target.value
                                          )
                                        }
                                        className={cn(
                                          "w-full px-4 py-2 border rounded-lg",
                                          errors.special_range_start &&
                                            "border-red-500"
                                        )}
                                      />
                                      <ErrorMessage
                                        message={errors.special_range_start}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hasta
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={formData.special_range_end}
                                        onChange={(e) =>
                                          updateFormData(
                                            "special_range_end",
                                            e.target.value
                                          )
                                        }
                                        className={cn(
                                          "w-full px-4 py-2 border rounded-lg",
                                          errors.special_range_end &&
                                            "border-red-500"
                                        )}
                                      />
                                      <ErrorMessage
                                        message={errors.special_range_end}
                                      />
                                    </div>
                                  </div>
                                </button>

                                

                                
                              </div>

                              <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-800">
                                  Eventos especiales
                                </p>
                                <p className="text-xs text-gray-500">
                                  Elige una fecha conmemorativa para automatizar
                                  la recompensa.
                                </p>
                                <div className="space-y-3">
                                  {SPECIAL_DATE_CARDS.filter(
                                    (card) => card.id !== "range"
                                  ).map((card) => {
                                    const isSelected =
                                      selectedSpecialEvent === card.id;
                                    return (
                                      <button
                                        type="button"
                                        key={card.id}
                                        onClick={() =>
                                          handleSpecialEventSelect(card.id)
                                        }
                                        className={cn(
                                          "w-full text-left border rounded-xl p-4 transition-all duration-200 hover:shadow-sm",
                                          isSelected
                                            ? "border-blue-500 bg-blue-50/70"
                                            : "border-gray-200 bg-gray-50"
                                        )}
                                      >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className="font-semibold text-gray-800">
                                            {card.title}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                          {card.description}
                                        </p>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <ErrorMessage
                                message={errors.special_event_type}
                              />
                            </div>
                          )}

                          {/* Campo de Monto Mínimo */}
                          {formData.condition_type === "min_order_value" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monto mínimo de compra
                              </label>
                              <input
                                type="number"
                                value={formData.minimum_amount}
                                onChange={(e) =>
                                  updateFormData(
                                    "minimum_amount",
                                    e.target.value
                                  )
                                }
                                placeholder="50000"
                                className={cn(
                                  "w-full px-4 py-2 border rounded-lg",
                                  errors.minimum_amount && "border-red-500"
                                )}
                              />
                              <ErrorMessage message={errors.minimum_amount} />
                            </div>
                          )}

                          {/* Campo de Cantidad Mínima */}
                          {(formData.condition_type === "min_orders_count" ||
                            formData.condition_type === "nth_order") && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {formData.condition_type === "nth_order"
                                  ? "Número exacto de compra"
                                  : "Cantidad mínima"}
                              </label>
                              <input
                                type="number"
                                value={formData.minimum_quantity}
                                onChange={(e) =>
                                  updateFormData(
                                    "minimum_quantity",
                                    e.target.value
                                  )
                                }
                                placeholder="3"
                                className={cn(
                                  "w-full px-4 py-2 border rounded-lg",
                                  errors.minimum_quantity && "border-red-500"
                                )}
                              />
                              <ErrorMessage message={errors.minimum_quantity} />
                            </div>
                          )}

                          {/* LISTA DE PRODUCTOS */}
                          {formData.condition_type &&
                            ((formData.condition_type === "min_order_value" &&
                              formData.minimum_amount) ||
                              ((formData.condition_type ===
                                "min_orders_count" ||
                                formData.condition_type === "nth_order") &&
                                formData.minimum_quantity)) && (
                              <div className="border-t pt-6 animate-fadeIn">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Productos aplicables (opcional)
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                  Selecciona los productos donde aplica esta
                                  recompensa. Si no seleccionas ninguno,
                                  aplicará a todos.
                                </p>

                                {/* Botón para abrir el modal */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProductModalMode("condition");
                                    setIsProductModalOpen(true);
                                  }}
                                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium text-gray-700 hover:text-blue-600"
                                >
                                  {formData.product_ids.length > 0
                                    ? `${formData.product_ids.length} producto${
                                        formData.product_ids.length !== 1
                                          ? "s"
                                          : ""
                                      } seleccionado${
                                        formData.product_ids.length !== 1
                                          ? "s"
                                          : ""
                                      }`
                                    : "Seleccionar productos"}
                                </button>

                                {/* Preview de productos seleccionados */}
                                {formData.product_ids.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {formData.product_ids
                                      .slice(0, 5)
                                      .map((productId) => {
                                        const product = products.find(
                                          (p) => p.id === productId
                                        );
                                        return product ? (
                                          <div
                                            key={productId}
                                            className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200"
                                          >
                                            {product.image_url && (
                                              <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                width={20}
                                                height={20}
                                                className="w-5 h-5 rounded-full object-cover"
                                              />
                                            )}
                                            <span className="text-xs text-blue-700 font-medium">
                                              {product.name}
                                            </span>
                                          </div>
                                        ) : null;
                                      })}
                                    {formData.product_ids.length > 5 && (
                                      <div className="flex items-center px-3 py-1.5 bg-gray-100 rounded-full">
                                        <span className="text-xs text-gray-600 font-medium">
                                          +{formData.product_ids.length - 5} más
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>

                        {/* Botones */}
                        <div className="flex justify-between pt-4">
                          <button
                            onClick={handleBack}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                          >
                            Atrás
                          </button>
                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              onClick={resetForm}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleNext}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:brightness-110 transition"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Paso 3 */}
                    {currentStep === 3 && (
                      <>
                        <h3 className="text-lg font-medium mb-1">
                          3. Beneficio
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Selecciona qué obtiene el cliente
                        </p>
                        <div className="space-y-6 mb-8">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tipo de beneficio
                            </label>
                            <Select
                              value={formData.benefit_type || undefined}
                              onValueChange={(value) => {
                                updateFormData("benefit_type", value);
                                // Limpiar campos relacionados al cambiar tipo
                                if (value !== "free_product") {
                                  updateFormData("product_id", "");
                                  updateFormData("free_products_ids", []);
                                  updateFormData("free_products_quantity", "1");
                                }
                              }}
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-11 rounded-lg border-gray-300 text-sm",
                                  errors.benefit_type &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              >
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent_discount">
                                  Descuento porcentual
                                </SelectItem>
                                <SelectItem value="fixed_discount">
                                  Descuento fijo
                                </SelectItem>
                                <SelectItem value="free_shipping">
                                  Envío gratis
                                </SelectItem>
                                <SelectItem value="free_product">
                                  Producto(s) gratis
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <ErrorMessage message={errors.benefit_type} />
                          </div>

                          {formData.benefit_type === "percent_discount" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Porcentaje (%)
                              </label>
                              <input
                                type="number"
                                value={formData.benefit_value}
                                onChange={(e) =>
                                  updateFormData(
                                    "benefit_value",
                                    e.target.value
                                  )
                                }
                                placeholder="10"
                                max="100"
                                className={cn(
                                  "w-full px-4 py-2 border rounded-lg",
                                  errors.benefit_value && "border-red-500"
                                )}
                              />
                              <ErrorMessage message={errors.benefit_value} />
                            </div>
                          )}

                          {formData.benefit_type === "fixed_discount" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monto ($)
                              </label>
                              <input
                                type="number"
                                value={formData.benefit_value}
                                onChange={(e) =>
                                  updateFormData(
                                    "benefit_value",
                                    e.target.value
                                  )
                                }
                                placeholder="5000"
                                className={cn(
                                  "w-full px-4 py-2 border rounded-lg",
                                  errors.benefit_value && "border-red-500"
                                )}
                              />
                              <ErrorMessage message={errors.benefit_value} />
                            </div>
                          )}

                          {formData.benefit_type === "free_product" && (
                            <div className="space-y-4">
                              {/* Campo: ¿Cuántos productos puede elegir? */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  ¿Cuántos productos gratis puede elegir el
                                  cliente?
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={formData.free_products_quantity}
                                  onChange={(e) =>
                                    updateFormData(
                                      "free_products_quantity",
                                      e.target.value
                                    )
                                  }
                                  placeholder="1"
                                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  El cliente podrá seleccionar hasta{" "}
                                  {formData.free_products_quantity || 1}{" "}
                                  producto
                                  {formData.free_products_quantity !== "1"
                                    ? "s"
                                    : ""}{" "}
                                  de los que elijas
                                </p>
                              </div>

                              {/* Selector de productos gratis */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Productos disponibles para regalo
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                  Selecciona los productos que el cliente puede
                                  elegir como regalo
                                </p>

                                {loadingProducts ? (
                                  <div className="w-full px-4 py-2 border rounded-lg text-gray-500">
                                    Cargando productos...
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProductModalMode("benefit");
                                        setIsProductModalOpen(true);
                                      }}
                                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium text-gray-700 hover:text-blue-600"
                                    >
                                      {formData.free_products_ids.length > 0
                                        ? `${
                                            formData.free_products_ids.length
                                          } producto${
                                            formData.free_products_ids
                                              .length !== 1
                                              ? "s"
                                              : ""
                                          } disponible${
                                            formData.free_products_ids
                                              .length !== 1
                                              ? "s"
                                              : ""
                                          } para regalo`
                                        : "Seleccionar productos para regalo"}
                                    </button>

                                    {/* Preview de productos gratis seleccionados */}
                                    {formData.free_products_ids.length > 0 && (
                                      <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between text-xs text-gray-600">
                                          <span>
                                            Productos disponibles para que el
                                            cliente elija:
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateFormData(
                                                "free_products_ids",
                                                []
                                              )
                                            }
                                            className="text-red-600 hover:text-red-700 underline"
                                          >
                                            Limpiar
                                          </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {formData.free_products_ids.map(
                                            (productId) => {
                                              const product = products.find(
                                                (p) => p.id === productId
                                              );
                                              return product ? (
                                                <div
                                                  key={productId}
                                                  className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200"
                                                >
                                                  {product.image_url && (
                                                    <Image
                                                      src={product.image_url}
                                                      alt={product.name}
                                                      width={20}
                                                      height={20}
                                                      className="w-5 h-5 rounded-full object-cover"
                                                    />
                                                  )}
                                                  <span className="text-xs text-green-700 font-medium">
                                                    {product.name}
                                                  </span>
                                                </div>
                                              ) : null;
                                            }
                                          )}
                                        </div>

                                        {/* Advertencia si la cantidad es mayor a productos disponibles */}
                                        {parseInt(
                                          formData.free_products_quantity || "1"
                                        ) >
                                          formData.free_products_ids.length && (
                                          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                            <span className="text-amber-600 text-xs">
                                              ⚠️ Has seleccionado{" "}
                                              {
                                                formData.free_products_ids
                                                  .length
                                              }{" "}
                                              producto
                                              {formData.free_products_ids
                                                .length !== 1
                                                ? "s"
                                                : ""}
                                              , pero el cliente puede elegir
                                              hasta{" "}
                                              {formData.free_products_quantity}.
                                              Ajusta la cantidad o agrega más
                                              productos.
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <ErrorMessage
                                      message={errors.free_products_ids}
                                    />
                                  </>
                                )}

                                {!loadingProducts && products.length === 0 && (
                                  <p className="mt-2 text-sm text-amber-600">
                                    ⚠️ No hay productos disponibles. Crea
                                    productos primero.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Botones */}
                        <div className="flex justify-between pt-4">
                          <button
                            onClick={handleBack}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                          >
                            Atrás
                          </button>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setIsModalOpen(false)}
                              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleNext}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:brightness-110"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Paso 4 */}
                    {currentStep === 4 && (
                      <>
                        <h3 className="text-lg font-medium mb-1">
                          4. Alcance y límites
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Configura límites y vigencia
                        </p>
                        <div className="space-y-6 mb-8">
                          {/* Selector de tipo de límite */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tipo de límite
                            </label>
                            <Select
                              value={formData.limit_type || undefined}
                              onValueChange={(value) =>
                                updateFormData("limit_type", value)
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-11 rounded-lg border-gray-300 text-sm",
                                  errors.limit_type &&
                                    "border-red-500 focus:ring-red-500"
                                )}
                              >
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="time">
                                  Tiempo limitado
                                </SelectItem>
                                <SelectItem value="quantity">
                                  Cupo limitado
                                </SelectItem>
                                <SelectItem value="sin_limite">
                                  Sin límite
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <ErrorMessage message={errors.limit_type} />
                          </div>

                          {/* Mostrar campos según el tipo seleccionado */}
                          {formData.limit_type === "time" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Válido hasta
                              </label>
                              <input
                                type="date"
                                value={formData.valid_until}
                                onChange={(e) =>
                                  updateFormData("valid_until", e.target.value)
                                }
                                className={cn(
                                  "w-full px-4 py-2 border rounded-lg",
                                  errors.valid_until && "border-red-500"
                                )}
                              />

                              <ErrorMessage message={errors.valid_until} />
                            </div>
                          )}

                          {formData.limit_type === "quantity" && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Límite por usuario
                                </label>
                                <input
                                  type="number"
                                  value={formData.user_limit}
                                  onChange={(e) =>
                                    updateFormData("user_limit", e.target.value)
                                  }
                                  placeholder="1 (opcional)"
                                  className={cn(
                                    "w-full px-4 py-2 border rounded-lg",
                                    errors.user_limit && "border-red-500"
                                  )}
                                />

                                <ErrorMessage message={errors.user_limit} />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Límite total
                                </label>
                                <input
                                  type="number"
                                  value={formData.total_limit}
                                  onChange={(e) =>
                                    updateFormData(
                                      "total_limit",
                                      e.target.value
                                    )
                                  }
                                  placeholder="100 (opcional)"
                                  className={cn(
                                    "w-full px-4 py-2 border rounded-lg",
                                    errors.total_limit && "border-red-500"
                                  )}
                                />
                                <ErrorMessage message={errors.total_limit} />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Botones */}
                        <div className="flex justify-between pt-4">
                          <button
                            onClick={handleBack}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                          >
                            Atrás
                          </button>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setIsModalOpen(false)}
                              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleNext}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:brightness-110"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Paso 5 */}
                    {currentStep === 5 && (
                      <>
                        <h3 className="text-lg font-semibold mb-1 text-gray-800">
                          {isEditmode
                            ? "Detalles de la Recompensa"
                            : "5. Revisión y confirmación"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                          {isEditmode
                            ? "Revisa los detalles y cambia el estado"
                            : "Verifica antes de crear"}
                        </p>

                        <div className="bg-white rounded-xl shadow-md p-6 space-y-6 max-w-md mx-auto">
                          {/* Imagen y nombre */}
                          {formData.name && (
                            <div className="flex flex-col items-center gap-2">
                              <div className="relative w-32 h-32 bg-gray-200 rounded-lg overflow-hidden">
                                {formData.image_preview ? (
                                  <Image
                                    src={formData.image_preview}
                                    alt="Preview"
                                    fill
                                    sizes="128px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    Sin imagen
                                  </div>
                                )}
                              </div>
                              <h4 className="font-semibold text-center text-gray-900">
                                {formData.name}
                              </h4>
                              {formData.description && (
                                <p className="text-center text-sm text-gray-500">
                                  {formData.description}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Toggle de activación - Solo en modo edición */}
                          {isEditmode && (
                            <div className="border-t border-b border-gray-200 py-4">
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-800">
                                    Estado de la recompensa
                                  </label>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formData.is_active
                                      ? "✅ Los clientes pueden usar esta recompensa"
                                      : "⚠️ Esta recompensa está desactivada"}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateFormData(
                                      "is_active",
                                      !formData.is_active
                                    )
                                  }
                                  className={cn(
                                    "relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                    formData.is_active
                                      ? "bg-green-600"
                                      : "bg-gray-300"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform",
                                      formData.is_active
                                        ? "translate-x-8"
                                        : "translate-x-1"
                                    )}
                                  />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Condición */}
                          {formData.condition_type &&
                            CONDITION_LABELS[formData.condition_type] && (
                              <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                                <span className="font-medium text-gray-700">
                                  Condición:
                                </span>
                                <span className="text-gray-600">
                                  {CONDITION_LABELS[formData.condition_type]}
                                </span>
                              </div>
                            )}

                          {formData.condition_type === "specialDates" &&
                            selectedSpecialEvent && (
                              <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                                <span className="font-medium text-gray-700">
                                  Modalidad especial:
                                </span>
                                <span className="text-gray-600 text-right">
                                  {selectedSpecialEvent === "range" &&
                                  formData.special_range_start &&
                                  formData.special_range_end
                                    ? `Del ${formatDateTimeLabel(
                                        formData.special_range_start
                                      )} al ${formatDateTimeLabel(
                                        formData.special_range_end
                                      )}`
                                    : SPECIAL_DATE_LABELS[
                                        selectedSpecialEvent
                                      ] || "Evento personalizado"}
                                </span>
                              </div>
                            )}

                          {/* Valor de condición */}
                          {formData.minimum_amount && (
                            <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                              <span className="font-medium text-gray-700">
                                Monto mínimo:
                              </span>
                              <span className="text-gray-600">
                                $
                                {Number(
                                  formData.minimum_amount
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}

                          {formData.minimum_quantity && (
                            <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                              <span className="font-medium text-gray-700">
                                Cantidad mínima:
                              </span>
                              <span className="text-gray-600">
                                {formData.minimum_quantity}
                              </span>
                            </div>
                          )}

                          {/* Beneficio */}
                          {formData.benefit_type &&
                            BENEFIT_LABELS[formData.benefit_type] && (
                              <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                                <span className="font-medium text-gray-700">
                                  Beneficio:
                                </span>
                                <span className="text-gray-600">
                                  {BENEFIT_LABELS[formData.benefit_type]}
                                </span>
                              </div>
                            )}

                          {/* Valor del beneficio */}
                          {formData.benefit_value &&
                            formData.benefit_type !== "free_product" && (
                              <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                                <span className="font-medium text-gray-700">
                                  Valor:
                                </span>
                                <span className="text-gray-600">
                                  {formData.benefit_type === "percent_discount"
                                    ? `${formData.benefit_value}%`
                                    : `$${Number(
                                        formData.benefit_value
                                      ).toLocaleString()}`}
                                </span>
                              </div>
                            )}

                          {/* Producto gratis */}
                          {formData.benefit_type === "free_product" &&
                            formData.free_products_ids.length > 0 && (
                              <div className="border-t border-b border-gray-200 py-4">
                                <div className="px-4 py-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="font-semibold text-gray-800 flex items-center gap-2">
                                      <Gift className="w-4 h-4 text-green-600" />
                                      Productos Regalo
                                    </span>
                                  </div>

                                  <div className="mb-3 p-2 bg-white rounded-md border border-green-200">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium text-green-700">
                                        El cliente puede elegir{" "}
                                        {formData.free_products_quantity}
                                      </span>{" "}
                                      producto
                                      {formData.free_products_quantity !== "1"
                                        ? "s"
                                        : ""}{" "}
                                      de los siguientes:
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    {formData.free_products_ids.map(
                                      (productId) => {
                                        const product = products.find(
                                          (p) => p.id === productId
                                        );
                                        return product ? (
                                          <div
                                            key={productId}
                                            className="flex items-center gap-3 bg-white p-3 rounded-lg border border-green-200 hover:border-green-300 transition-colors"
                                          >
                                            {product.image_url ? (
                                              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                                <Image
                                                  src={product.image_url}
                                                  alt={product.name}
                                                  fill
                                                  sizes="48px"
                                                  className="object-cover"
                                                />
                                              </div>
                                            ) : (
                                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <Gift className="w-6 h-6 text-gray-400" />
                                              </div>
                                            )}
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-gray-900">
                                                {product.name}
                                              </p>
                                              {product.price && (
                                                <p className="text-xs text-gray-500">
                                                  Valor: $
                                                  {Number(
                                                    product.price
                                                  ).toLocaleString()}
                                                </p>
                                              )}
                                            </div>
                                            <div className="bg-green-100 px-2 py-1 rounded-full">
                                              <span className="text-xs font-medium text-green-700">
                                                Gratis
                                              </span>
                                            </div>
                                          </div>
                                        ) : null;
                                      }
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* En el Paso 5, después de la sección de beneficios y antes de límites */}
                          {formData.product_ids.length > 0 && (
                            <div className="border-t border-b border-gray-200 py-4">
                              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                                <span className="font-medium text-gray-700 block mb-2">
                                  Productos aplicables (
                                  {formData.product_ids.length}):
                                </span>

                                <div className="flex flex-wrap gap-2">
                                  {formData.product_ids.map((productId) => {
                                    const product = products.find(
                                      (p) => p.id === productId
                                    );
                                    return product ? (
                                      <div
                                        key={productId}
                                        className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-300"
                                      >
                                        {product.image_url && (
                                          <Image
                                            src={product.image_url}
                                            alt={product.name}
                                            width={24}
                                            height={24}
                                            className="w-6 h-6 rounded-full object-cover"
                                          />
                                        )}
                                        <span className="text-sm text-gray-700">
                                          {product.name}
                                        </span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Límites */}
                          {formData.user_limit && (
                            <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                              <span className="font-medium text-gray-700">
                                Límite/usuario:
                              </span>
                              <span className="text-gray-600">
                                {formData.user_limit}
                              </span>
                            </div>
                          )}

                          {formData.total_limit && (
                            <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                              <span className="font-medium text-gray-700">
                                Límite total:
                              </span>
                              <span className="text-gray-600">
                                {formData.total_limit}
                              </span>
                            </div>
                          )}

                          {formData.valid_until && (
                            <div className="flex justify-between px-4 py-2 bg-gray-100 rounded-lg">
                              <span className="font-medium text-gray-700">
                                Válido hasta:
                              </span>
                              <span className="text-gray-600">
                                {new Date(
                                  formData.valid_until
                                ).toLocaleDateString("es-CO", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Botones */}
                        <div
                          className={cn(
                            "flex pt-6 max-w-md mx-auto",
                            isEditmode ? "justify-end" : "justify-between"
                          )}
                        >
                          {!isEditmode && (
                            <button
                              onClick={handleBack}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                            >
                              Atrás
                            </button>
                          )}
                          <div className="flex gap-3">
                            <button
                              onClick={resetForm}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSubmit}
                              disabled={isSubmitting}
                              className={cn(
                                "px-6 py-2 text-white rounded-lg hover:brightness-110 disabled:opacity-50",
                                isEditmode ? "bg-blue-600" : "bg-green-600"
                              )}
                            >
                              {isSubmitting
                                ? isEditmode
                                  ? "Actualizando..."
                                  : "Creando..."
                                : isEditmode
                                ? "Actualizar Recompensa"
                                : "Crear Recompensa"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <style>{`
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
    `}</style>
          </div>,

          document.body
        )}

      <ProductSelectorModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          // Opcional: resetear a "condition" al cerrar
          setProductModalMode("condition");
        }}
        products={products}
        selectedProductIds={
          productModalMode === "condition"
            ? formData.product_ids
            : formData.free_products_ids
        }
        onConfirm={(selectedIds) => {
          if (productModalMode === "condition") {
            updateFormData("product_ids", selectedIds);
          }

          if (productModalMode === "benefit") {
            updateFormData("free_products_ids", selectedIds);
          }
        }}
        loading={loadingProducts}
        mode="multiple"
        title={
          productModalMode === "condition"
            ? "Productos Aplicables"
            : "Productos Disponibles para Regalo"
        }
        description={
          productModalMode === "condition"
            ? "Selecciona los productos donde aplica esta recompensa"
            : "Selecciona los productos que el cliente puede elegir como regalo"
        }
      />
    </main>
  );
}
