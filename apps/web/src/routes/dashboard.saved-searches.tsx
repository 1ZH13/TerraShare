import { createFileRoute } from "@tanstack/react-router";
import SavedSearchesPage from "../pages/dashboard/SavedSearchesPage";

export const Route = createFileRoute("/dashboard/saved-searches")({
  component: SavedSearchesPage,
});
