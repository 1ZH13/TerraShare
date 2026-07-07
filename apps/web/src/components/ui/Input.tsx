import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export default function Input({ invalid = false, className, ...rest }: InputProps) {
  const cls = ["ds-input", invalid ? "ds-input--invalid" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return <input className={cls} aria-invalid={invalid || undefined} {...rest} />;
}
