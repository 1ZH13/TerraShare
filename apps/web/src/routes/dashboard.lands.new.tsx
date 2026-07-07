import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import PublishLandPage from "../pages/PublishLandPage";

export const Route = createFileRoute("/dashboard/lands/new")({
  component: () => (
    <ProtectedRoute><PublishLandPage /></ProtectedRoute>
  ),
});
