import { useState, type ChangeEvent } from "react";

export interface NumericInputProps {
  id?: string;
  /** null/undefined means empty — never coerced to 0, see docs/ARCHITECTURE.md "Numeric inputs". */
  value: number | null;
  onChange: (value: number | null) => void;
  allowNegative?: boolean;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

/**
 * The one numeric text input every admin form should use instead of a
 * bare `<input type="number">` — manual point adjustments and product
 * prices both hit the same real bug: `<input type="number" value={0}>`
 * shows a literal "0" that a fast typist doesn't clear first, so typing
 * "100" produces the field reading "0100" (which most browsers then
 * parse back as 100 anyway, but the *visible* value while typing is
 * wrong, and some contexts genuinely keep the leading zero). This
 * component keeps its own draft string so the field can be genuinely
 * empty, only ever shows digits (and a leading "-" when allowed), and
 * never re-inserts a leading zero. See product brief §7.
 */
export function NumericInput({
  id,
  value,
  onChange,
  allowNegative = false,
  placeholder,
  disabled,
  className,
  ...aria
}: NumericInputProps) {
  const [draft, setDraft] = useState<string>(value === null || value === undefined ? "" : String(value));

  // Stay in sync when the parent resets the value (e.g. modal reopened
  // for a different row) without fighting the user's own keystrokes —
  // only resync when the *numeric meaning* actually diverged.
  const draftAsNumber = draft === "" || draft === "-" ? null : Number(draft);
  if (value !== draftAsNumber && !(value === null && draft === "")) {
    setDraft(value === null || value === undefined ? "" : String(value));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const pattern = allowNegative ? /^-?\d*$/ : /^\d*$/;
    if (!pattern.test(raw)) return; // reject any non-digit keystroke outright

    // Normalize away leading zeros ("0100" -> "100", but "0" stays "0"
    // and "-0" -> "-0" while still typing the next digit).
    const sign = raw.startsWith("-") ? "-" : "";
    const digits = raw.slice(sign.length).replace(/^0+(?=\d)/, "");
    const normalized = sign + digits;

    setDraft(normalized);
    onChange(normalized === "" || normalized === "-" ? null : Number(normalized));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode={allowNegative ? "text" : "numeric"}
      pattern={allowNegative ? undefined : "[0-9]*"}
      value={draft}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      aria-label={aria["aria-label"]}
    />
  );
}
