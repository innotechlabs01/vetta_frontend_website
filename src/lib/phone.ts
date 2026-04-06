import { COUNTRY_LIST } from "@/components/ui/country-select";

const COUNTRY_CODES = Array.from(
  new Set(COUNTRY_LIST.map((c) => c.code))
).sort((a, b) => b.length - a.length);
const MAX_NATIONAL_DIGITS = 15;

function compactPhone(raw: string) {
  const trimmed = (raw || "").trim();
  const hadIntlPrefix = /^\s*(\+|00)/.test(trimmed);
  let compact = trimmed.replace(/[^\d+]/g, "");

  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (compact.includes("+")) {
    compact = `${compact.startsWith("+") ? "+" : ""}${compact.replace(/\+/g, "")}`;
  }

  return { compact, hadIntlPrefix };
}

function formatReadableDigits(digits: string) {
  if (!digits) return "";
  const groups: string[] = [];
  let rest = digits;

  while (rest.length > 4) {
    groups.push(rest.slice(0, 3));
    rest = rest.slice(3);
  }
  groups.push(rest);

  return groups.filter(Boolean).join(" ");
}

export function parsePhoneInput(raw: string, fallbackCountryCode = "+57") {
  const { compact, hadIntlPrefix } = compactPhone(raw);

  if (!compact) {
    return {
      countryCode: fallbackCountryCode,
      nationalDigits: "",
      formattedNational: "",
      hadExplicitCountry: false,
    };
  }

  if (compact.startsWith("+")) {
    const allDigits = compact.slice(1);
    const matchedCode = COUNTRY_CODES.find((code) =>
      allDigits.startsWith(code.replace("+", ""))
    );

    if (matchedCode) {
      const nationalDigits = allDigits
        .slice(matchedCode.replace("+", "").length)
        .slice(0, MAX_NATIONAL_DIGITS);
      return {
        countryCode: matchedCode,
        nationalDigits,
        formattedNational: formatReadableDigits(nationalDigits),
        hadExplicitCountry: true,
      };
    }

    return {
      countryCode: fallbackCountryCode,
      nationalDigits: allDigits.slice(0, MAX_NATIONAL_DIGITS),
      formattedNational: formatReadableDigits(allDigits.slice(0, MAX_NATIONAL_DIGITS)),
      hadExplicitCountry: true,
    };
  }

  const nationalDigits = compact.replace(/\D/g, "").slice(0, MAX_NATIONAL_DIGITS);
  return {
    countryCode: fallbackCountryCode,
    nationalDigits,
    formattedNational: formatReadableDigits(nationalDigits),
    hadExplicitCountry: hadIntlPrefix,
  };
}
