// app/under-construction/page.tsx
import Link from "next/link"
import {
  Settings,
  User,
  MapPin,
  MessageCircle,
  ArrowLeft,
  ArrowRight
} from "lucide-react"

export default function UnderConstruction() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            🚧 Estamos trabajando en este módulo
          </h1>
          <p className="text-gray-600">
            Nuestro equipo está desarrollando esta funcionalidad. Mientras tanto, puedes ir adelantando la configuración inicial:
          </p>
        </div>

        {/* Acciones sugeridas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <Link
            href="/settings/general"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-blue-50 p-2">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">Configura tu marca</h3>
            <p className="mt-1 text-sm text-gray-600">
              Logo, colores y datos generales del negocio.
            </p>
            <span className="mt-3 inline-block text-sm text-blue-700 group-hover:underline">
              Ir a General →
            </span>
          </Link>

          <Link
            href="/settings/profile"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-green-50 p-2">
                <User className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">Completa tu cuenta</h3>
            <p className="mt-1 text-sm text-gray-600">
              Nombre, foto y datos de contacto del usuario.
            </p>
            <span className="mt-3 inline-block text-sm text-green-700 group-hover:underline">
              Ir a Perfil →
            </span>
          </Link>

          <Link
            href="/settings/locations"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-purple-50 p-2">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">Crea sucursales</h3>
            <p className="mt-1 text-sm text-gray-600">
              Define direcciones, horarios y canales de venta.
            </p>
            <span className="mt-3 inline-block text-sm text-purple-700 group-hover:underline">
              Ir a Sucursales →
            </span>
          </Link>
        </div>

        {/* Soporte / WhatsApp */}
        <div className="space-y-3">
          <p className="text-gray-600">
            ¿Dudas o quieres reportar un bug? Escríbenos por WhatsApp.
          </p>
          <a
            href="https://wa.me/573172723452"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold shadow hover:bg-emerald-700 transition"
          >
            <MessageCircle className="h-5 w-5" />
            Contactar por WhatsApp
          </a>
        </div>

        {/* Regresar */}
        <div>
          <Link
            href="/settings/general"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            ir a configuraciones
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  )
}