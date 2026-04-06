export type PrinterConfig = {
  name: string;
  displayName?: string;
  mode?: string;
  host?: string;
  port?: number;
  timeoutMs?: number;
  retries?: number;
  interface?: string;
  cupsOptions?: Record<string, unknown>;
  [key: string]: unknown;
};

export const PRINTER_LOCAL_STORAGE_KEY = "recompry.pos.printer";

function normalizeMode(mode?: string | null): string | undefined {
  if (!mode) return undefined;
  const value = mode.toLowerCase();
  if (value === "system" || value === "spool") return "winspool";
  if (value === "tcp" || value === "cups" || value === "winspool") return value;
  return undefined;
}

function normalizePort(port: unknown): number | undefined {
  if (typeof port === "number" && Number.isFinite(port)) return port;
  if (typeof port === "string" && port.trim().length > 0) {
    const parsed = Number.parseInt(port, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function normalizePrinterConfig(input: unknown): PrinterConfig | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;

  const name =
    (typeof data.name === "string" && data.name.trim().length > 0 && data.name) ||
    (typeof data.printerName === "string" && data.printerName.trim().length > 0 && data.printerName) ||
    (typeof data.displayName === "string" && data.displayName.trim().length > 0 && data.displayName) ||
    undefined;

  if (!name) return null;

  const displayName =
    (typeof data.displayName === "string" && data.displayName.trim().length > 0 && data.displayName) || name;

  const mode = normalizeMode(typeof data.mode === "string" ? data.mode : undefined);
  const host =
    typeof data.host === "string" && data.host.trim().length > 0 ? data.host.trim() : undefined;
  const port = normalizePort(data.port);
  const timeoutMs =
    typeof data.timeoutMs === "number" && Number.isFinite(data.timeoutMs) ? data.timeoutMs : undefined;
  const retries =
    typeof data.retries === "number" && Number.isFinite(data.retries) ? data.retries : undefined;
  const iface =
    typeof data.interface === "string" && data.interface.trim().length > 0 ? data.interface.trim() : undefined;
  const shareName =
    typeof data.shareName === "string" && data.shareName.trim().length > 0 ? data.shareName.trim() : undefined;
  const driverName =
    typeof data.driverName === "string" && data.driverName.trim().length > 0 ? data.driverName.trim() : undefined;
  const portName =
    typeof data.portName === "string" && data.portName.trim().length > 0 ? data.portName.trim() : undefined;
  const systemName =
    typeof data.systemName === "string" && data.systemName.trim().length > 0 ? data.systemName.trim() : undefined;
  const status =
    typeof data.status === "string" && data.status.trim().length > 0 ? data.status.trim() : undefined;

  const config: PrinterConfig = { name, displayName };
  if (mode) config.mode = mode;
  if (host) config.host = host;
  if (port !== undefined) config.port = port;
  if (timeoutMs !== undefined) config.timeoutMs = timeoutMs;
  if (retries !== undefined) config.retries = retries;
  if (iface) config.interface = iface;
  if (shareName) config.shareName = shareName;
  if (driverName) config.driverName = driverName;
  if (portName) config.portName = portName;
  if (systemName) config.systemName = systemName;
  if (status) config.status = status;

  const defaultRaw =
    (data.isDefault as unknown) ??
    (data.default as unknown) ??
    (data.Default as unknown);
  if (typeof defaultRaw === "boolean") {
    config.isDefault = defaultRaw;
    config.default = defaultRaw;
  } else if (typeof defaultRaw === "string") {
    const lowered = defaultRaw.trim().toLowerCase();
    if (lowered === "true" || lowered === "1") {
      config.isDefault = true;
      config.default = true;
    } else if (lowered === "false" || lowered === "0") {
      config.isDefault = false;
      config.default = false;
    }
  }

  if (data.cupsOptions && typeof data.cupsOptions === "object") {
    config.cupsOptions = data.cupsOptions as Record<string, unknown>;
  }

  return config;
}

export function normalizePrinterListItem(input: unknown): PrinterConfig | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;

  const base: Record<string, unknown> = {
    ...candidate,
    mode: normalizeMode(
      typeof candidate.mode === "string" ? candidate.mode : undefined,
    ) ?? "winspool",
  };

  if (typeof candidate.name === "string") {
    base.name = candidate.name;
  } else if (typeof candidate.deviceId === "string") {
    base.name = candidate.deviceId;
  } else if (typeof candidate.printer === "string") {
    base.name = candidate.printer;
  }

  if (typeof candidate.displayName === "string") {
    base.displayName = candidate.displayName;
  } else if (typeof base.name === "string") {
    base.displayName = base.name;
  }

  const defaultCandidate =
    (candidate.isDefault as unknown) ??
    (candidate.default as unknown) ??
    (candidate.Default as unknown);
  if (typeof defaultCandidate === "boolean") {
    base.isDefault = defaultCandidate;
    base.default = defaultCandidate;
  } else if (typeof defaultCandidate === "string") {
    const lowered = defaultCandidate.trim().toLowerCase();
    if (lowered === "true" || lowered === "1") {
      base.isDefault = true;
      base.default = true;
    } else if (lowered === "false" || lowered === "0") {
      base.isDefault = false;
      base.default = false;
    }
  }

  return normalizePrinterConfig(base);
}

export function loadStoredPrinter(): PrinterConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PRINTER_LOCAL_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const normalized = normalizePrinterConfig(parsed);
    if (!normalized) {
      window.localStorage.removeItem(PRINTER_LOCAL_STORAGE_KEY);
    }
    return normalized;
  } catch {
    return null;
  }
}

export function saveStoredPrinter(config: PrinterConfig | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!config) {
      window.localStorage.removeItem(PRINTER_LOCAL_STORAGE_KEY);
    } else {
      const payload: PrinterConfig = {
        name: config.name,
        displayName: config.displayName,
        mode: config.mode,
        host: config.host,
        port: config.port,
        timeoutMs: config.timeoutMs,
        retries: config.retries,
        interface: config.interface,
      };
      if (config.shareName) payload.shareName = config.shareName;
      if (config.driverName) payload.driverName = config.driverName;
      if (config.portName) payload.portName = config.portName;
      if (config.systemName) payload.systemName = config.systemName;
      if (config.status) payload.status = config.status;
      if (config.isDefault !== undefined) {
        payload.isDefault = config.isDefault;
        payload.default = config.isDefault;
      }
      if (config.cupsOptions && typeof config.cupsOptions === "object") {
        payload.cupsOptions = config.cupsOptions;
      }
      window.localStorage.setItem(PRINTER_LOCAL_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // ignore write errors (quota, private mode, etc.)
  }
}

export function getPrinterLabel(printer: PrinterConfig | null | undefined): string {
  if (!printer) return "Sin impresora";
  return printer.displayName || printer.name;
}
