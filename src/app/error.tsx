"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">Algo salió mal</h1>
        <p className="text-muted-foreground">
          Ocurrió un error inesperado. Intenta de nuevo.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-xl px-4 py-2 bg-gray-800 text-white hover:bg-gray-700 transition"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl px-4 py-2 border hover:bg-muted transition"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
