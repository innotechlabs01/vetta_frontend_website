"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  GripVertical,
  Plus,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  OptionSetWithValues,
  VariationSetDraft,
} from "./types";

type AddVariationsDialogProps = {
  open: boolean;
  onClose: () => void;
  optionSets: OptionSetWithValues[];
  initialSets: VariationSetDraft[];
  onSave: (sets: VariationSetDraft[]) => void;
};

const EMPTY_SET: VariationSetDraft = {
  id: "",
  optionSetId: null,
  title: "",
  selectedOptionIds: [],
};

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function VariationOptionsSelect({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(term)
    );
  }, [query, options]);

  const checkedCount = value.length;
  const totalCount = options.length;
  const allSelected = checkedCount > 0 && checkedCount === totalCount;
  const partiallySelected = checkedCount > 0 && checkedCount < totalCount;

  const toggle = (optionId: string) => {
    onChange(
      value.includes(optionId)
        ? value.filter((id) => id !== optionId)
        : [...value, optionId]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map((option) => option.id));
    }
  };

  const summaryLabel = value.length
    ? options
        .filter((option) => value.includes(option.id))
        .map((option) => option.label)
        .join(", ")
    : "Selecciona opciones";

  return (
    <div ref={containerRef} className="w-full">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between text-left font-normal"
          >
            <span className="truncate">{summaryLabel}</span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[70] w-72 p-0"
          sideOffset={6}
          align="start"
          container={containerRef.current}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Buscar opción…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {options.length ? (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleSelectAll}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelectAll();
                    }
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                >
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : partiallySelected
                          ? "indeterminate"
                          : false
                    }
                  />
                  Seleccionar todo
                </div>
                {filtered.map((option) => (
                  <div
                    key={option.id}
                    role="button"
                    tabIndex={0}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                    onClick={() => toggle(option.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle(option.id);
                      }
                    }}
                  >
                    <Checkbox checked={value.includes(option.id)} />
                    <span className="truncate">{option.label}</span>
                  </div>
                ))}
                {!filtered.length ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No encontramos coincidencias.
                  </div>
                ) : null}
              </>
            ) : (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                Este set aún no tiene opciones.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SortableSetRow({
  row,
  optionSets,
  usedSetIds,
  onChange,
  onRemove,
}: {
  row: VariationSetDraft;
  optionSets: OptionSetWithValues[];
  usedSetIds: Set<string>;
  onChange: (next: VariationSetDraft) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const currentSet = optionSets.find((set) => set.id === row.optionSetId);
  const availableOptions =
    currentSet?.options.map((option) => ({
      id: option.id,
      label: option.display_name || option.name,
    })) ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3 transition",
        isDragging ? "bg-muted/50 shadow-sm" : ""
      )}
    >
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start md:gap-4">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border md:h-11 md:w-11 md:self-start"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Set title
            </Label>
            <Select
              value={row.optionSetId ?? ""}
              onValueChange={(value) => {
                if (!value) return;
                const nextSet = optionSets.find((set) => set.id === value);
                onChange({
                  ...row,
                  optionSetId: value,
                  title: row.title || nextSet?.display_name || nextSet?.name || "",
                  selectedOptionIds: [],
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un set" />
              </SelectTrigger>
              <SelectContent>
                {optionSets.map((set) => (
                  <SelectItem
                    key={set.id}
                    value={set.id}
                    disabled={
                      usedSetIds.has(set.id) && row.optionSetId !== set.id
                    }
                  >
                    {set.display_name || set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Nombre visible (opcional)"
              value={row.title}
              onChange={(event) =>
                onChange({ ...row, title: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Variation options
            </Label>
            <VariationOptionsSelect
              options={availableOptions}
              value={row.selectedOptionIds}
              onChange={(selectedOptionIds) =>
                onChange({ ...row, selectedOptionIds })
              }
            />
          </div>
        </div>
        <div className="flex items-start justify-end md:self-start">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AddVariationsDialog({
  open,
  onClose,
  optionSets,
  initialSets,
  onSave,
}: AddVariationsDialogProps) {
  const [rows, setRows] = useState<VariationSetDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    if (open) {
      if (initialSets.length) {
        setRows(
          initialSets.map((set) => ({
            ...EMPTY_SET,
            ...set,
            id: set.id || generateId(),
          }))
        );
      } else {
        setRows([{ ...EMPTY_SET, id: generateId() }]);
      }
      setError(null);
    }
  }, [open, initialSets]);

  const usedSetIds = useMemo(
    () =>
      new Set(
        rows
          .map((row) => row.optionSetId)
          .filter((value): value is string => Boolean(value))
      ),
    [rows]
  );

  const estimatedCombinations = useMemo(() => {
    if (!rows.length) return 0;
    let total = 1;
    let validSets = 0;
    rows.forEach((row) => {
      if (row.optionSetId && row.selectedOptionIds.length) {
        validSets += 1;
        total *= row.selectedOptionIds.length;
      }
    });
    return validSets ? total : 0;
  }, [rows]);

  const handleAddRow = () => {
    const availableSet = optionSets.find(
      (set) => !rows.some((row) => row.optionSetId === set.id)
    );
    setRows((prev) => [
      ...prev,
      {
        ...EMPTY_SET,
        id: generateId(),
        optionSetId: availableSet?.id ?? null,
        title: availableSet?.display_name || availableSet?.name || "",
      },
    ]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIndex = prev.findIndex((row) => row.id === active.id);
      const newIndex = prev.findIndex((row) => row.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSubmit = () => {
    if (!rows.length) {
      setError("Agrega al menos un set de variaciones.");
      return;
    }

    const invalidRow = rows.find(
      (row) => !row.optionSetId || !row.selectedOptionIds.length
    );

    if (invalidRow) {
      setError("Cada set necesita un origen y al menos una opción seleccionada.");
      return;
    }

    setError(null);
    onSave(rows);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : onClose())}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Agregar variantes</DialogTitle>
          <DialogDescription>
            Combina diferentes listas de opciones para generar variaciones automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4 -mt-3">

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rows.map((row) => row.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {rows.map((row) => (
                  <SortableSetRow
                    key={row.id}
                    row={row}
                    optionSets={optionSets}
                    usedSetIds={usedSetIds}
                    onChange={(nextRow) =>
                      setRows((prev) =>
                        prev.map((item) => (item.id === row.id ? nextRow : item))
                      )
                    }
                    onRemove={() =>
                      setRows((prev) => prev.filter((item) => item.id !== row.id))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddRow}
            className="gap-2 bg-gray-100"
            disabled={!optionSets.length}
          >
            <Plus className="h-4 w-4" />
            Agregar otro set
          </Button>
          {!optionSets.length ? (
            <p className="text-xs text-muted-foreground">
              Crea listas desde Inventario → Opciones para comenzar.
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter className="pb-4 px-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Generar variaciones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
