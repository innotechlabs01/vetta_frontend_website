"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import CustomerModal from "@/components/customers/CustomerModal";
import type { DBCustomer } from "@/types/customers";

type CustomerRowProps = {
  customers: DBCustomer[];
  customersLoading: boolean;
  selectedCustomer?: DBCustomer | null;
  setSelectedCustomerId: (id: string | null) => void;
  customerDisplayName: (c: DBCustomer) => string;
  fetchCustomers: () => Promise<void>;
  organizationId?: string;
  supabase: any;
};

type DropdownEntry =
  | { kind: "counter" }
  | { kind: "customer"; customer: DBCustomer }
  | { kind: "create"; seed: { phone?: string; name?: string } };

function documentLabel(customer?: DBCustomer | null) {
  if (customer?.id_type && customer?.id_number) {
    return `${customer.id_type}: ${customer.id_number}`;
  }
  if (customer?.email) return customer.email;
  if (customer?.phone) return customer.phone;
  return "Sin identificación";
}

function hasFakeOfacAlert(customer?: DBCustomer | null): boolean {
  if (!customer) return false;
  const seed = `${customer.id_number ?? ""}${customer.phone ?? ""}${customer.id}`;
  if (!seed.trim()) return false;
  let score = 0;
  for (let index = 0; index < seed.length; index += 1) {
    score += seed.charCodeAt(index) * (index + 1);
  }
  return score % 13 === 0;
}

export default function CustomerRow({
  customers,
  customersLoading,
  selectedCustomer,
  setSelectedCustomerId,
  customerDisplayName,
  fetchCustomers,
  organizationId,
  supabase,
}: CustomerRowProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [modalSeed, setModalSeed] = useState<{ phone?: string; name?: string }>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!isDropdownOpen) return;
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isDropdownOpen) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    } else {
      setSearchTerm("");
      setActiveIndex(-1);
    }
  }, [isDropdownOpen]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      const haystack = [
        customerDisplayName(c),
        c.id_type,
        c.id_number,
        c.email,
        c.phone,
        c.address,
        c.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [customers, customerDisplayName, searchTerm]);

  const trimmedSearchTerm = searchTerm.trim();
  const normalizedSearchTerm = trimmedSearchTerm.toLowerCase();
  const createEntryTerm = trimmedSearchTerm;
  const isNumericTerm =
    createEntryTerm.length > 0 && /^[\d()+\s-]+$/.test(createEntryTerm);
  const showCreateEntry = createEntryTerm.length > 0 && filteredCustomers.length === 0;
  const createEntrySeed = showCreateEntry
    ? isNumericTerm
      ? { phone: createEntryTerm }
      : { name: createEntryTerm }
    : null;

  const dropdownEntries = useMemo<DropdownEntry[]>(() => {
    const entries: DropdownEntry[] = [];
    if (createEntrySeed) {
      entries.push({ kind: "create", seed: createEntrySeed });
    }
    entries.push({ kind: "counter" });
    filteredCustomers.forEach((customer) => {
      entries.push({ kind: "customer", customer });
    });
    return entries;
  }, [filteredCustomers, createEntrySeed]);

  const showEmptyState = dropdownEntries.length === 0;

  useEffect(() => {
    if (activeIndex >= dropdownEntries.length) {
      setActiveIndex(dropdownEntries.length - 1);
    }
    if (dropdownEntries.length === 0) {
      setActiveIndex(-1);
    }
  }, [dropdownEntries.length, activeIndex]);

  const closeDropdown = () => {
    setIsDropdownOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const focusEntryAt = (index: number) => {
    setActiveIndex(index);
    requestAnimationFrame(() => {
      optionsRefs.current[index]?.focus();
    });
  };

  const handleSelectCustomer = (id: string | null) => {
    setSelectedCustomerId(id);
    closeDropdown();
  };

  const openModalForSeed = (seed: { phone?: string; name?: string }) => {
    setModalSeed(seed);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleOptionKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    idx: number,
    entry: DropdownEntry
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (idx + 1) % dropdownEntries.length;
      focusEntryAt(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = idx === 0 ? dropdownEntries.length - 1 : idx - 1;
      focusEntryAt(prev);
    } else if (e.key === "Escape") {
      closeDropdown();
    } else if (entry.kind === "create" && e.key === "Enter") {
      e.preventDefault();
      openModalForSeed(entry.seed);
    } else if (entry.kind === "counter" && e.key === "Enter") {
      e.preventDefault();
      handleSelectCustomer(null);
    }
  };

  const handleSaved = async (customer: DBCustomer) => {
    await fetchCustomers();
    setSelectedCustomerId(customer.id);
  };

  const handleExistingCustomerSelect = (customer: DBCustomer) => {
    setSelectedCustomerId(customer.id);
    void fetchCustomers();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalSeed({});
  };
  const selectedHasOfacAlert = hasFakeOfacAlert(selectedCustomer);

  return (
    <>
      <div className="flex flex-1 items-center gap-2">
        <div className="relative min-w-0 flex-1 rounded-xl bg-white px-2 py-2">
          <button
            ref={buttonRef}
            className="flex w-full items-center gap-2 bg-transparent text-left outline-none"
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIsDropdownOpen(true);
                requestAnimationFrame(() => {
                  if (dropdownEntries.length > 0) {
                    focusEntryAt(0);
                  } else {
                    searchInputRef.current?.focus();
                  }
                });
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIsDropdownOpen(true);
                const lastIndex = dropdownEntries.length - 1;
                if (lastIndex >= 0) {
                  requestAnimationFrame(() => {
                    focusEntryAt(lastIndex);
                  });
                }
              }
            }}
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
              {(selectedCustomer?.name?.[0] ?? "👤").toString().toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {selectedCustomer ? customerDisplayName(selectedCustomer) : "Mostrador"}
              </div>
              <div className="truncate text-xs text-gray-500">
                {documentLabel(selectedCustomer)}
              </div>
              {selectedHasOfacAlert ? (
                <div className="mt-0.5 inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  OFAC
                </div>
              ) : null}
            </div>
            <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
          </button>

          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute z-20 mt-4 ml-[-5px] max-h-80 w-full overflow-auto rounded-xl border bg-white shadow-lg"
              role="listbox"
            >
              <div className="sticky top-0 bg-white p-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar cliente…"
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setActiveIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        if (dropdownEntries.length > 0) {
                          focusEntryAt(0);
                        }
                      } else if (e.key === "Escape") {
                        closeDropdown();
                      }
                    }}
                  />
                  {customersLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </div>
              </div>

              <ul className="space-y-1 p-2">
                {(() => {
                  optionsRefs.current = [];
                  return (
                    <>
                      {dropdownEntries.map((entry, idx) => {
                        const isActive = activeIndex === idx;
                        if (entry.kind === "counter") {
                          return (
                            <li key="counter" role="presentation">
                              <button
                                type="button"
                                ref={(el) => {
                                  if (el) {
                                    optionsRefs.current[idx] = el;
                                  }
                                }}
                                role="option"
                                aria-selected={isActive}
                                className="w-full rounded-lg px-2 py-2 text-left hover:bg-gray-50 focus:bg-gray-100 focus:outline-none"
                                onClick={() => handleSelectCustomer(null)}
                                onKeyDown={(event) =>
                                  handleOptionKeyDown(event, idx, entry)
                                }
                              >
                                <div className="flex items-center gap-2">
                                  <div className="grid h-10 min-w-10 w-10 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                                    CM
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium leading-tight">
                                      Cliente mostrador
                                    </div>
                                    <div className="truncate text-xs text-gray-500">
                                      Sin cliente asignado
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        }
                        if (entry.kind === "customer") {
                          const c = entry.customer;
                          const haystack = [
                            customerDisplayName(c),
                            c.id_type,
                            c.id_number,
                            c.email,
                            c.phone,
                            c.address,
                            c.notes,
                          ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();
                          return (
                            <li key={c.id} role="presentation">
                              <button
                                type="button"
                                ref={(el) => {
                                  if (el) {
                                    optionsRefs.current[idx] = el;
                                  }
                                }}
                                data-haystack={haystack}
                                role="option"
                                aria-selected={isActive}
                                className="w-full rounded-lg px-2 py-2 text-left hover:bg-gray-50 focus:bg-gray-100 focus:outline-none"
                                onClick={() => handleSelectCustomer(c.id)}
                                onKeyDown={(event) =>
                                  handleOptionKeyDown(event, idx, entry)
                                }
                              >
                                <div className="flex items-center gap-2">
                                  <div className="grid h-10 w-10 min-w-10 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                                    {(c.name?.[0] ?? "👤").toString().toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium leading-tight">
                                      {customerDisplayName(c)}
                                    </div>
                                    <div className="truncate text-xs text-gray-500">
                                      {documentLabel(c)}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        }
                        return (
                          <li key="create" role="presentation">
                            <button
                              type="button"
                              ref={(el) => {
                                if (el) {
                                  optionsRefs.current[idx] = el;
                                }
                              }}
                              role="option"
                              aria-selected={isActive}
                              className="w-full rounded-lg px-2 py-2 text-left hover:bg-emerald-50 focus:bg-emerald-100 focus:outline-none"
                              onClick={() => openModalForSeed(entry.seed)}
                              onKeyDown={(event) =>
                                handleOptionKeyDown(event, idx, entry)
                              }
                            >
                              <div className="flex items-center gap-2">
                                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-600">
                                  <Plus className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-emerald-900">
                                    Crear cliente
                                  </div>
                                  <div className="truncate text-xs text-gray-500">
                                    {entry.seed.phone || entry.seed.name || "Ingresa un valor"}
                                  </div>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                      {showEmptyState && (
                        <li className="px-2 py-2 text-sm text-gray-500" role="presentation">
                          No hay clientes.
                        </li>
                      )}
                    </>
                  );
                })()}
              </ul>
            </div>
          )}
        </div>

        <button
          className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-blue-200 text-white hover:brightness-110"
          type="button"
          onClick={() => {
            setIsDropdownOpen(false);
            setModalSeed({});
            setIsModalOpen(true);
          }}
          title="Nuevo cliente"
        >
          <span className="text-xl font-bold text-blue-800">
            <Plus />
          </span>
        </button>
      </div>

      <CustomerModal
        open={isModalOpen}
        onClose={handleModalClose}
        supabase={supabase}
        organizationId={organizationId}
        initialCustomer={null}
        initialPhone={modalSeed.phone || undefined}
        initialName={modalSeed.name}
        onExistingCustomerSelect={handleExistingCustomerSelect}
        onSaved={handleSaved}
        requireIdNumber={false}
        showLoyaltyControls={false}
      />
    </>
  );
}
