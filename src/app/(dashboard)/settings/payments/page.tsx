"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEnvironment } from "@/context/EnvironmentContext";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { toast } from "sonner";

// Sencillo componente para pintar un logo con fallback textual
function BrandLogo({
  src,
  alt,
  width = 30,
  height = 18,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  return (
    <div className="flex items-center justify-center rounded-xl bg-white ring-1 ring-gray-200 p-2 w-16 h-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="max-w-full max-h-full object-contain truncate"
        onError={(e) => {
          // Fallback textual si la imagen no carga
          (e.currentTarget as HTMLImageElement).style.display = "none";
          const parent = (e.currentTarget as HTMLImageElement).parentElement;
          if (parent) {
            parent.innerHTML = `<span style="font-size:12px;color:#6b7280">${alt}</span>`;
          }
        }}
      />
    </div>
  );
}

export default function PagosPage() {
  const { org } = useEnvironment();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const businessCategory = (org?.business_category ?? "").toLowerCase();
  const isExchangeBusiness =
    businessCategory === "currency_exchange" || businessCategory === "exchange";
  const [fxDailyLimit, setFxDailyLimit] = useState("1000");
  const [fxLimitLoading, setFxLimitLoading] = useState(false);
  const [fxLimitSaving, setFxLimitSaving] = useState(false);

  useEffect(() => {
    if (!org?.id || !isExchangeBusiness) return;
    let cancelled = false;

    const load = async () => {
      setFxLimitLoading(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("fx_daily_limit_per_customer_usd")
          .eq("id", org.id)
          .single();
        if (error) throw error;
        if (cancelled) return;
        const raw = data?.fx_daily_limit_per_customer_usd;
        setFxDailyLimit(raw != null ? String(raw) : "1000");
      } catch (error) {
        console.error("No se pudo cargar límite diario FX", error);
      } finally {
        if (!cancelled) {
          setFxLimitLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [org?.id, isExchangeBusiness, supabase]);

  const saveFxLimit = async () => {
    if (!org?.id) return;
    const parsed = Number(fxDailyLimit);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("El límite diario debe ser un número válido mayor o igual a 0.");
      return;
    }

    setFxLimitSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          fx_daily_limit_per_customer_usd: parsed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", org.id);
      if (error) throw error;
      toast.success("Límite diario por cliente actualizado.");
    } catch (error) {
      console.error("No se pudo guardar límite diario FX", error);
      toast.error("No se pudo guardar el límite diario.");
    } finally {
      setFxLimitSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full">
        <div className="max-w-3xl mx-auto px-4 py-6 items-center  gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Pagos</h1>
<p className="text-sm mt-1">
            Estos son los proveedores de pago habilitados por <strong>Vetta</strong> para aceptar
            tarjetas débito y crédito, transferencias y pagos en línea en Colombia.
          </p>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-4 py-0 space-y-6">
        
        {/* Tarjeta de métodos y tarifa */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-base">
              {/* <Image src="/logo.svg" alt="Vetta" width={120} height={100} className="rounded" /> */}
              <span className="text-gray-400 text-md">Payments</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logos grid */}
            <div className="flex gap-4">
              <BrandLogo
                src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/mastercard.svg"
                alt="Mastercard"
              />
              <BrandLogo
                src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/visa.svg"
                alt="Visa"
              />
              <BrandLogo
                src=''
                alt="Bancol.."
              />
              <BrandLogo
                src=''
                alt="Nequi"
              />
              <BrandLogo
                src=''
                alt="PSE"
              />
              <BrandLogo
                src=""
                alt="Tarjetas"
              />
            </div>

            {/* Tarifa */}
            <div className="rounded-xl bg-gray-100 p-4 w-full">
              <p className="text-sm text-gray-600">Tarifa</p>
              <p className="text-xl font-semibold">3% + $900 COP <span className="text-xs text-gray-500 text-ligth">/ por transacción</span></p>
            </div>
          </CardContent>
        </Card>

        {/* CTA WhatsApp */}
        <p className="text-sm text-gray-600">
          ¿Quieres habilitar un proveedor de pago propio?
          {" "}
          <Link
            href="https://wa.me/573172723452?text=Hola%20Vetta%2C%20quiero%20habilitar%20mi%20proveedor%20de%20pagos"
            target="_blank"
            className="text-primary underline hover:opacity-80"
          >
            Contactanos
          </Link>
        </p>

        {isExchangeBusiness ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Currency Exchange Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Límite diario por cliente para transacciones de cambio de divisas.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Daily limit per customer (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={fxDailyLimit}
                    onChange={(event) => setFxDailyLimit(event.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="1000"
                    disabled={fxLimitLoading || fxLimitSaving}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={saveFxLimit}
                    disabled={fxLimitLoading || fxLimitSaving}
                  >
                    {fxLimitSaving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
