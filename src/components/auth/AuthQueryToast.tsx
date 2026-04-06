"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type Props = {
  type?: string;
  message?: string;
  error?: string;
  success?: string;
};

export function AuthQueryToast({ type, message, error, success }: Props) {
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    const normalizedType = (type || "").toLowerCase();
    const resolvedMessage = error || success || message || "";
    if (!resolvedMessage) return;

    const key = `${normalizedType}|${resolvedMessage}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    if (normalizedType === "error" || error) {
      console.error("[auth:signInWithOtp]", resolvedMessage);
      toast.error(resolvedMessage);
      return;
    }

    if (normalizedType === "success" || success) {
      toast.success(resolvedMessage);
      return;
    }

    toast.message(resolvedMessage);
  }, [type, message, error, success]);

  return null;
}

