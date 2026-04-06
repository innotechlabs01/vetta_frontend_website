"use client";

import { useState } from "react";
import { CountrySelect } from "@/components/ui/country-select";
import { Input } from "@/components/ui/input";
import { parsePhoneInput } from "@/lib/phone";

export function PhoneLoginFields() {
  const [countryCode, setCountryCode] = useState("+57");
  const [phoneDisplay, setPhoneDisplay] = useState("");

  const onPhoneChange = (value: string) => {
    const parsed = parsePhoneInput(value, countryCode);
    if (parsed.hadExplicitCountry && parsed.countryCode !== countryCode) {
      setCountryCode(parsed.countryCode);
    }
    setPhoneDisplay(parsed.formattedNational);
  };

  return (
    <div className="flex gap-2 w-full">
      <div className="w-32">
        <CountrySelect name="countryCode" value={countryCode} onChange={setCountryCode} />
      </div>
      <div className="flex-1">
        <Input
          name="phoneNumber"
          autoFocus
          placeholder="300 123 4567"
          value={phoneDisplay}
          inputMode="tel"
          autoComplete="tel"
          onChange={(e) => onPhoneChange(e.target.value)}
          required
        />
      </div>
    </div>
  );
}

