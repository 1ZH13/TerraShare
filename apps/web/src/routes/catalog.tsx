import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import AppLayout from "../components/AppLayout";
import CatalogPage from "../pages/CatalogPage";

export const Route = createFileRoute("/catalog")({
  component: () => (
    <ProtectedRoute><AppLayout><CatalogPage /></AppLayout></ProtectedRoute>
  ),
});
