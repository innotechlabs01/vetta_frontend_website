// app/org/select/OrgSelectForm.tsx
"use client";

import { useRef } from "react";

export default function OrgSelectForm(
  props: React.FormHTMLAttributes<HTMLFormElement>
) {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      {...props}
      onChange={(e) => {
        const t = e.target as HTMLInputElement;
        if (t?.name === "org_id" && (props as any)["data-autosubmit"]) {
          // submit inmediato al seleccionar
          ref.current?.requestSubmit();
        }
        props.onChange?.(e);
      }}
    />
  );
}