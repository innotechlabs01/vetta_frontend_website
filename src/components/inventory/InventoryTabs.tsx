"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface InventoryTab {
  href: string;
  label: string;
}

interface InventoryTabsProps {
  tabs: InventoryTab[];
  className?: string;
}

export function InventoryTabs({ tabs, className }: InventoryTabsProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex overflow-x-auto gap-1 mb-6 pb-2 border-b", className)}>
      {tabs.map((tab) => {
        const isActive = 
          pathname === tab.href || 
          (tab.href !== "/items" && pathname.startsWith(tab.href));
        
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
              isActive
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}