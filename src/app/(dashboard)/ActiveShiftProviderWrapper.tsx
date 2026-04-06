"use client";

import { ActiveShiftProvider } from "@/context/ActiveShiftContext";

export default function ActiveShiftProviderWrapper({ children }: { children: React.ReactNode }) {
  return <ActiveShiftProvider>{children}</ActiveShiftProvider>;
}
