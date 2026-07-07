import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "green" | "clay" | "beige" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  children?: ReactNode;
}

export default function Badge({ tone = "green", dot = false, className, children, ...rest }: BadgeProps) {
  const cls = ["ds-badge", `ds-badge--${tone}`, className ?? ""].filter(Boolean).join(" ");

  return (
    <span className={cls} {...rest}>
      {dot ? <span className="ds-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
