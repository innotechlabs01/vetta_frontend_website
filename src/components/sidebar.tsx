// app/components/Sidebar.tsx
"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  Home, Users, ShoppingCart, Tag, Globe, Megaphone, Star, Settings,
  LogOut, ChevronRight, Check, ChevronDown, User, ChevronLeft, Dot,
  Clock,
  DollarSign,
  ArrowDownUp,
  StoreIcon,
  Loader2,
  PanelLeftDashed,
  FileText,
  Menu,
  Bike,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useEnvironment } from "@/context/EnvironmentContext"
import { useSidebar } from "@/context/SidebarContext"
import { SidebarTooltip } from "./sidebar-tooltip"
import { getIcon } from "@/lib/icon-map"

const isProd = process.env.NODE_ENV === "production"
const safeHref = (href: string) => (isProd ? "/we-are-working" : href)

// Build menu items from dynamic config
const buildMenuFromConfig = (menuConfig: any[], memberRole: string | null, userMenuAccess: string[] | null) => {
  if (!menuConfig || menuConfig.length === 0) {
    // Fallback to default items if no config
    const defaultItems = [
      { label: "Inicio", href: "/home", icon: "Home" },
      { label: "Punto de Venta", href: "/pos/new", icon: "Store" },
      { label: "Pedidos", href: "/sales", icon: "ShoppingCart" },
      { label: "Domicilios", href: "/deliveries", icon: "Bike" },
      { label: "Clientes", href: "/customers", icon: "Users" },
    ];
    return defaultItems.map(item => ({
      ...item,
      icon: getIcon(item.icon),
    }));
  }

  // If user has custom menu access, filter by those paths
  const userAccessiblePaths = userMenuAccess && Array.isArray(userMenuAccess) && userMenuAccess.length > 0
    ? new Set(userMenuAccess)
    : null;

  // Filter by active status, role-based visibility, and parent-child
  const canSeeItem = (item: any) => {
    if (!item.is_active) return false;
    
    // Always visible items (e.g., Inicio) - skip role check
    if (item.always_visible) return true;
    
    // If user has custom menu access, check if path is in their list
    if (userAccessiblePaths && userAccessiblePaths.has(item.path)) {
      return true;
    }
    
    // Otherwise, check role-based visibility
    const visibleRoles = item.visible_to_roles || ['owner', 'admin', 'manager', 'member', 'viewer'];
    if (!visibleRoles.includes(memberRole || '')) return false;
    
    return true;
  };

  // Get top-level items (no parent)
  const topLevel = menuConfig
    .filter(item => !item.parent_id && canSeeItem(item))
    .sort((a, b) => a.sort_order - b.sort_order);

  // Build hierarchy
  return topLevel.map(item => {
    const children = menuConfig
      .filter(child => child.parent_id === item.id && canSeeItem(child))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(child => ({
        label: child.label,
        href: child.path,
        icon: getIcon(child.icon_name),
      }));

    return {
      label: item.label,
      href: item.path,
      icon: getIcon(item.icon_name),
      ...(children.length > 0 && { items: children }),
    };
  });
};

const footerItems = [
  { label: "Configuraciones", redirect: "/settings/general", href: "/settings", icon: Settings },
]

// Tipos
type OrgRow = { id: string; name: string; slug: string | null }

const Sidebar = () => {
  const { org, profile, user, organizationLocations, currentLocationId, hasOrganizationLevelAccess, locationAccess, menuConfig, userMenuAccess, memberRole } = useEnvironment()
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const { collapsed: persistedCollapsed, toggle } = useSidebar()
  const [isMobile, setIsMobile] = useState(false)
  const collapsed = isMobile ? false : persistedCollapsed

  const [openMenu, setOpenMenu] = useState<Record<string, boolean>>({})
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tooltip, setTooltip] = useState<{
    label: string
    anchor: { top: number; left: number }
  } | null>(null)

  // Dropdowns
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef<HTMLDivElement | null>(null)
  const mobileUserRef = useRef<HTMLDivElement | null>(null)
  const [mobileUserOpen, setMobileUserOpen] = useState(false)
  const [orgOpen, setOrgOpen] = useState(false)
  const orgRef = useRef<HTMLDivElement | null>(null)

  // Orgs
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  
  // Build menuItems based on user role and dynamic config
  const menuItems = useMemo(() => {
    return buildMenuFromConfig(menuConfig || [], memberRole, userMenuAccess);
  }, [menuConfig, memberRole, userMenuAccess]);

  // Add admin-only items (Dashboard, etc.) after dynamic items
  // Moved to menu_config table - no longer need to hardcode
  const allMenuItems = useMemo(() => {
    return menuItems;
  }, [menuItems]);

  useEffect(() => {
    const parentWithChildren = menuItems.find(
      (mi: any) => Array.isArray(mi.items) && pathname.startsWith(mi.href)
    )
    if (parentWithChildren) {
      setOpenMenu({ [parentWithChildren.href]: true })
    } else {
      setOpenMenu({})
    }
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (mobileUserRef.current && !mobileUserRef.current.contains(e.target as Node)) setMobileUserOpen(false)
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) setOrgOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setMobileUserOpen(false)
  }, [pathname])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!profile?.avatar_url) { setAvatarUrl(null); return }
      if (mounted) setAvatarUrl(profile.avatar_url ?? null)
    })()
    return () => { mounted = false }
  }, [profile?.avatar_url, supabase])

  const fetchMyOrganizations = useCallback(async () => {
    if (!user?.id) { setOrgs([]); return }
    setLoadingOrgs(true)
    const { data, error } = await supabase
      .from("organization_members")
      .select("organizations(id, name, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (!error) {
      const list: OrgRow[] =
        (data ?? [])
          .map((row: any) => ({
            id: row.organizations?.id,
            name: row.organizations?.name ?? "Negocio",
            slug: row.organizations?.slug ?? null,
          }))
          .filter((o: OrgRow) => !!o.id)
      setOrgs(list)
    }
    setLoadingOrgs(false)
  }, [supabase, user?.id])

  useEffect(() => {
    fetchMyOrganizations()
  }, [fetchMyOrganizations])

  useEffect(() => {
    if (!collapsed) {
      setTooltip(null)
    }
  }, [collapsed])

  useEffect(() => {
    setTooltip(null)
  }, [pathname])

  useEffect(() => {
    const handleDismiss = () => setTooltip(null)
    window.addEventListener("scroll", handleDismiss, true)
    window.addEventListener("resize", handleDismiss)
    return () => {
      window.removeEventListener("scroll", handleDismiss, true)
      window.removeEventListener("resize", handleDismiss)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const initials =
    (profile?.full_name?.trim()?.charAt(0).toUpperCase())
    || (profile?.email?.trim()?.charAt(0).toUpperCase())
    || "U"

  const isActive = (href: string, opts: { hasChildren?: boolean; strict?: boolean } = {}) => {
    const { hasChildren = false, strict = false } = opts
    if (href === "/home" && pathname === "/") return true
    if (hasChildren) return pathname === href
    if (strict) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  useEffect(() => {
    const all = [...menuItems, ...footerItems].map((i) => i.href)
    all.push("/org/select")
    all.forEach((path) => { if (path !== pathname) router.prefetch(path) })
  }, [router, pathname])

  const switchOrg = async (targetOrgId: string) => {
    if (switchingOrgId !== null) return

    const next = pathname || "/home"
    setSwitchingOrgId(targetOrgId)
    setOrgOpen(false)

    try {
      const response = await fetch("/api/org/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org: targetOrgId, next }),
        credentials: "include",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to switch org (status ${response.status})`)
      }

      let payload: any = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      const resolvedNext =
        typeof payload?.next === "string" && payload.next.startsWith("/")
          ? payload.next
          : next

      if (typeof document !== "undefined") {
        const ensureCookie = async () => {
          const maxAttempts = 10
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const cookieValue = document.cookie
              .split("; ")
              .find((row) => row.startsWith("org_id="))
              ?.split("=")[1]

            if (cookieValue && decodeURIComponent(cookieValue) === targetOrgId) {
              return
            }

            await new Promise((resolve) => setTimeout(resolve, 80))
          }

          document.cookie = `org_id=${encodeURIComponent(targetOrgId)}; path=/`
        }

        await ensureCookie()

        try {
          window.localStorage?.setItem("org:changed", `${Date.now()}`)
        } catch {
          // localStorage can be unavailable in some environments (e.g. Electron restrictions)
        }
      }

      if (typeof window !== "undefined") {
        if (resolvedNext !== pathname) {
          window.location.replace(resolvedNext)
        } else {
          window.location.reload()
        }
        return
      }
    } catch (e) {
      console.error("switchOrg error", e)
    }
    setSwitchingOrgId(null)
  }

  // --- UI helpers
  const sidebarWidth = collapsed ? "md:w-[60px]" : "md:w-[240px]"
  const labelHiddenCls = collapsed ? "opacity-0 pointer-events-none select-none w-0 ml-0" : "opacity-100 w-auto ml-3"
  const showLabel = true
  const pinnedLabel = collapsed ? "Expandir menú" : "Colapsar menú";

  const handleShowTooltip = useCallback((label: string, target: HTMLElement | null) => {
    if (!collapsed || !target) return
    const rect = target.getBoundingClientRect()
    setTooltip({
      label,
      anchor: { top: rect.top + rect.height / 2, left: rect.right },
    })
  }, [collapsed])

  const handleHideTooltip = useCallback(() => setTooltip(null), [])

  return (
    <>
      {/* Header móvil estilo app */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[30] h-14 border-b border-gray-200 bg-white/95 backdrop-blur-sm flex items-center justify-between px-3">
        <button
          onClick={() => setMobileOpen(true)}
          type="button"
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <Image
            src="/logo.svg"
            alt="Recompry Logo"
            width={110}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </Link>

        <div className="relative" ref={mobileUserRef}>
          <button
            onClick={() => setMobileUserOpen((o) => !o)}
            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
            aria-haspopup="menu"
            aria-expanded={mobileUserOpen}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="avatar"
                width={32}
                height={32}
                className="rounded-full object-cover w-8 h-8"
                unoptimized
              />
            ) : (
              <span className="text-gray-700 font-semibold text-sm">{initials}</span>
            )}
          </button>

          <div
            className={`absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg transition-all origin-top-right ${
              mobileUserOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
            }`}
            role="menu"
          >
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{profile?.full_name || "Usuario"}</p>
              <p className="text-xs text-gray-500">{profile?.email || ""}</p>
            </div>
            <hr />
            <ul className="py-2 text-sm text-gray-700">
              <li>
                <Link
                  href="/settings/profile"
                  prefetch
                  className="flex items-center px-4 py-2 hover:bg-gray-100"
                  onClick={() => setMobileUserOpen(false)}
                >
                  <User className="w-4 h-4 mr-2" />
                  Perfil
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/general"
                  prefetch
                  className="flex items-center px-4 py-2 hover:bg-gray-100"
                  onClick={() => setMobileUserOpen(false)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configuraciones
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 hover:bg-gray-100">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Backdrop móvil */}
      <button
        type="button"
        className={`md:hidden fixed inset-0 z-[24] bg-black/30 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}
        aria-label="Cerrar menú"
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-[25] h-[100svh] w-[240px] bg-white md:bg-transparent ${sidebarWidth} transition-transform md:transition-all duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="flex flex-col h-full px-3 py-4">

          {/* Logo + Botón colapsar */}
          <div className={`relative mb-4 ${collapsed ? "flex flex-col items-center" : ""}`}>
            

            {/* Botón de colapsar:
                - Expandido: absolute a la derecha del logo
                - Colapsado: debajo del logo, sin absolute
            */}
            <button
              onClick={() => {
                setTooltip(null)
                toggle()
              }}
              className={`hidden md:block p-2 rounded-md transition absolute right-0 top-1/2 -translate-y-1/2 bg-transparent text-gray-600 ${collapsed ? "opacity-60 hover:opacity-100 hover:bg-gray-200" : "hover:bg-gray-200"}`}
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
              title={collapsed ? "Expandir" : "Colapsar"}
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            </button>

            <Link href="/" className={`flex items-center ${collapsed ? "justify-center" : "pl-2"} mb-0`}>
              <Image
                src="/logo.svg"
                alt="Recompry Logo"
                width={collapsed ? 36 : 135}
                height={35}
                className={`${collapsed ? " h-[35px] object-cover object-left" : "h-[35px] w-auto"}`}
                priority
              />
            </Link>
          </div>  

          {/* Selector de negocio (ocultarlo en colapsado para mantener limpio) */}
          {true && (
            <div ref={orgRef} className="relative mb-3 z-20">
              <button
                type="button"
                onClick={() => setOrgOpen(o => !o)}
                className={` ${ collapsed ? 'px-2.5' : 'px-3' } w-full border  py-1.5 items-center rounded-lg flex justify-between border-gray-200 hover:border-blue-300 bg-gray-100 hover:bg-blue-100 cursor-pointer`}
                aria-haspopup="menu"
                aria-expanded={orgOpen}
                title={org?.name ?? ""}
                onMouseEnter={(e) => handleShowTooltip(org?.name ?? "Mi negocio", e.currentTarget)}
                onMouseLeave={handleHideTooltip}
              >
                <span className="text-gray-900 truncate">{org?.name ?? "Mi negocio"}</span>
                {
                  collapsed ? null : (
                    <ChevronDown className="text-gray-500 h-5" />
                  )
                }
              </button>

              <div
                className={`absolute left-0 mt-2 w-[260px] bg-white border rounded-lg shadow-lg transition-all origin-top ${orgOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}
                role="menu"
              >
                <div className="px-4 py-3">
                  <div className="text-sm font-semibold truncate">{org?.name ?? "Mi negocio"}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {org?.slug ? (
                      <a
                        href={`https://${org.slug}.recompry.site`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {`${org.slug}.recompry.site`}
                      </a>
                    ) : ""}
                  </div>
                </div>
                <hr />
                <div className="px-2 py-2 ">
                  <div className="px-2 pb-2 text-xs uppercase text-gray-500">Tus Negocios</div>

                  {loadingOrgs ? (
                    <div className="px-2 py-1 text-sm text-gray-500">Cargando...</div>
                  ) : orgs.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-gray-500">No perteneces a ninguna</div>
                  ) : (
                <ul className="space-y-1 max-h-56 overflow-y-auto no-scrollbar">
                      {orgs.map(o => {
                        const isCurrent = o.id === org?.id
                        return (
                          <li key={o.id}>
                            <button
                              type="button"
                              onClick={() => { if (!isCurrent) switchOrg(o.id) }}
                              disabled={isCurrent || switchingOrgId !== null}
                              className={`w-full px-2 py-2 text-sm rounded-md flex items-center justify-between transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed ${isCurrent ? "bg-blue-50 text-blue-700" : "text-gray-800"}`}
                            >
                              <span className="truncate">{o.name}</span>
                              {isCurrent ? (
                                <Check className="w-4 h-4" />
                              ) : switchingOrgId === o.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  <div className="mt-2">
                    <Link
                      href="/org/select"
                      prefetch
                      className="w-full inline-flex items-center justify-between text-sm px-3 py-2 rounded-md border hover:bg-gray-50"
                      onClick={() => setOrgOpen(false)}
                    >
                      <span>Administrar Negocios</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Location Selector - only show if multiple locations */}
                  {organizationLocations.length > 1 && (
                    <>
                      <hr className="my-2" />
                      <div className="px-2 pb-2 text-xs uppercase text-gray-500">Sucursales</div>
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {organizationLocations.map(loc => {
                          const isCurrentLoc = loc.id === currentLocationId;
                          return (
                            <li key={loc.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  window.location.href = `/api/location/select?location=${loc.id}`;
                                }}
                                disabled={isCurrentLoc}
                                className={`w-full px-2 py-1.5 text-sm rounded-md flex items-center justify-between transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed ${isCurrentLoc ? "bg-green-50 text-green-700" : "text-gray-800"}`}
                              >
                                <span className="truncate">{loc.name}</span>
                                {isCurrentLoc ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-400" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Menú scrollable */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <ul className="space-y-0">
              {menuItems.map((item) => {
                const Icon = item.icon
                const hasChildren = Array.isArray((item as any).items) && (item as any).items.length > 0
                const active = isActive(item.href, { hasChildren })
                const isOpenSub = !!openMenu[item.href]

                return (
                  <li key={item.href} className="relative">
                    {!hasChildren ? (
                      <Link
                        href={item.href}
                        prefetch
                        className={`flex items-center text-sm p-2 rounded-lg transition-colors ${
                          active ? "bg-blue-100/70 text-blue-600" : "text-gray-800 hover:text-gray-900 hover:bg-gray-200"
                        }`}
                        title={collapsed ? item.label : undefined}
                        onMouseEnter={(e) => handleShowTooltip(item.label, e.currentTarget)}
                        onMouseLeave={handleHideTooltip}
                      >
                        {/* Wrapper de icono con ancho fijo */}
                        <span className="min-w-[20px] w-5 h-5 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span
                          className={`truncate transition-all ${labelHiddenCls}`}
                        >
                          {item.label}
                        </span>
                      </Link>
                    ) : (
                      <>
                        <div
                          className={`flex items-center text-sm rounded-lg transition-colors ${
                            active ? "bg-blue-100/70 text-blue-600" : "text-gray-800 hover:text-gray-900 hover:bg-gray-200"
                          }`}
                          title={collapsed ? item.label : undefined}
                          onMouseEnter={(e) => handleShowTooltip(item.label, e.currentTarget)}
                          onMouseLeave={handleHideTooltip}
                        >
                          {/* Padre: navegar + abrir submenu (cuando no está colapsado) */}
                          <Link
                            href={item.href}
                            prefetch
                            className="flex-1 flex items-center p-2 rounded-lg"
                            onClick={() => {
                              if (!collapsed) setOpenMenu({ [item.href]: true })
                            }}
                          >
                            <span className="min-w-[20px] w-5 h-5 flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5" />
                            </span>
                            <span className={`truncate transition-all ${labelHiddenCls}`}>
                              {item.label}
                            </span>
                          </Link>

                          {/* Chevron (solo visible cuando no está colapsado) */}
                          {showLabel && (
                            <button
                              type="button"
                              aria-label="Alternar submenú"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setOpenMenu(prev => {
                                  const opening = !prev[item.href]
                                  return opening ? { [item.href]: true } : {}
                                })
                              }}
                              className="px-2 py-2 mr-1 rounded-md hover:bg-gray-300/60"
                              aria-expanded={isOpenSub}
                              aria-controls={`submenu-${item.href}`}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isOpenSub ? "rotate-180" : ""}`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Submenú (oculto completamente en colapsado) */}
                        {showLabel && (
                          <div
                            id={`submenu-${item.href}`}
                            className={`${isOpenSub ? "block" : "hidden"} relative`}
                          >
                            
                            <span aria-hidden className={`
                              ${
                                collapsed ? "left-4" : "left-6"
                              }
                              z-0
                              pointer-events-none absolute  top-0 bottom-4 w-px bg-gray-300  
                            `} />

                            <ul className="pt-1 relative z-1 space-y-1">
                              {(item as any).items.map((child: any) => {
                                const childActive = isActive(child.href, { strict: !!child.strict })
                                const ChildIcon = child.icon
                                return (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      prefetch
                                      className={` flex items-center gap-2 text-sm p-2 py-1.5 rounded-lg 
                                        ${
                                          collapsed ? "pl-[10px] bg-gray-200" : "pl-[40px]"
                                        }
                                        ${
                                        childActive
                                          ? "!bg-blue-100 text-blue-600"
                                          : "text-gray-700 hover:text-gray-900 hover:bg-gray-200"
                                      }`}
                                      title={collapsed ? child.label : undefined}
                                      onMouseEnter={(e) => handleShowTooltip(child.label, e.currentTarget)}
                                      onMouseLeave={handleHideTooltip}
                                    >
                                      
                                      <span className="truncate">{child.label}</span>
                                    </Link>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Footer fijo */}
          <div className="pt-4 mt-4">
            <button
              type="button"
              onClick={() => {
                setTooltip(null)
                toggle()
              }}
              aria-pressed={!collapsed}
              onMouseEnter={(e) => handleShowTooltip(pinnedLabel, e.currentTarget)}
              onMouseLeave={handleHideTooltip}
              className={`w-full flex items-center text-[15px] p-2 rounded-lg transition-colors ${
                !collapsed ? "bg-blue-100/70 text-blue-600" : "text-gray-800 hover:text-gray-900 hover:bg-gray-200"
              } mb-2`}
              title={collapsed ? pinnedLabel : undefined}
            >
              <span className="min-w-[20px] w-5 h-5 flex items-center justify-center shrink-0">
                <PanelLeftDashed className="w-5 h-5" />
              </span>
              <span className={`truncate transition-all ${labelHiddenCls}`}>{pinnedLabel}</span>
            </button>
            {footerItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.redirect ?? item.href}
                  prefetch
                  className={`flex items-center text-[15px] p-2 rounded-lg transition-colors ${
                    active ? "bg-blue-100/70 text-blue-600" : "text-gray-800 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                  title={collapsed ? item.label : undefined}
                  onMouseEnter={(e) => handleShowTooltip(item.label, e.currentTarget)}
                  onMouseLeave={handleHideTooltip}
                >
                  <span className="min-w-[20px] w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className={`truncate transition-all ${labelHiddenCls}`}>{item.label}</span>
                </Link>
              )
            })}

            {/* Usuario */}
            <div className="hidden md:block relative mt-3" ref={userRef}>
              <button
                onClick={() => setUserOpen(o => !o)}
                className={`w-full flex items-center gap-3 border   hover:bg-gray-200 focus:outline-none ${collapsed ? "justify-center rounded-full" : "p-0 rounded-full"}`}
                aria-haspopup="menu"
                aria-expanded={userOpen}
                title={collapsed ? (profile?.full_name || "Usuario") : undefined}
                onMouseEnter={(e) => handleShowTooltip(profile?.full_name || "Usuario", e.currentTarget)}
                onMouseLeave={handleHideTooltip}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="avatar"
                      width={32}
                      height={32}
                      className="rounded-full object-cover w-8 h-8"
                      unoptimized
                    />
                  ) : (
                    <span className="text-gray-700 font-semibold text-sm">{initials}</span>
                  )}
                </div>

                {/* Info usuario (oculta en colapsado sin romper ancho) */}
                {!collapsed && (
                  <div className="text-left overflow-hidden">
                    <div className="text-sm font-medium truncate">
                      {profile?.full_name || "Usuario"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{profile?.email || ""}</div>
                  </div>
                )}
              </button>

              {/* Dropdown usuario:
                  - Expandido: abre hacia la derecha del sidebar (240px)
                  - Colapsado: abre a la derecha del sidebar (left-full)
               */}
              <div
                className={`absolute ${collapsed ? "left-full ml-2 bottom-0" : "left-[240px] bottom-0"} mb-0 w-56 bg-white border rounded-lg shadow-lg transition-all origin-bottom-left ${
                  userOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
                }`}
                role="menu"
              >
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.full_name || "Usuario"}
                  </p>
                </div>
                <hr />
                <ul className="py-2 text-sm text-gray-700">
                  <li>
                    <Link
                      href="/settings/profile"
                      prefetch
                      className="flex items-center px-4 py-2 hover:bg-gray-100"
                      onClick={() => setUserOpen(false)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Perfil
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/settings/general"
                      prefetch
                      className="flex items-center px-4 py-2 hover:bg-gray-100"
                      onClick={() => setUserOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configuraciones
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Cerrar sesión
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </aside>
      <SidebarTooltip
        label={tooltip?.label ?? ""}
        anchor={tooltip?.anchor ?? { top: 0, left: 0 }}
        visible={Boolean(tooltip)}
      />
    </>
  )
}

export default Sidebar
