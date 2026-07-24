import { createFileRoute } from "@tanstack/react-router";
import Login from "../components/Login";
import { GuestRoute } from "../components/route-guards";

// GuestRoute: con sesión activa, /login no debe mostrarse ni quedar en el
// historial como destino al que rebotar (#422).
export const Route = createFileRoute("/login")({
  component: () => (
    <GuestRoute>
      <Login />
    </GuestRoute>
  ),
});
