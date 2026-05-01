"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X } from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterSection {
  key: string;
  label: string;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

interface FilterPanelProps {
  sections: FilterSection[];
  className?: string;
}

export function FilterPanel({ sections, className }: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  const activeCount = sections.reduce((count, section) => {
    return count + (section.selectedIds.length > 0 ? 1 : 0);
  }, 0);

  const clearAll = () => {
    sections.forEach((section) => section.onChange([]));
  };

  const hasActiveFilters = activeCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[120px] justify-between">
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </span>
          {hasActiveFilters && (
            <span className="ml-2 rounded-full bg-blue-600 text-white text-xs px-2 py-0.5">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Filtros</h3>
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="text-xs text-blue-600 hover:underline"
              >
                Limpiar todo
              </button>
            )}
          </div>

          {sections.map((section) => (
            <div key={section.key} className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {section.label}
              </Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {section.options.length ? (
                  section.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={section.selectedIds.includes(option.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            section.onChange([...section.selectedIds, option.id]);
                          } else {
                            section.onChange(
                              section.selectedIds.filter((id) => id !== option.id)
                            );
                          }
                        }}
                        className="rounded"
                      />
                      {option.label}
                    </label>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Sin opciones
                  </div>
                )}
              </div>
            </div>
          ))}

          <Button onClick={() => setOpen(false)} className="w-full">
            Aplicar filtros
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Componente para mostrar chips de filtros activos
interface ActiveFiltersChipsProps {
  filters: {
    key: string;
    label: string;
    options: { id: string; label: string }[];
    selectedIds: string[];
    onRemove: (id: string) => void;
  }[];
}

export function ActiveFiltersChips({ filters }: ActiveFiltersChipsProps) {
  const colorMap: Record<string, string> = {
    category: "bg-blue-50 text-blue-700",
    branch: "bg-green-50 text-green-700",
    status: "bg-purple-50 text-purple-700",
    default: "bg-muted text-muted-foreground",
  };

  const activeFilters = filters.filter((f) => f.selectedIds.length > 0);

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {activeFilters.map((filter) =>
        filter.selectedIds.map((id) => {
          const option = filter.options.find((o) => o.id === id);
          if (!option) return null;
          
          const colorClass = colorMap[filter.key] || colorMap.default;
          
          return (
            <span
              key={`${filter.key}-${id}`}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${colorClass}`}
            >
              {option.label}
              <button
                onClick={() => filter.onRemove(id)}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })
      )}
    </div>
  );
}