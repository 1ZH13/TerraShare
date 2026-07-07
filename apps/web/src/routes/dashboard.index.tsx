import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import AppLayout from "../components/AppLayout";
import HomePage from "../pages/HomePage";

export const Route = createFileRoute("/dashboard/")({
  component: () => (
    <ProtectedRoute><AppLayout><HomePage /></AppLayout></ProtectedRoute>
  ),
});
