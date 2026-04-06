import Link from "next/link";
import { ExternalLink, Palette, QrCode } from "lucide-react";

type OnlineRightColumnProps = {
  slug?: string | null;
  siteUrl: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  onOpenBrand: () => void;
};

function ColorSwatch({ label, value }: { label: string; value?: string }) {
  const color = value || "#e5e7eb";
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 h-8 rounded-lg border ring-1 ring-gray-200" style={{ background: color }} />
      <div className="leading-tight">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function OnlineRightColumn({ slug, siteUrl, brandColors, onOpenBrand }: OnlineRightColumnProps) {
  const hasSlug = Boolean(slug && siteUrl);
  const palette = [
    { label: "Primario", value: brandColors?.primary },
    { label: "Secundario", value: brandColors?.secondary },
    { label: "Acento", value: brandColors?.accent },
  ].filter((c) => !!c.value);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dominio</p>
            <p className="text-lg font-semibold text-gray-900">{hasSlug ? siteUrl : "Configura tu slug"}</p>
            <p className="text-sm text-gray-600 mt-1">Comparte el enlace público de tu sitio.</p>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${hasSlug ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {hasSlug ? "Listo" : "Pendiente"}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={hasSlug ? `https://${siteUrl}` : "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!hasSlug}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              hasSlug ? "text-gray-800 hover:bg-gray-50" : "cursor-not-allowed text-gray-400 bg-gray-50"
            }`}
          >
            Ver sitio
            <ExternalLink className="w-4 h-4" />
          </a>
          <Link
            href="/online/qr-codes"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            QR Codes
            <QrCode className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Marca rápida</p>
            <p className="text-xs text-gray-500">Colores que se usan en tu landing.</p>
          </div>
          <button
            type="button"
            onClick={onOpenBrand}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Palette className="w-4 h-4" />
            Editar
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {palette.length ? (
            palette.map((swatch) => (
              <ColorSwatch key={swatch.label} label={swatch.label} value={swatch.value} />
            ))
          ) : (
            <p className="text-sm text-gray-500">Agrega tus colores de marca para personalizar la experiencia.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">Atajos</p>
        <div className="mt-3 space-y-2">
          <Link
            href="/online"
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-gray-700 transition hover:border-blue-200 hover:bg-blue-50"
          >
            Configuración general
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </Link>
          <Link
            href="/online/qr-codes"
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-gray-700 transition hover:border-blue-200 hover:bg-blue-50"
          >
            QR Codes
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </Link>
        </div>
      </div>
    </div>
  );
}
