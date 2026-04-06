// context/SidebarContext.tsx
"use client"
import React, { createContext, useContext, useEffect, useState } from "react"

type ToggleFn = {
  (next?: boolean): void
  (e: React.MouseEvent<HTMLButtonElement>): void
}

type SidebarContextType = {
  collapsed: boolean
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  toggle: ToggleFn
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)
const STORAGE_KEY = "ui:sidebar-collapsed"

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === "true") {
        setCollapsed(true)
      }
    } catch (error) {
      console.error("No se pudo leer preferencia del sidebar", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false")
    } catch (error) {
      console.error("No se pudo guardar preferencia del sidebar", error)
    }
  }, [collapsed])

  const toggle: ToggleFn = (arg?: boolean | React.MouseEvent<HTMLButtonElement>) => {
    setCollapsed(c => (typeof arg === "boolean" ? arg : !c))
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebar must be used within <SidebarProvider>")
  return ctx
}
