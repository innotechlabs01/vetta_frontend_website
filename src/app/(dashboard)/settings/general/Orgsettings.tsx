// app/org/OrgSettingsClient.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Upload, Pencil, Mail, Phone, MapPin,
  Globe, Instagram, Facebook, Twitter, Linkedin, Youtube, Loader2
} from "lucide-react";
import { upsertOrgSettingsAction } from "../../../actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { toast } from "sonner";
import { getPrinterLabel, type PrinterConfig } from "@/utils/printer";
import { usePrinterContext } from "@/context/PrinterContext";

type Org = { id: string; name: string; slug: string | null };

const IMAGE_ACCEPT = "image/*";
const MAX_IMAGE_KB = 500;
const MAX_IMAGE_BYTES = MAX_IMAGE_KB * 1024;
const IMAGE_MIME_PREFIX = "image/";
const IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-icon": "ico",
};
const ALLOWED_IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
  "avif",
  "bmp",
  "tif",
  "tiff",
  "ico",
]);

function getExt(fileName: string) {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : "";
}

function isAllowedImageFile(file: File) {
  if (file.type?.startsWith(IMAGE_MIME_PREFIX)) return true;
  const ext = getExt(file.name);
  return ext ? ALLOWED_IMAGE_EXTS.has(ext) : false;
}

function getImageExt(file: File) {
  return getExt(file.name) || IMAGE_EXT_BY_MIME[file.type] || "img";
}

function getImageValidationError(file: File) {
  if (!isAllowedImageFile(file)) {
    return "Solo se permiten imagenes (jpg, png, webp, etc.).";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Cada imagen debe pesar maximo ${MAX_IMAGE_KB} KB.`;
  }
  return null;
}

async function uploadBrandAsset(opts: {
  supabase: ReturnType<typeof getSupabaseBrowser>;
  orgId: string;
  file: File;
  kind: "logo" | "logo_horizontal" | "banner"; 
}) {
  const { supabase, orgId, file, kind } = opts;
  const validationError = getImageValidationError(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const ext = getImageExt(file);
  const path = `${orgId}/${kind}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("brand-assets")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("brand-assets").getPublicUrl(path);
  return pub?.publicUrl || null;
}

type OrgSettings = {
  organization_id: string;
  // generales
  name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  default_tip_percentage?: number | null;

  // facturación
  legal_name?: string | null; // 👈 NUEVO
  billing_address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    postal_code?: string | null;
  } | null;
  currency?: string | null;
  timezone?: string | null;
  title_init?: string | null;
  title_last?: string | null;
  

  // marca
  brand_banner_url?: string | null;
  brand_logo_url?: string | null;
  brand_logo_landscape_url?: string | null;
  brand_description?: string | null;
  brand_colors?: { primary?: string; secondary?: string; accent?: string } | null;
  social_links?: {
    website?: string; instagram?: string; facebook?: string; tiktok?: string;
    twitter?: string; linkedin?: string; youtube?: string;
  } | null;
  business_category?: string;
};

type AllowedBusinessCategory =
  | "pharmacy"
  | "restaurant"
  | "coffee_shop"
  | "online_store"
  | "currency_exchange"
  | "store"
  | "supermarket"
  | "boutique"
  | "electronics"
  | "hardware"
  | "beauty"
  | "convenience"
  | "fast_food"
  | "bar"
  | "clinic"
  | "gym"
  | "other";

const BUSINESS_CATEGORIES: { value: AllowedBusinessCategory; label: string; icon: string }[] = [
  // Tiendas
  { value: "store", label: "Tienda", icon: "🏪" },
  { value: "supermarket", label: "Supermercado", icon: "🛒" },
  { value: "boutique", label: "Boutique", icon: "👗" },
  { value: "electronics", label: "Electrónicos", icon: "📱" },
  { value: "hardware", label: "Ferretería", icon: "🔧" },
  { value: "beauty", label: "Belleza", icon: "💄" },
  { value: "convenience", label: "Miscelánea", icon: "🗃️" },
  // Alimentación
  { value: "restaurant", label: "Restaurante", icon: "🍽️" },
  { value: "coffee_shop", label: "Cafetería", icon: "☕" },
  { value: "fast_food", label: "Comida Rápida", icon: "🍔" },
  { value: "bar", label: "Bar", icon: "🍺" },
  // Servicios
  { value: "pharmacy", label: "Farmacia", icon: "💊" },
  { value: "clinic", label: "Clínica", icon: "🏥" },
  { value: "gym", label: "Gimnasio", icon: "💪" },
  { value: "online_store", label: "Tienda Online", icon: "🌐" },
  { value: "currency_exchange", label: "Cambio de Divisas", icon: "💱" },
  { value: "other", label: "Otro", icon: "📦" },
];

function GeneralForm({
  orgId,
  current,
  onSaved,
}: {
  orgId: string;
  current: {
    name: string;
    contact_email: string;
    contact_phone: string;
    business_category: AllowedBusinessCategory;
    default_tip_percentage: number;
  };
  onSaved: (v: {
    name: string;
    contact_email: string;
    contact_phone: string;
    business_category: AllowedBusinessCategory;
    default_tip_percentage: number;
  }) => void;
}) {
  const supabase = getSupabaseBrowser();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: current.name,
    contact_email: current.contact_email,
    contact_phone: current.contact_phone,
    business_category: current.business_category,
    default_tip_percentage: current.default_tip_percentage,
  });

  const closeRef = useRef<HTMLButtonElement>(null);

  function isAllowedCategory(v: string): v is AllowedBusinessCategory {
    return !!BUSINESS_CATEGORIES.find(x => x.value === v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name?.trim();
    const email = form.contact_email?.trim() || null;
    const phone = form.contact_phone?.trim() || null;
    const cat = form.business_category;
    const rawTip = Number(form.default_tip_percentage);
    const defaultTip =
      Number.isFinite(rawTip) && rawTip >= 0
        ? Math.min(rawTip, 100)
        : 0;

    if (!name) {
      toast.error("El nombre del negocio es requerido");
      return;
    }
    if (!isAllowedCategory(cat)) {
      toast.error("Selecciona una categoría válida");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("organizations")
        .update({
          name,
          contact_email: email,
          contact_phone: phone,
          business_category: cat,
          default_tip_percentage: defaultTip,
          updated_at: new Date().toISOString()
        })
        .eq("id", orgId);

      if (error) {
        console.error(error);
        toast.error("No se pudieron guardar los cambios.");
        return;
      }

      onSaved({
        name,
          contact_email: email || "",
          contact_phone: phone || "",
          business_category: cat,
          default_tip_percentage: defaultTip,
        });
      toast.success("Datos generales actualizados");
      closeRef.current?.click();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogClose asChild>
        <button ref={closeRef} type="button" className="hidden" aria-hidden="true" />
      </DialogClose>

      <div>
        <Label>Nombre del negocio</Label>
        <Input
          name="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Correo del negocio</Label>
          <Input
            name="contact_email"
            type="email"
            placeholder="ej: contacto@tu-negocio.com"
            value={form.contact_email}
            onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
          />
        </div>
        <div>
          <Label>Teléfono del negocio</Label>
          <Input
            name="contact_phone"
            placeholder="+57 300 000 0000"
            value={form.contact_phone}
            onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
          />
        </div>
      </div>

      {/* 👇 Selector de categoría visual */}
      <div>
        <Label>Categoría del negocio</Label>
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {BUSINESS_CATEGORIES.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, business_category: opt.value }))}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                form.business_category === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Selecciona la categoría principal de tu negocio.
        </p>
      </div>

      <div>
        <Label>Propina sugerida (POS)</Label>
        <div className="mt-2">
          <Input
            name="default_tip_percentage"
            type="number"
            min={0}
            max={100}
            step="1"
            value={form.default_tip_percentage}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                default_tip_percentage: Number(e.target.value),
              }))
            }
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Se usará como porcentaje inicial de propina en el POS. Acepta valores entre 0% y 100%.
        </p>
      </div>

      <div className="pt-2 flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={loading}>
            Cancelar
          </Button>
        </DialogClose>
      </div>
    </form>
  );
}

function BillingForm({
  orgId,
  current,
  onSaved,
}: {
  orgId: string;
  current: {
    legal_name: string;
    billing_address: NonNullable<OrgSettings["billing_address"]>;
    currency: string;
    timezone: string;
  };
  onSaved: (v: {
    legal_name: string;
    billing_address: NonNullable<OrgSettings["billing_address"]>;
    currency: string;
    timezone: string;
  }) => void;
}) {
  const supabase = getSupabaseBrowser();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    legal_name: current.legal_name || "",
    line1: current.billing_address?.line1 || "",
    line2: current.billing_address?.line2 || "",
    city: current.billing_address?.city || "",
    province: current.billing_address?.province || "",
    country: current.billing_address?.country || "Colombia",
    postal_code: current.billing_address?.postal_code || "",
    currency: current.currency || "COP",
    timezone: current.timezone || "America/Bogota",
  });
  const closeRef = useRef<HTMLButtonElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      legal_name: form.legal_name?.trim() || null,
      billing_address: {
        line1: form.line1 ? form.line1?.trim() : null,
        line2: form.line2?.trim() || null,
        city: form.city?.trim() || null,
        province: form.province?.trim() || null,
        country: form.country?.trim() || null,
        postal_code: form.postal_code?.trim() || null,
      },
      currency: form.currency?.trim() || null,
      timezone: form.timezone?.trim() || null,
      updated_at: new Date().toISOString(), // opcional si trigger lo maneja
    };

    try {
      setLoading(true);
      const { error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", orgId);

      if (error) {
        console.error(error);
        toast.error("No se pudieron guardar los cambios de facturación.");
        return;
      }

      onSaved({
        legal_name: payload.legal_name || "",
        billing_address: payload.billing_address,
        currency: payload.currency || "COP",
        timezone: payload.timezone || "America/Bogota",
      });

      toast.success("Datos de facturación actualizados");
      closeRef.current?.click();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogClose asChild>
        <button ref={closeRef} type="button" className="hidden" aria-hidden="true" />
      </DialogClose>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Razón social</Label>
          <Input
            value={form.legal_name}
            onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Dirección</Label>
          <Input
            value={form.line1}
            onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
          />
        </div>
        <div>
          <Label>Apartamento, local, etc.</Label>
          <Input
            value={form.line2}
            onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
          />
        </div>
        <div>
          <Label>Ciudad</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div>
          <Label>Provincia/Depto</Label>
          <Input
            value={form.province}
            onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
          />
        </div>
        <div>
          <Label>País</Label>
          <Input
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
          />
        </div>
        <div>
          <Label>Código postal</Label>
          <Input
            value={form.postal_code}
            onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
          />
        </div>
        <div>
          <Label>Moneda</Label>
          <Input
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
          />
        </div>
        <div>
          <Label>Zona horaria</Label>
          <Input
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          />
        </div>
      </div>

      <div className="pt-2 flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={loading}>Cancelar</Button>
        </DialogClose>
      </div>
    </form>
  );
}

function UploadTile({
  label,
  hint,
  preview,
  onPickFile,
  aspect = "wide",
}: {
  label: string;
  hint?: string;
  preview: string | null;
  onPickFile: (f?: File) => void;
  aspect?: "wide" | "wide-short";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const classes =
    aspect === "wide"
      ? "h-36"
      : "h-24";

  return (
    <div className="space-y-2">
      <Label className="text-gray-500">{label}</Label>
      <div
        className={`relative w-full ${classes} rounded-lg ring-1 ring-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onPickFile(f);
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Image src={preview} width={700} height={200} alt={label} className="w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-sm">Arrastra o haz clic</span>
            {!!hint && <span className="text-[11px] opacity-70 mt-1">{hint}</span>}
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 bg-black/0 hover:bg-black/20 transition flex items-center justify-center text-white text-sm"
          aria-label={`Subir ${label}`}
        >
          {!preview && <span className="px-2 py-1 rounded bg-black/40">Seleccionar archivo</span>}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] || undefined)}
        />
      </div>
    </div>
  );
}

async function extractPaletteFromImage(src: string, maxColors = 6): Promise<string[]> {
  const img = await loadImg(src);
  const { canvas, ctx } = createCanvas(img.naturalWidth, img.naturalHeight);

  // downscale para performance
  const targetW = 160;
  const scale = targetW / img.naturalWidth;
  const w = targetW;
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);

  // binning 5 bits por canal (32 niveles) -> 32^3 = 32768 bins
  const bins = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 16) continue; // ignora casi-transparente

    const r = data[i] >> 3;     // 0-31
    const g = data[i + 1] >> 3; // 0-31
    const b = data[i + 2] >> 3; // 0-31
    const key = (r << 10) | (g << 5) | b;
    bins.set(key, (bins.get(key) || 0) + 1);
  }

  // top bins
  const top = Array.from(bins.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 32);

  // convertir cada bin a color promedio del cubo (centro aproximado)
  const colors = top
    .map(([key]) => {
      const r = ((key >> 10) & 31) << 3;
      const g = ((key >> 5) & 31) << 3;
      const b = (key & 31) << 3;
      return rgbToHex(r | 0x4, g | 0x4, b | 0x4); // empuja un poquito al centro
    })
    .filter(uniqueHex)
    .slice(0, maxColors);

  // ordenar por saturación (más “marca” arriba)
  const sorted = colors.sort((a, b) => hslSat(b) - hslSat(a));
  return sorted;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function createCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx };
}

function rgbToHex(r: number, g: number, b: number) {
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function uniqueHex(x: string, i: number, arr: string[]) {
  return arr.indexOf(x) === i;
}

function hslSat(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  return s;
}

const SOCIAL_DEFS = [
  { key: "website", label: "Sitio web", icon: <Globe className="w-4 h-4" /> },
  { key: "instagram", label: "Instagram", icon: <Instagram className="w-4 h-4" /> },
  { key: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4" /> },
  { key: "tiktok", label: "TikTok", icon: <Youtube className="w-4 h-4 rotate-90 opacity-60" /> }, // placeholder de icon
  { key: "twitter", label: "Twitter / X", icon: <Twitter className="w-4 h-4" /> },
  { key: "linkedin", label: "LinkedIn", icon: <Linkedin className="w-4 h-4" /> },
  { key: "youtube", label: "YouTube", icon: <Youtube className="w-4 h-4" /> },
] as const;

function isValidSocialUrl(url: string): boolean {
  if (!url) return true; // campo vacío = permitido
  try {
    const u = new URL(url);
    // sólo permitir http(s)
    if (!/^https?:$/.test(u.protocol)) return false;
    // no permitir IPs (v4 o v6)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) return false;
    if (/^\[?[0-9a-fA-F:]+\]?$/.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function BrandResourcesForm({ orgId, state, onPatched }: any) {
  const supabase = getSupabaseBrowser();
  const [saving, setSaving] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  // previews locales
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [logoHFile, setLogoHFile] = useState<File | null>(null);
  const [logoHPreview, setLogoHPreview] = useState<string | null>(null);

  // formulario
  const [desc, setDesc] = useState(state.brand_description || "");
  const [colors, setColors] = useState({
    primary: state.brand_colors?.primary || "#0ea5e9",
    secondary: state.brand_colors?.secondary || "#6366f1",
    accent: state.brand_colors?.accent || "#22c55e",
  });
  const [socials, setSocials] = useState({
    website: state.social_links?.website || "",
    instagram: state.social_links?.instagram || "",
    facebook: state.social_links?.facebook || "",
    tiktok: state.social_links?.tiktok || "",
    twitter: state.social_links?.twitter || "",
    linkedin: state.social_links?.linkedin || "",
    youtube: state.social_links?.youtube || "",
  });

  function onPickBanner(f?: File) {
    if (!f) return;
    const validationError = getImageValidationError(f);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setBannerFile(f);
    setBannerPreview(URL.createObjectURL(f));
  }

  async function autoExtractFrom(src: string) {
    try {
      const palette = await extractPaletteFromImage(src);
      const [c1, c2, c3] = palette.slice(0, 3);
      setColors((prev) => ({
        primary: c1 || prev.primary,
        secondary: c2 || prev.secondary,
        accent: c3 || prev.accent,
      }));
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron extraer colores del logo");
    }
  }

  function onPickLogoH(f?: File) {
    if (!f) return;
    const validationError = getImageValidationError(f);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const url = URL.createObjectURL(f);
    setLogoHFile(f);
    setLogoHPreview(url);
    autoExtractFrom(url);
  }

  // 👇 si hay logo horizontal de DB y aún no hay preview local, extrae al abrir
  // (no bloqueante; solo primera vez)
  const didInitRef = useRef(false);
  if (!didInitRef.current && state.brand_logo_landscape_url && !logoHPreview) {
    didInitRef.current = true;
    autoExtractFrom(state.brand_logo_landscape_url);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    for (const [key, val] of Object.entries(socials)) {
      if (!isValidSocialUrl(val)) {
        toast.error(`El link de ${key} no es válido. Debe empezar por http(s) y no ser una IP.`);
        return;
      }
    }

    try {
      setSaving(true);

      let bannerUrl = state.brand_banner_url || "";
      if (bannerFile) {
        const u = await uploadBrandAsset({ supabase, orgId, file: bannerFile, kind: "banner" });
        if (!u) throw new Error("Banner upload sin URL");
        bannerUrl = u;
      }

      let logoLandscapeUrl = state.brand_logo_landscape_url || "";
      if (logoHFile) {
        const u = await uploadBrandAsset({ supabase, orgId, file: logoHFile, kind: "logo_horizontal" });
        if (!u) throw new Error("Logo horizontal upload sin URL");
        logoLandscapeUrl = u;
      }

      const payload = {
        brand_banner_url: bannerUrl || null,
        brand_logo_landscape_url: logoLandscapeUrl || null,  
        brand_description: desc || null,
        brand_colors: colors,
        social_links: socials,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("organizations").update(payload).eq("id", orgId);
      if (error) throw error;

      onPatched({
        brand_banner_url: payload.brand_banner_url || "",
        brand_logo_landscape_url: payload.brand_logo_landscape_url || "",
        brand_description: payload.brand_description || "",
        brand_colors: payload.brand_colors,
        social_links: payload.social_links,
      });

      toast.success("Recursos de marca actualizados");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
      closeRef.current?.click();
      closeRef.current?.click();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <UploadTile
          label="Banner"
          hint="1920x480 recomendado - JPG/PNG/WEBP, maximo 500 KB"
          preview={bannerPreview || state.brand_banner_url || null}
          onPickFile={onPickBanner}
          aspect="wide"
        />

        {/* 👇 usa la nueva propiedad para el horizontal */}
        <UploadTile
          label="Logo horizontal"
          hint="PNG/WEBP con transparencia, maximo 500 KB"
          preview={logoHPreview || state.brand_logo_landscape_url || null}
          onPickFile={onPickLogoH}
          aspect="wide-short"
        />
      </div>

      <div>
        <Label>Descripción corta</Label>
        <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      {/* Colores: inputs + pickers bi-direccionales, cuadrados, sin borde */}
      <div className="grid sm:grid-cols-3 gap-4">
        <SmartColorInput
          label="Color primario"
          value={colors.primary}
          onChange={(v) => setColors((c) => ({ ...c, primary: v }))}
        />
        <SmartColorInput
          label="Color secundario"
          value={colors.secondary}
          onChange={(v) => setColors((c) => ({ ...c, secondary: v }))}
        />
        <SmartColorInput
          label="Color acento"
          value={colors.accent}
          onChange={(v) => setColors((c) => ({ ...c, accent: v }))}
        />
      </div>

      {/* Redes (igual) */}
      <div className="grid sm:grid-cols-2 gap-3">
        {SOCIAL_DEFS.map(({ key, label }) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              value={(socials as any)[key] || ""}
              onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))}
              placeholder={key === "website" ? "https://..." : `https://.../${key}`}
              className={!isValidSocialUrl((socials as any)[key]) ? "border-red-500" : ""}
            />
          </div>
        ))}
      </div>

      <div className="pt-2 flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        <DialogClose asChild>
          <Button ref={closeRef} type="button" variant="outline" >Cancelar</Button>
        </DialogClose>
      </div>
    </form>
  );
}

function SmartColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const sanitized = (v: string) => {
    let x = v.trim();
    if (!x.startsWith("#")) x = `#${x}`;
    if (/^#([0-9a-fA-F]{3}){1,2}$/.test(x)) return x.toLowerCase();
    return value; // ignora inválidos
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(sanitized(e.target.value))}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-none outline-none border-0 p-0 cursor-pointer appearance-none"
          style={{
            WebkitAppearance: "none",
            padding: 0,
          }}
        />
      </div>
    </div>
  );
}

export default function OrgSettingsClient({
  org,
  initialSettings,
}: {
  org: Org;
  initialSettings: OrgSettings | null;
}) {

  const [state, setState] = useState<OrgSettings>(() => ({
    organization_id: org.id,
    name: initialSettings?.name ?? org.name,
    contact_email: initialSettings?.contact_email ?? "",
    contact_phone: initialSettings?.contact_phone ?? "",
    default_tip_percentage: initialSettings?.default_tip_percentage ?? 10,
    legal_name: initialSettings?.legal_name ?? "", 
    billing_address: initialSettings?.billing_address ?? {},
    currency: initialSettings?.currency ?? "COP",
    timezone: initialSettings?.timezone ?? "America/Bogota",
    title_init: initialSettings?.title_init ?? "",
    title_last: initialSettings?.title_last ?? "",
    brand_banner_url: initialSettings?.brand_banner_url ?? "",
    brand_logo_url: initialSettings?.brand_logo_url ?? "",
    brand_logo_landscape_url: initialSettings?.brand_logo_landscape_url ?? "",
    brand_description: initialSettings?.brand_description ?? "",
    brand_colors: {
      primary: initialSettings?.brand_colors?.primary ?? "#0ea5e9",
      secondary: initialSettings?.brand_colors?.secondary ?? "#6366f1",
      accent: initialSettings?.brand_colors?.accent ?? "#22c55e",
    },
    social_links: {
      website: initialSettings?.social_links?.website ?? "",
      instagram: initialSettings?.social_links?.instagram ?? "",
      facebook: initialSettings?.social_links?.facebook ?? "",
      tiktok: initialSettings?.social_links?.tiktok ?? "",
      twitter: initialSettings?.social_links?.twitter ?? "",
      linkedin: initialSettings?.social_links?.linkedin ?? "",
      youtube: initialSettings?.social_links?.youtube ?? "",
    },
    business_category: (initialSettings?.business_category as AllowedBusinessCategory | undefined) ?? "other",
  }));

  const initials = useMemo(() => getInitials(state.name || org.name), [state.name, org.name]);

  // dentro del header, al lado del avatar cuadrado
  const supabase = getSupabaseBrowser();

  async function handleHeaderUpload(kind: "logo" | "banner", file: File) {
    const validationError = getImageValidationError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      const url = await uploadBrandAsset({ supabase, orgId: org.id, file, kind });
      if (!url) throw new Error("No URL");

      // persistimos en organizations
      const patch = kind === "logo" ? { brand_logo_url: url } : { brand_banner_url: url };
      const { error } = await supabase
        .from("organizations")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", org.id);

      if (error) throw error;

      // optimistic UI
      setState((s) => ({
        ...s,
        brand_logo_url: kind === "logo" ? url : s.brand_logo_url,
        brand_banner_url: kind === "banner" ? url : s.brand_banner_url,
      }));

      toast.success(kind === "logo" ? "Logo actualizado" : "Banner actualizado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo subir el archivo");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full py-8">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-4">
          {/* Avatar cuadrado */}
          <div className="relative w-24 h-24 rounded-xl bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center overflow-hidden">

            {state.brand_logo_url ? (
              <Image src={state.brand_logo_url} width={100} height={100} alt={org.name} className="object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500">
                <Building2 className="w-8 h-8 mb-1" />
              </div>
            )}

            {/* Overlay para cambiar logo */}
            <label className="absolute opacity-0 hover:opacity-100 inset-0 h-full flex items-center justify-center bg-black/40 cursor-pointer">
              <span className="text-white text-xs px-2 py-1 rounded bg-black/60">
                Cambiar logo (JPG/PNG/WEBP, maximo 500 KB)
              </span>
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleHeaderUpload("logo", f);
                }}
              />
            </label>
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{state.name || org.name}</h1>
            <p className="text-gray-500 text-sm">Configuración de negocio</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-12 space-y-4">
        {/* ===== Tarjeta 1: Datos generales ===== */}
        <HoverEditableCard title="Datos generales">
          <div className="space-y-3">
            <div className="grid sm:grid-cols-3 gap-3 items-center">
              <span className="text-gray-500">Nombre</span>
              <span className="sm:col-span-2 font-medium">{state.name || "..."}</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 items-center">
              <span className="text-gray-500">Categoría</span>
              <span className="sm:col-span-2">
                {BUSINESS_CATEGORIES.find(x => x.value === state.business_category)?.label || "Other"}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 items-center">
              <span className="text-gray-500">Propina sugerida</span>
              <span className="sm:col-span-2">
                {typeof state.default_tip_percentage === "number"
                  ? `${state.default_tip_percentage}%`
                  : "..."}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 items-center">
              <span className="text-gray-500 flex items-center gap-2">Correo</span>
              <span className="sm:col-span-2">{state.contact_email || "..."}</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 items-center">
              <span className="text-gray-500 flex items-center gap-2">Teléfono</span>
              <span className="sm:col-span-2">{state.contact_phone || "..."}</span>
            </div>
          </div>

          {/* Dialog edición: Generales (FRONT + RLS sobre public.organizations) */}
          <EditSectionDialog title="Editar datos generales" triggerClass="absolute top-3 right-3">
            <GeneralForm
              orgId={org.id}
              current={{
                name: state.name || "",
                contact_email: state.contact_email || "",
                contact_phone: state.contact_phone || "",
                default_tip_percentage: typeof state.default_tip_percentage === "number"
                  ? state.default_tip_percentage
                  : 0,
                business_category: state.business_category as AllowedBusinessCategory,
              }}
              onSaved={(next) => {
                setState((s) => ({
                  ...s,
                  name: next.name,
                  contact_email: next.contact_email,
                  contact_phone: next.contact_phone,
                  business_category: next.business_category,
                  default_tip_percentage: next.default_tip_percentage,
                }));
              }}
            />
          </EditSectionDialog>

        </HoverEditableCard>

        {/* ===== Tarjeta 2: Datos de facturación ===== */}
        <HoverEditableCard title="Datos de facturación">
          <div className="space-y-3">
            <Row label="Razón social">{state.legal_name || "..."}</Row>
            <Row label="Dirección" >
              {compactAddress(state.billing_address) || "..."}
            </Row>
            <Row label="Moneda">{state.currency || "..."}</Row>
            <Row label="Zona horaria">{state.timezone || "..."}</Row>
          </div>

          <EditSectionDialog title="Editar datos de facturación" triggerClass="absolute top-3 right-3">
            <BillingForm
              orgId={org.id}
              current={{
                legal_name: state.legal_name || "",
                billing_address: state.billing_address || {},
                currency: state.currency || "COP",
                timezone: state.timezone || "America/Bogota",
              }}
              onSaved={(next) => {
                setState((s) => ({
                  ...s,
                  legal_name: next.legal_name,
                  billing_address: next.billing_address,
                  currency: next.currency,
                  timezone: next.timezone,
                }));
              }}
            />
          </EditSectionDialog>

        </HoverEditableCard>

        <HoverEditableCard title="Impresora POS">
          <PrinterSelectorSection />
        </HoverEditableCard>
      </main>
    </div>
  );
}

function PrinterSelectorSection() {
  const {
    printers,
    loading,
    error,
    hasBridge,
    refresh,
    selectPrinter,
    selected,
  } = usePrinterContext();

  const handleSelect = useCallback(
    (printer: PrinterConfig) => {
      void (async () => {
        try {
          await selectPrinter(printer);
          toast.success(`Impresora seleccionada: ${getPrinterLabel(printer)}`);
        } catch (err) {
          console.error("[settings] No se pudo sincronizar la impresora seleccionada:", err);
          toast.error("No se pudo sincronizar la impresora con el backend.");
        }
      })();
    },
    [selectPrinter],
  );

  const selectedKey = selected?.name ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Selecciona la impresora que utilizará la aplicación POS en este equipo.
        </p>
        {hasBridge ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh();
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              "Actualizar"
            )}
          </Button>
        ) : null}
      </div>

      {!hasBridge ? (
        <p className="text-sm text-gray-500">
          Esta configuración está disponible cuando ejecutas la app de escritorio.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Buscando impresoras...
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : printers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {printers.map((printer) => {
            const isActive = selectedKey === printer.name;
            const classes = isActive
              ? "border-blue-600 bg-blue-100 text-blue-700"
              : "border-gray-300 bg-gray-100 text-gray-600 hover:border-blue-400 hover:text-blue-600";
            const details = [
              printer.portName ?? null,
              printer.mode ? String(printer.mode).toUpperCase() : null,
              printer.driverName ?? null,
            ]
              .filter(Boolean)
              .join(" • ");

            return (
              <button
                key={printer.name}
                type="button"
                onClick={() => handleSelect(printer)}
                className={`max-w-xs truncate rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${classes}`}
              >
                <span className="block truncate font-medium">{getPrinterLabel(printer)}</span>
                {details ? (
                  <span className="block truncate text-xs text-gray-500">{details}</span>
                ) : null}
                {printer.isDefault ? (
                  <span className="mt-1 inline-block text-xs font-medium text-gray-500">
                    predeterminada
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No se encontraron impresoras disponibles.</p>
      )}

      {selected ? (
        <p className="text-xs text-gray-500">
          Selección actual:{" "}
          <span className="font-medium text-gray-700">{getPrinterLabel(selected)}</span>
        </p>
      ) : hasBridge ? (
        <p className="text-xs text-gray-500">Selecciona una impresora para habilitar la impresión.</p>
      ) : null}
    </div>
  );
}

/* ---------- UI helpers ---------- */

function HoverEditableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="group relative shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base mb-2">{title}</CardTitle>
        {/* Botón lápiz (se muestra al hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition absolute top-3 right-3">
          {/* El DialogTrigger vive dentro de cada sección (EditSectionDialog) */}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Row({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <span className="text-gray-500 flex items-center gap-2">
        {icon} {label}
      </span>
      <span className="sm:col-span-2">{children}</span>
    </div>
  );
}

function SocialLine({ icon, value, label }: { icon: React.ReactNode; value?: string | null; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 flex items-center gap-2">{icon} {label}:</span>
      {value ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate">
          {value}
        </a>
      ) : (
        <span className="text-gray-600">...</span>
      )}
    </div>
  );
}

function ColorDot({ hex, label }: { hex?: string; label: string }) {
  const val = hex || "#e5e7eb";
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-5 h-5 rounded ring-1 ring-gray-200" style={{ background: val }} />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

function ColorInput({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input name={name} defaultValue={defaultValue} />
        <input type="color" defaultValue={defaultValue} className="w-10 h-10 rounded-md cursor-pointer" />
      </div>
    </div>
  );
}

function EditSectionDialog({
  title,
  children,
  triggerClass,
  type
}: {
  title: string;
  children: React.ReactNode;
  triggerClass?: string;
  type?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={`opacity-0 group-hover:opacity-100 transition ${triggerClass || ""}`} aria-label="Editar sección">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className={`${type == 'brand' ? 'max-w-5xl' : 'w-full'} gap-0`}>
        <DialogHeader className="px-4 py-5">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-1 w-full px-6 pb-6 m-auto">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function compactAddress(addr?: OrgSettings["billing_address"]) {
  if (!addr) return "";
  const parts = [addr.line1, addr.line2, addr.city, addr.province, addr.country, addr.postal_code]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join(" • ");
}
