import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminUsersPage from "../pages/AdminUsersPage";

export const Route = createFileRoute("/dashboard/admin/users")({
  component: () => (
    <AdminRoute><AdminLayout><AdminUsersPage /></AdminLayout></AdminRoute>
  ),
});
