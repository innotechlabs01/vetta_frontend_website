// app/layout.tsx
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ProgressBar } from "@/components/ProgressBar"
import { Toaster } from "sonner"
import { DeviceGuard } from "@/components/DeviceGuard"
import { PrinterProvider } from "@/context/PrinterContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Vetta App",
    template: "%s | Vetta",
  },
  applicationName: "Vetta POS",
  description: "Engage Customers, Drive Repeat Sales.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192x192.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vetta",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ProgressBar />

        {/* ?? Subir z-index del contenedor y permitir clics en cada toast */}
        <Toaster
          position="bottom-center"
          className="z-[9999] pointer-events-none"      // contenedor arriba del Dialog
          toastOptions={{
            classNames: {
              toast: "pointer-events-auto",            // cada toast recibe clics
            },
          }}
        />

        <DeviceGuard>
          <PrinterProvider>
            {children}
          </PrinterProvider>
        </DeviceGuard>
      </body>
    </html>
  )
}
