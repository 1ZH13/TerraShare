import { createFileRoute } from "@tanstack/react-router";
import VisitsPage from "../pages/dashboard/VisitsPage";

export const Route = createFileRoute("/dashboard/visits")({
  component: VisitsPage,
});
