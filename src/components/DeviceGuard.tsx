// src/components/DeviceGuard.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MonitorSmartphone, MessageCircle } from "lucide-react"

export function DeviceGuard({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState<boolean | null>(null)

  useEffect(() => {
    const compute = () => {
      const isNarrow = window.innerWidth < 1024 // < lg
      const ua = navigator.userAgent || ""
      const isMobileOrTablet = /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(ua)
      setBlocked(isNarrow || isMobileOrTablet)
    }

    compute()
    window.addEventListener("resize", compute)
    return () => window.removeEventListener("resize", compute)
  }, [])

  if (blocked === null) return null // evita parpadeo SSR/CSR

  if (false) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100">
            <MonitorSmartphone className="w-7 h-7 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Esta experiencia está disponible solo en computador (desktop)
          </h1>
          <p className="text-gray-600">
            Por ahora, utiliza un equipo de escritorio o una pantalla amplia para acceder.
            Si necesitas ayuda o quieres reportar un problema, contáctanos por WhatsApp.
          </p>
          <a
            href="https://wa.me/573172723452"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold shadow hover:bg-emerald-700 transition"
          >
            <MessageCircle className="w-5 h-5" />
            Contactar por WhatsApp
          </a>

          <p className="text-xs text-gray-500">
            Tip: amplía la ventana o usa un monitor ≥ 1024px de ancho.
          </p>
        </div>
      </main>
    )
  }

  return <>{children}</>
}