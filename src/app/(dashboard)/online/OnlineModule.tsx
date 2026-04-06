"use client";

import { useState, useEffect, useRef } from "react";
import { Globe, Upload, Pencil, Instagram, Facebook, Twitter, Linkedin, Youtube } from "lucide-react";
import { useSlugValidation } from "@/hooks/uselocations";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { toast } from "sonner";
import Image from "next/image";
import {
  Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import OnlineRightColumn from "./OnlineRightColumn";

const THEME_OPTIONS = [
  { key: "default", name: "Default", desc: "Versátil para retail y servicios" },
  { key: "restaurant", name: "Restaurantes", desc: "Menú, combos, horarios" },
  { key: "pharmacy", name: "Farmacias", desc: "Medicamentos y categorías" },
] as const;

const CATEGORIES = [
  "Restaurante",
  "Farmacia",
  "Tienda de Ropa",
  "Tecnología",
  "Servicios",
  "Otro",
];

const SOCIAL_DEFS = [
  { key: "website", label: "Sitio web", icon: <Globe className="w-4 h-4" /> },
  { key: "instagram", label: "Instagram", icon: <Instagram className="w-4 h-4" /> },
  { key: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4" /> },
  { key: "tiktok", label: "TikTok", icon: <Youtube className="w-4 h-4 rotate-90 opacity-60" /> },
  { key: "twitter", label: "Twitter / X", icon: <Twitter className="w-4 h-4" /> },
  { key: "linkedin", label: "LinkedIn", icon: <Linkedin className="w-4 h-4" /> },
  { key: "youtube", label: "YouTube", icon: <Youtube className="w-4 h-4" /> },
] as const;

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

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function isValidSlug(s: string) {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s);
}

function SocialLine({ icon, value, label }: { icon: React.ReactNode; value?: string | null; label: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-gray-500 flex items-center gap-2 flex-shrink-0">{icon} {label}:</span>
      {value ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate min-w-0">
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

function BrandResourcesFormOnline({ org, state, onPatched, onClose }: {
  org: { id: string; name: string; slug: string | null };
  state: any;
  onPatched: (updated: any) => void;
  onClose: () => void;
}) {
  const supabase = getSupabaseBrowser();
  const [saving, setSaving] = useState(false);
  
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoHFile, setLogoHFile] = useState<File | null>(null);
  const [logoHPreview, setLogoHPreview] = useState<string | null>(null);

  const [desc, setDesc] = useState(state.description || "");
  const [colors, setColors] = useState({
    primary: state.colors?.primary || "#0ea5e9",
    secondary: state.colors?.secondary || "#6366f1",
    accent: state.colors?.accent || "#22c55e",
  });
  const [socials, setSocials] = useState({
    website: state.socials?.website || "",
    instagram: state.socials?.instagram || "",
    facebook: state.socials?.facebook || "",
    tiktok: state.socials?.tiktok || "",
    twitter: state.socials?.twitter || "",
    linkedin: state.socials?.linkedin || "",
    youtube: state.socials?.youtube || "",
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

  const didInitRef = useRef(false);
  if (!didInitRef.current && state.logoLandscapeUrl && !logoHPreview) {
    didInitRef.current = true;
    autoExtractFrom(state.logoLandscapeUrl);
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

      let bannerUrl = state.bannerUrl || "";
      if (bannerFile) {
        const u = await uploadBrandAsset({ 
          supabase, 
          orgId: org.id,
          file: bannerFile, 
          kind: "banner" 
        });
        if (!u) throw new Error("Banner upload sin URL");
        bannerUrl = u;
      }

      let logoLandscapeUrl = state.logoLandscapeUrl || "";
      if (logoHFile) {
        const u = await uploadBrandAsset({ 
          supabase, 
          orgId: org.id, 
          file: logoHFile, 
          kind: "logo_horizontal" 
        });
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

      const { error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", org.id);

      if (error) throw error;

      const updatedState = {
        bannerUrl,
        logoLandscapeUrl,
        description: desc,
        colors,
        socials,
      };

      onPatched(updatedState);
      toast.success("Recursos de marca actualizados");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <UploadTile
          label="Banner"
          hint="1920x480 recomendado - JPG/PNG/WEBP, maximo 500 KB"
          preview={bannerPreview || state.bannerUrl || null}
          onPickFile={onPickBanner}
          aspect="wide"
        />

        <UploadTile
          label="Logo horizontal"
          hint="PNG/WEBP con transparencia, maximo 500 KB"
          preview={logoHPreview || state.logoLandscapeUrl || null}
          onPickFile={onPickLogoH}
          aspect="wide-short"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Descripción corta</label>
        <textarea 
          rows={3} 
          value={desc} 
          onChange={(e) => setDesc(e.target.value)}
          className="w-full mt-1 rounded-xl border px-3 py-2 text-sm bg-gray-50"
        />
      </div>

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

      <div className="grid sm:grid-cols-2 gap-3">
        {SOCIAL_DEFS.map(({ key, label }) => (
          <div key={key}>
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <input
              type="text"
              value={(socials as any)[key] || ""}
              onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))}
              placeholder={key === "website" ? "https://..." : `https://.../${key}`}
              className={`w-full mt-1 rounded-xl border px-3 py-2 text-sm bg-gray-50 ${!isValidSocialUrl((socials as any)[key]) ? "border-red-500" : ""}`}
            />
          </div>
        ))}
      </div>

      <div className="pt-2 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={saving}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:brightness-110"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function BrandDialog({ isOpen, onClose, children }: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode; 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Editar recursos de marca</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function isValidSocialUrl(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) return false;
    if (/^\[?[0-9a-fA-F:]+\]?$/.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
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
  const classes = aspect === "wide" ? "h-36" : "h-24";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
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
    return value;
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(sanitized(e.target.value))}
          className="flex-1 rounded-xl border px-3 py-2 text-sm bg-gray-50"
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border cursor-pointer"
        />
      </div>
    </div>
  );
}

async function extractPaletteFromImage(src: string, maxColors = 6): Promise<string[]> {
  const img = await loadImg(src);
  const { canvas, ctx } = createCanvas(img.naturalWidth, img.naturalHeight);

  const targetW = 160;
  const scale = targetW / img.naturalWidth;
  const w = targetW;
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);

  const bins = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 16) continue;

    const r = data[i] >> 3;
    const g = data[i + 1] >> 3;
    const b = data[i + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;
    bins.set(key, (bins.get(key) || 0) + 1);
  }

  const top = Array.from(bins.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 32);

  const colors = top
    .map(([key]) => {
      const r = ((key >> 10) & 31) << 3;
      const g = ((key >> 5) & 31) << 3;
      const b = (key & 31) << 3;
      return rgbToHex(r | 0x4, g | 0x4, b | 0x4);
    })
    .filter(uniqueHex)
    .slice(0, maxColors);

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
        <Button variant="ghost" size="icon" className={`${triggerClass || ""}`} aria-label="Editar sección">
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

function SiteDataForm({
  orgId,
  current,
  onSaved,
}: {
  orgId: string;
  current: { title_init: string; title_last: string };
  onSaved: (v: { title_init: string; title_last: string }) => void;
}) {
  const supabase = getSupabaseBrowser();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    title_init: current.title_init,
    title_last: current.title_last,
  });
  
  const closeRef = useRef<HTMLButtonElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const titleInit = form.title_init?.trim() || null;
    const titleLast = form.title_last?.trim() || null;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("organizations")
        .update({
          title_init: titleInit,
          title_last: titleLast,
          updated_at: new Date().toISOString()
        })
        .eq("id", orgId);

      if (error) {
        console.error(error);
        toast.error("No se pudieron guardar los cambios.");
        return;
      }

      onSaved({
        title_init: titleInit || "",
        title_last: titleLast || "",
      });
      toast.success("Datos del sitio actualizados");
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
        <Label>Texto principal (Header title)</Label>
        <Input
          name="title_init"
          placeholder="ej: GreenStore"
          value={form.title_init}
          onChange={(e) => setForm((f) => ({ ...f, title_init: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Aparece como título principal en tu sitio web.
        </p>
      </div>

      <div>
        <Label>Texto secundario</Label>
        <Input
          name="title_last"
          placeholder="ej: Tu empresa equipada con lo mejor en tech"
          value={form.title_last}
          onChange={(e) => setForm((f) => ({ ...f, title_last: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Descripción o slogan que aparece debajo del título principal.
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

export default function OnlineModule({
  org,
  initialBrandData
}: {
  org: { id: string; name: string; slug: string | null };
  initialBrandData?: {
    brand_banner_url?: string | null;
    brand_logo_landscape_url?: string | null;
    brand_description?: string | null;
    brand_colors?: { primary?: string; secondary?: string; accent?: string } | null;
    social_links?: {
      website?: string; instagram?: string; facebook?: string; tiktok?: string;
      twitter?: string; linkedin?: string; youtube?: string;
    } | null;
    title_init?: string | null;
    title_last?: string | null;
  } | null;
}) {
  const [theme, setTheme] = useState<(typeof THEME_OPTIONS)[number]["key"]>("default");
  const [slug, setSlug] = useState(org.slug || "")
  const [isUpdating, setIsUpdating] = useState(false);
  const [category, setCategory] = useState("Restaurante");
  const [enableSubscriptions, setEnableSubscriptions] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const {isChecking, isAvailable} = useSlugValidation(slug, org.id, org.slug);
  const [siteData, setSiteData] = useState({
    title_init: initialBrandData?.title_init || "",
    title_last: initialBrandData?.title_last || "",
  });
  const [brandResources, setBrandResources] = useState({
    bannerUrl: initialBrandData?.brand_banner_url || "",
    logoLandscapeUrl: initialBrandData?.brand_logo_landscape_url || "",
    description: initialBrandData?.brand_description || "",
    colors: {
      primary: initialBrandData?.brand_colors?.primary || "#2563EB",
      secondary: initialBrandData?.brand_colors?.secondary || "#6366f1", 
      accent: initialBrandData?.brand_colors?.accent || "#22c55e",
    },
    socials: {
      website: initialBrandData?.social_links?.website || "",
      instagram: initialBrandData?.social_links?.instagram || "",
      facebook: initialBrandData?.social_links?.facebook || "",
      twitter: initialBrandData?.social_links?.twitter || "",
      linkedin: initialBrandData?.social_links?.linkedin || "",
      youtube: initialBrandData?.social_links?.youtube || "",
    },
  });

  const [colors, setColors] = useState({
    primary: "#2563EB", 
    accent: "#10B981", 
    text: "#111827", 
  });

  useEffect(() => {
    if (theme === "restaurant") {
      setColors({ primary: "#EA580C", accent: "#F59E0B", text: "#0F172A" });
      setCategory("Restaurante");
    } else if (theme === "pharmacy") {
      setColors({ primary: "#059669", accent: "#22D3EE", text: "#0B1220" });
      setCategory("Farmacia");
    } else if (theme === "default") {
      setColors({ primary: "#2563EB", accent: "#10B981", text: "#111827" });
    }
  }, [theme]);

  const slugOk = isValidSlug(slug);
  const url = slug ? `${slug}.recompry.site` : "";

 

  async function handleSave() {


      if (slug === org.slug) {
      toast.success("No hay cambios que guardar");
      return;
    }
    if (!slugOk) {
      toast.error("El formato del slug no es válido");
      return;
    }

    if (isAvailable === false) {
      toast.error("Este slug ya está en uso por otra organización");
      return;
    }

    if (isChecking) {
      toast.error("Esperando verificación de disponibilidad...");
      return;
    }

  

    try {
      const supabase = getSupabaseBrowser();

      const { error } = await supabase
        .from("organizations")
        .update({
          slug: slug,
          updated_at: new Date().toISOString(),
        })
        .eq("id", org.id);

      if (error) throw error;

      toast.success(`Slug actualizado a: ${slug}.recompry.site`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al guardar la configuración");
      setSlug(org.slug || "");
    }
  }

  return (
    <div className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 grid place-items-center rounded-xl border bg-white shadow-sm">
          <Globe className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Online</h1>
          <p className="text-sm text-gray-600">
            Configura tu sitio: tema, dominio y funciones.
          </p>
        </div>
      </div>

      <div className="grid gap-6 mx-auto max-w-6xl pb-10 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <div className="flex flex-col gap-6">
          <section>
            <div className="rounded-2xl border border-gray-200 p-4 bg-white shadow-sm h-fit">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Dominio</h2>
              
              {/* Input con sufijo y botón Ver Sitio */}
              <div className="space-y-6">
                <div className="flex items-stretch gap-4">
                  <div className="flex flex-1 min-w-0">
                    <input
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                        )
                      }
                      placeholder="mi-sitio"
                      className={cn(
                        "flex-1 rounded-l-lg border border-r-0 px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0",
                        isAvailable === false && "border-red-300 bg-red-50"
                      )}
                    />
                    <div className="px-4 py-3 bg-gray-100 border border-l-0 rounded-r-lg text-base text-gray-600 whitespace-nowrap">
                      .recompry.site
                    </div>
                  </div>
                  <button 
                    onClick={() => url && window.open(`https://${url}`, '_blank')}
                    disabled={!url || !slugOk}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 rounded-lg text-base text-gray-700 flex items-center gap-2 whitespace-nowrap transition-colors"
                  >
                    Ver Sitio
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Estados de validación */}
              <div className="text-sm space-y-2 mt-4">
                {isChecking && (
                  <div className="text-blue-600 flex items-center gap-2">
                    <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Verificando disponibilidad...
                  </div>
                )}

                {!isChecking && isAvailable === false && slug !== org.slug && (
                  <div className="text-red-600 flex items-center gap-2">
                    <span>❌</span>
                    Este slug ya está en uso por otra organización
                  </div>
                )}

                {!isChecking && isAvailable === true && slug.length >= 3 && slug !== org.slug && (
                  <div className="text-green-600 flex items-center gap-2">
                    <span>✅</span>
                    Disponible para usar
                  </div>
                )}

                {!slugOk && slug && (
                  <div className="text-red-600">
                    El slug debe tener 3-40 caracteres, minúsculas, números o guiones (sin iniciar/terminar en guión).
                  </div>
                )}
              </div>

              {/* Texto descriptivo */}
              <p className="text-gray-500 text-base leading-relaxed mt-6 mb-8">
                Para conexiones a dominios personalizados ponte en contacto con el equipo de soporte*
              </p>

              {/* Botón Actualizar */}
              <div className="flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={!slugOk || isAvailable === false || isChecking || slug === org.slug}
                  className="px-8 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-base font-medium transition-colors"
                >
                  {isChecking ? "Verificando..." : "Actualizar"}
                </button>
              </div>
            </div>
          </section>

          {/* Right: Site Data Card */}
          <section>
            <div className="rounded-2xl border border-gray-200 p-4 bg-white shadow-sm h-fit group relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Datos del sitio</h2>
                <EditSectionDialog title="Editar datos del sitio" triggerClass="opacity-0 group-hover:opacity-100 transition">
                  <SiteDataForm
                    orgId={org.id}
                    current={{
                      title_init: siteData.title_init || "",
                      title_last: siteData.title_last || "",
                    }}
                    onSaved={(next) => {
                      setSiteData({
                        title_init: next.title_init,
                        title_last: next.title_last,
                      });
                    }}
                  />
                </EditSectionDialog>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Header title</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                      <span className="text-gray-500 text-sm">Texto principal</span>
                      <span className="text-gray-900">{siteData.title_init || "..."}</span>
                    </div>
                    
                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                      <span className="text-gray-500 text-sm">Secundario</span>
                      <span className="text-gray-900">{siteData.title_last || "..."}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm relative group">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recursos de marca</h2>
                <button
                  onClick={() => setShowBrandDialog(true)}
                  className="opacity-0 group-hover:opacity-100 transition rounded-lg p-2 hover:bg-gray-100"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                  {/* Logo preview (horizontal) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Logo (horizontal)
                    </label>
                    <div className="relative w-full h-20 rounded-lg bg-white ring-1 ring-gray-200 overflow-hidden flex items-center justify-center">
                      {brandResources.logoLandscapeUrl ? (
                        <Image
                          src={brandResources.logoLandscapeUrl}
                          width={300}
                          height={100}
                          alt="Logo horizontal"
                          className="max-w-full max-h-full object-contain p-3"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                          Sin logo
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Banner preview */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Banner</label>
                    {brandResources.bannerUrl ? (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden ring-1 ring-gray-200">
                        <Image
                          src={brandResources.bannerUrl}
                          alt="Banner preview"
                          width={500}
                          height={150}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-20 rounded-lg bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center text-gray-500 text-sm">
                        Sin banner
                      </div>
                    )}
                  </div>
                </div>

                {/* Descripción & colores */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Descripción corta
                    </label>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {brandResources.description || "..."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Colores</label>
                    <div className="flex flex-wrap gap-3">
                      <ColorDot
                        hex={brandResources.colors?.primary}
                        label="Primario"
                      />
                      <ColorDot
                        hex={brandResources.colors?.secondary}
                        label="Secundario"
                      />
                      <ColorDot
                        hex={brandResources.colors?.accent}
                        label="Acento"
                      />
                    </div>
                  </div>
                </div>

                {/* Redes */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Redes sociales</label>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <SocialLine
                      icon={<Globe className="w-4 h-4" />}
                      value={brandResources.socials?.website}
                      label="Sitio web"
                    />
                    <SocialLine
                      icon={<Instagram className="w-4 h-4" />}
                      value={brandResources.socials?.instagram}
                      label="Instagram"
                    />
                    <SocialLine
                      icon={<Facebook className="w-4 h-4" />}
                      value={brandResources.socials?.facebook}
                      label="Facebook"
                    />
                    <SocialLine
                      icon={<Twitter className="w-4 h-4" />}
                      value={brandResources.socials?.twitter}
                      label="Twitter / X"
                    />
                    <SocialLine
                      icon={<Linkedin className="w-4 h-4" />}
                      value={brandResources.socials?.linkedin}
                      label="LinkedIn"
                    />
                    <SocialLine
                      icon={<Youtube className="w-4 h-4" />}
                      value={brandResources.socials?.youtube}
                      label="YouTube"
                    />
                  </div>
                </div>
              </div>
              
            </div>
          </section>
        </div>

        <OnlineRightColumn
          slug={slug}
          siteUrl={url}
          brandColors={brandResources.colors}
          onOpenBrand={() => setShowBrandDialog(true)}
        />
      </div>

      <BrandDialog
        isOpen={showBrandDialog}
        onClose={() => setShowBrandDialog(false)}
      >
        <BrandResourcesFormOnline
          org={org}
          state={brandResources}
          onPatched={(updatedBrand: any) => {
            setBrandResources(updatedBrand);
          }}
          onClose={() => setShowBrandDialog(false)}
        />
      </BrandDialog>
    </div>
  );
}
