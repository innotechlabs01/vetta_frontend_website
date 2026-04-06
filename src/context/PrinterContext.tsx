'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  loadStoredPrinter,
  normalizePrinterConfig,
  normalizePrinterListItem,
  saveStoredPrinter,
  type PrinterConfig,
} from "@/utils/printer";

type PrinterContextValue = {
  printers: PrinterConfig[];
  loading: boolean;
  error: string | null;
  selected: PrinterConfig | null;
  hasBridge: boolean;
  refresh: () => Promise<void>;
  selectPrinter: (printer: PrinterConfig | null) => Promise<void>;
};

const PrinterContext = createContext<PrinterContextValue | undefined>(undefined);

function samePrinter(a: PrinterConfig | null | undefined, b: PrinterConfig | null | undefined) {
  if (!a || !b) return false;
  return a.name?.toLowerCase() === b.name?.toLowerCase();
}

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const initialSelection =
    typeof window !== "undefined" ? loadStoredPrinter() : null;

  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PrinterConfig | null>(initialSelection);
  const [hasBridge, setHasBridge] = useState<boolean>(() =>
    typeof window !== "undefined" && !!window.electron?.listPrinters,
  );

  const mountedRef = useRef(false);
  const selectedRef = useRef<PrinterConfig | null>(initialSelection);
  const printersRef = useRef<PrinterConfig[]>([]);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    printersRef.current = printers;
  }, [printers]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const materializePrinter = useCallback(
    (printer: PrinterConfig | null | undefined, list?: PrinterConfig[]) => {
      if (!printer) return null;
      const normalized = normalizePrinterConfig(printer);
      if (!normalized) return null;
      const source = list ?? printersRef.current;
      const match = source.find((item) => samePrinter(item, normalized));
      return match ?? normalized;
    },
    [],
  );

  const applySelection = useCallback(
    async (
      printer: PrinterConfig | null,
      {
        persist = true,
        notifyElectron = true,
      }: { persist?: boolean; notifyElectron?: boolean } = {},
    ) => {
      const materialized = materializePrinter(printer);

      if (!materialized) {
        if (selectedRef.current) {
          setSelected(null);
          selectedRef.current = null;
          if (persist) saveStoredPrinter(null);
        }
        return;
      }

      const current = selectedRef.current;
      const next = materialized;

      if (!samePrinter(current, next) || current !== next) {
        setSelected(next);
        selectedRef.current = next;
      } else if (current) {
        // update with richer data
        setSelected(next);
        selectedRef.current = next;
      }

      if (persist) {
        saveStoredPrinter(next);
      }

      if (notifyElectron && window.electron?.setSelectedPrinter) {
        try {
          await window.electron.setSelectedPrinter({ ...next, persistSelection: true });
        } catch (err) {
          console.error("[printing] setSelectedPrinter IPC falló:", err);
          throw err;
        }
      }
    },
    [materializePrinter],
  );

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }

    const task = (async () => {
      if (typeof window === "undefined") {
        setPrinters([]);
        setHasBridge(false);
        return;
      }

      const bridge = !!window.electron?.listPrinters;
      setHasBridge(bridge);

      if (!bridge) {
        setPrinters([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [rawList, remoteSelection] = await Promise.all([
          window.electron?.listPrinters?.(),
          window.electron?.getSelectedPrinter?.(),
        ]);

        const normalizedList = (Array.isArray(rawList) ? rawList : [])
          .map((item) => normalizePrinterListItem(item))
          .filter((item): item is PrinterConfig => !!item);

        printersRef.current = normalizedList;
        setPrinters(normalizedList);

        const stored = loadStoredPrinter();
        const remote = normalizePrinterConfig(remoteSelection);

        const candidates: Array<PrinterConfig | null | undefined> = [
          selectedRef.current,
          stored,
          remote,
          normalizedList.find((printer) => printer.isDefault),
          normalizedList[0],
        ];

        const next = candidates
          .map((candidate) => materializePrinter(candidate, normalizedList))
          .find((candidate) => !!candidate) ?? null;

        if (next) {
          try {
            await applySelection(next, { persist: true, notifyElectron: true });
          } catch (err) {
            console.error("[printing] No se pudo sincronizar la impresora predeterminada:", err);
          }
        } else {
          await applySelection(null, { persist: true, notifyElectron: false });
        }
      } catch (err) {
        console.error("[printing] refresh printers failed:", err);
        if (mountedRef.current) {
          setError("No se pudo obtener la lista de impresoras.");
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    })();

    refreshInFlight.current = task;
    try {
      await task;
    } finally {
      refreshInFlight.current = null;
    }
  }, [applySelection, materializePrinter]);

  useEffect(() => {
    if (!hasBridge) return;
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    void refresh();
  }, [hasBridge, refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = () => {
      const stored = loadStoredPrinter();
      void applySelection(stored, { persist: false, notifyElectron: false });
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [applySelection]);

  const selectPrinter = useCallback(
    async (printer: PrinterConfig | null) => {
      await applySelection(printer, { persist: true, notifyElectron: true });
    },
    [applySelection],
  );

  const value = useMemo<PrinterContextValue>(
    () => ({
      printers,
      loading,
      error,
      selected,
      hasBridge,
      refresh,
      selectPrinter,
    }),
    [error, hasBridge, loading, printers, refresh, selectPrinter, selected],
  );

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
}

export function usePrinterContext() {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error("usePrinterContext must be used within a PrinterProvider");
  }
  return context;
}
