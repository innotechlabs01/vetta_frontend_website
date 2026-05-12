// app/layout.tsx
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ProgressBar } from "@/components/ProgressBar"
import { Toaster } from "sonner"
import { DeviceGuard } from "@/components/DeviceGuard"
import { PrinterProvider } from "@/context/PrinterContext"

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: {
    default: "Vetta App",
    template: "%s | Vetta",
  },
  applicationName: "Vetta POS",
  description: "Engage Customers, Drive Repeat Sales.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://front-vetta-website.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Vetta POS",
    title: "Vetta App",
    description: "Engage Customers, Drive Repeat Sales.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vetta App",
    description: "Engage Customers, Drive Repeat Sales.",
  },
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
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
