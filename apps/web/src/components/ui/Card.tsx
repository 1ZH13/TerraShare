import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
  interactive?: boolean;
  children?: ReactNode;
}

export default function Card({ flat, interactive, className, children, ...rest }: CardProps) {
  const cls = [
    "ds-card",
    flat ? "ds-card--flat" : "",
    interactive ? "ds-card--interactive" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
