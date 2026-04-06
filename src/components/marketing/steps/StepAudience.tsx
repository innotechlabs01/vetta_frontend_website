// StepAudience.tsx
// Paso 2: Audiencia (selección única por bloque) + modal con switches de shadcn/ui
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { lastPurchase } from "@/data/wizard";
import { useEnvironment } from "@/context/EnvironmentContext";
import { Switch } from "@/components/ui/switch";

interface AudienceFilters {
  location?: string[];
  categories?: string[];
  zones?: string[];
  lastPurchase?: string;
  categoryPurchase?: string[];
  cart_interaction_days?: string;
  last_purchase_from_iso?: string;
}

interface StepAudienceProps {
  filters: AudienceFilters;
  estimatedAudience: number;
  onUpdate: (filters: AudienceFilters) => void;
}

/* ================= Utils fecha ================= */
function computeDateFromPeriod(period?: string): Date | null {
  if (!period) return null;
  const d = new Date();
  switch (period) {
    case "24hr":
      d.setHours(d.getHours() - 24);
      return d;
    case "1 semana":
      d.setDate(d.getDate() - 7);
      return d;
    case "15 dias":
      d.setDate(d.getDate() - 15);
      return d;
    case "todos":
      return new Date(0);
    default:
      return new Date(0);
  }
}
const isValidDate = (dt: Date | null): dt is Date => !!dt && !isNaN(dt.getTime());

/* ================= Componente ================= */
export const StepAudience: React.FC<StepAudienceProps> = ({
  filters,
  estimatedAudience,
  onUpdate,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(
    filters.location?.[0] ?? null
  );
  const [selectedLastPurchase, setSelectedLastPurchase] = useState<string | null>(
    filters.lastPurchase ?? null
  );
  const [selectedCategoryPurchase, setSelectedCategoryPurchase] = useState<string | null>(
    filters.categoryPurchase?.[0] ?? null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    filters.categories?.[0] ?? null
  );
  const [selectedZone, setSelectedZone] = useState<string | null>(
    filters.zones?.[0] ?? null
  );
  const [selectedCartDays, setSelectedCartDays] = useState<string | null>(
    filters.cart_interaction_days ?? null
  );

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [, setAudienceLoading] = useState(false);

  const [showProductsModal, setShowProductsModal] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number>(estimatedAudience ?? 0);

  const { org } = useEnvironment();
  const supabase = useMemo(() => createClient(), []);

  const lastPurchaseFromISO = useMemo(() => {
    const dt = computeDateFromPeriod(selectedLastPurchase || undefined);
    return isValidDate(dt) ? dt.toISOString() : undefined;
  }, [selectedLastPurchase]);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const filtersForParent = useMemo<AudienceFilters>(() => ({
    location: selectedLocation ? [selectedLocation] : undefined,
    categories: selectedCategory ? [selectedCategory] : undefined,
    zones: selectedZone ? [selectedZone] : undefined,
    lastPurchase: selectedLastPurchase || undefined,
    last_purchase_from_iso: lastPurchaseFromISO || undefined,
    categoryPurchase: selectedCategoryPurchase ? [selectedCategoryPurchase] : undefined,
    cart_interaction_days: selectedCartDays || undefined,
  }), [
    selectedLocation,
    selectedCategory,
    selectedZone,
    selectedLastPurchase,
    selectedCategoryPurchase,
    selectedCartDays,
    lastPurchaseFromISO,
  ]);

  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    const nextStr = JSON.stringify(filtersForParent);
    if (lastSentRef.current !== nextStr) {
      lastSentRef.current = nextStr;
      onUpdateRef.current(filtersForParent);
    }
  }, [filtersForParent]);

  const toggleLocation = (name: string) => setSelectedLocation((p) => (p === name ? null : name));
  const toggleCategory = (name: string) => setSelectedCategory((p) => (p === name ? null : name));
  const toggleZone = (name: string) => setSelectedZone((p) => (p === name ? null : name));
  const toggleCategoryPurchaseSingle = (name: string) =>
    setSelectedCategoryPurchase((p) => (p === name ? null : name));
  const selectCartDays = (value: string) =>
    setSelectedCartDays((p) => (p === value ? null : value));

  /* ================= Loads ================= */
  useEffect(() => {
    if (!org?.id) return;
    let active = true;
    setLocLoading(true);
    setLocError(null);
    (async () => {
      try {
        const [locRes, prodRes, catRes] = await Promise.all([
          supabase
            .from("locations")
            .select("id,name,organization_id")
            .eq("organization_id", org.id)
            .order("name", { ascending: true })
            .limit(100),
          supabase
            .from("products")
            .select("id,name,organization_id")
            .eq("organization_id", org.id)
            .order("name", { ascending: true })
            .limit(200),
          supabase
            .from("product_categories")
            .select("id,name,organization_id")
            .eq("organization_id", org.id)
            .order("name", { ascending: true })
            .limit(200),
        ]);

        const error = locRes.error || prodRes.error || catRes.error;
        if (error) throw error;

        if (!active) return;
        setLocations(locRes.data ?? []);
        setProducts(prodRes.data ?? []);
        setCategories(catRes.data ?? []);
      } catch (e: any) {
        if (active) setLocError(e.message ?? "Error cargando datos");
      } finally {
        if (active) setLocLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [org?.id, supabase]);

  useEffect(() => {
    if (!org?.id || !lastPurchaseFromISO) {
      setAudienceCount(estimatedAudience ?? 0);
      return;
    }
    let active = true;
    (async () => {
      try {
        setAudienceLoading(true);
        setLocError(null);
        const { data, error } = await supabase
          .from("sales")
          .select("customer_id, created_at")
          .eq("organization_id", org.id)
          .gte("created_at", lastPurchaseFromISO)
          .not("customer_id", "is", null);
        if (error) throw error;
        const unique = new Set((data ?? []).map((s: any) => s.customer_id));
        if (active) setAudienceCount(unique.size);
      
      } catch (e: any) {
        if (active) setLocError(e.message ?? "Error cargando audiencia");
      } finally {
        if (active) setAudienceLoading(false);
      }
    })();
    return () => { active = false; };
  }, [org?.id, lastPurchaseFromISO, supabase, estimatedAudience]);

  const visibleProducts = products.slice(0, 15);
  const hasMoreProducts = products.length > 15;

  const basePill =
    "box-border inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-normal whitespace-nowrap border-2 transition-colors";
  const pillUnselected = "bg-[#EAEAEA] text-[#333] border-transparent hover:bg-gray-300";
  const pillSelected = "bg-[#DFEBF9] text-[#053FC8] border-[#1265F7]";
  const badge = "px-1.5 py-0.5 bg-white rounded-2xl inline-flex items-center tabular-nums w-10 justify-center";

  return (
    <>
      <div className="mx-auto w-[90%] md:w-[70%] space-y-3">
        <div className="flex flex-col gap-[21px]">
          {/* BLOQUE 1: Tiempo desde la última compra */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[#666] font-inter text-sm font-normal leading-normal not-italic">
              Tiempo desde la última compra
            </p>
            <div className="flex gap-2.5 flex-wrap">
              {lastPurchase.map((purchase: any) => (
                <button
                  key={`lp-${purchase.id}-${purchase.name}`}
                  onClick={() =>
                    setSelectedLastPurchase((prev) =>
                      prev === purchase.name ? null : purchase.name
                    )
                  }
                  className={`${basePill} ${selectedLastPurchase === purchase.name ? pillSelected : pillUnselected}`}
                >
                  {purchase.name}
                </button>
              ))}
            </div>
          </div>

          {/* BLOQUE 2: Sucursales donde ha comprado */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[#666] font-inter text-sm font-normal leading-normal not-italic">
              Sucursales donde ha comprado
            </p>
            <div className="flex gap-2.5 flex-wrap">
              {locations.map((loc) => (
                <button
                  key={`loc-${loc.id}`}
                  onClick={() => toggleLocation(loc.name)}
                  className={`${basePill} ${selectedLocation === loc.name ? pillSelected : pillUnselected}`}
                >
                  {loc.name}
                  <div className={badge}>
                    <div className="text-zinc-800 text-xs font-normal font-inter">10</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* BLOQUE 3: Productos que ha comprado */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[#666] font-inter text-sm font-normal leading-normal not-italic">
              Productos que ha comprado
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <button
                onClick={() => toggleZone("Todos")}
                className={`${basePill} ${selectedZone === "Todos" ? pillSelected : pillUnselected}`}
              >
                Todos
                <div className={badge}>
                  <div className="text-zinc-800 text-xs font-normal font-inter">
                    {products.length}
                  </div>
                </div>
              </button>

              {visibleProducts.map((zone) => (
                <button
                  key={`prod-${zone.id}`}
                  onClick={() => toggleZone(zone.name)}
                  className={`${basePill} ${selectedZone === zone.name ? pillSelected : pillUnselected}`}
                >
                  {zone.name}
                  <div className={badge}>
                    <div className="text-zinc-800 text-xs font-normal font-inter">10</div>
                  </div>
                </button>
              ))}

              {hasMoreProducts && (
                <button
                  onClick={() => setShowProductsModal(true)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap bg-[#1265F7] text-white hover:bg-blue-700"
                >
                  Ver más ({products.length - 15})
                </button>
              )}
            </div>
          </div>

          {/* BLOQUE 4: Categorías en las que ha comprado */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[#666] font-inter text-sm font-normal leading-normal not-italic">
              Categorías en las que ha comprado
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <button
                onClick={() => toggleCategoryPurchaseSingle("Todos")}
                className={`${basePill} ${selectedCategoryPurchase === "Todos" ? pillSelected : pillUnselected}`}
              >
                Todos
                <div className={badge}>
                  <div className="text-zinc-800 text-xs font-normal font-inter">
                    {categories.length}
                  </div>
                </div>
              </button>

              {categories.map((item) => (
                <button
                  key={`cat-${item.id}`}
                  onClick={() => toggleCategoryPurchaseSingle(item.name)}
                  className={`${basePill} ${selectedCategoryPurchase === item.name ? pillSelected : pillUnselected}`}
                >
                  {item.name}
                  <div className={badge}>
                    <div className="text-zinc-800 text-xs font-normal font-inter">10</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AUDIENCIA ESTIMADA */}
          <div className="flex flex-col justify-center items-start gap-[6px]">
            <p className="text-[#666] font-inter text-[15px] font-normal leading-normal not-italic">
              Audiencia estimada
            </p>
            <p className="text-[#333] font-inter text-[16px] font-normal leading-normal not-italic">
              <span className="text-[20px] font-bold">{audienceCount.toLocaleString()}</span>{" "}
              Clientes
            </p>
          </div>
        </div>
      </div>

      {/* ================= Modal: Todos los productos (con Switch de shadcn/ui) ================= */}
      {showProductsModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowProductsModal(false)}
          />

          {/* Contenedor modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-[90%] max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-[#333]">
                Todos los productos ({products.length})
              </h3>
              <button
                onClick={() => setShowProductsModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Lista con switches de shadcn/ui */}
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y">
                {/* Fila "Todos" */}
                <li className="px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#333] font-medium">Todos</span>
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-2xl tabular-nums">
                        {products.length}
                      </span>
                    </div>
                    <Switch
                      checked={selectedZone === "Todos"}
                      onCheckedChange={() => toggleZone("Todos")}
                      aria-label="Seleccionar todos los productos"
                    />
                  </div>
                </li>

                {/* Filas productos */}
                {products.map((p) => (
                  <li key={`prod-row-${p.id}`} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#333]">{p.name}</span>
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-2xl tabular-nums">
                          10
                        </span>
                      </div>
                      <Switch
                        checked={selectedZone === p.name}
                        onCheckedChange={() => toggleZone(p.name)}
                        aria-label={`Seleccionar ${p.name}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowProductsModal(false)}
                className="px-6 py-2.5 rounded-full bg-[#1265F7] text-white hover:bg-blue-700 transition font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
