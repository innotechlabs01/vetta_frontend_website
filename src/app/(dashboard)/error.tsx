"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">Error en el panel</h1>
        <p className="text-muted-foreground">
          No pudimos cargar esta sección. Por favor intenta de nuevo.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-xl px-4 py-2 bg-gray-800 text-white hover:bg-gray-700 transition"
          >
            Reintentar
          </button>
          <Link
            href="/home"
            className="inline-flex items-center rounded-xl px-4 py-2 border hover:bg-muted transition"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
