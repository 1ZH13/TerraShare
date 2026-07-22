import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  /** Etiqueta accesible del control (no se pinta). */
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Icono a la izquierda del texto. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Desplegable propio del sistema de diseño (#379).
 *
 * Sustituye al `<select>` nativo por dos motivos que se notan usando la web:
 *
 * 1. **La lista de opciones no se puede estilar.** El navegador la pinta con su
 *    aspecto del sistema — un rectángulo blanco con tipografía de sistema — que
 *    no tiene nada que ver con la píldora crema sobre la que cuelga, ni sigue
 *    al tema oscuro.
 * 2. **Solo abría al pulsar el texto.** El `<select>` nativo ocupaba una parte
 *    del interior de la píldora; el icono y el galón quedaban fuera, así que
 *    pulsar el botón «entero» no hacía nada. Aquí el botón ES el disparador.
 *
 * Teclado: Enter/Espacio/flechas abren, las flechas mueven, Enter elige,
 * Escape cierra y devuelve el foco al botón.
 */
export default function Dropdown({
  label,
  value,
  options,
  onChange,
  icon,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  // Cerrar al pulsar fuera o al perder el foco de la ventana. Sin esto se puede
  // dejar más de una lista abierta a la vez y el resultado es un desastre.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("blur", () => setOpen(false), { once: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  // El foco pasa a la lista al abrir para que el teclado funcione de inmediato.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(activeIndex);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className={["ds-dd", className].filter(Boolean).join(" ")} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`ds-dd__btn${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close() : openAt(selectedIndex))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openAt(selectedIndex);
          }
        }}
      >
        {icon && <span className="ds-dd__icon">{icon}</span>}
        <span className="ds-dd__value">{selected?.label ?? label}</span>
        <ChevronDown size={14} className="ds-dd__chev" aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${activeIndex}`}
          tabIndex={-1}
          className="ds-dd__list"
          onKeyDown={onListKeyDown}
        >
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={option.value === value}
              className={[
                "ds-dd__opt",
                i === activeIndex ? "is-active" : "",
                option.value === value ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => choose(i)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
