// src/components/ProgressBar.tsx
"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

function ProgressBarImpl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    NProgress.start();
    const timeout = setTimeout(() => {
      NProgress.done();
    }, 500);

    return () => {
      clearTimeout(timeout);
      NProgress.done();
    };
  }, [pathname, searchParams?.toString()]); // forzar cambio cuando varían los query params

  return null;
}

export function ProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarImpl />
    </Suspense>
  );
}