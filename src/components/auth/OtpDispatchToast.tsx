"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

function maskPhone(phone: string) {
  if (!phone) return "";
  const normalized = phone.startsWith("+") ? phone : `+${phone}`;
  if (normalized.length <= 6) return normalized;
  return `${normalized.slice(0, 4)}***${normalized.slice(-3)}`;
}

export function OtpDispatchToast({
  status,
  phone,
}: {
  status?: string;
  phone?: string;
}) {
  const shownRef = useRef<string>("");

  useEffect(() => {
    if (!status) return;
    const key = `${status}|${phone ?? ""}`;
    if (shownRef.current === key) return;
    shownRef.current = key;

    const masked = maskPhone(phone ?? "");

    if (status === "otp_sent") {
      console.info("[auth:sms] OTP request accepted", { phone: masked });
      toast.success("Código enviado por SMS.");
      return;
    }

    if (status === "otp_resent") {
      console.info("[auth:sms] OTP resend accepted", { phone: masked });
      toast.success("Código reenviado por SMS.");
    }
  }, [status, phone]);

  return null;
}

