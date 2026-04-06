"use client"
import Link from 'next/link'
import { User, Lock, Settings, Key, Users, CreditCard, MapPin, Receipt, Gem, Monitor, Printer, Plug } from 'lucide-react'
import { usePathname } from 'next/navigation'

const configItems = [
  {
    section: 'Cuenta',
    items: [
      { label: "Perfil", href: "/settings/profile", icon: <User className="w-5 h-5" /> },
      //{ label: "Seguridad", href: "/settings/security", icon: <Lock className="w-5 h-5" /> },
    ],
  },
  {
    section: 'Neogicio',
    items: [
      { label: "General", href: "/settings/general", icon: <Settings className="w-5 h-5" /> },
      /* { label: "Planes", href: "/settings/plans", icon: <Gem className="w-5 h-5" /> },
      { label: "Facturación", href: "/settings/billing", icon: <Receipt className="w-5 h-5" /> },
       */{ label: "Usuarios", href: "/settings/users", icon: <Users className="w-5 h-5" /> },
      { label: "Pagos", href: "/settings/payments", icon: <CreditCard className="w-5 h-5" /> },
      { label: "Integraciones", href: "/settings/integrations", icon: <Plug className="w-5 h-5" /> },
      { label: "Sucursales", href: "/settings/locations", icon: <MapPin className="w-5 h-5" /> },
      { label: "POS Terminales", href: "/settings/pos-terminals", icon: <Monitor className="w-5 h-5" /> },
      { label: "Zonas de impresion", href: "/settings/print-zones", icon: <Printer className="w-5 h-5" /> },
    
    ],
  }
]

export default function LoyaltySettingsSidebar() {
  const pathname = usePathname()

  // Check if current path includes the item's href
  const isActive = (href: string) => {
    return pathname.includes(href)
  }

  return (
    <aside className="w-64 h-full p-5 sticky top-0 bg-white">
      <h2 className='text-lg font-semibold mb-4'>Configuraciones</h2>

      {configItems.map((section, idx) => (
        <div key={idx} className="mb-6">
          {
            idx == 0 ? "" :
            <h4 className="pl-1 mt-4 mb-2 text-gray-700 text-[13px] text-gray-400 uppercase mb-2">{section.section}</h4>
          }
          <ul className="space-y-1">
            {section.items.map((item, index) => {
              const active = isActive(item.href)
              return (
                <li key={index}>
                  <Link
                    href={item.href}
                    className={`text-[15px] text-gray-500 flex items-center p-2 rounded-lg hover:text-gray-900 ${active ? 'bg-blue-100/60 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    {item.icon}
                    <span className={`ml-3 text-sm ${active ? 'text-blue-600' : ''}`}>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </aside>
  )
}
