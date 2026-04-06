"use client";

import { type ServiceChannelStatus } from "@/app/(dashboard)/pos/new/types";

type ServiceChannelStatusSwitchProps = {
  label: string;
  status: ServiceChannelStatus;
  onChange: (status: ServiceChannelStatus) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
};

export function ServiceChannelStatusSwitch({
  label,
  status,
  onChange,
  disabled = false,
  loading = false,
  error = null,
}: ServiceChannelStatusSwitchProps) {
  const states: ServiceChannelStatus[] = ["active", "waiting", "inactive"];

  const getStateColor = (state: ServiceChannelStatus, isActive: boolean) => {
    if (!isActive) {
      return "bg-gray-100 text-gray-400 border-gray-200";
    }

    switch (state) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "waiting":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "inactive":
        return "bg-red-100 text-red-700 border-red-300";
    }
  };

  const getStateLabel = (state: ServiceChannelStatus) => {
    switch (state) {
      case "active":
        return "Activo";
      case "waiting":
        return "Espera";
      case "inactive":
        return "Inactivo";
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return "🟢";
      case "waiting":
        return "🟡";
      case "inactive":
        return "🔴";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-500">{getStatusBadge()}</span>
      </div>

      <div className="flex gap-1.5">
        {states.map((state) => {
          const isActive = status === state;
          return (
            <button
              key={state}
              onClick={() => onChange(state)}
              disabled={disabled || loading}
              className={`
                flex-1 px-3 py-2 rounded-lg border transition-all
                text-xs font-medium uppercase tracking-tight
                ${getStateColor(state, isActive)}
                ${isActive ? "ring-2 ring-offset-1" : ""}
                ${disabled || loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-sm active:scale-95"}
              `}
            >
              {loading && isActive ? (
                <span className="inline-block">
                  <span className="animate-spin inline-block">⏳</span>
                </span>
              ) : (
                getStateLabel(state)
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
