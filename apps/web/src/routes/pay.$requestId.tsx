import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import PaymentPage from "../pages/PaymentPage";

export const Route = createFileRoute("/pay/$requestId")({
  component: () => (
    <ProtectedRoute><PaymentPage /></ProtectedRoute>
  ),
});
