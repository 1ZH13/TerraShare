import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminLandsPage from "../pages/AdminLandsPage";

export const Route = createFileRoute("/dashboard/admin/lands")({
  component: () => (
    <AdminRoute><AdminLayout><AdminLandsPage /></AdminLayout></AdminRoute>
  ),
});
