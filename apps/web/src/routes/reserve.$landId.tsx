import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import ReservePage from "../pages/ReservePage";

export const Route = createFileRoute("/reserve/$landId")({
  component: () => (
    <ProtectedRoute><ReservePage /></ProtectedRoute>
  ),
});
