// components/MainContentPadding.tsx
"use client"

import { useSidebar } from "@/context/SidebarContext"

export default function MainContentPadding({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <main className={`flex-1 h-[100svh] md:h-auto transition-all duration-200 pl-0 pt-14 md:pt-0 ${collapsed ? "md:pl-[60px]" : "md:pl-[240px]"}`}>
      <div className="dashboard-content bg-white h-full min-h-[var(--app-content-min-height)] md:min-h-[100svh] border-l overflow-auto">
        {children}
      </div>
    </main>
  )
}
