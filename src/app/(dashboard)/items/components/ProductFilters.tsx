"use client";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Option[];
  selectedCategoryIds: string[];
  onCategoryChange: (id: string) => void;
  branches: Option[];
  selectedBranchIds: string[];
  onBranchChange: (id: string) => void;
  availability: "all" | "available" | "unavailable";
  onAvailabilityChange: (availability: "all" | "available" | "unavailable") => void;
}

export function ProductFilters({
  categories,
  selectedCategoryIds,
  onCategoryChange,
  branches,
  selectedBranchIds,
  onBranchChange,
  availability,
  onAvailabilityChange,
}: ProductFiltersProps) {
  const getAvailabilityLabel = () => {
    switch (availability) {
      case "available":
        return "Activo";
      case "unavailable":
        return "Inactivo";
      default:
        return "Todos";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 md:justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[160px] justify-between">
            <span>Categoría</span>
            {selectedCategoryIds.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                {selectedCategoryIds.length}
              </span>
            )}
            <ChevronDown className="ml-2 w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Filtrar por categoría
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {categories.length > 0 ? (
            categories.map((category) => (
              <DropdownMenuCheckboxItem
                key={category.id}
                checked={selectedCategoryIds.includes(category.id)}
                onCheckedChange={() => onCategoryChange(category.id)}
              >
                {category.name}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Sin categorías
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[160px] justify-between">
            <span>Sucursal</span>
            {selectedBranchIds.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                {selectedBranchIds.length}
              </span>
            )}
            <ChevronDown className="ml-2 w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Filtrar por sucursal
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {branches.length > 0 ? (
            branches.map((branch) => (
              <DropdownMenuCheckboxItem
                key={branch.id}
                checked={selectedBranchIds.includes(branch.id)}
                onCheckedChange={() => onBranchChange(branch.id)}
              >
                {branch.name}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Sin sucursales
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[140px] justify-between">
            <span>Estado</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {getAvailabilityLabel()}
            </span>
            <ChevronDown className="ml-2 w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuCheckboxItem
            checked={availability === "all"}
            onCheckedChange={() => onAvailabilityChange("all")}
          >
            Todos
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={availability === "available"}
            onCheckedChange={() => onAvailabilityChange("available")}
          >
            Activo
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={availability === "unavailable"}
            onCheckedChange={() => onAvailabilityChange("unavailable")}
          >
            Inactivo
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}