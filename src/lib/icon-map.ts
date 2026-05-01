// lib/icon-map.ts
// Utility for dynamic lucide-react icon loading and mapping

import * as LucideIcons from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

// Cache for loaded icons
const iconCache = new Map<string, IconComponent>();

// Get icon component by name - optimized with caching
export const getIcon = (iconName: string): IconComponent => {
  // Check cache first
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!;
  }

  // Try to get from lucide icons
  const IconComponent = (LucideIcons as any)[iconName];
  
  if (!IconComponent) {
    console.warn(`Icon "${iconName}" not found, falling back to HelpCircle`);
    return LucideIcons.HelpCircle;
  }

  // Cache the result
  iconCache.set(iconName, IconComponent);
  return IconComponent;
};

// Pre-defined list of commonly used icons in this app
// This avoids needing to load all 1000+ icons
export const AVAILABLE_ICONS = {
  // Navigation & Layout
  Home: 'Home',
  Store: 'Store',
  ShoppingCart: 'ShoppingCart',
  Globe: 'Globe',
  Bike: 'Bike',
  Users: 'Users',
  Tag: 'Tag',
  Settings: 'Settings',
  
  // Actions
  Plus: 'Plus',
  Minus: 'Minus',
  Edit: 'Edit',
  Trash: 'Trash',
  Save: 'Save',
  RefreshCw: 'RefreshCw',
  
  // Status
  CheckCircle: 'CheckCircle',
  XCircle: 'XCircle',
  AlertCircle: 'AlertCircle',
  AlertTriangle: 'AlertTriangle',
  Info: 'Info',
  Clock: 'Clock',
  
  // UI Elements
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  ChevronLeft: 'ChevronLeft',
  ChevronRight: 'ChevronRight',
  Menu: 'Menu',
  X: 'X',
  Search: 'Search',
  
  // Business
  DollarSign: 'DollarSign',
  Package: 'Package',
  Truck: 'Truck',
  Layers: 'Layers',
  QrCode: 'QrCode',
  Megaphone: 'Megaphone',
  Star: 'Star',
  
  // File & Data
  FileText: 'FileText',
  FileSpreadsheet: 'FileSpreadsheet',
  Download: 'Download',
  Upload: 'Upload',
  Printer: 'Printer',
  
  // User actions
  LogOut: 'LogOut',
  User: 'User',
  UserCog: 'UserCog',
  UserPlus: 'UserPlus',
  
  // Misc
  Dot: 'Dot',
  ArrowDownUp: 'ArrowDownUp',
  PanelLeftDashed: 'PanelLeftDashed',
  Utensils: 'Utensils',
  ShoppingBag: 'ShoppingBag',
} as const;

// Get all available icon names for the icon picker
export const getAvailableIconNames = (): string[] => {
  return Object.values(AVAILABLE_ICONS);
};

// Search icons by name (for icon picker autocomplete)
export const searchIcons = (query: string): string[] => {
  if (!query) return getAvailableIconNames();
  
  const q = query.toLowerCase();
  return getAvailableIconNames().filter(name => 
    name.toLowerCase().includes(q)
  );
};
