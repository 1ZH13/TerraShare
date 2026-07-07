import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import ChatsPage from "../pages/ChatsPage";

export const Route = createFileRoute("/dashboard/chats")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><ChatsPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
