// app/onboarding/organization/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { slugify } from '@/lib/slugify';
import { createClient } from '@/utils/supabase/client';
import { createOrgAction, signOutAction } from '../actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type BusinessCategory = {
  value: string;
  label: string;
  icon: string;
};

const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { value: 'store', label: 'Tienda', icon: '🏪' },
  { value: 'supermarket', label: 'Supermercado', icon: '🛒' },
  { value: 'boutique', label: 'Boutique', icon: '👗' },
  { value: 'electronics', label: 'Electrónicos', icon: '📱' },
  { value: 'hardware', label: 'Ferretería', icon: '🔧' },
  { value: 'beauty', label: 'Belleza', icon: '💄' },
  { value: 'convenience', label: 'Miscelánea', icon: '🗃️' },
  { value: 'restaurant', label: 'Restaurante', icon: '🍽️' },
  { value: 'coffee_shop', label: 'Cafetería', icon: '☕' },
  { value: 'fast_food', label: 'Comida Rápida', icon: '🍔' },
  { value: 'bar', label: 'Bar', icon: '🍺' },
  { value: 'pharmacy', label: 'Farmacia', icon: '💊' },
  { value: 'clinic', label: 'Clínica', icon: '🏥' },
  { value: 'gym', label: 'Gimnasio', icon: '💪' },
  { value: 'online_store', label: 'Tienda Online', icon: '🌐' },
  { value: 'other', label: 'Otro', icon: '📦' },
];

export default function OnboardingOrganizationPage() {
  const supabase = useMemo(() => createClient(), []);
  const [businessCategory, setBusinessCategory] = useState('store');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const domainBase = 'Vetta.site';

  useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  useEffect(() => {
    if (!slug) { setAvailable(null); return; }
    const handle = setTimeout(async () => {
      setChecking(true);
      const { data, error } = await supabase.rpc('org_slug_available', { p_slug: slug });
      setAvailable(error ? null : Boolean(data));
      setChecking(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [slug, supabase]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 relative">
      <form action={signOutAction} className="fixed bottom-6 left-6">
        <button
          type="submit"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cerrar sesión
        </button>
      </form>

      <div className="w-full max-w-lg bg-white rounded-xl shadow p-8 space-y-6">
        <div className="flex items-center justify-center">
          <Link href="/" className="flex items-center">
            {/*<Image
              src="/logo.svg"
              alt="Vetta Logo"
              width={160}
              height={40}
              priority
            />*/}
          </Link>
        </div>

        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Crea tu negocio</h1>
          <p className="text-gray-600 text-sm">Este será el espacio para tu tienda y equipo.</p>
        </div>

        <form
          action={createOrgAction}
          onSubmit={(e) => {
            if (available === false || checking) e.preventDefault();
          }}
          className="space-y-5"
        >
          <input type="hidden" name="latitude" value={coords?.lat ?? ''} />
          <input type="hidden" name="longitude" value={coords?.lng ?? ''} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Qué tipo de negocio tienes?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BUSINESS_CATEGORIES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBusinessCategory(opt.value)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all",
                    "hover:border-blue-300 hover:bg-blue-50",
                    businessCategory === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  )}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="business_category" value={businessCategory} />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Nombre</span>
            <input
              name="name"
              className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600"
              placeholder="Mi negocio"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Subdominio</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                name="slug"
                className="w-[170px] rounded-lg border px-3 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600"
                value={slug}
                onChange={e => { setSlug(slugify(e.target.value)); setTouchedSlug(true); }}
                onBlur={() => setTouchedSlug(true)}
                required
                aria-invalid={available === false}
                aria-describedby="slug-help"
              />
              <span className="text-sm text-gray-500">.{domainBase}</span>
            </div>

            <div id="slug-help" className="mt-1 text-xs">
              {checking && <span>Verificando disponibilidad…</span>}
              {!checking && available === true && (
                <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                  Disponible: {slug}.{domainBase}
                </span>
              )}
              {!checking && available === false && (
                <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                  No disponible. Prueba otra variante.
                </span>
              )}
              {!checking && available === null && slug && (
                <span className="text-gray-500">No pudimos verificar ahora. Intenta de nuevo.</span>
              )}
            </div>
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 text-white px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={available === false || checking}
          >
            Crear y continuar
          </button>
        </form>
      </div>
    </div>
  );
}