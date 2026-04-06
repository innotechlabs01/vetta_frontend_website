"use client";

import { forwardRef, type FocusEventHandler } from "react";
import clsx from "clsx";
import { NumericFormat, type NumberFormatValues, type NumericFormatProps } from "react-number-format";
import { formatAmountForInput } from "./utils";

type CurrencyInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
  inputClassName?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
};

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onValueChange,
      placeholder,
      disabled,
      autoFocus,
      id,
      name,
      className,
      inputClassName,
      onBlur,
      onFocus,
      ...ariaProps
    },
    ref,
  ) => {
    const handleValueChange = (values: NumberFormatValues) => {
      if (values.value === "") {
        onValueChange("");
        return;
      }
      const next = typeof values.floatValue === "number" && Number.isFinite(values.floatValue)
        ? formatAmountForInput(values.floatValue)
        : "";
      onValueChange(next);
    };

    const formatProps: NumericFormatProps = {
      value,
      getInputRef: ref,
      thousandSeparator: ".",
      decimalSeparator: ",",
      decimalScale: 2,
      fixedDecimalScale: true,
      allowNegative: false,
      allowLeadingZeros: false,
      onValueChange: handleValueChange,
      placeholder,
      disabled,
      autoFocus,
      id,
      name,
      inputMode: "decimal",
      className: clsx(
        "w-full rounded-xl border border-gray-200 bg-white py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
        inputClassName,
      ),
      onBlur,
      onFocus,
      ...ariaProps,
    };

    return (
      <div className={clsx("relative", className)}>
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
          $
        </span>
        <NumericFormat {...formatProps} />
      </div>
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;
