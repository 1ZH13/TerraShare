import { createFileRoute } from "@tanstack/react-router";
import Register from "../components/Register";
import { GuestRoute } from "../components/route-guards";

// GuestRoute: con sesión activa, /register no debe mostrarse ni quedar en el
// historial como destino al que rebotar (#422).
export const Route = createFileRoute("/register")({
  component: () => (
    <GuestRoute>
      <Register />
    </GuestRoute>
  ),
});
