import { Notification } from "@backend/db/schemas";

/**
 * Notificación a un usuario tras una acción sensible ejecutada vía MCP (capa E, #328).
 *
 * Escribe en el centro de notificaciones existente (modelo `Notification`), que el
 * usuario ya consulta desde la app. Es defensa en profundidad + trazabilidad: si un
 * agente ejecuta una acción en nombre del usuario, este se entera y puede reaccionar.
 *
 * Es un efecto secundario **no crítico**: quien la invoca debe envolver la llamada
 * en try/catch para que un fallo de notificación no revierta la acción principal.
 */
export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
}): Promise<void> {
  await Notification.create({
    id: `ntf_${crypto.randomUUID()}`,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    read: false,
  });
}
