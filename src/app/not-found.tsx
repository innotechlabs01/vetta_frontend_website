// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">Página no encontrada</h1>
        <p className="text-muted-foreground">
          La ruta que buscaste no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl px-4 py-2 border hover:bg-muted transition"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}