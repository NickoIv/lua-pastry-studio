import { useState } from "react";
import { FormField } from "./FormField";

const COMMON_ALLERGENS = [
  { key: "milk", label: "Молоко" },
  { key: "nuts", label: "Орехи" },
  { key: "gluten", label: "Глютен" },
  { key: "egg", label: "Яйца" },
  { key: "soy", label: "Соя" },
];

export interface AllergenInputProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * Selectable common allergens plus a free-text "other" — replaces the
 * old comma-separated text field (error-prone: stray spaces/typos
 * produced inconsistent tags). Storage stays the same plain
 * `text[]` column (products.allergens), just populated more reliably.
 * See product brief §15.
 */
export function AllergenInput({ value, onChange }: AllergenInputProps) {
  const customValues = value.filter((v) => !COMMON_ALLERGENS.some((c) => c.key === v));
  const [customDraft, setCustomDraft] = useState("");

  function toggle(key: string) {
    onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
  }

  function addCustom() {
    const trimmed = customDraft.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setCustomDraft("");
  }

  return (
    <FormField label="Аллергены">
      <div className="lua-allergen-input">
        {COMMON_ALLERGENS.map((allergen) => (
          <button
            key={allergen.key}
            type="button"
            className={`lua-allergen-chip${value.includes(allergen.key) ? " lua-allergen-chip--active" : ""}`}
            onClick={() => toggle(allergen.key)}
          >
            {allergen.label}
          </button>
        ))}
        {customValues.map((custom) => (
          <button
            key={custom}
            type="button"
            className="lua-allergen-chip lua-allergen-chip--active"
            onClick={() => onChange(value.filter((v) => v !== custom))}
            title="Нажмите, чтобы удалить"
          >
            {custom} ×
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Другой аллерген…"
        />
        <button type="button" className="lua-form-advanced-toggle" onClick={addCustom}>
          Добавить
        </button>
      </div>
    </FormField>
  );
}
