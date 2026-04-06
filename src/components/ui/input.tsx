import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 font-medium bg-white w-full rounded-md border border-input hover:border-blue-500 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary focus-visible:outline-offset-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };