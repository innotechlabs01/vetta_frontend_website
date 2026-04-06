// app/onboarding/organization/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { slugify } from '@/lib/slugify';
import { createClient } from '@/utils/supabase/client';
import { createOrgAction, signOutAction } from '../actions';
import Link from 'next/link';
import Image from 'next/image';

export default function OnboardingOrganizationPage() {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const domainBase = 'recompry.site';

  useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  // Debounced availability
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
        {/* Header con logo centrado */}
        <div className="flex items-center justify-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Recompry Logo"
              width={160}
              height={40}
              priority
            />
          </Link>
        </div>

        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Crea tu negocio</h1>
          <p className="text-gray-600 text-sm">Este será el espacio para tu tienda y equipo.</p>
        </div>

        {/* El submit lo maneja la Server Action */}
        <form action={createOrgAction} className="space-y-4">
          <label className="block">
            <span className="text-sm">Nombre</span>
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
            <span className="text-sm">Subdominio</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                name="slug"  // <-- importante para que llegue al Server Action
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

          {/* Botón principal abajo */}
          <button
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
