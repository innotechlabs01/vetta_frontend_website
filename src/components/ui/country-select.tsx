"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export const COUNTRY_LIST = [
  // Latinoamérica
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+53", country: "Cuba", flag: "🇨🇺" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+503", country: "El Salvador", flag: "🇸🇻" },
  { code: "+502", country: "Guatemala", flag: "🇬🇹" },
  { code: "+504", country: "Honduras", flag: "🇭🇳" },
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
  { code: "+507", country: "Panamá", flag: "🇵🇦" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+51", country: "Perú", flag: "🇵🇪" },
  { code: "+1", country: "Puerto Rico", flag: "🇵🇷" },
  { code: "+1", country: "República Dominicana", flag: "🇩🇴" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  
  // Estados Unidos y Canadá
  { code: "+1", country: "Estados Unidos", flag: "🇺🇸" },
  { code: "+1", country: "Canadá", flag: "🇨🇦" },
  
  // Europa principales
  { code: "+49", country: "Alemania", flag: "🇩🇪" },
  { code: "+33", country: "Francia", flag: "🇫🇷" },
  { code: "+39", country: "Italia", flag: "🇮🇹" },
  { code: "+34", country: "España", flag: "🇪🇸" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
  { code: "+31", country: "Países Bajos", flag: "🇳🇱" },
  { code: "+32", country: "Bélgica", flag: "🇧🇪" },
  { code: "+41", country: "Suiza", flag: "🇨🇭" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+48", country: "Polonia", flag: "🇵🇱" },
  { code: "+7", country: "Rusia", flag: "🇷🇺" },
] as const;

export interface CountrySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  name?: string;
  phoneInputRef?: React.RefObject<HTMLInputElement>;
}

const CountrySelect = React.forwardRef<HTMLButtonElement, CountrySelectProps>(
  (
    { className, value = "+57", onChange, name, phoneInputRef, ...props },
    ref
  ) => {
    // Internal state to track selection locally
    const [selectedCode, setSelectedCode] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Keep internal state in sync if parent value changes
    useEffect(() => {
      setSelectedCode(value);
    }, [value]);

    const selectedCountry =
      COUNTRY_LIST.find((c) => c.code === selectedCode) || COUNTRY_LIST[0];

    const filteredCountries = COUNTRY_LIST.filter(
      (c) =>
        c.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.includes(searchTerm)
    );

    const handleSelect = (code: string) => {
      setSelectedCode(code);
      onChange?.(code);
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(0);
      setTimeout(() => {
        const next = document.querySelector<HTMLInputElement>(
          'input[name="phoneNumber"]'
        );
        next?.focus();
      }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredCountries.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCountries.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(filteredCountries[highlightedIndex].code);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    // Scroll to highlighted item
    useEffect(() => {
      const el = listRef.current
        ?.querySelectorAll("button")[highlightedIndex];
      el?.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex]);

    return (
      <div className="relative">
        <button
          ref={ref}
          type="button"
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2",
            className
          )}
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => searchInputRef.current?.focus(), 0);
          }}
          {...props}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{selectedCountry.flag}</span>
            <span>{selectedCountry.code}</span>
          </div>
          <svg
            className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Use internal state for hidden input */}
        <input type="hidden" name={name} value={selectedCode} />

        {isOpen && (
          <>
            <div className="absolute top-full left-0 z-50 mt-1 min-w-[100px] rounded-md border bg-white shadow-lg">
              <div className="p-2 border-b">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar país..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2"
                />
              </div>
              <div ref={listRef} className="max-h-60 overflow-y-auto" role="listbox">
                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No se encontraron países
                  </div>
                ) : (
                  filteredCountries.map((country, index) => (
                    <button
                      key={country.code + country.country}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2",
                        index === highlightedIndex
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                      )}
                      onClick={() => handleSelect(country.code)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="font-medium min-w-[35px]">
                        {country.code}
                      </span>
                      <span className="text-gray-600 truncate">
                        {country.country}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="fixed inset-0 z-40" onClick={() => {
              setIsOpen(false);
              setSearchTerm("");
              setHighlightedIndex(0);
            }} />
          </>
        )}
      </div>
    );
  }
);

CountrySelect.displayName = "CountrySelect";
export { CountrySelect };
