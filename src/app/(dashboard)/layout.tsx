// app/(dashboard)/layout.tsx  (SERVER COMPONENT)
import type { Metadata } from "next"
import { getEnvironment } from "@/lib/get-env";
import { EnvironmentProvider } from "@/context/EnvironmentContext";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Panel de control",
};
import Sidebar from "@/components/sidebar";
import OrgSync from "@/components/OrgSync";

import { SidebarProvider } from "@/context/SidebarContext";
import MainContentPadding from "./clientLayout";
import ActiveShiftProviderWrapper from "./ActiveShiftProviderWrapper";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const env = await getEnvironment();

  if (!env.org) redirect("/org/select");

  return (
    <EnvironmentProvider value={env}>
      <ActiveShiftProviderWrapper>
        <SidebarProvider>{/* 👈 límite cliente */}
          <OrgSync />
          <Sidebar />
          <MainContentPadding>{children}</MainContentPadding>
        </SidebarProvider>
      </ActiveShiftProviderWrapper>
    </EnvironmentProvider>
  );
}