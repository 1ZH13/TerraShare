import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminBackupsPage from "../pages/AdminBackupsPage";

export const Route = createFileRoute("/dashboard/admin/backups")({
  component: () => (
    <AdminRoute><AdminLayout><AdminBackupsPage /></AdminLayout></AdminRoute>
  ),
});
