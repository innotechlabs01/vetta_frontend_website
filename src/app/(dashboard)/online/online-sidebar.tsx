"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, QrCode } from "lucide-react";

const navItems = [
  { label: "General", href: "/online", icon: <Globe className="w-5 h-5" /> },
  { label: "QR Codes", href: "/online/qr-codes", icon: <QrCode className="w-5 h-5" /> },
];

export default function OnlineSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/online" && pathname.startsWith(`${href}/`));

  return (
    <aside className="w-64 h-full p-5 sticky top-0 bg-white">
      <h2 className="text-lg font-semibold mb-4">Online</h2>
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`text-[15px] text-gray-600 flex items-center p-2 rounded-lg transition-colors ${
                  active ? "bg-blue-100/60 font-medium text-blue-700" : "hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {item.icon}
                <span className={`ml-3 text-sm ${active ? "text-blue-700" : ""}`}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
