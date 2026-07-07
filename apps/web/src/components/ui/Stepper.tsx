export interface StepperProps {
  steps: string[];
  /** Índice (0-based) del paso activo. */
  current: number;
  className?: string;
  /** Muestra el número de cada paso dentro de un círculo. */
  showIndex?: boolean;
}

export default function Stepper({ steps, current, className, showIndex = true }: StepperProps) {
  const total = steps.length;
  const clamped = Math.max(0, Math.min(current, total - 1));
  const fill = total > 1 ? (clamped / (total - 1)) * 100 : 100;
  const cls = ["ds-stepper", className ?? ""].filter(Boolean).join(" ");

  return (
    <div
      className={cls}
      role="group"
      aria-label={`Paso ${clamped + 1} de ${total}: ${steps[clamped] ?? ""}`}
    >
      <div className="ds-stepper__track">
        <div className="ds-stepper__fill" style={{ width: `${fill}%` }} />
      </div>
      <div className="ds-stepper__labels">
        {steps.map((step, i) => {
          const state = i < clamped ? "is-done" : i === clamped ? "is-active" : "";
          return (
            <span
              key={step}
              className={["ds-stepper__label", state].filter(Boolean).join(" ")}
              aria-current={i === clamped ? "step" : undefined}
            >
              {showIndex ? <span className="ds-stepper__index">{i + 1}</span> : null}
              {step}
            </span>
          );
        })}
      </div>
    </div>
  );
}
