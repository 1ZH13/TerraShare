import { ArrowLeft } from "lucide-react";
import { useCanGoBack, useRouter } from "@tanstack/react-router";
import "./back-link.css";

interface BackLinkProps {
  /**
   * Destino de respaldo cuando no hay pantalla anterior dentro de la aplicación
   * (enlace compartido, pestaña nueva, recarga). Sin esto el control sería un
   * callejón sin salida justo en el caso en que más falta hace.
   */
  fallbackTo: string;
  label?: string;
  className?: string;
}

/**
 * Control de «volver» (#377).
 *
 * Retrocede en el historial del enrutador, que es lo que la persona espera:
 * deshacer el último paso, sea cual sea. `useCanGoBack()` distingue el caso en
 * que TanStack Router tiene una entrada previa propia de aquel en que se entró
 * directo a la URL; en el segundo se navega al padre de la sección en vez de
 * dejar un botón que no hace nada (o que saca de la aplicación).
 */
export default function BackLink({ fallbackTo, label = "Volver", className }: BackLinkProps) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <button
      type="button"
      className={["ts-back", className].filter(Boolean).join(" ")}
      onClick={() => {
        if (canGoBack) router.history.back();
        else router.navigate({ to: fallbackTo });
      }}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
