import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  /** id del control asociado; se usa en el `htmlFor` del label. */
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export default function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: FieldProps) {
  const cls = ["ds-field", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      <label className="ds-field__label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ds-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <span className="ds-field__error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="ds-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
