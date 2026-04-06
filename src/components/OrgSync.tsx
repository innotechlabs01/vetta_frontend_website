// app/app/OrgSync.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEnvironment } from "@/context/EnvironmentContext";

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="))
    ?.split("=")[1];
}

export default function OrgSync() {
  const { org } = useEnvironment();
  const router = useRouter();

  useEffect(() => {
    // 1) Reaccionar a señales entre pestañas (localStorage)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "org:changed") {
        router.refresh(); // vuelve a pedir el layout -> nuevo env
      }
    };
    window.addEventListener("storage", onStorage);

    // 2) Al volver el foco, compara cookie vs. env.org.id y refresca
    const checkCookieAndRefresh = () => {
      const cookieOrg = getCookie("org_id");
      if (cookieOrg && cookieOrg !== (org?.id ?? "")) {
        router.refresh();
      }
    };
    window.addEventListener("focus", checkCookieAndRefresh);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkCookieAndRefresh();
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", checkCookieAndRefresh);
      document.removeEventListener("visibilitychange", checkCookieAndRefresh);
    };
  }, [org?.id, router]);

  return null;
}