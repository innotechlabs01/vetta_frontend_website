"use client"

import { createPortal } from "react-dom"

type SidebarTooltipProps = {
  label: string
  anchor: { top: number; left: number }
  visible: boolean
}

export function SidebarTooltip({ label, anchor, visible }: SidebarTooltipProps) {
  if (!visible) return null
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed z-[1300] pointer-events-none"
      style={{ top: anchor.top, left: anchor.left + 12, transform: "translateY(-50%)" }}
      role="tooltip"
    >
      <div className="rounded-lg bg-black/60 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm">
        <span className="whitespace-nowrap">{label}</span>
      </div>
    </div>,
    document.body
  )
}
