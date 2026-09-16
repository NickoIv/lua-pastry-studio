import type { ReactNode } from "react";
import "./FormField.css";

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  htmlFor?: string;
}

/** One labeled control for every Admin form — consistent spacing/typography and a real <label htmlFor> association for accessibility. */
export function FormField({ label, children, error, hint, htmlFor }: FormFieldProps) {
  return (
    <div className="lua-form-field">
      <label className="lua-form-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="lua-form-field__hint">{hint}</p> : null}
      {error ? (
        <p className="lua-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
